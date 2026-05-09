export class AnywareError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
  }
}

export class RpcRequestError extends AnywareError {
  readonly method: string;
  readonly url: string;
  readonly status?: number;

  constructor(message: string, args: { method: string; url: string; status?: number; cause?: unknown }) {
    super(message, "RPC_REQUEST_ERROR", args.cause);
    this.method = args.method;
    this.url = args.url;
    this.status = args.status;
  }
}

export class RpcResponseShapeError extends AnywareError {
  readonly field: string;

  constructor(message: string, field: string, cause?: unknown) {
    super(message, "RPC_RESPONSE_SHAPE_ERROR", cause);
    this.field = field;
  }
}

export class BeaconApiRequestError extends AnywareError {
  readonly path: string;
  readonly status: number;

  constructor(message: string, args: { path: string; status: number; cause?: unknown }) {
    super(message, "BEACON_API_REQUEST_ERROR", args.cause);
    this.path = args.path;
    this.status = args.status;
  }
}

export class BeaconResponseShapeError extends AnywareError {
  readonly field: string;

  constructor(message: string, field: string, cause?: unknown) {
    super(message, "BEACON_RESPONSE_SHAPE_ERROR", cause);
    this.field = field;
  }
}

export class BeaconBlockNotFoundError extends AnywareError {
  readonly blockHash: string;
  readonly searchWindowSlots: number;

  constructor(message: string, args: { blockHash: string; searchWindowSlots: number; cause?: unknown }) {
    super(message, "BEACON_BLOCK_NOT_FOUND", args.cause);
    this.blockHash = args.blockHash;
    this.searchWindowSlots = args.searchWindowSlots;
  }
}

export class DestinationAnchorNotFoundError extends AnywareError {
  readonly beaconRoot: string;
  readonly anchorBlockNumber: bigint;
  readonly searchWindowBlocks: number;

  constructor(
    message: string,
    args: { beaconRoot: string; anchorBlockNumber: bigint; searchWindowBlocks: number; cause?: unknown },
  ) {
    super(message, "DESTINATION_ANCHOR_NOT_FOUND", args.cause);
    this.beaconRoot = args.beaconRoot;
    this.anchorBlockNumber = args.anchorBlockNumber;
    this.searchWindowBlocks = args.searchWindowBlocks;
  }
}
