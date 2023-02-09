import { FetchError, ResponseDecodeError, SchemaDecodeError } from "./Error.js"
import { fromReadableStream } from "./util/stream.js"

/**
 * @tsplus getter Response json
 */
export const json = (self: Response): Effect<never, FetchError, unknown> =>
  Effect.tryCatchPromise(
    () => self.json(),
    _ => new ResponseDecodeError(_, self, "json"),
  )

/**
 * @tsplus getter Response text
 */
export const text = (self: Response): Effect<never, FetchError, string> =>
  Effect.tryCatchPromise(
    () => self.text(),
    _ => new ResponseDecodeError(_, self, "text"),
  )

/**
 * @tsplus getter Response blob
 */
export const blob = (self: Response): Effect<never, FetchError, Blob> =>
  Effect.tryCatchPromise(
    () => self.blob(),
    _ => new ResponseDecodeError(_, self, "blob"),
  )

/**
 * @tsplus getter Response blob
 */
export const arrayBuffer = (
  self: Response,
): Effect<never, FetchError, ArrayBuffer> =>
  Effect.tryCatchPromise(
    () => self.arrayBuffer(),
    _ => new ResponseDecodeError(_, self, "arrayBuffer"),
  )

/**
 * @tsplus getter Response formData
 */
export const formData = (self: Response): Effect<never, FetchError, FormData> =>
  Effect.tryCatchPromise(
    () => self.formData(),
    _ => new ResponseDecodeError(_, self, "formData"),
  )

/**
 * @tsplus getter Response stream
 */
export const stream = (self: Response): Stream<never, FetchError, Uint8Array> =>
  self.body
    ? fromReadableStream(self.body).mapError(
        _ => new ResponseDecodeError(_, self, "stream"),
      )
    : Stream.fail(new ResponseDecodeError("no body", self, "stream"))

/**
 * @tsplus pipeable Response decode
 */
export const decode =
  <A>(schema: Schema<A>) =>
  (self: Response): Effect<never, FetchError, A> =>
    json(self).flatMap(_ => {
      const result = schema.decode(_)
      return result._tag === "Left"
        ? Effect.fail(new SchemaDecodeError(result.left, self))
        : Effect.succeed(result.right)
    })
