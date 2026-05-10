# SDK Errors and Debugging

`anyware-prover` exposes typed errors so you can tell the difference between:

- endpoint outages
- malformed responses
- missing beacon data
- destination anchor lookup failures

## Typed errors

### `RpcRequestError`

The source or destination JSON-RPC request failed entirely.

Common causes:

- RPC endpoint downtime
- rate limits
- transport timeout
- HTTP 5xx from the provider

### `RpcResponseShapeError`

The RPC responded, but not in the shape the SDK expects.

Common causes:

- provider-specific response differences
- malformed JSON-RPC payloads
- unsupported endpoint behavior

### `BeaconApiRequestError`

The beacon API request failed.

Common causes:

- beacon node outage
- rate limits
- missing route support

### `BeaconResponseShapeError`

The beacon API returned a payload that does not match the shape the SDK expects.

Common causes:

- incompatible beacon API implementation
- malformed response body
- version mismatch in the returned payload

### `BeaconBlockNotFoundError`

The SDK could not find the matching beacon block for the target execution block within the configured slot search window.

Common causes:

- search window too narrow
- beacon API history gap
- RPC/beacon mismatch

### `DestinationAnchorNotFoundError`

The destination chain could not find the target beacon root near the expected destination block window.

Common causes:

- proof generated against a source block that is too fresh
- destination chain anchor search window too narrow
- destination endpoint incompatibility

## Debug workflow

1. Run `anyware-prover doctor`
2. Confirm source RPC, beacon API, and destination RPC are all healthy
3. Retry against a slightly older source block if you are near the chain head
4. Increase `searchWindowSlots` or `destinationSearchWindowBlocks` only when you understand the tradeoff

## CLI helpers

```bash
anyware-prover doctor --network sepolia-base-sepolia
anyware-prover doctor --json
```

These are the fastest way to separate endpoint problems from proof-shape problems.

