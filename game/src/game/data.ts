export type Vec3 = [number, number, number];

export type QuestState =
  | "talkKeeper"
  | "lockCollateral"
  | "meetArchivist"
  | "matchBeacon"
  | "crossBridge"
  | "anchorRoot"
  | "verifyHeader"
  | "verifyTrie"
  | "claimLoan"
  | "complete";

export type InteractableType = "npc" | "vault" | "archive" | "gate" | "shrine" | "hall" | "keep" | "lender";

export interface InteractableDefinition {
  id: string;
  name: string;
  title: string;
  type: InteractableType;
  zone: "winter" | "summer" | "neutral";
  position: Vec3;
  markerOffset?: Vec3;
  markerRings?: [number, number];
  beaconHeight?: number;
  clickRadius?: number;
  accent: string;
  description: string;
}

export interface DialoguePayload {
  title: string;
  speaker: string;
  lines: string[];
  tone: "winter" | "summer" | "neutral";
}

export interface QuestDefinition {
  state: QuestState;
  chapter: "Winter / Ethereum" | "Courier / Offchain" | "Summer / Base";
  title: string;
  objective: string;
  targetId: string | null;
  actionLabel: string;
  meaning: string;
  blockedLine: string;
  success: DialoguePayload;
  rewards?: string[];
  loanAmount?: number;
}

export const HERO_START: Vec3 = [-22, 0, 8];

export const INTERACTABLES: InteractableDefinition[] = [
  {
    id: "vault_keeper",
    name: "Vault Keeper",
    title: "Keeper of Origin",
    type: "npc",
    zone: "winter",
    position: [-18, 0, -4],
    markerOffset: [0, 0, -0.2],
    markerRings: [1.35, 1.8],
    beaconHeight: 4.4,
    clickRadius: 1.9,
    accent: "#9ad7ff",
    description: "Explains how truth begins on Ethereum.",
  },
  {
    id: "frozen_vault",
    name: "Frozen Vault",
    title: "Collateral Chamber",
    type: "vault",
    zone: "winter",
    position: [-12, 0, 5],
    markerOffset: [0, 0, 0.45],
    markerRings: [1.8, 2.3],
    beaconHeight: 5.5,
    clickRadius: 2.2,
    accent: "#b7f1ff",
    description: "Where the lock record is created and stored.",
  },
  {
    id: "archivist",
    name: "Archivist",
    title: "Proof Gatherer",
    type: "npc",
    zone: "winter",
    position: [-7, 0, -8],
    markerOffset: [0, 0, -0.15],
    markerRings: [1.35, 1.8],
    beaconHeight: 4.4,
    clickRadius: 1.9,
    accent: "#8be0d1",
    description: "Collects the account proof and storage proof.",
  },
  {
    id: "beacon_archive",
    name: "Beacon Archive",
    title: "Consensus Observatory",
    type: "archive",
    zone: "winter",
    position: [-1, 0, 2],
    markerOffset: [0, 0, 0.25],
    markerRings: [1.75, 2.2],
    beaconHeight: 5.8,
    clickRadius: 2.2,
    accent: "#9eb2ff",
    description: "Matches the execution block into the beacon chronicle.",
  },
  {
    id: "solstice_bridge",
    name: "Relay Ruin",
    title: "Broken Bridge",
    type: "gate",
    zone: "neutral",
    position: [5, 0, 0],
    markerOffset: [0, 0, 0],
    markerRings: [2.4, 3.1],
    beaconHeight: 4.9,
    clickRadius: 3,
    accent: "#f1df96",
    description: "A shattered bridge that proves this journey is not message passing.",
  },
  {
    id: "anchor_shrine",
    name: "Anchor Shrine",
    title: "EIP-4788 Anchor",
    type: "shrine",
    zone: "summer",
    position: [11, 0, -5],
    markerOffset: [0, 0, 0.45],
    markerRings: [1.75, 2.2],
    beaconHeight: 5.7,
    clickRadius: 2.2,
    accent: "#ffd36d",
    description: "Reads Base's local beacon root anchor.",
  },
  {
    id: "header_hall",
    name: "Header Hall",
    title: "Header Tribunal",
    type: "hall",
    zone: "summer",
    position: [16, 0, 5],
    markerOffset: [0.15, 0, -0.15],
    markerRings: [1.95, 2.45],
    beaconHeight: 5.6,
    clickRadius: 2.4,
    accent: "#ffb55e",
    description: "Verifies the beacon header and SSZ payload branch.",
  },
  {
    id: "trie_keep",
    name: "Trie Keep",
    title: "State Root Bastion",
    type: "keep",
    zone: "summer",
    position: [21, 0, -7],
    markerOffset: [-0.2, 0, 0.1],
    markerRings: [1.95, 2.5],
    beaconHeight: 5.7,
    clickRadius: 2.45,
    accent: "#ff9966",
    description: "Walks the account trie and storage trie onchain.",
  },
  {
    id: "sun_lender",
    name: "Sun Lender",
    title: "Summer Credit Court",
    type: "lender",
    zone: "summer",
    position: [26, 0, 2],
    markerOffset: [0.55, 0, 0.1],
    markerRings: [1.95, 2.45],
    beaconHeight: 5.3,
    clickRadius: 2.35,
    accent: "#ffe08a",
    description: "Issues the loan after verification is complete.",
  },
];

