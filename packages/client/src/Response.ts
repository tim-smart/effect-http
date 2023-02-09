import { Effect, succeed } from "@effect/io/Effect"
import {
  HttpClientError,
  ResponseDecodeError,
  SchemaDecodeError,
  StatusCodeError,
} from "./Error.js"
import { fromReadableStream } from "./util/stream.js"

export interface Response {
  readonly status: number
  readonly headers: Headers
  readonly stream: Stream<never, HttpClientError, Uint8Array>
  readonly json: Effect<never, HttpClientError, unknown>
  readonly text: Effect<never, HttpClientError, string>
  readonly blob: Effect<never, HttpClientError, Blob>
  readonly decode: <A>(schema: Schema<A>) => Effect<never, HttpClientError, A>
}

class ResponseImpl implements Response {
  constructor(private readonly source: globalThis.Response) {}

  get status(): number {
    return this.source.status
  }

  get headers(): Headers {
    return this.source.headers
  }

  get stream(): Stream<never, HttpClientError, Uint8Array> {
    return this.source.body
      ? fromReadableStream(this.source.body).mapError(
          _ => new ResponseDecodeError(_, this, "stream"),
        )
      : Stream.fail(new ResponseDecodeError("no body", this, "stream"))
  }

  get json(): Effect<never, HttpClientError, unknown> {
    return Effect.tryCatchPromise(
      () => this.source.json(),
      _ => new ResponseDecodeError(_, this, "json"),
    )
  }

  get text(): Effect<never, HttpClientError, string> {
    return Effect.tryCatchPromise(
      () => this.source.text(),
      _ => new ResponseDecodeError(_, this, "text"),
    )
  }

  get blob(): Effect<never, HttpClientError, Blob> {
    return Effect.tryCatchPromise(
      () => this.source.blob(),
      _ => new ResponseDecodeError(_, this, "blob"),
    )
  }

  decode<A>(schema: Schema<A>): Effect<never, HttpClientError, A> {
    return this.json.flatMap(_ =>
      Effect.fromEither(schema.decode(_)).mapError(
        _ => new SchemaDecodeError(_, this),
      ),
    )
  }
}

export const fromWeb = (_: globalThis.Response): Response => new ResponseImpl(_)

export const defaultTransform = (
  response: Response,
): Effect<never, HttpClientError, Response> => succeed(response)

export const defaultValidator = (
  response: Response,
): Effect<never, HttpClientError, Response> => {
  if (response.status >= 300) {
    return Effect.fail(new StatusCodeError(response))
  }

  return Effect.succeed(response)
}
