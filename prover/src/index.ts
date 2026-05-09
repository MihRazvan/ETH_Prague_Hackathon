import { EthereumRpcClient } from "./eth-getProof.js";
import { BeaconApiClient } from "./beacon-fetch.js";
import { assembleBundle } from "./bundle.js";
import type { ProofBundle, ProveStorageSlotArgs, ProverConfig } from "./types.js";

export * from "./types.js";

export class Prover {
  readonly #eth: EthereumRpcClient;
  readonly #beacon: BeaconApiClient;

  constructor(config: ProverConfig) {
    this.#eth = new EthereumRpcClient(config.ethRpcUrl);
    this.#beacon = new BeaconApiClient(config);
  }

  async proveStorageSlot(args: ProveStorageSlotArgs): Promise<ProofBundle> {
    const blockNumber = args.blockNumber ?? (await this.#eth.getBlockNumber());
    const block = await this.#eth.getBlockByNumber(blockNumber);
    const ethProof = await this.#eth.getProof(args.account, args.slot, blockNumber);
    const anchor = await this.#beacon.findExecutionAnchor(block.hash);

    return assembleBundle(
      {
        ...args,
        blockNumber,
      },
      anchor,
      ethProof,
    );
  }
}
