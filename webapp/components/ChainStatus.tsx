type ChainStatusProps = {
  source: string;
  destination: string;
  anchor: string;
};

export function ChainStatus({ source, destination, anchor }: ChainStatusProps) {
  return (
    <div className="panel">
      <h3 className="sectionTitle">Chain Status</h3>
      <div className="statusRow">
        <div className="statusPill good">Source: {source}</div>
        <div className="statusPill good">Destination: {destination}</div>
        <div className="statusPill warn">Anchor: {anchor}</div>
      </div>
    </div>
  );
}
