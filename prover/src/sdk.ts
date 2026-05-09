import { encodeAbiParameters, getAddress, isAddress, keccak256, type Address, type Hex } from "viem";

import { Prover } from "./index.js";
import type { PreflightReport, ProofBundle, ProveStorageSlotArgs, ProverConfig } from "./types.js";

export class ElsewareClient {
  readonly #prover: Prover;

  constructor(private readonly config: ProverConfig) {
    this.#prover = new Prover(config);
  }

  proveStorageSlot(args: ProveStorageSlotArgs): Promise<ProofBundle> {
    return this.#prover.proveStorageSlot(args);
  }

  computeMappingSlot(address: Address | string, mappingSlot = 0n): Hex {
    const normalized = normalizeAddress(address);
    return computeMappingSlot(normalized, mappingSlot);
  }

  async preflight(): Promise<PreflightReport> {
    return this.#prover.preflight();
  }
}

export function createElsewareClient(config: ProverConfig): ElsewareClient {
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
