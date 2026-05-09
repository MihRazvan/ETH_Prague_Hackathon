import { type Hex } from "viem";

import type {
  BeaconExecutionAnchor,
  BeaconHeader,
  ExecutionPayloadHeader,
  ProverConfig,
} from "./types.js";
import { buildExecutionPayloadProof } from "./ssz-prove.js";

interface BeaconHeaderResponse {
  data: {
    root: Hex;
    header: {
      message: {
        slot: string;
        proposer_index: string;
        parent_root: Hex;
        state_root: Hex;
        body_root: Hex;
      };
    };
  };
}

interface BlindedBlockResponse {
  version: "deneb" | "electra" | "fulu";
  data: {
    message: {
      slot: string;
      proposer_index: string;
      parent_root: Hex;
      state_root: Hex;
      body: {
        execution_payload_header: {
          parent_hash: Hex;
          fee_recipient: Hex;
          state_root: Hex;
          receipts_root: Hex;
          logs_bloom: Hex;
          prev_randao: Hex;
          block_number: string;
          gas_limit: string;
          gas_used: string;
          timestamp: string;
          extra_data: Hex;
          base_fee_per_gas: string;
          block_hash: Hex;
          transactions_root: Hex;
          withdrawals_root: Hex;
          blob_gas_used?: string;
          excess_blob_gas?: string;
        };
        [key: string]: unknown;
      };
    };
  };
}

export class BeaconApiClient {
  readonly #searchWindowSlots: number;

  constructor(private readonly config: ProverConfig) {
    this.#searchWindowSlots = config.searchWindowSlots ?? 96;
  }

  async findExecutionAnchor(blockHash: Hex): Promise<BeaconExecutionAnchor> {
    const head = await this.#fetchJson<BeaconHeaderResponse>("/eth/v1/beacon/headers/head");
    const headSlot = BigInt(head.data.header.message.slot);

    for (let offset = 0; offset < this.#searchWindowSlots; offset++) {
      const slot = headSlot - BigInt(offset);
      const block = await this.#fetchJson<BlindedBlockResponse>(`/eth/v1/beacon/blinded_blocks/${slot.toString()}`);
      const executionHeader = this.#parseExecutionHeader(block.data.message.body.execution_payload_header);

      if (executionHeader.blockHash.toLowerCase() !== blockHash.toLowerCase()) {
        continue;
      }

      const header = await this.#fetchHeader(slot.toString());
      const { gindex, proof } = await buildExecutionPayloadProof(block.version, block.data.message.body);

      return {
        header,
        executionHeader,
        executionPayloadGIndex: gindex,
        executionHeaderProof: proof,
      };
    }

    throw new Error(
      `Could not find beacon block for execution block ${blockHash} within the last ${this.#searchWindowSlots} slots`,
    );
  }

  async #fetchHeader(blockId: string): Promise<BeaconHeader> {
    const header = await this.#fetchJson<BeaconHeaderResponse>(`/eth/v1/beacon/headers/${blockId}`);
    return {
      root: header.data.root,
      slot: BigInt(header.data.header.message.slot),
      proposerIndex: BigInt(header.data.header.message.proposer_index),
      parentRoot: header.data.header.message.parent_root,
      stateRoot: header.data.header.message.state_root,
      bodyRoot: header.data.header.message.body_root,
    };
  }

  #parseExecutionHeader(payload: BlindedBlockResponse["data"]["message"]["body"]["execution_payload_header"]): ExecutionPayloadHeader {
    return {
      parentHash: payload.parent_hash,
      feeRecipient: payload.fee_recipient,
      stateRoot: payload.state_root,
      receiptsRoot: payload.receipts_root,
      logsBloom: payload.logs_bloom,
      prevRandao: payload.prev_randao,
      blockNumber: BigInt(payload.block_number),
      gasLimit: BigInt(payload.gas_limit),
      gasUsed: BigInt(payload.gas_used),
      timestamp: BigInt(payload.timestamp),
      extraData: payload.extra_data,
      baseFeePerGas: BigInt(payload.base_fee_per_gas),
      blockHash: payload.block_hash,
      transactionsRoot: payload.transactions_root,
      withdrawalsRoot: payload.withdrawals_root,
      blobGasUsed: BigInt(payload.blob_gas_used ?? "0"),
      excessBlobGas: BigInt(payload.excess_blob_gas ?? "0"),
    };
  }

  async #fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.config.beaconApiUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Beacon API request failed for ${path} with status ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
