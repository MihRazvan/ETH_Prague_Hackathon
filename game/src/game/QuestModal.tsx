import { type InteractableDefinition, type QuestDefinition } from "./data";

interface QuestModalProps {
  interaction: InteractableDefinition;
  quest: QuestDefinition;
  phase: "briefing" | "resolved";
  isCurrentQuest: boolean;
  onAction: () => void;
  onClose: () => void;
}

export function QuestModal({ interaction, quest, phase, isCurrentQuest, onAction, onClose }: QuestModalProps) {
  const title = phase === "resolved" && isCurrentQuest ? quest.success.title : interaction.name;
  const speaker = phase === "resolved" && isCurrentQuest ? quest.success.speaker : interaction.title;
  const lines =
    phase === "resolved" && isCurrentQuest
      ? quest.success.lines
      : isCurrentQuest
        ? [quest.objective, quest.meaning]
        : [interaction.description, quest.blockedLine];
  const tone = phase === "resolved" && isCurrentQuest ? quest.success.tone : interaction.zone === "winter" ? "winter" : interaction.zone === "summer" ? "summer" : "neutral";
  const buttonLabel =
    phase === "resolved"
      ? isCurrentQuest
        ? quest.state === "claimLoan"
          ? "Take the funds"
          : "Continue the ritual"
        : "Return"
        : isCurrentQuest
          ? quest.actionLabel
          : "Return";
  const actionLines =
    phase === "resolved" && isCurrentQuest
      ? lines
      : isCurrentQuest
        ? [quest.meaning]
        : [quest.blockedLine];

  return (
    <div className="modal-backdrop">
      <div className={`quest-modal tone-${tone}`}>
        <div className="modal-topline">
          <div className="modal-glyph" />
          <div>
            <p className="modal-speaker">{speaker}</p>
            <h2 className="modal-title">{title}</h2>
          </div>
        </div>
        <div className="modal-lines">
          {actionLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="modal-actions">
          {phase === "resolved" ? (
            <button className="modal-button primary" onClick={onClose} type="button">
              {buttonLabel}
            </button>
          ) : (
            <>
              <button className="modal-button primary" onClick={onAction} type="button">
                {buttonLabel}
              </button>
              <button className="modal-button secondary" onClick={onClose} type="button">
                Leave
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
