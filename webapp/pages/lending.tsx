import { ChainStatus } from "../components/ChainStatus";
import { ProofVisualizer } from "../components/ProofVisualizer";

export default function LendingPage() {
  return (
    <main>
      <section className="hero">
        <span className="badge">Lending Demo</span>
        <h1 className="title">Lock on Ethereum. Borrow on Base. No bridge in the middle.</h1>
        <p className="subtitle">
          This flow is intentionally narrow and demo-friendly: one vault slot per borrower, one
          lender contract on Base, and a mock USDC token minted against a verified lock.
        </p>
      </section>

      <div style={{ height: 20 }} />

      <div className="grid two">
        <div className="panel">
          <h3 className="sectionTitle">Operator Flow</h3>
          <div className="stepList">
            <div className="step">
              <strong>1. Lock</strong>
              <span className="copy">Deposit ETH into the Sepolia vault and capture the borrower slot.</span>
            </div>
            <div className="step">
              <strong>2. Borrow</strong>
              <span className="copy">Generate a proof bundle, verify it on Base, and mint demo USDC.</span>
            </div>
            <div className="step">
              <strong>3. Repay</strong>
              <span className="copy">Burn the borrowed demo USDC before settlement.</span>
            </div>
            <div className="step">
              <strong>4. Settle</strong>
              <span className="copy">Unlock on Sepolia, prove the released state, and close the loan.</span>
            </div>
          </div>
          <div className="metrics">
            <div className="metric">
              <span>LTV</span>
              <strong>50%</strong>
            </div>
            <div className="metric">
              <span>Token</span>
              <strong>hUSDC</strong>
            </div>
            <div className="metric">
              <span>Lock format</span>
              <strong>Packed slot</strong>
            </div>
          </div>
        </div>

        <ProofVisualizer />
      </div>

      <div style={{ height: 20 }} />
      <ChainStatus source="Sepolia vault" destination="Base lender" anchor="Beacon root + SSZ + MPT" />
    </main>
  );
}
