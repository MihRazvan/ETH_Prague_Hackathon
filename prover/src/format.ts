import type { ProofBundle } from "./types.js";

export const BUNDLE_VERSION = 1 as const;

export type SerializedExecutionPayloadHeader = {
  [K in keyof ProofBundle["executionHeader"]]: ProofBundle["executionHeader"][K] extends bigint
    ? string
    : ProofBundle["executionHeader"][K];
};

export interface SerializedProofBundle
  extends Omit<ProofBundle, "timestamp" | "slot" | "proposerIndex" | "executionPayloadGIndex" | "executionHeader"> {
  timestamp: string;
  slot: string;
  proposerIndex: string;
  executionPayloadGIndex: string;
  executionHeader: SerializedExecutionPayloadHeader;
}

export interface ProofBundleEnvelope {
  bundleVersion: typeof BUNDLE_VERSION;
  bundle: SerializedProofBundle;
}

export function serializeBundle(bundle: ProofBundle): SerializedProofBundle {
  return JSON.parse(
    JSON.stringify(bundle, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as SerializedProofBundle;
}

export function toBundleEnvelope(bundle: ProofBundle): ProofBundleEnvelope {
  return {
    bundleVersion: BUNDLE_VERSION,
    bundle: serializeBundle(bundle),
  };
}

export function serializeUnknown<T>(payload: T): T {
  return JSON.parse(
    JSON.stringify(payload, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
  ) as T;
}
