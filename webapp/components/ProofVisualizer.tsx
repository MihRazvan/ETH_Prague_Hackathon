const STEP_COPY = [
  ["EIP-4788", "Read the beacon root already exposed on the destination chain."],
  ["Beacon Header", "Rebuild the SSZ root for the supplied beacon header."],
  ["Execution Header", "Verify the execution payload header branch into the beacon body root."],
  ["Account Proof", "Walk the Ethereum state trie to the vault account."],
  ["Storage Proof", "Walk the vault storage trie to the exact borrower slot."],
  ["Freshness", "Reject old proofs before they can back stale collateral."],
];

export function ProofVisualizer() {
  return (
    <div className="panel">
      <h3 className="sectionTitle">Verification Steps</h3>
      <div className="stepList">
        {STEP_COPY.map(([title, body]) => (
          <div className="step" key={title}>
            <strong>{title}</strong>
            <span className="copy">{body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
