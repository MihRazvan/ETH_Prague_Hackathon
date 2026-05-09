import { ChainStatus } from "../components/ChainStatus";
import { ProofVisualizer } from "../components/ProofVisualizer";

export default function PlaygroundPage() {
  return (
    <main>
      <section className="hero">
        <span className="badge">Verifier Playground</span>
        <h1 className="title">Pick a slot. Build a proof. Verify it on-chain.</h1>
        <p className="subtitle">
          The playground is the credibility demo: judges can point at a Sepolia contract slot and
          see each verification stage the Base-side verifier is expected to pass.
        </p>
      </section>

      <div style={{ height: 20 }} />

      <div className="grid two">
        <div className="panel">
          <h3 className="sectionTitle">Proof Inputs</h3>
          <div className="field">
            <label>Contract address</label>
            <input defaultValue="0xVaultContractAddress" />
          </div>
          <div className="field">
            <label>Storage slot key</label>
            <input defaultValue="0x..." />
          </div>
          <div className="field">
            <label>Execution block number</label>
            <input defaultValue="10821243" />
          </div>
          <div className="ctaRow">
            <button className="button" type="button">
              Generate Proof
            </button>
            <button className="button secondary" type="button">
              Verify On-Chain
            </button>
          </div>
          <div className="metrics">
            <div className="metric">
              <span>Expected proof size</span>
              <strong>12-20 KB</strong>
            </div>
            <div className="metric">
              <span>Anchor source</span>
              <strong>Beacon blinded block</strong>
            </div>
            <div className="metric">
              <span>Freshness gate</span>
              <strong>1 hour</strong>
            </div>
          </div>
        </div>

        <ProofVisualizer />
      </div>

      <div style={{ height: 20 }} />
      <ChainStatus source="Ethereum Sepolia RPC" destination="Base Sepolia verifier" anchor="Public beacon API + EIP-4788" />
    </main>
  );
}
