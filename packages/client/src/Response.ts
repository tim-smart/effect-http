import { Effect } from "@effect/io/Effect"
import { ResponseDecodeError, SchemaDecodeError } from "./Error.js"
import { fromReadableStream } from "./util/stream.js"

export interface Response {
  readonly status: number
  readonly headers: Headers
  readonly stream: Stream<never, ResponseDecodeError, Uint8Array>
  readonly json: Effect<never, ResponseDecodeError, unknown>
  readonly text: Effect<never, ResponseDecodeError, string>
  readonly blob: Effect<never, ResponseDecodeError, Blob>
  readonly decode: <A>(
    schema: Schema<A>,
  ) => Effect<never, ResponseDecodeError | SchemaDecodeError, A>
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
    return Effect.tryCatchPromise(
      () => this.source.json(),
      _ => new ResponseDecodeError(_, this, "json"),
    )
  }

  get text(): Effect<never, ResponseDecodeError, string> {
    return Effect.tryCatchPromise(
      () => this.source.text(),
      _ => new ResponseDecodeError(_, this, "text"),
    )
  }

  get blob(): Effect<never, ResponseDecodeError, Blob> {
    return Effect.tryCatchPromise(
      () => this.source.blob(),
      _ => new ResponseDecodeError(_, this, "blob"),
    )
  }

  decode<A>(
    schema: Schema<A>,
  ): Effect<never, ResponseDecodeError | SchemaDecodeError, A> {
    return this.json.flatMap(_ =>
      Effect.fromEither(schema.decode(_)).mapError(
        _ => new SchemaDecodeError(_, this),
      ),
    )
  }
}

export const fromWeb = (_: globalThis.Response): Response => new ResponseImpl(_)
