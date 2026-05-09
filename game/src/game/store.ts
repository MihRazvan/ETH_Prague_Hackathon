import { create } from "zustand";

import { type DialoguePayload, HERO_START, type Vec3 } from "./data";

interface GameStore {
  heroPosition: Vec3;
  targetPosition: Vec3 | null;
  pendingInteractionId: string | null;
  dialogue: DialoguePayload | null;
  inventory: string[];
  loanBalance: number;
  setHeroPosition: (position: Vec3) => void;
  setMoveTarget: (position: Vec3) => void;
  queueInteraction: (id: string, position: Vec3) => void;
  clearMoveTarget: () => void;
  clearPendingInteraction: () => void;
  openDialogue: (dialogue: DialoguePayload) => void;
  closeDialogue: () => void;
  addRewards: (items: string[]) => void;
  setLoanBalance: (amount: number) => void;
  resetRun: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  heroPosition: HERO_START,
  targetPosition: null,
  pendingInteractionId: null,
  dialogue: null,
  inventory: [],
  loanBalance: 0,
  setHeroPosition: (position) => set({ heroPosition: position }),
  setMoveTarget: (position) => set({ targetPosition: position, pendingInteractionId: null }),
  queueInteraction: (id, position) => set({ targetPosition: position, pendingInteractionId: id }),
  clearMoveTarget: () => set({ targetPosition: null }),
  clearPendingInteraction: () => set({ pendingInteractionId: null }),
  openDialogue: (dialogue) => set({ dialogue }),
  closeDialogue: () => set({ dialogue: null }),
  addRewards: (items) =>
    set((state) => ({
      inventory: Array.from(new Set([...state.inventory, ...items])),
    })),
  setLoanBalance: (amount) => set({ loanBalance: amount }),
  resetRun: () =>
    set({
      heroPosition: HERO_START,
      targetPosition: null,
      pendingInteractionId: null,
      dialogue: null,
      inventory: [],
      loanBalance: 0,
    }),
}));
