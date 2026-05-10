import type { NextApiRequest, NextApiResponse } from "next";
import { getAddress, isAddress } from "viem";

import type { DemoErrorResponse, DemoProofResponse } from "../../../lib/demo";
import { ensureDemoEnvLoaded } from "../../../lib/server-env";
import { computeMappingSlot, createAnywareClient } from "../../../../prover/dist/index.js";

interface ProofRequestBody {
  borrower?: string;
  blockNumber?: string;
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

  const { borrower, blockNumber } = (req.body ?? {}) as ProofRequestBody;
  if (!borrower || !isAddress(borrower)) {
    res.status(400).json({ ok: false, error: "Borrower address is required." });
    return;
  }

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

    const startedAt = Date.now();
    const normalizedBorrower = getAddress(borrower);
    const bundle = await withTimeout(
      client.proveVaultLock({
        vault: vaultAddress,
        borrower: normalizedBorrower,
        blockNumber: blockNumber ? BigInt(blockNumber) : undefined,
      }),
      DEMO_PROOF_TIMEOUT_MS,
      "Proof generation timed out. Public Sepolia/Base endpoints are likely too slow right now.",
    );
    const lockSlot = computeMappingSlot(normalizedBorrower, 0n);
    const serialized = client.serializeBundle(bundle);
    const proofBundleSizeBytes = Buffer.byteLength(JSON.stringify(serialized), "utf8");

    res.status(200).json({
      ok: true,
      blockNumber: bundle.executionHeader.blockNumber.toString(),
      lockSlot,
      proofLatencyMs: Date.now() - startedAt,
      proofBundleSizeBytes,
      bundle: serialized,
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
