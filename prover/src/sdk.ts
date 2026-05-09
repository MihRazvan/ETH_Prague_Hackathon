import { encodeAbiParameters, getAddress, isAddress, keccak256, type Address, type Hex } from "viem";

import { Prover } from "./index.js";
import { BUNDLE_VERSION, serializeBundle, toBundleEnvelope, type ProofBundleEnvelope, type SerializedProofBundle } from "./format.js";
import { resolveProverConfig } from "./presets.js";
import type {
  ElsewareClientConfig,
  PreflightReport,
  ProofBundle,
  ProveMappingValueArgs,
  ProveStorageSlotArgs,
  ProveVaultLockArgs,
  ProverConfig,
} from "./types.js";

export class ElsewareClient {
  readonly #prover: Prover;
  readonly config: ProverConfig;

  constructor(config: ElsewareClientConfig) {
    this.config = resolveProverConfig(config);
    this.#prover = new Prover(this.config);
  }

  proveStorageSlot(args: ProveStorageSlotArgs): Promise<ProofBundle> {
    return this.#prover.proveStorageSlot(args);
  }

  proveMappingValue(args: ProveMappingValueArgs): Promise<ProofBundle> {
    const normalizedAccount = normalizeAddress(args.account);
    const normalizedKey = normalizeAddress(args.keyAddress);
    const slot = computeMappingSlot(normalizedKey, args.mappingSlot ?? 0n);
    return this.proveStorageSlot({
      account: normalizedAccount,
      slot,
      blockNumber: args.blockNumber,
    });
  }

  proveVaultLock(args: ProveVaultLockArgs): Promise<ProofBundle> {
    return this.proveMappingValue({
      account: args.vault,
      keyAddress: args.borrower,
      mappingSlot: args.mappingSlot ?? 0n,
      blockNumber: args.blockNumber,
    });
  }

  computeMappingSlot(address: Address | string, mappingSlot = 0n): Hex {
    const normalized = normalizeAddress(address);
    return computeMappingSlot(normalized, mappingSlot);
  }

  serializeBundle(bundle: ProofBundle): SerializedProofBundle {
    return serializeBundle(bundle);
  }

  toBundleEnvelope(bundle: ProofBundle): ProofBundleEnvelope {
    return toBundleEnvelope(bundle);
  }

  get bundleVersion(): typeof BUNDLE_VERSION {
    return BUNDLE_VERSION;
  }

  async preflight(): Promise<PreflightReport> {
    return this.#prover.preflight();
  }
}

export function createElsewareClient(config: ElsewareClientConfig): ElsewareClient {
  return new ElsewareClient(config);
}

export function computeMappingSlot(address: Address, mappingSlot = 0n): Hex {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [address, mappingSlot],
  );
  return keccak256(encoded);
}

function normalizeAddress(value: Address | string): Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return getAddress(value);
}
