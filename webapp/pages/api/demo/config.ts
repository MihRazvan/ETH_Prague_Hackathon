import type { NextApiRequest, NextApiResponse } from "next";

import type { DemoConfig } from "../../../lib/demo";
import { ensureDemoEnvLoaded } from "../../../lib/server-env";

export default function handler(_req: NextApiRequest, res: NextApiResponse<DemoConfig | { error: string }>) {
  ensureDemoEnvLoaded();

  const ethRpcUrl = process.env.ETH_RPC_URL;
  const baseRpcUrl = process.env.BASE_RPC_URL;
  const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}` | undefined;
  const verifierAddress = process.env.VERIFIER_ADDRESS as `0x${string}` | undefined;

  if (!ethRpcUrl || !baseRpcUrl || !vaultAddress || !verifierAddress) {
    res.status(500).json({ error: "Missing demo environment configuration." });
    return;
  }

  res.status(200).json({
    ethRpcUrl,
    baseRpcUrl,
    vaultAddress,
    verifierAddress,
    lockAmountEth: process.env.LOCK_AMOUNT_ETH ?? "0.01",
    maxProofAgeSeconds: process.env.MAX_PROOF_AGE ?? "3600",
  });
}
