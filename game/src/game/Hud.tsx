import type { DialoguePayload, QuestDefinition } from "./data";

interface HudProps {
  quest: QuestDefinition;
  dialogue: DialoguePayload | null;
  inventory: string[];
  loanBalance: number;
  onCloseDialogue: () => void;
  onReset: () => void;
}

export function Hud({ quest, dialogue, inventory, loanBalance, onCloseDialogue, onReset }: HudProps) {
  return (
    <div className="hud-root">
      <section className="hud-panel hud-objective">
        <p className="eyebrow">{quest.chapter}</p>
        <h1>{quest.title}</h1>
        <p className="body-copy">{quest.objective}</p>
        <div className="meaning-block">
          <span className="meaning-label">What this means</span>
          <p>{quest.meaning}</p>
        </div>
      </section>

      <section className="hud-panel hud-inventory">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Collected Proof Artifacts</p>
            <h2>Inventory</h2>
          </div>
          <button className="secondary-button" onClick={onReset} type="button">
            Restart Journey
          </button>
        </div>
        <div className="artifact-grid">
          {inventory.length === 0 ? (
            <div className="artifact-card artifact-empty">No artifacts collected yet.</div>
          ) : (
            inventory.map((artifact) => (
              <div className="artifact-card" key={artifact}>
                {artifact}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="hud-panel hud-status">
        <div className="status-card">
          <p className="eyebrow">Loan Status</p>
          <h2>{loanBalance > 0 ? "Disbursed" : "Locked"}</h2>
          <p className="metric">{loanBalance > 0 ? `${loanBalance.toLocaleString()} hUSDC minted` : "Awaiting final tribunal"}</p>
        </div>
        <div className="status-card">
          <p className="eyebrow">Controls</p>
          <p className="body-copy compact">
            Click the ground to move.
            <br />
            Click glowing landmarks to pursue the current quest.
            <br />
            Read the dialogue to learn what each step means.
          </p>
        </div>
      </section>

      {dialogue && (
        <section className={`dialogue-panel tone-${dialogue.tone}`}>
          <div className="dialogue-meta">
            <p className="eyebrow">{dialogue.speaker}</p>
            <h2>{dialogue.title}</h2>
          </div>
          <div className="dialogue-lines">
            {dialogue.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <button className="primary-button" onClick={onCloseDialogue} type="button">
            Continue
          </button>
        </section>
      )}
    </div>
  );
}
