import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createPublicClient, createWalletClient, custom, formatEther, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";

import { CollageBackground, SiteNav } from "../components/SiteChrome";
import {
  chainName,
  decodeLockValue,
  deserializeBundle,
  statusLabel,
  truncateAddress,
  type DemoConfig,
  type DemoErrorResponse,
  type DemoProofResponse,
  type DemoSourceFactSnapshot,
  type VerificationSummary,
  verifierAbi,
} from "../lib/demo";

type FlowKey = "connect" | "select" | "prove" | "verify" | "unlock";
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
  { key: "select", label: "Pick live fact", eyebrow: "Ethereum" },
  { key: "prove", label: "Generate proof", eyebrow: "Anyware" },
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
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [proofBundle, setProofBundle] = useState<ReturnType<typeof deserializeBundle> | null>(null);
  const [proofLatencyMs, setProofLatencyMs] = useState<number | null>(null);
  const [proofBundleSizeBytes, setProofBundleSizeBytes] = useState<number | null>(null);
  const [proofSourceBlockNumber, setProofSourceBlockNumber] = useState<bigint | null>(null);
  const [proofSourceOffset, setProofSourceOffset] = useState<bigint | null>(null);
  const [lockSlot, setLockSlot] = useState<`0x${string}` | null>(null);
  const [verification, setVerification] = useState<VerificationSummary | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [activeFlow, setActiveFlow] = useState<FlowKey>("connect");
  const [busy, setBusy] = useState<FlowKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [proofPipeline, setProofPipeline] = useState<Record<string, StepState>>({});
  const [verifyPipeline, setVerifyPipeline] = useState<Record<string, StepState>>({});

  const selectedSource = useMemo(
    () => config?.sources.find((source) => source.id === selectedSourceId) ?? config?.sources[0] ?? null,
    [config, selectedSourceId],
  );
  const recentFeed = feed.slice(0, 2);

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    if (!selectedSourceId && config?.sources[0]) {
      setSelectedSourceId(config.sources[0].id);
      setActiveFlow("select");
    }
  }, [config, selectedSourceId]);

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
      appendFeed("Demo ready", "Live Ethereum and Base endpoints are online.", "good");
      appendFeed("Source fact loaded", `${payload.sources.length} live Ethereum fact${payload.sources.length === 1 ? "" : "s"} ready.`, "neutral");
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
      setActiveFlow("select");
      appendFeed("Wallet connected", `${truncateAddress(address)} on ${chainName(chainId)}.`, "good");
    } catch (error) {
      handleError("Wallet connection failed.", error, "connect");
    } finally {
      setBusy(null);
    }
  }

  function selectSource(source: DemoSourceFactSnapshot) {
    setSelectedSourceId(source.id);
    setProofBundle(null);
    setProofLatencyMs(null);
    setProofBundleSizeBytes(null);
    setProofSourceBlockNumber(null);
    setProofSourceOffset(null);
    setLockSlot(null);
    setVerification(null);
    setAccessGranted(false);
    setProofPipeline({});
    setVerifyPipeline({});
    setErrorMessage(null);
    setActiveFlow(walletAddress ? "prove" : "select");
    appendFeed("Live fact selected", `${source.label} is staged for proof generation.`, "neutral");
  }

  async function generateProof() {
    if (!selectedSource) return;

    try {
      setBusy("prove");
      setErrorMessage(null);
      setActiveFlow("prove");
      setProofPipeline({});
      appendFeed("Proof request started", `Assembling a fresh bundle for ${selectedSource.label}.`, "neutral");
      await runPipeline(proofPipelineLabels, setProofPipeline, 240);

      const response = await fetch("/api/demo/proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId: selectedSource.id }),
      });

      const payload = (await response.json()) as DemoProofResponse | DemoErrorResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Unknown proof error." : payload.error);
      }

      setProofBundle(deserializeBundle(payload.bundle));
      setLockSlot(payload.lockSlot);
      setProofLatencyMs(payload.proofLatencyMs);
      setProofBundleSizeBytes(payload.proofBundleSizeBytes);
      setProofSourceBlockNumber(BigInt(payload.blockNumber));
      setProofSourceOffset(BigInt(payload.blockOffset));
      setActiveFlow("verify");

      appendFeed(
        "Proof assembled",
        `${payload.proofBundleSizeBytes} bytes from Sepolia block ${payload.blockNumber} in ${payload.proofLatencyMs}ms.`,
        "good",
      );
    } catch (error) {
      handleError("Proof generation failed.", error, "prove");
    } finally {
      setBusy(null);
    }
  }

  async function verifyOnBase() {
    if (!config || !proofBundle || !selectedSource) return;

    try {
      setBusy("verify");
      setErrorMessage(null);
      setActiveFlow("verify");
      appendFeed("Switching to Base", "Preparing the Base verification context.", "neutral");

      const connector = getConnectorClient();
      await ensureChain(connector, baseSepolia);
      setActiveChainId(baseSepolia.id);
      setVerifyPipeline({});
      await runPipeline(verifyPipelineLabels, setVerifyPipeline, 220);

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
        `${selectedSource.label} reconstructed ${formatEther(decoded.amountWei)} ETH from Ethereum state.`,
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
    appendFeed("Builder access unlocked", "Verified Mode is now active on Base.", "good");
  }

  function handleError(prefix: string, error: unknown, flow: FlowKey) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    setErrorMessage(`${prefix} ${message}`);
    appendFeed(prefix, message, "warn");
    setActiveFlow(flow);
  }

  function currentInstruction() {
    if (accessGranted) return "Base accepted the Ethereum fact. The experience is now unlocked.";
    if (!walletAddress) return "Connect a wallet to run the live Base-side verification flow.";
    if (!selectedSource) return "Pick the live Ethereum fact you want to test.";
    if (!proofBundle) return "Generate a fresh bundle from a live Ethereum lock that already exists.";
    if (!verification) return "Verify the bundle on Base and reconstruct the exact locked state.";
    return "Verification passed. Unlock the Base-side result and finish the flow.";
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

    if (!proofBundle) {
      return (
        <button className="lpPrimaryButton" disabled={busy !== null || !selectedSource} onClick={generateProof} type="button">
          {busy === "prove" ? "Generating..." : "Generate live proof"}
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
          Unlock Builder Pass
        </button>
      );
    }

    return (
      <button className="lpPrimaryButton" disabled type="button">
        Builder Pass unlocked
      </button>
    );
  }

  const progressStates = flowSteps.map((step) => {
    if (accessGranted) return { ...step, state: "success" as StepState };
    if (step.key === "connect" && walletAddress) return { ...step, state: "success" as StepState };
    if (step.key === "select" && selectedSource) return { ...step, state: "success" as StepState };
    if (step.key === "prove" && proofBundle) return { ...step, state: "success" as StepState };
    if (step.key === "verify" && verification) return { ...step, state: "success" as StepState };
    if (step.key === "unlock" && accessGranted) return { ...step, state: "success" as StepState };
    if (step.key === activeFlow && busy) return { ...step, state: "active" as StepState };
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
                  {walletAddress ? truncateAddress(walletAddress) : "connect"}
                </button>
              }
            />

            <section className="demoWorkbench">
              <div className="demoTopbar">
                <div className="demoTopbarLabel">
                  <span>live demo</span>
                  <strong>dashboard</strong>
                </div>
                <div className="demoTopbarMeta">
                  <span>{walletAddress ? "wallet live" : "wallet required"}</span>
                  <span>{activeChainId ? chainName(activeChainId) : "no chain selected"}</span>
                </div>
              </div>

              <div className="demoProgress">
                {progressStates.map((step) => (
                  <div className={`demoProgressStep is-${step.state}`} key={step.key}>
                    <span>{step.eyebrow}</span>
                    <strong>{step.label}</strong>
                  </div>
                ))}
              </div>

              <div className="demoAppGrid">
                <section className="demoMarketSurface">
                  <div className="demoFactsTable" role="table" aria-label="Live source facts">
                    <div className="demoFactsHead" role="row">
                      <span>Fact</span>
                      <span>Borrower</span>
                      <span>Locked</span>
                      <span>Status</span>
                      <span />
                    </div>
                    {(config?.sources ?? []).map((source) => {
                      const isSelected = source.id === selectedSource?.id;
                      return (
                        <button
                          className={`demoFactsRow ${isSelected ? "is-selected" : ""}`}
                          key={source.id}
                          onClick={() => selectSource(source)}
                          type="button"
                        >
                          <div className="demoFactsPrimary">
                            <strong>{source.label}</strong>
                            <span>{source.eyebrow}</span>
                          </div>
                          <span>{truncateAddress(source.borrower)}</span>
                          <span>{formatEther(BigInt(source.amountWei))} ETH</span>
                          <span>{statusLabel(source.status)}</span>
                          <span>{isSelected ? "selected" : "choose"}</span>
                        </button>
                      );
                    })}
                  </div>

                  <details className="demoInspect">
                    <summary>Inspect live proof details</summary>
                    <div className="demoInspectGrid">
                      <div>
                        <span>Borrower</span>
                        <strong>{selectedSource?.borrower ?? "—"}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{statusLabel(selectedSource?.status ?? null)}</strong>
                      </div>
                      <div>
                        <span>Vault</span>
                        <strong>{verification?.sourceAccount ?? config?.vaultAddress ?? "—"}</strong>
                      </div>
                      <div>
                        <span>Slot</span>
                        <strong>{verification?.sourceSlot ?? lockSlot ?? "—"}</strong>
                      </div>
                      <div>
                        <span>Offset</span>
                        <strong>{proofSourceOffset ? `${proofSourceOffset.toString()} blocks` : "—"}</strong>
                      </div>
                      <div>
                        <span>Window</span>
                        <strong>{config ? `${config.maxProofAgeSeconds}s` : "—"}</strong>
                      </div>
                    </div>
                    <div className="demoTerminalBlock">
                      <div className="demoTerminalHeader">
                        <span>proof trace</span>
                      </div>
                      <div className="demoTerminalStream">
                        {proofPipelineLabels.map((step, index) => (
                          <TerminalLine
                            key={step}
                            index={index + 1}
                            label={step}
                            state={proofPipeline[step] ?? (proofBundle ? "success" : "pending")}
                          />
                        ))}
                        {verifyPipelineLabels.map((step, index) => (
                          <TerminalLine
                            key={step}
                            index={proofPipelineLabels.length + index + 1}
                            label={step}
                            state={verifyPipeline[step] ?? (verification ? "success" : "pending")}
                          />
                        ))}
                      </div>
                    </div>
                  </details>
                </section>

                <aside className="demoActionPanel">
                  <div className="demoActionPanelHeader">
                    <span>Action</span>
                    <strong>{selectedSource?.label ?? "Select a fact"}</strong>
                  </div>

                  <div className="demoActionNotice">
                    <span>Now</span>
                    <p>{currentInstruction()}</p>
                  </div>

                  <dl className="demoActionStats">
                    <div>
                      <dt>Selected lock</dt>
                      <dd>{selectedSource ? `${formatEther(BigInt(selectedSource.amountWei))} ETH` : "—"}</dd>
                    </div>
                    <div>
                      <dt>Source block</dt>
                      <dd>{proofSourceBlockNumber?.toString() ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Proof latency</dt>
                      <dd>{proofLatencyMs ? `${proofLatencyMs} ms` : "—"}</dd>
                    </div>
                    <div>
                      <dt>Verified result</dt>
                      <dd>{verification ? `${formatEther(verification.amountWei)} ETH` : "Pending"}</dd>
                    </div>
                  </dl>

                  <div className="demoActionRow">
                    {actionButton()}
                    <div className="demoActionMeta" />
                  </div>

                  <div className={`demoUnlock ${accessGranted ? "is-open" : ""}`}>
                    <div className="demoUnlockBadge">{accessGranted ? "verified" : "locked"}</div>
                    <div>
                      <strong>Builder Pass</strong>
                      <p>
                        {accessGranted
                          ? "This wallet now carries a Base-side access state unlocked by Ethereum truth."
                          : "Base unlocks this pass only after the proof is accepted."}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <div className="demoActivityBar" aria-live="polite">
                {recentFeed.map((entry) => (
                  <div className={`demoActivityItem is-${entry.tone}`} key={entry.id}>
                    <strong>{entry.title}</strong>
                    <span>{entry.detail}</span>
                  </div>
                ))}
              </div>
            </section>

            {errorMessage ? <p className="demoError">{errorMessage}</p> : null}
          </div>
        </section>
      </main>
    </>
  );
}

function TerminalLine({
  index,
  label,
  state,
}: {
  index: number;
  label: string;
  state: StepState;
}) {
  return (
    <div className={`demoTerminalLine is-${state}`}>
      <span className="demoTerminalIndex">{String(index).padStart(2, "0")}</span>
      <span className="demoTerminalPrompt">&gt;</span>
      <strong>{label}</strong>
      <span className="demoTerminalState">{state}</span>
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

async function ensureChain(client: ReturnType<typeof createWalletClient>, chain: typeof baseSepolia) {
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
