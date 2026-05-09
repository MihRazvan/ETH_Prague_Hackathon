import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = resolve(new URL("../../", import.meta.url).pathname);
const proverDir = resolve(new URL("../", import.meta.url).pathname);
const tempDir = mkdtempSync(join(tmpdir(), "elseware-prover-smoke-"));

try {
  execFileSync("pnpm", ["build"], { cwd: proverDir, stdio: "inherit" });
  execFileSync("pnpm", ["pack", "--pack-destination", tempDir], { cwd: proverDir, stdio: "inherit" });

  const tarball = readTarballName(tempDir);
  writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify(
      {
        name: "elseware-prover-smoke",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
  );

  execFileSync("pnpm", ["add", join(tempDir, tarball)], { cwd: tempDir, stdio: "inherit" });

  const script = `
    import { ElsewareClient, BUNDLE_VERSION, computeMappingSlot } from "@elseware/prover";
    const client = new ElsewareClient({ ethRpcUrl: "https://source.example", beaconApiUrl: "https://beacon.example" });
    const slot = computeMappingSlot("0x92AAe0857979a139344f5b6F008e71F27A507522", 0n);
    if (slot !== "0x72b3e5216fb2e942730ef6ca919ec6b688ed45f0e881ff7d07f299fd8e722e18") {
      throw new Error("Unexpected slot output");
    }
    if (client.bundleVersion !== BUNDLE_VERSION || BUNDLE_VERSION !== 1) {
      throw new Error("Unexpected bundle version");
    }
    console.log("import-ok");
  `;

  execFileSync("node", ["--input-type=module", "--eval", script], { cwd: tempDir, stdio: "inherit" });
  execFileSync("pnpm", ["exec", "elseware-prover"], { cwd: tempDir, stdio: "inherit" });

  console.log(`Smoke package install passed from ${repoRoot}`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function readTarballName(dir) {
  return execFileSync("sh", ["-lc", "ls *.tgz"], { cwd: dir, encoding: "utf8" }).trim();
}
