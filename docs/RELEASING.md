# Elseware Release Flow

This is the pre-publication path for the two developer-facing Elseware packages:

- `@elseware/prover`
- `@elseware/solidity`

## 1. Run the full release checks

From the repo root:

```bash
pnpm release:check
```

This runs:
- SDK build + test + packed-install smoke test
- Solidity test + packed-install smoke test

## 2. Run dry-run publishes

From the repo root:

```bash
pnpm release:dry-run
```

This runs `pnpm publish --dry-run` for both packages without actually publishing.

If you want to test one side only:

```bash
pnpm release:dry-run:prover
pnpm release:dry-run:solidity
```

## 3. Tag the release

After `release:check` and `release:dry-run` both pass:

```bash
git tag -a prover-v0.1.0 -m "@elseware/prover v0.1.0"
git tag -a solidity-v0.1.0 -m "@elseware/solidity v0.1.0"
```

If both packages move together, you can also tag the repo-level release:

```bash
git tag -a v0.1.0 -m "Elseware v0.1.0"
```

Push tags:

```bash
git push origin prover-v0.1.0 solidity-v0.1.0
git push origin v0.1.0
```

## 4. Publish

Publish the SDK:

```bash
cd prover
pnpm publish --access public
```

Publish the Solidity package:

```bash
cd contracts
pnpm publish --access public
```

## Notes

- `prepublishOnly` is wired for both packages.
- The Solidity package intentionally keeps `smoke-pack` in `release:check` rather than `prepublishOnly`, because nested `pnpm pack` inside `pnpm publish --dry-run` is not stable across environments.
- The SDK smoke test installs the packed tarball into a temporary project and verifies:
  - imports work
  - CLI resolves
- The Solidity smoke test installs the packed tarball into a temporary project and verifies:
  - contract sources are included
  - minimal example consumer is included
  - `foundry.toml` and package README are included
