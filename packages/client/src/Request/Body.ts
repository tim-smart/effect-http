export type RequestBody = RawBody | StreamBody

export class RawBody {
  readonly _tag = "RawBody"
  constructor(
    readonly contentType: string,
    readonly contentLength: Maybe<number>,
    readonly value: unknown,
  ) {}
}

export class StreamBody {
  readonly _tag = "StreamBody"
  constructor(
    readonly value: Stream<never, unknown, Uint8Array>,
    readonly contentType: string,
  ) {}
}

const rawFromString = (contentType: string, value: string): RawBody => {
  const body = new TextEncoder().encode(value)
  return new RawBody(contentType, Maybe.some(body.length), body)
}

export const text = (value: string): RequestBody =>
  rawFromString("text/plain", value)

export const json = (value: unknown): RequestBody =>
  rawFromString("application/json", JSON.stringify(value))

export const stream = (
  value: Stream<never, unknown, Uint8Array>,
  contentType = "application/octet-stream",
): RequestBody => new StreamBody(value, contentType)
