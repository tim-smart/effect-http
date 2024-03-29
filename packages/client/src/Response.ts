import type { Effect } from "@effect/io/Effect"
import { ResponseDecodeError, SchemaDecodeError } from "./Error.js"
import { fromReadableStream } from "./util/stream.js"
import type { ParseOptions } from "@effect/schema/AST"
import { Schema } from "@effect/schema/Schema"

export interface Response {
  readonly status: number
  readonly headers: Headers
  readonly stream: Stream<never, ResponseDecodeError, Uint8Array>
  readonly json: Effect<never, ResponseDecodeError, unknown>
  readonly text: Effect<never, ResponseDecodeError, string>
  readonly formData: Effect<never, ResponseDecodeError, FormData>
  readonly blob: Effect<never, ResponseDecodeError, Blob>
  readonly decode: <I, O>(
    schema: Schema<I, O>,
    options?: ParseOptions,
  ) => Effect<never, ResponseDecodeError | SchemaDecodeError, O>
}

class ResponseImpl implements Response {
  constructor(private readonly source: globalThis.Response) {}

  get status(): number {
    return this.source.status
  }

  get headers(): Headers {
    return this.source.headers
  }

  get stream(): Stream<never, ResponseDecodeError, Uint8Array> {
    return this.source.body
      ? fromReadableStream(this.source.body).mapError(
          _ => new ResponseDecodeError(_, this, "stream"),
        )
      : Stream.fail(new ResponseDecodeError("no body", this, "stream"))
  }

  get json(): Effect<never, ResponseDecodeError, unknown> {
    return Effect.tryPromise({
      try: () => this.source.json(),
      catch: _ => new ResponseDecodeError(_, this, "json"),
    })
  }

  get text(): Effect<never, ResponseDecodeError, string> {
    return Effect.tryPromise({
      try: () => this.source.text(),
      catch: _ => new ResponseDecodeError(_, this, "text"),
    })
  }

  get formData(): Effect<never, ResponseDecodeError, FormData> {
    return Effect.tryPromise({
      try: () => this.source.formData(),
      catch: _ => new ResponseDecodeError(_, this, "text"),
    })
  }

  get blob(): Effect<never, ResponseDecodeError, Blob> {
    return Effect.tryPromise({
      try: () => this.source.blob(),
      catch: _ => new ResponseDecodeError(_, this, "blob"),
    })
  }

  decode<I, O>(
    schema: Schema<I, O>,
    options?: ParseOptions,
  ): Effect<never, ResponseDecodeError | SchemaDecodeError, O> {
    const parse = schema.parse
    return this.json.flatMap(_ =>
      parse(_, options).mapError(_ => new SchemaDecodeError(_, this)),
    )
  }
}

export const fromWeb = (_: globalThis.Response): Response => new ResponseImpl(_)
