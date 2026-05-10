import Head from "next/head";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, http, parseEther, type Address, type Hex } from "viem";
import { baseSepolia, sepolia } from "viem/chains";

import { CollageBackground, SiteNav } from "../components/SiteChrome";
import {
  chainName,
  decodeLockValue,
  deserializeBundle,
  type DemoConfig,
  type DemoErrorResponse,
  type DemoProofResponse,
  type VerificationSummary,
  verifierAbi,
  vaultAbi,
} from "../lib/demo";

type FlowKey = "connect" | "lock" | "prove" | "verify" | "unlock";
type StepState = "pending" | "active" | "success" | "error";
type FeedTone = "neutral" | "good" | "warn";

interface FeedEntry {
  id: number;
  title: string;
  detail: string;
  tone: FeedTone;
}

interface StepVisual {
  key: FlowKey;
  label: string;
  eyebrow: string;
}

const flowSteps: StepVisual[] = [
  { key: "connect", label: "Connect wallet", eyebrow: "Auth" },
  { key: "lock", label: "Lock on Ethereum", eyebrow: "Sepolia" },
  { key: "prove", label: "Assemble proof", eyebrow: "Anyware" },
  { key: "verify", label: "Verify on Base", eyebrow: "Base" },
  { key: "unlock", label: "Unlock access", eyebrow: "App" },
];

const proofPipelineLabels = [
  "Fetch storage proof",
  "Fetch beacon header",
  "Match execution block",
  "Build SSZ branch",
  "Package proof bundle",
] as const;

const verifyPipelineLabels = [
  "Read EIP-4788 anchor",
  "Rebuild beacon root",
  "Verify execution payload",
  "Verify account trie",
  "Verify storage trie",
  "Decode lock state",
] as const;

