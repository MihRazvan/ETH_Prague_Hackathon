import { Tree } from "@chainsafe/persistent-merkle-tree";
import { ssz as denebSsz } from "@lodestar/types/deneb";
import { ssz as electraSsz } from "@lodestar/types/electra";
import { bytesToHex } from "viem";

type ProofResult = {
  gindex: bigint;
  proof: `0x${string}`[];
};

type JsonLike = Record<string, unknown>;

const BODY_TYPES = {
  deneb: denebSsz.BlindedBeaconBlockBody,
  electra: electraSsz.BlindedBeaconBlockBody,
  fulu: electraSsz.BlindedBeaconBlockBody,
} as const;

export async function buildExecutionPayloadProof(
  version: "deneb" | "electra" | "fulu",
  body: JsonLike,
): Promise<ProofResult> {
  const bodyType = BODY_TYPES[version] as any;
  const bodyValue = bodyType.fromJson(body);
  const view = bodyType.toViewDU(bodyValue);
  const gindex = bodyType.getPropertyGindex("executionPayloadHeader") as bigint | null;
  if (gindex === null) {
    throw new Error(`Could not resolve executionPayloadHeader gindex for ${version}`);
  }

  const tree = new Tree(view.node);
  const proof = tree.getSingleProof(gindex).map((node: Uint8Array) => bytesToHex(node));

  return { gindex, proof };
}
