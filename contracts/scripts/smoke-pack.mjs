import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const contractsDir = resolve(new URL("../", import.meta.url).pathname);
const tempDir = mkdtempSync(join(tmpdir(), "elseware-solidity-smoke-"));

try {
  execFileSync("pnpm", ["pack", "--pack-destination", tempDir], { cwd: contractsDir, stdio: "inherit" });

  const tarball = expectedTarballName();
  writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "elseware-solidity-smoke",
        private: true,
      },
      null,
      2,
    ),
  );

  execFileSync("pnpm", ["add", join(tempDir, tarball)], { cwd: tempDir, stdio: "inherit" });

  const packageRoot = join(tempDir, "node_modules", "@elseware", "solidity");
  assertFile(join(packageRoot, "src", "BeaconStateProof.sol"));
  assertFile(join(packageRoot, "src", "interfaces", "IBeaconStateProof.sol"));
  assertFile(join(packageRoot, "src", "examples", "VerifiedSlotConsumer.sol"));
  assertFile(join(packageRoot, "foundry.toml"));
  assertFile(join(packageRoot, "README.md"));

  const readme = readFileSync(join(packageRoot, "README.md"), "utf8");
  if (!readme.includes("VerifiedSlotConsumer.sol")) {
    throw new Error("Packaged Solidity README is missing the minimal consumer reference");
  }

  console.log(`Smoke package install passed from ${contractsDir}`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function expectedTarballName() {
  const packageJson = JSON.parse(readFileSync(join(contractsDir, "package.json"), "utf8"));
  const normalizedName = String(packageJson.name).replace(/^@/, "").replace(/\//g, "-");
  return `${normalizedName}-${packageJson.version}.tgz`;
}

function assertFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Expected packaged file missing: ${path}`);
  }
}
