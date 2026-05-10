import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

import { decodeLockValue, DEMO_SOURCE_FACTS, type DemoConfig, type DemoSourceFactSnapshot, vaultAbi } from "../../../lib/demo";
import { ensureDemoEnvLoaded } from "../../../lib/server-env";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<DemoConfig | { error: string }>,
) {
  ensureDemoEnvLoaded();

  const ethRpcUrl = process.env.ETH_RPC_URL;
  const baseRpcUrl = process.env.BASE_RPC_URL;
  const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}` | undefined;
  const verifierAddress = process.env.VERIFIER_ADDRESS as `0x${string}` | undefined;
  const lenderAddress = process.env.LENDER_ADDRESS as `0x${string}` | undefined;
  const mockUsdcAddress = process.env.MOCK_USDC_ADDRESS as `0x${string}` | undefined;

  if (!ethRpcUrl || !baseRpcUrl || !vaultAddress || !verifierAddress || !lenderAddress || !mockUsdcAddress) {
    res.status(500).json({ error: "Missing demo environment configuration." });
    return;
  }

  try {
    const sourceClient = createPublicClient({
      chain: sepolia,
      transport: http(ethRpcUrl),
    });

    const sources = await Promise.all(
      DEMO_SOURCE_FACTS.map(async (fact): Promise<DemoSourceFactSnapshot> => {
        const encodedValue = await sourceClient.readContract({
          address: vaultAddress,
          abi: vaultAbi,
          functionName: "locks",
          args: [fact.borrower],
        });
        const decoded = decodeLockValue(encodedValue);

        return {
          id: fact.id,
          label: fact.label,
          eyebrow: fact.eyebrow,
          borrower: fact.borrower,
          blurb: fact.blurb,
          amountWei: decoded.amountWei.toString(),
          status: decoded.status,
        };
      }),
    );

    res.status(200).json({
      ethRpcUrl,
      baseRpcUrl,
      vaultAddress,
      verifierAddress,
      lenderAddress,
      mockUsdcAddress,
      lockAmountEth: process.env.LOCK_AMOUNT_ETH ?? "0.01",
      maxProofAgeSeconds: process.env.MAX_PROOF_AGE ?? "3600",
      sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load source facts.";
    res.status(500).json({ error: message });
  }
}
