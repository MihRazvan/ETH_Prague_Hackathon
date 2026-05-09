import Link from "next/link";

import { ChainStatus } from "../components/ChainStatus";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <span className="badge">ETHPrague Core Track</span>
        <h1 className="title">Trustless cross-chain reads, anchored by Ethereum itself.</h1>
        <p className="subtitle">
          This demo repo ships a Solidity verifier, a TypeScript proof bundle builder, and a thin
          UI for showing how Base can verify Ethereum storage directly through EIP-4788, SSZ, and
          Merkle Patricia proofs.
        </p>
        <div className="ctaRow">
          <Link className="button" href="/playground">
            Open Verifier Playground
          </Link>
          <Link className="button secondary" href="/lending">
            Open Lending Demo
          </Link>
        </div>
      </section>

      <div style={{ height: 20 }} />

      <div className="grid two">
        <ChainStatus source="Ethereum Sepolia" destination="Base Sepolia" anchor="EIP-4788 beacon roots" />

        <div className="panel">
          <h3 className="sectionTitle">Why it matters</h3>
          <p className="copy">
            The demo keeps collateral on Ethereum and verifies it from Base without relayers,
            multisigs, or oracle committees. The trust assumption moves from operators to proofs.
          </p>
          <div className="metrics">
            <div className="metric">
              <span>Contracts</span>
              <strong>Vault + Lender + Verifier</strong>
            </div>
            <div className="metric">
              <span>Trust anchor</span>
              <strong>Beacon root</strong>
            </div>
            <div className="metric">
              <span>Surface</span>
              <strong>No relayer service</strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
