import type { Effect } from "@effect/io/Effect"
import * as Http from "http"
import Body from "raw-body"

export const utf8String = (request: Http.IncomingMessage, limit: number) =>
  Effect.async<never, Body.RawBodyError, string>((resume) => {
    Body(
      request,
      {
        encoding: "utf-8",
        limit,
      },
      (err, body) => {
        if (err) {
          resume(Effect.fail(err))
        } else {
          resume(Effect.succeed(body))
        }
      },
    )
  })
