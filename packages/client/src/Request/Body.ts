export type RequestBody = RawBody | FormDataBody | StreamBody

export class RawBody {
  readonly _tag = "RawBody"
  constructor(
    readonly contentType: Maybe<string>,
    readonly contentLength: Maybe<number>,
    readonly value: unknown,
  ) {}
}

export class FormDataBody {
  readonly _tag = "FormDataBody"
  constructor(readonly value: FormData) {}
}

export class StreamBody {
  readonly _tag = "StreamBody"
  constructor(
    readonly contentType: Maybe<string>,
    readonly contentLength: Maybe<number>,
    readonly value: Stream<never, unknown, Uint8Array>,
  ) {}
}

const rawFromString = (contentType: string, value: string): RawBody => {
  const body = new TextEncoder().encode(value)
  return new RawBody(Maybe.some(contentType), Maybe.some(body.length), body)
}

export const text = (value: string, contentType = "text/plain"): RequestBody =>
  rawFromString(contentType, value)

export const json = (value: unknown): RequestBody =>
  rawFromString("application/json", JSON.stringify(value))

export const searchParams = (value: URLSearchParams): RequestBody =>
  rawFromString("application/x-www-form-urlencoded", value.toString())

export const formData = (value: FormData): RequestBody =>
  new FormDataBody(value)

export const stream = (
  value: Stream<never, unknown, Uint8Array>,
  contentType = "application/octet-stream",
  contentLength?: number,
): RequestBody =>
  new StreamBody(
    Maybe.some(contentType),
    Maybe.fromNullable(contentLength),
    value,
  )
