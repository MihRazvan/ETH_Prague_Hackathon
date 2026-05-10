import Head from "next/head";
import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
  type Address,
} from "viem";
import { baseSepolia, sepolia } from "viem/chains";

import { CollageBackground, SiteNav } from "../components/SiteChrome";
import {
  chainName,
  decodeLockValue,
  deserializeBundle,
  lenderAbi,
  mockUsdcAbi,
  truncateAddress,
  vaultAbi,
  type DemoConfig,
  type DemoErrorResponse,
  type DemoProofBundle,
  type DemoProofResponse,
} from "../lib/demo";

type Step = "lock" | "prove" | "borrow" | "done";

interface StepStatus {
  step: Step;
  state: "pending" | "active" | "done" | "error";
}

export default function DemoPage() {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [activeChainId, setActiveChainId] = useState<number | null>(null);

  // Lock state (Sepolia side)
  const [lockTxHash, setLockTxHash] = useState<string | null>(null);
  const [lockedAmount, setLockedAmount] = useState<bigint | null>(null);
  const [lockStatus, setLockStatus] = useState<number | null>(null);

  // Proof state
  const [proofBundle, setProofBundle] = useState<DemoProofBundle | null>(null);
  const [proofLatencyMs, setProofLatencyMs] = useState<number | null>(null);
  const [proofBlock, setProofBlock] = useState<string | null>(null);
  const [proofBundleSize, setProofBundleSize] = useState<number | null>(null);

  // Borrow state (Base side)
  const [borrowTxHash, setBorrowTxHash] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState<bigint | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);

  // Flow
  const [currentStep, setCurrentStep] = useState<Step>("lock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider?.on) return;
    const handleAccounts = (accs: string[]) => {
      setWalletAddress(accs[0] ? (accs[0] as Address) : null);
    };
    const handleChain = (hex: string) => {
      setActiveChainId(Number.parseInt(hex, 16));
    };
    provider.on("accountsChanged", handleAccounts);
    provider.on("chainChanged", handleChain);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
      provider.removeListener?.("chainChanged", handleChain);
    };
  }, []);

  // Check existing lock when wallet connects
  useEffect(() => {
    if (!config || !walletAddress) return;
    void checkExistingLock();
  }, [config, walletAddress]);

  async function checkExistingLock() {
    if (!config || !walletAddress) return;
    try {
      const client = createPublicClient({ chain: sepolia, transport: http(config.ethRpcUrl) });
      const encoded = await client.readContract({
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "locks",
        args: [walletAddress],
      });
      const decoded = decodeLockValue(encoded);
      if (decoded.amountWei > 0n) {
        setLockedAmount(decoded.amountWei);
        setLockStatus(decoded.status);
      }
    } catch {
      // ignore
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/demo/config");
      const data = (await res.json()) as DemoConfig | { error: string };
      if (!res.ok || "error" in data) throw new Error("error" in data ? data.error : "Failed");
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    }
  }

  async function connectWallet() {
    try {
      const connector = getConnectorClient();
      const [address] = await connector.requestAddresses();
      const chainId = await connector.getChainId();
      setWalletAddress(address);
      setActiveChainId(chainId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    }
  }

  function disconnectWallet() {
    setWalletAddress(null);
    setActiveChainId(null);
    setLockedAmount(null);
    setLockStatus(null);
    setLockTxHash(null);
    setProofBundle(null);
    setProofLatencyMs(null);
    setProofBlock(null);
    setProofBundleSize(null);
    setBorrowTxHash(null);
    setLoanAmount(null);
    setUsdcBalance(null);
    setCurrentStep("lock");
    setError(null);
    setStatusMessage(null);
  }

  async function lockEth() {
    if (!config || !walletAddress) return;
    try {
      setBusy(true);
      setError(null);
      setStatusMessage("Switching to Sepolia...");

      const connector = getConnectorClient();
      await ensureChain(connector, sepolia);
      setActiveChainId(sepolia.id);

      setStatusMessage("Confirm the lock transaction in your wallet...");
      const hash = await connector.writeContract({
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "lock",
        value: parseEther("0.01"),
        chain: sepolia,
        account: walletAddress,
      });

      setLockTxHash(hash);
      setStatusMessage("Waiting for confirmation on Sepolia...");

      const client = createPublicClient({ chain: sepolia, transport: http(config.ethRpcUrl) });
      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Lock transaction reverted on-chain. Check Etherscan for details.");
      }

      // Re-read actual lock value from contract
      const encoded = await client.readContract({
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "locks",
        args: [walletAddress],
      });
      const decoded = decodeLockValue(encoded);
      setLockedAmount(decoded.amountWei);
      setLockStatus(decoded.status);
      setCurrentStep("prove");
      setStatusMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lock failed");
      setStatusMessage(null);
    } finally {
      setBusy(false);
    }
  }

  async function generateProof() {
    if (!config || !walletAddress) return;
    try {
      setBusy(true);
      setError(null);
      setStatusMessage("Generating cross-chain proof... This may take up to 45s");

      const res = await fetch("/api/demo/proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ borrower: walletAddress }),
      });

      const data = (await res.json()) as DemoProofResponse | DemoErrorResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.ok ? "Unknown error" : data.error);
      }

      setProofBundle(deserializeBundle(data.bundle));
      setProofLatencyMs(data.proofLatencyMs);
      setProofBlock(data.blockNumber);
      setProofBundleSize(data.proofBundleSizeBytes);
      setCurrentStep("borrow");
      setStatusMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proof generation failed");
      setStatusMessage(null);
    } finally {
      setBusy(false);
    }
  }

  async function borrowOnBase() {
    if (!config || !walletAddress || !proofBundle) return;
    try {
      setBusy(true);
      setError(null);
      setStatusMessage("Switching to Base Sepolia...");

      const connector = getConnectorClient();
      await ensureChain(connector, baseSepolia);
      setActiveChainId(baseSepolia.id);

      setStatusMessage("Confirm the borrow transaction...");
      const hash = await connector.writeContract({
        address: config.lenderAddress,
        abi: lenderAbi,
        functionName: "borrow",
        args: [proofBundle],
        chain: baseSepolia,
        account: walletAddress,
      });

      setBorrowTxHash(hash);
      setStatusMessage("Waiting for confirmation on Base...");

      const client = createPublicClient({ chain: baseSepolia, transport: http(config.baseRpcUrl) });
      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status === "reverted") {
        throw new Error("Borrow transaction reverted on-chain. The proof may have expired or the vault state changed. Check BaseScan for details.");
      }

      const balance = await client.readContract({
        address: config.mockUsdcAddress,
        abi: mockUsdcAbi,
        functionName: "balanceOf",
        args: [walletAddress],
      });

      setUsdcBalance(balance);
      setLoanAmount(balance);
      setCurrentStep("done");
      setStatusMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Borrow failed");
      setStatusMessage(null);
    } finally {
      setBusy(false);
    }
  }

  // Computed values
  const estimatedBorrow = lockedAmount ? (Number(formatEther(lockedAmount)) * 0.5 * 1_000_000) : null;
  const collateralUsd = lockedAmount ? (Number(formatEther(lockedAmount)) * 1_000_000).toFixed(2) : null;

  const steps: StepStatus[] = [
    {
      step: "lock",
      state:
        currentStep !== "lock" ? "done" :
        busy ? "active" :
        error ? "error" :
        "pending",
    },
    {
      step: "prove",
      state:
        proofBundle ? "done" :
        currentStep === "prove" && busy ? "active" :
        currentStep === "prove" && error ? "error" :
        currentStep === "lock" ? "pending" :
        "pending",
    },
    {
      step: "borrow",
      state:
        currentStep === "done" ? "done" :
        currentStep === "borrow" && busy ? "active" :
        currentStep === "borrow" && error ? "error" :
        "pending",
    },
    {
      step: "done",
      state: currentStep === "done" ? "done" : "pending",
    },
  ];

  const stepLabels: Record<Step, string> = {
    lock: "Lock ETH",
    prove: "Generate Proof",
    borrow: "Borrow on Base",
    done: "Complete",
  };

  return (
    <>
      <Head>
        <title>Anyware Demo — Cross-Chain Lending</title>
      </Head>

      <main className="lp demoPage">
        <section className="lpSection demoSection">
          <CollageBackground />
          <div className="lpGlobalNav">
            <div className="lpShell lpNavShell">
              <SiteNav
                rightSlot={
                  walletAddress ? (
                    <button className="demoWalletPill demoWalletConnected" onClick={disconnectWallet} type="button" title="Click to disconnect">
                      {truncateAddress(walletAddress)}
                    </button>
                  ) : (
                    <button className="demoWalletPill" onClick={connectWallet} type="button">
                      connect
                    </button>
                  )
                }
              />
            </div>
          </div>

          <div className="lpShell demoShell">
            <section className="demoWorkbench">
              {/* Progress */}
              <div className="demoHeader">
                <div className="demoTopbar">
                  <div className="demoTopbarLabel">
                    <strong>Cross-Chain Lending</strong>
                    <span>Lock ETH on Sepolia → Borrow hUSDC on Base</span>
                  </div>
                  <div className="demoTopbarMeta">
                    {activeChainId && (
                      <span className={`demoChainIndicator ${activeChainId === sepolia.id ? "is-eth" : activeChainId === baseSepolia.id ? "is-base" : ""}`}>
                        <span className="demoChainIndicatorDot" />
                        {chainName(activeChainId)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="demoProgress">
                  {steps.map((s, i) => (
                    <div className={`demoProgressStep is-${s.state}`} key={s.step}>
                      {i > 0 && <div className="demoProgressLine" />}
                      <div className="demoProgressDot">
                        <span className="demoProgressDotInner">
                          {s.state === "done" ? "✓" : i + 1}
                        </span>
                      </div>
                      <div className="demoProgressLabel">
                        <strong>{stepLabels[s.step]}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split-chain panels */}
              <div className="demoSplit">
                {/* Left: Ethereum / Sepolia */}
                <div className="demoChainPanel">
                  <div className="demoChainHeader">
                    <div className="demoChainDot demoChainDotEth" />
                    <strong>Ethereum Sepolia</strong>
                    <span>Source chain</span>
                  </div>

                  <div className="demoChainBody">
                    {/* Pool info */}
                    <div className="demoPoolInfo">
                      <div className="demoPoolRow">
                        <span>Asset</span>
                        <strong>ETH</strong>
                      </div>
                      <div className="demoPoolRow">
                        <span>Vault</span>
                        <span className="demoChainMono">{config ? truncateAddress(config.vaultAddress) : "—"}</span>
                      </div>
                      <div className="demoPoolRow">
                        <span>Lock type</span>
                        <span>Cumulative</span>
                      </div>
                    </div>

                    {/* Your position */}
                    <div className="demoChainSection">
                      <div className="demoChainLabel">Your Position</div>
                      {lockedAmount && lockedAmount > 0n ? (
                        <>
                          <div className="demoChainHighlight">
                            <strong>{formatEther(lockedAmount)} ETH</strong>
                            <span className="demoChainBadgeGreen">{lockStatus === 1 ? "Active" : lockStatus === 2 ? "Released" : "—"}</span>
                          </div>
                          <div className="demoPoolRow demoPoolRowSub">
                            <span>Value (demo rate)</span>
                            <span>${collateralUsd}</span>
                          </div>
                          <div className="demoPoolRow demoPoolRowSub">
                            <span>Borrow capacity</span>
                            <span>{estimatedBorrow?.toFixed(2)} hUSDC</span>
                          </div>
                        </>
                      ) : (
                        <div className="demoChainValue">No active lock</div>
                      )}
                    </div>

                    {lockTxHash && (
                      <a
                        className="demoExplorerBtn"
                        href={`https://sepolia.etherscan.io/tx/${lockTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="demoExplorerHash">{truncateAddress(lockTxHash)}</span>
                        <span className="demoExplorerArrow">View on Etherscan ↗</span>
                      </a>
                    )}

                    {currentStep === "lock" && (
                      <button
                        className="lpPrimaryButton demoChainAction"
                        disabled={busy || !config || !walletAddress}
                        onClick={lockEth}
                        type="button"
                      >
                        {busy ? "Locking..." : `Lock 0.01 ETH${lockedAmount && lockedAmount > 0n ? " (top up)" : ""}`}
                      </button>
                    )}

                    {currentStep === "prove" && (
                      <button
                        className="lpPrimaryButton demoChainAction"
                        disabled={busy || !config}
                        onClick={generateProof}
                        type="button"
                      >
                        {busy ? "Proving..." : "Generate Proof"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Center: Proof bridge */}
                <div className="demoBridge">
                  <div className={`demoBridgeLine ${proofBundle ? "is-active" : ""}`} />
                  <div className={`demoBridgeLabel ${proofBundle ? "is-active" : ""}`}>
                    {proofBundle ? "Proof verified" : "Awaiting proof"}
                  </div>
                  <div className={`demoBridgeLine ${proofBundle ? "is-active" : ""}`} />
                </div>

                {/* Right: Base Sepolia */}
                <div className="demoChainPanel">
                  <div className="demoChainHeader">
                    <div className="demoChainDot demoChainDotBase" />
                    <strong>Base Sepolia</strong>
                    <span>Destination chain</span>
                  </div>

                  <div className="demoChainBody">
                    {/* Market info */}
                    <div className="demoPoolInfo">
                      <div className="demoPoolRow">
                        <span>Borrow asset</span>
                        <strong>hUSDC</strong>
                      </div>
                      <div className="demoPoolRow">
                        <span>Lender</span>
                        <span className="demoChainMono">{config ? truncateAddress(config.lenderAddress) : "—"}</span>
                      </div>
                      <div className="demoPoolRow">
                        <span>LTV ratio</span>
                        <span>50%</span>
                      </div>
                      <div className="demoPoolRow">
                        <span>ETH/USD rate</span>
                        <span>$1,000,000 (demo)</span>
                      </div>
                      <div className="demoPoolRow">
                        <span>Max proof age</span>
                        <span>1 hour</span>
                      </div>
                    </div>

                    {/* Your borrow position */}
                    <div className="demoChainSection">
                      <div className="demoChainLabel">Your Balance</div>
                      {usdcBalance && usdcBalance > 0n ? (
                        <div className="demoChainHighlight">
                          <strong>{(Number(usdcBalance) / 1e6).toFixed(2)} hUSDC</strong>
                          <span className="demoChainBadgeGreen">Received</span>
                        </div>
                      ) : (
                        <div className="demoChainValue">—</div>
                      )}
                    </div>

                    {borrowTxHash && (
                      <a
                        className="demoExplorerBtn"
                        href={`https://sepolia.basescan.org/tx/${borrowTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="demoExplorerHash">{truncateAddress(borrowTxHash)}</span>
                        <span className="demoExplorerArrow">View on BaseScan ↗</span>
                      </a>
                    )}

                    {currentStep === "borrow" && (
                      <button
                        className="lpPrimaryButton demoChainAction"
                        disabled={busy || !config || !walletAddress || !proofBundle}
                        onClick={borrowOnBase}
                        type="button"
                      >
                        {busy ? "Borrowing..." : `Borrow ${estimatedBorrow ? estimatedBorrow.toFixed(2) : "—"} hUSDC`}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Proof details panel */}
              {proofBundle && (
                <div className="demoProofDetails">
                  <div className="demoProofDetailsTitle">Proof Bundle</div>
                  <div className="demoProofGrid">
                    <div className="demoProofItem">
                      <span>Beacon slot</span>
                      <strong>{proofBundle.slot.toString()}</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>Source block</span>
                      <strong>{proofBlock}</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>Latency</span>
                      <strong>{proofLatencyMs}ms</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>Bundle size</span>
                      <strong>{proofBundleSize ? `${(proofBundleSize / 1024).toFixed(1)} KB` : "—"}</strong>
                    </div>
                    <div className="demoProofItem demoProofItemWide">
                      <span>State root</span>
                      <strong className="demoChainMono">{proofBundle.stateRoot}</strong>
                    </div>
                    <div className="demoProofItem demoProofItemWide">
                      <span>Body root</span>
                      <strong className="demoChainMono">{proofBundle.bodyRoot}</strong>
                    </div>
                    <div className="demoProofItem demoProofItemWide">
                      <span>Execution block hash</span>
                      <strong className="demoChainMono">{proofBundle.executionHeader.blockHash}</strong>
                    </div>
                    <div className="demoProofItem demoProofItemWide">
                      <span>Storage slot key</span>
                      <strong className="demoChainMono">{proofBundle.slotKey}</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>Account proof depth</span>
                      <strong>{proofBundle.accountProof.length} nodes</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>Storage proof depth</span>
                      <strong>{proofBundle.storageProof.length} nodes</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>SSZ proof depth</span>
                      <strong>{proofBundle.executionHeaderProof.length} hashes</strong>
                    </div>
                    <div className="demoProofItem">
                      <span>Proposer index</span>
                      <strong>{proofBundle.proposerIndex.toString()}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Status / Error */}
              {statusMessage && (
                <div className="demoStatus">{statusMessage}</div>
              )}
              {error && (
                <div className="demoError">{error}</div>
              )}

              {/* Done state */}
              {currentStep === "done" && (
                <div className="demoDoneCard">
                  <strong>Cross-chain lending complete</strong>
                  <p>
                    You locked {lockedAmount ? formatEther(lockedAmount) : "—"} ETH on Ethereum Sepolia
                    and borrowed {usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "—"} hUSDC on Base Sepolia.
                    <br />
                    No bridge. No oracle. No relayer. Just cryptographic proof.
                  </p>
                </div>
              )}

              {/* Explainer when not connected */}
              {!walletAddress && (
                <div className="demoStatus">
                  Connect a wallet to start the cross-chain lending demo.
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}

function getInjectedProvider(): any {
  if (typeof window === "undefined") return null;
  return (window as typeof window & { ethereum?: any }).ethereum ?? null;
}

function getConnectorClient() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet found.");
  return createWalletClient({ transport: custom(provider) });
}

async function ensureChain(client: ReturnType<typeof createWalletClient>, chain: typeof baseSepolia | typeof sepolia) {
  try {
    await client.switchChain({ id: chain.id });
  } catch {
    await client.addChain({ chain });
    await client.switchChain({ id: chain.id });
  }
}
