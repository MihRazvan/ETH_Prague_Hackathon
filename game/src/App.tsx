import { useMachine } from "@xstate/react";
import { useMemo, useState } from "react";

import { GameScene } from "./game/GameScene";
import { INTERACTABLES_BY_ID, type QuestState, QUESTS } from "./game/data";
import { questMachine } from "./game/machine";
import { QuestModal } from "./game/QuestModal";
import { useGameStore } from "./game/store";

const QUEST_ORDER: QuestState[] = [
  "talkKeeper",
  "lockCollateral",
  "meetArchivist",
  "matchBeacon",
  "crossBridge",
  "anchorRoot",
  "verifyHeader",
  "verifyTrie",
  "claimLoan",
  "complete",
];

export default function App() {
  const [state, send] = useMachine(questMachine);
  const questKey = state.value as QuestState;
  const quest = QUESTS[questKey];
  const [modalState, setModalState] = useState<{ interactionId: string; phase: "briefing" | "resolved" } | null>(null);

  const inventory = useGameStore((store) => store.inventory);
  const loanBalance = useGameStore((store) => store.loanBalance);
  const addRewards = useGameStore((store) => store.addRewards);
  const setLoanBalance = useGameStore((store) => store.setLoanBalance);

  const questIndex = useMemo(() => QUEST_ORDER.indexOf(questKey), [questKey]);

  const handleArriveInteraction = (interactionId: string) => {
    setModalState({ interactionId, phase: "briefing" });
  };

  const activeInteraction = modalState ? INTERACTABLES_BY_ID[modalState.interactionId] : null;
  const isCurrentQuest = Boolean(activeInteraction && quest.targetId === activeInteraction.id);

  const handleModalAction = () => {
    if (!activeInteraction || !isCurrentQuest) {
      setModalState(null);
      return;
    }

    if (quest.rewards && quest.rewards.length > 0) {
      addRewards(quest.rewards);
    }

    if (quest.loanAmount) {
      setLoanBalance(quest.loanAmount);
    }

    setModalState({ interactionId: activeInteraction.id, phase: "resolved" });
  };

  const handleModalClose = () => {
    const shouldAdvance = modalState?.phase === "resolved" && isCurrentQuest && questKey !== "complete";
    setModalState(null);

    if (shouldAdvance) {
      send({ type: "ADVANCE" });
    }
  };

  return (
    <main className="game-shell">
      <div className="scene-wrap">
        <GameScene
          currentTargetId={quest.targetId}
          onArriveInteraction={handleArriveInteraction}
          interactionLocked={Boolean(modalState)}
          questIndex={questIndex}
          inventoryCount={inventory.length}
          loanBalance={loanBalance}
        />
      </div>
      <aside className="quest-log">
        <div className="quest-log__frame" />
        <div className="quest-log__crest" />
        <div className="quest-log__steps">
          {QUEST_ORDER.filter((step) => step !== "complete").map((step, index) => {
            const item = QUESTS[step];
            const completed = questIndex > index;
            const active = questKey === step;

            return (
              <div
                key={step}
                className={[
                  "quest-log__step",
                  completed ? "is-complete" : "",
                  active ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="quest-log__index">{completed ? "✓" : active ? "!" : "•"}</span>
                <div className="quest-log__copy">
                  <strong>{item.actionLabel}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
      {activeInteraction && (
        <QuestModal
          interaction={activeInteraction}
          quest={quest}
          phase={modalState?.phase ?? "briefing"}
          isCurrentQuest={isCurrentQuest}
          onAction={handleModalAction}
          onClose={handleModalClose}
        />
      )}
    </main>
  );
}