export default function DemoPage() {
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [activeChainId, setActiveChainId] = useState<number | null>(null);
  const [sourceBlockNumber, setSourceBlockNumber] = useState<bigint | null>(null);
  const [sourceTxHash, setSourceTxHash] = useState<Hex | null>(null);
  const [lockAmountWei, setLockAmountWei] = useState<bigint | null>(null);
  const [lockStatus, setLockStatus] = useState<number | null>(null);
  const [lockSlot, setLockSlot] = useState<Hex | null>(null);
  const [proofBundle, setProofBundle] = useState<ReturnType<typeof deserializeBundle> | null>(null);
  const [proofLatencyMs, setProofLatencyMs] = useState<number | null>(null);
  const [proofBundleSizeBytes, setProofBundleSizeBytes] = useState<number | null>(null);
  const [verification, setVerification] = useState<VerificationSummary | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [activeFlow, setActiveFlow] = useState<FlowKey>("connect");
  const [busy, setBusy] = useState<FlowKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [proofPipeline, setProofPipeline] = useState<Record<string, StepState>>({});
  const [verifyPipeline, setVerifyPipeline] = useState<Record<string, StepState>>({});

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider?.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      const next = accounts[0];
      setWalletAddress(next ? (next as Address) : null);
      if (!next) {
        setActiveFlow("connect");
      }
    };
    const handleChainChanged = (hexChainId: string) => {
      setActiveChainId(Number.parseInt(hexChainId, 16));
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  async function loadConfig() {
    try {
      const response = await fetch("/api/demo/config");
      const payload = (await response.json()) as DemoConfig | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Failed to load demo config.");
      }
      setConfig(payload);
      appendFeed("Demo ready", "Live Sepolia and Base endpoints loaded.", "good");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load demo config.";
      setConfigError(message);
      setErrorMessage(message);
    }
  }

  function appendFeed(title: string, detail: string, tone: FeedTone) {
    setFeed((current) => [
      { id: Date.now() + current.length, title, detail, tone },
      ...current,
    ].slice(0, 8));
  }

  async function connectWallet() {
    try {
      setBusy("connect");
      setErrorMessage(null);
      const connector = getConnectorClient();
      const [address] = await connector.requestAddresses();
      const chainId = await connector.getChainId();
      setWalletAddress(address);
      setActiveChainId(chainId);
      setActiveFlow("lock");
      appendFeed("Wallet connected", `${address} on ${chainName(chainId)}.`, "good");
    } catch (error) {
      handleError("Wallet connection failed.", error, "connect");
    } finally {
      setBusy(null);
    }
  }

  async function lockOnEthereum() {
    if (!config || !walletAddress) return;

    try {
      setBusy("lock");
      setErrorMessage(null);
      setActiveFlow("lock");
      appendFeed("Switching source chain", "Requesting Ethereum Sepolia in wallet.", "neutral");

      const connector = getConnectorClient();
      await ensureChain(connector, sepolia);
      setActiveChainId(sepolia.id);

      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(config.ethRpcUrl),
      });

      const existingLock = await publicClient.readContract({
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "locks",
        args: [walletAddress],
      });
      const currentStatus = Number(existingLock & 0xffn);
      if (currentStatus === 1) {
        const latestBlock = await publicClient.getBlockNumber();
        const decoded = decodeLockValue(existingLock);
        setSourceBlockNumber(latestBlock);
        setLockAmountWei(decoded.amountWei);
        setLockStatus(decoded.status);
        setActiveFlow("prove");
        appendFeed("Active lock detected", `${formatEther(decoded.amountWei)} ETH is already locked on Sepolia.`, "warn");
        return;
      }

      appendFeed("Waiting for signature", `Locking ${config.lockAmountEth} ETH in the source vault.`, "neutral");
      const writeClient = createWalletClient({
        transport: custom(getInjectedProvider()),
      });
      const txHash = await writeClient.writeContract({
        account: walletAddress,
        chain: sepolia,
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "lock",
        args: [],
        value: parseEther(config.lockAmountEth),
      });
      setSourceTxHash(txHash);
      appendFeed("Source transaction sent", txHash, "neutral");

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const refreshedLock = await publicClient.readContract({
        address: config.vaultAddress,
        abi: vaultAbi,
        functionName: "locks",
        args: [walletAddress],
      });
      const decoded = decodeLockValue(refreshedLock);

      setSourceBlockNumber(receipt.blockNumber);
      setLockAmountWei(decoded.amountWei);
      setLockStatus(decoded.status);
      setActiveFlow("prove");

      appendFeed(
        "Collateral locked",
        `${formatEther(decoded.amountWei)} ETH confirmed in block ${receipt.blockNumber.toString()}.`,
        "good",
      );
    } catch (error) {
      handleError("Ethereum lock failed.", error, "lock");
    } finally {
      setBusy(null);
    }
  }

  async function generateProof() {
    if (!walletAddress || !sourceBlockNumber) return;

    try {
      setBusy("prove");
      setErrorMessage(null);
      setActiveFlow("prove");
      setProofPipeline({});
      await runPipeline(proofPipelineLabels, setProofPipeline, 280);

      const response = await fetch("/api/demo/proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          borrower: walletAddress,
          blockNumber: sourceBlockNumber.toString(),
        }),
      });

      const payload = (await response.json()) as DemoProofResponse | DemoErrorResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Unknown proof error." : payload.error);
      }

      setProofBundle(deserializeBundle(payload.bundle));
      setLockSlot(payload.lockSlot);
      setProofLatencyMs(payload.proofLatencyMs);
      setProofBundleSizeBytes(payload.proofBundleSizeBytes);
      setActiveFlow("verify");

      appendFeed(
        "Proof assembled",
        `${payload.proofBundleSizeBytes} bytes bundled in ${payload.proofLatencyMs}ms.`,
        "good",
      );
    } catch (error) {
      handleError("Proof generation failed.", error, "prove");
    } finally {
      setBusy(null);
    }
  }

  async function verifyOnBase() {
    if (!config || !proofBundle) return;

    try {
      setBusy("verify");
      setErrorMessage(null);
      setActiveFlow("verify");
      appendFeed("Switching destination chain", "Preparing Base verification context.", "neutral");

      const connector = getConnectorClient();
      await ensureChain(connector, baseSepolia);
      setActiveChainId(baseSepolia.id);
      setVerifyPipeline({});
      await runPipeline(verifyPipelineLabels, setVerifyPipeline, 260);

      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(config.baseRpcUrl),
      });
      const [verifiedValue, sourceBlock, sourceAccount, sourceSlot] = await client.readContract({
        address: config.verifierAddress,
        abi: verifierAbi,
        functionName: "verifyStorageSlot",
        args: [proofBundle, BigInt(config.maxProofAgeSeconds)],
      });

      const encodedValue = BigInt(verifiedValue);
      const decoded = decodeLockValue(encodedValue);
      const summary = {
        encodedValue,
        sourceBlockNumber: sourceBlock,
        sourceAccount,
        sourceSlot,
        amountWei: decoded.amountWei,
        status: decoded.status,
      } satisfies VerificationSummary;

      setVerification(summary);
      setActiveFlow("unlock");

      appendFeed(
        "Proof accepted on Base",
        `${formatEther(decoded.amountWei)} ETH reconstructed from Ethereum-authenticated state.`,
        "good",
      );
    } catch (error) {
      handleError("Base verification failed.", error, "verify");
    } finally {
      setBusy(null);
    }
  }

  function unlockAccess() {
    setAccessGranted(true);
    setActiveFlow("unlock");
    appendFeed("Access unlocked", "Verified Mode is now active on Base.", "good");
  }

  function handleError(prefix: string, error: unknown, flow: FlowKey) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    setErrorMessage(`${prefix} ${message}`);
    appendFeed(prefix, message, "warn");
    setActiveFlow(flow);
  }

  function currentInstruction() {
    if (accessGranted) return "Ethereum truth accepted. Base access is now open.";
    if (!walletAddress) return "Connect your wallet to begin the live proof flow.";
    if (!sourceBlockNumber) return "Lock a small amount on Ethereum Sepolia to create the fact.";
    if (!proofBundle) return "Assemble the proof bundle from live Ethereum + beacon data.";
    if (!verification) return "Run the Base verification path and reconstruct the slot onchain.";
    return "Verification passed. Unlock the Base-side reward and finish the demo.";
  }

  function actionButton() {
    if (configError) {
      return (
        <button className="lpPrimaryButton" disabled type="button">
          Config error
        </button>
      );
    }

    if (!walletAddress) {
      return (
        <button className="lpPrimaryButton" disabled={busy !== null || !config} onClick={connectWallet} type="button">
          {busy === "connect" ? "Connecting..." : "Connect wallet"}
        </button>
      );
    }

    if (!sourceBlockNumber) {
      return (
        <button className="lpPrimaryButton" disabled={busy !== null || !config} onClick={lockOnEthereum} type="button">
          {busy === "lock" ? "Locking..." : "Lock on Ethereum"}
        </button>
      );
    }

    if (!proofBundle) {
      return (
        <button className="lpPrimaryButton" disabled={busy !== null} onClick={generateProof} type="button">
          {busy === "prove" ? "Assembling..." : "Generate proof"}
        </button>
      );
    }

    if (!verification) {
      return (
        <button className="lpPrimaryButton" disabled={busy !== null || !config} onClick={verifyOnBase} type="button">
          {busy === "verify" ? "Verifying..." : "Verify on Base"}
        </button>
      );
    }

    if (!accessGranted) {
      return (
        <button className="lpPrimaryButton" disabled={busy !== null} onClick={unlockAccess} type="button">
          Unlock Builder Mode
        </button>
      );
    }

    return (
      <a className="lpPrimaryButton" href="/learn">
        Enter the side quest
      </a>
    );
  }

  const progressStates = flowSteps.map((step) => {
    if (accessGranted) return { ...step, state: "success" as StepState };
    if (step.key === activeFlow && busy) return { ...step, state: "active" as StepState };
    if (step.key === "connect" && walletAddress) return { ...step, state: "success" as StepState };
    if (step.key === "lock" && sourceBlockNumber) return { ...step, state: "success" as StepState };
    if (step.key === "prove" && proofBundle) return { ...step, state: "success" as StepState };
    if (step.key === "verify" && verification) return { ...step, state: "success" as StepState };
    if (step.key === "unlock" && accessGranted) return { ...step, state: "success" as StepState };
    if (step.key === activeFlow) return { ...step, state: "active" as StepState };
    return { ...step, state: "pending" as StepState };
  });

  return (
    <>
      <Head>
        <title>Anyware Demo</title>
      </Head>

      <main className="lp demoPage">
        <section className="lpSection demoSection">
          <CollageBackground />
          <div className="lpShell demoShell">
            <SiteNav
              rightSlot={
                <button className="demoWalletPill" onClick={connectWallet} type="button">
                  {walletAddress ? chainName(activeChainId) : "connect"}
                </button>
              }
            />

            <div className="demoHero">
              <div>
                <p className="demoOverline">Live proof flow</p>
                <h1 className="demoTitle">Lock on Ethereum. Unlock on Base.</h1>
              </div>
              <p className="demoTitleMeta">
                One live fact. One proof bundle. One Base-side unlock.
              </p>
            </div>

            <section className="demoWorkbench">
              <div className="demoProgress">
                {progressStates.map((step) => (
                  <div className={`demoProgressStep is-${step.state}`} key={step.key}>
                    <span>{step.eyebrow}</span>
                    <strong>{step.label}</strong>
                  </div>
                ))}
              </div>

              <div className="demoColumns">
                <div className="demoStage">
                  <div className="demoGuide">
                    <span>Now</span>
                    <p>{currentInstruction()}</p>
                  </div>

                  <div className="demoTrack">
                    <div className={`demoNode ${walletAddress ? "is-on" : ""}`}>
                      <span>Ethereum</span>
                      <strong>Lock</strong>
                    </div>
                    <div className={`demoBeam ${sourceBlockNumber ? "is-on" : ""}`} />
                    <div className={`demoNode ${proofBundle ? "is-on" : ""}`}>
                      <span>Anyware</span>
                      <strong>Prove</strong>
                    </div>
                    <div className={`demoBeam ${verification ? "is-on" : ""}`} />
                    <div className={`demoNode ${accessGranted ? "is-on" : ""}`}>
                      <span>Base</span>
                      <strong>Unlock</strong>
                    </div>
                  </div>

                  <div className="demoActionRow">
                    {actionButton()}
                    <div className="demoActionMeta">
                      <span>{walletAddress ? "Wallet live" : "Wallet required"}</span>
                      <span>{activeChainId ? chainName(activeChainId) : "No chain selected"}</span>
                    </div>
                  </div>

                  <div className="demoPipeline">
                    {(busy === "prove" || proofBundle) && (
                      <Pipeline
                        label="Proof assembly"
                        statuses={proofPipeline}
                        steps={proofPipelineLabels}
                      />
                    )}
                    {(busy === "verify" || verification) && (
                      <Pipeline
                        label="Base verification"
                        statuses={verifyPipeline}
                        steps={verifyPipelineLabels}
                      />
                    )}
                  </div>

                  <div className={`demoUnlock ${accessGranted ? "is-open" : ""}`}>
                    <div className="demoUnlockBadge">{accessGranted ? "verified" : "locked"}</div>
                    <div>
                      <strong>Builder Mode</strong>
                      <p>
                        {accessGranted
                          ? "Base accepted the Ethereum fact. Access is open."
                          : "Verification success will unlock the Base-side experience."}
                      </p>
                    </div>
                  </div>
                </div>

                <aside className="demoRail">
                  <section className="demoMetricBlock">
                    <h2>Session</h2>
                    <dl>
                      <div>
                        <dt>Wallet</dt>
                        <dd>{walletAddress ?? "Not connected"}</dd>
                      </div>
                      <div>
                        <dt>Source block</dt>
                        <dd>{sourceBlockNumber?.toString() ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Lock slot</dt>
                        <dd>{lockSlot ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Source tx</dt>
                        <dd>{sourceTxHash ?? "—"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="demoMetricBlock">
                    <h2>Proof</h2>
                    <dl>
                      <div>
                        <dt>Bundle size</dt>
                        <dd>{proofBundleSizeBytes ? `${proofBundleSizeBytes} bytes` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Assembly</dt>
                        <dd>{proofLatencyMs ? `${proofLatencyMs} ms` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Lock amount</dt>
                        <dd>{lockAmountWei ? `${formatEther(lockAmountWei)} ETH` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{lockStatus === 1 ? "Active" : lockStatus === 2 ? "Released" : "—"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="demoMetricBlock">
                    <h2>Verification</h2>
                    <dl>
                      <div>
                        <dt>Decoded</dt>
                        <dd>{verification ? `${formatEther(verification.amountWei)} ETH` : "—"}</dd>
                      </div>
                      <div>
                        <dt>Source vault</dt>
                        <dd>{verification?.sourceAccount ?? config?.vaultAddress ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Proof age</dt>
                        <dd>{config ? `${config.maxProofAgeSeconds}s window` : "—"}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="demoFeed">
                    <h2>Live feed</h2>
                    <ul>
                      {feed.map((entry) => (
                        <li className={`is-${entry.tone}`} key={entry.id}>
                          <strong>{entry.title}</strong>
                          <span>{entry.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                </aside>
              </div>
            </section>

            {errorMessage ? <p className="demoError">{errorMessage}</p> : null}
          </div>
        </section>
      </main>
    </>
  );
}

function Pipeline({
  label,
  statuses,
  steps,
}: {
  label: string;
  statuses: Record<string, StepState>;
  steps: readonly string[];
}) {
  return (
    <div className="demoPipelineBlock">
      <div className="demoPipelineHeader">
        <span>{label}</span>
      </div>
      <div className="demoPipelineSteps">
        {steps.map((step) => (
          <div className={`demoPipelineStep is-${statuses[step] ?? "pending"}`} key={step}>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function getInjectedProvider(): any {
  if (typeof window === "undefined") return null;
  return (window as typeof window & { ethereum?: any }).ethereum ?? null;
}

function getConnectorClient() {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No injected wallet found.");
  }

  return createWalletClient({
    transport: custom(provider),
  });
}

async function ensureChain(client: ReturnType<typeof createWalletClient>, chain: typeof sepolia | typeof baseSepolia) {
  try {
    await client.switchChain({ id: chain.id });
  } catch {
    await client.addChain({ chain });
    await client.switchChain({ id: chain.id });
  }
}

async function runPipeline(
  steps: readonly string[],
  setStatuses: Dispatch<SetStateAction<Record<string, StepState>>>,
  delayMs: number,
) {
  for (const step of steps) {
    setStatuses((current) => ({ ...current, [step]: "active" }));
    await wait(delayMs);
    setStatuses((current) => ({ ...current, [step]: "success" }));
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
