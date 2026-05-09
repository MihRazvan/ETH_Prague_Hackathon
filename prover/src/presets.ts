import type { ElsewareClientConfig, NetworkPresetName, ProverConfig, ProverPresetConfig } from "./types.js";

export const NETWORK_PRESETS: Record<NetworkPresetName, ProverConfig> = {
  "sepolia-base-sepolia": {
    ethRpcUrl: "https://ethereum-sepolia.publicnode.com",
    beaconApiUrl: "https://ethereum-sepolia-beacon-api.publicnode.com",
    destinationRpcUrl: "https://sepolia.base.org",
  },
};

export function resolveProverConfig(config: ElsewareClientConfig): ProverConfig {
  if (!("network" in config)) {
    return config;
  }

  const preset = NETWORK_PRESETS[config.network];
  if (!preset) {
    throw new Error(`Unknown Elseware network preset: ${config.network}`);
  }
  return {
    ...preset,
    ...pickOverrides(config),
  };
}

function pickOverrides(config: ProverPresetConfig): Partial<ProverConfig> {
  return {
    ethRpcUrl: config.ethRpcUrl ?? NETWORK_PRESETS[config.network].ethRpcUrl,
    beaconApiUrl: config.beaconApiUrl ?? NETWORK_PRESETS[config.network].beaconApiUrl,
    destinationRpcUrl: config.destinationRpcUrl ?? NETWORK_PRESETS[config.network].destinationRpcUrl,
    searchWindowSlots: config.searchWindowSlots,
    destinationSearchWindowBlocks: config.destinationSearchWindowBlocks,
    beaconVersion: config.beaconVersion,
  };
}