export const INTERACTABLES_BY_ID = Object.fromEntries(INTERACTABLES.map((item) => [item.id, item])) as Record<
  string,
  InteractableDefinition
>;

export const QUESTS: Record<QuestState, QuestDefinition> = {
  talkKeeper: {
    state: "talkKeeper",
    chapter: "Winter / Ethereum",
    title: "Seek the Keeper of Origin",
    objective: "Speak to the Vault Keeper to learn where the original truth is born.",
    targetId: "vault_keeper",
    actionLabel: "Hear the origin",
    meaning: "Ethereum is the source world. The original fact must be created there before anything can ever be proven elsewhere.",
    blockedLine: "The Keeper of Origin should explain why Winter is the source of truth.",
    success: {
      title: "Truth Begins In Winter",
      speaker: "Vault Keeper",
      tone: "winter",
      lines: [
        "Collateral does not begin on Base. It begins here, inside Ethereum's cold vaults.",
        "Your journey is to carry evidence of that truth, not a promise or signature.",
      ],
    },
  },
  lockCollateral: {
    state: "lockCollateral",
    chapter: "Winter / Ethereum",
    title: "Lock the Collateral",
    objective: "Activate the Frozen Vault to create the lock record in Ethereum storage.",
    targetId: "frozen_vault",
    actionLabel: "Lock collateral",
    meaning: "The vault writes a specific storage slot. That slot is the fact the verifier will later recover and trustlessly check.",
    blockedLine: "The collateral chamber comes next. We need the original slot value before any proof can exist.",
    rewards: ["Lock Record"],
    success: {
      title: "Collateral Bound To Storage",
      speaker: "Frozen Vault",
      tone: "winter",
      lines: [
        "The lock is now written into one exact storage slot.",
        "That slot is the truth your proof will later recover on Base.",
      ],
    },
  },
  meetArchivist: {
    state: "meetArchivist",
    chapter: "Winter / Ethereum",
    title: "Gather The Trie Evidence",
    objective: "Meet the Archivist and gather the account proof plus the storage proof.",
    targetId: "archivist",
    actionLabel: "Assemble the proofs",
    meaning: "The offchain prover does not create truth. It only gathers the account and storage evidence needed for onchain verification.",
    blockedLine: "Find the Proof Gatherer. Offchain code must collect the trie evidence before Summer can inspect it.",
    rewards: ["Account Proof", "Storage Proof"],
    success: {
      title: "Evidence, Not Trust",
      speaker: "Archivist",
      tone: "winter",
      lines: [
        "I have fetched the account proof and storage proof from Ethereum.",
        "These scrolls do not ask Summer to trust us. They let Summer verify the path itself.",
      ],
    },
  },
  matchBeacon: {
    state: "matchBeacon",
    chapter: "Winter / Ethereum",
    title: "Match Consensus To Execution",
    objective: "Awaken the Beacon Archive to match the execution block into the beacon chronicle.",
    targetId: "beacon_archive",
    actionLabel: "Match the beacon block",
    meaning: "The prover must find the beacon block whose execution payload header matches the source execution block, then build the SSZ branch.",
    blockedLine: "The Consensus Observatory must bless the block before the courier can depart.",
    rewards: ["Beacon Branch"],
    success: {
      title: "The Chronicle Agrees",
      speaker: "Beacon Archive",
      tone: "winter",
      lines: [
        "The execution block has been matched into Ethereum consensus.",
        "You now carry the SSZ branch proving the payload belongs to the beacon body.",
      ],
    },
  },
  crossBridge: {
    state: "crossBridge",
    chapter: "Courier / Offchain",
    title: "Cast The Bundle Across",
    objective: "Reject the broken bridge and send the proof bundle across the void without relaying a trusted message.",
    targetId: "solstice_bridge",
    actionLabel: "Transfer the proof bundle",
    meaning: "This is not a bridge and not a relayed message. Offchain only packages evidence and launches it toward Summer for local verification.",
    blockedLine: "The old bridge is dead. Use the courier transfer instead of trusting a message path.",
    rewards: ["Proof Bundle"],
    success: {
      title: "No Bridge, Only Evidence",
      speaker: "Relay Ruin",
      tone: "neutral",
      lines: [
        "The bundle crossed despite the bridge being broken because nothing is being bridged here.",
        "Offchain code launched evidence only. Summer will still decide truth locally onchain.",
      ],
    },
  },
  anchorRoot: {
    state: "anchorRoot",
    chapter: "Summer / Base",
    title: "Awaken The Local Anchor",
    objective: "Activate the Anchor Shrine so Summer can read its own beacon-root trust anchor.",
    targetId: "anchor_shrine",
    actionLabel: "Read the anchor root",
    meaning: "Base already stores the beacon root locally via EIP-4788. The verifier starts by reading that local anchor instead of trusting a relayed message.",
    blockedLine: "The EIP-4788 Anchor must wake first. Summer trusts its own protocol root before anything else.",
    success: {
      title: "Summer Reads Its Own Anchor",
      speaker: "Anchor Shrine",
      tone: "summer",
      lines: [
        "The local beacon root has been recovered from Summer itself.",
        "No oracle vouched for it. The destination chain already holds this anchor natively.",
      ],
    },
  },
  verifyHeader: {
    state: "verifyHeader",
    chapter: "Summer / Base",
    title: "Judge The Header Branch",
    objective: "Open the Header Hall and verify the beacon header plus the SSZ payload branch.",
    targetId: "header_hall",
    actionLabel: "Verify the header branch",
    meaning: "Solidity recomputes the beacon header root and verifies the execution payload branch to bind the execution state into Ethereum consensus.",
    blockedLine: "The Header Tribunal is the next gate. Summer must verify the beacon root and SSZ branch locally.",
    success: {
      title: "Consensus Path Confirmed",
      speaker: "Header Hall",
      tone: "summer",
      lines: [
        "The beacon header root matches the local anchor.",
        "The execution payload branch has been walked and Summer now trusts the execution state root.",
      ],
    },
  },
  verifyTrie: {
    state: "verifyTrie",
    chapter: "Summer / Base",
    title: "Walk The Tries",
    objective: "Enter the Trie Keep and verify the account proof plus storage proof onchain.",
    targetId: "trie_keep",
    actionLabel: "Walk the tries",
    meaning: "The verifier walks the account trie to recover the contract storage root, then walks the storage trie to recover the exact slot value.",
    blockedLine: "Only the State Root Bastion can open the real account and storage paths.",
    success: {
      title: "The Slot Value Is Proven",
      speaker: "Trie Keep",
      tone: "summer",
      lines: [
        "Summer has recovered the real contract account, then the exact storage slot.",
        "The fact from Winter is now proven onchain in Summer without trusting a relayer.",
      ],
    },
  },
  claimLoan: {
    state: "claimLoan",
    chapter: "Summer / Base",
    title: "Claim The Loan",
    objective: "Speak to the Sun Lender and receive funds now that the collateral fact is proven.",
    targetId: "sun_lender",
    actionLabel: "Issue the loan",
    meaning: "The lender is not the verifier. It simply uses the verified slot value to apply lending rules and issue funds.",
    blockedLine: "The Credit Court only opens once every prior verification gate is complete.",
    loanAmount: 50000,
    success: {
      title: "Funds Released",
      speaker: "Sun Lender",
      tone: "summer",
      lines: [
        "The collateral proof is accepted. The loan can now be issued on Base.",
        "Business logic happens only after cryptographic verification is complete.",
      ],
    },
  },
  complete: {
    state: "complete",
    chapter: "Summer / Base",
    title: "The Proof Journey Is Complete",
    objective: "Roam the map, revisit the landmarks, and explain the system back to the next judge.",
    targetId: null,
    actionLabel: "Continue",
    meaning: "You have seen the full path: Ethereum creates the fact, TypeScript gathers evidence, Base verifies it, and the lender acts only after truth is proven.",
    blockedLine: "You have already completed the journey. Now the map is yours to review.",
    success: {
      title: "Victory",
      speaker: "Summer Credit Court",
      tone: "summer",
      lines: [
        "You now understand the proof flow well enough to teach it.",
        "Winter creates the truth. Offchain carries evidence. Summer verifies locally. Then lending becomes safe.",
      ],
    },
  },
};

export const WELCOME_DIALOGUE: DialoguePayload = {
  title: "The Two-Season Trial",
  speaker: "Game Master",
  tone: "neutral",
  lines: [
    "Play through Winter and Summer to understand exactly how the proof flow works.",
    "Move by clicking the ground or a landmark. Complete each quest and the final loan will unlock in Summer.",
  ],
};
