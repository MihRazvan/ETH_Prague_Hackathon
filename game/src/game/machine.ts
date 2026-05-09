import { createMachine } from "xstate";

export const questMachine = createMachine({
  id: "proofJourney",
  initial: "talkKeeper",
  states: {
    talkKeeper: {
      on: {
        ADVANCE: "lockCollateral",
        RESET: "talkKeeper",
      },
    },
    lockCollateral: {
      on: {
        ADVANCE: "meetArchivist",
        RESET: "talkKeeper",
      },
    },
    meetArchivist: {
      on: {
        ADVANCE: "matchBeacon",
        RESET: "talkKeeper",
      },
    },
    matchBeacon: {
      on: {
        ADVANCE: "crossBridge",
        RESET: "talkKeeper",
      },
    },
    crossBridge: {
      on: {
        ADVANCE: "anchorRoot",
        RESET: "talkKeeper",
      },
    },
    anchorRoot: {
      on: {
        ADVANCE: "verifyHeader",
        RESET: "talkKeeper",
      },
    },
    verifyHeader: {
      on: {
        ADVANCE: "verifyTrie",
        RESET: "talkKeeper",
      },
    },
    verifyTrie: {
      on: {
        ADVANCE: "claimLoan",
        RESET: "talkKeeper",
      },
    },
    claimLoan: {
      on: {
        ADVANCE: "complete",
        RESET: "talkKeeper",
      },
    },
    complete: {
      on: {
        RESET: "talkKeeper",
      },
    },
  },
});
