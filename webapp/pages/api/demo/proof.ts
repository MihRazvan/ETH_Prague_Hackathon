import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, getAddress, http } from "viem";
import { sepolia } from "viem/chains";

import { computeMappingSlot, createAnywareClient } from "anyware-prover";

import { DEMO_SAFE_BLOCK_OFFSETS, DEMO_SOURCE_FACTS, type DemoErrorResponse, type DemoProofResponse } from "../../../lib/demo";
import { ensureDemoEnvLoaded } from "../../../lib/server-env";

interface ProofRequestBody {
  sourceId?: string;
  borrower?: string;
}

const DEMO_PROOF_TIMEOUT_MS = 45_000;
const DEMO_SEARCH_WINDOW_SLOTS = 96;
const DEMO_DESTINATION_SEARCH_BLOCKS = 256;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DemoProofResponse | DemoErrorResponse>,
) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  ensureDemoEnvLoaded();

  const { sourceId, borrower: rawBorrower } = (req.body ?? {}) as ProofRequestBody;

  const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}` | undefined;
  const ethRpcUrl = process.env.ETH_RPC_URL;
  const beaconApiUrl = process.env.BEACON_API_URL;
  const baseRpcUrl = process.env.BASE_RPC_URL;

  if (!vaultAddress || !ethRpcUrl || !beaconApiUrl || !baseRpcUrl) {
    res.status(500).json({ ok: false, error: "Proof service is missing environment configuration." });
    return;
  }

  try {
    const client = createAnywareClient({
      network: "sepolia-base-sepolia",
      ethRpcUrl,
      beaconApiUrl,
      destinationRpcUrl: baseRpcUrl,
      searchWindowSlots: DEMO_SEARCH_WINDOW_SLOTS,
      destinationSearchWindowBlocks: DEMO_DESTINATION_SEARCH_BLOCKS,
    });
    const sourceClient = createPublicClient({
      chain: sepolia,
      transport: http(ethRpcUrl),
    });

    const latestBlockNumber = await sourceClient.getBlockNumber();
    const startedAt = Date.now();

    // Use explicitly provided borrower address, fall back to source facts
    let borrowerAddress: string;
    if (rawBorrower) {
      borrowerAddress = rawBorrower;
    } else {
      const source = DEMO_SOURCE_FACTS.find((fact) => fact.id === sourceId) ?? DEMO_SOURCE_FACTS[0];
      borrowerAddress = source.borrower;
    }
    const normalizedBorrower = getAddress(borrowerAddress);
    const errors: string[] = [];

    for (const offset of DEMO_SAFE_BLOCK_OFFSETS) {
      const candidateBlock = latestBlockNumber > offset ? latestBlockNumber - offset : latestBlockNumber;
      try {
        const bundle = await withTimeout(
          client.proveVaultLock({
            vault: vaultAddress,
            borrower: normalizedBorrower,
            blockNumber: candidateBlock,
          }),
          DEMO_PROOF_TIMEOUT_MS,
          "Proof generation timed out. Public Sepolia/Base endpoints are likely too slow right now.",
        );
        const lockSlot = computeMappingSlot(normalizedBorrower, 0n);
        const serialized = client.serializeBundle(bundle);
        const proofBundleSizeBytes = Buffer.byteLength(JSON.stringify(serialized), "utf8");

        res.status(200).json({
          ok: true,
          sourceId: sourceId ?? "wallet-lock",
          borrower: normalizedBorrower,
          blockNumber: bundle.executionHeader.blockNumber.toString(),
          blockOffset: offset.toString(),
          lockSlot,
          proofLatencyMs: Date.now() - startedAt,
          proofBundleSizeBytes,
          bundle: serialized,
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown proof generation error.";
        errors.push(`${candidateBlock.toString()}: ${message}`);
      }
    }

    res.status(500).json({
      ok: false,
      error: `Could not assemble a live proof for ${normalizedBorrower}. Tried ${DEMO_SAFE_BLOCK_OFFSETS.length} mature source blocks. Last error: ${errors.at(-1) ?? "Unknown error."}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proof generation error.";
    const statusCode = message.includes("timed out") ? 504 : 500;
    res.status(statusCode).json({ ok: false, error: message });
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
