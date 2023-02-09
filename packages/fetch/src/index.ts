import { FetchError, FetchFailure, StatusCodeError } from "./Error.js"

export interface FetchOptions {
  readonly validStatusCode?: (status: number) => boolean
}

export const defaultValidStatusCode = (status: number) =>
  status >= 200 && status < 300

export const fetch = (
  url: RequestInfo,
  init: RequestInit = {},
  { validStatusCode = defaultValidStatusCode }: FetchOptions = {},
): Effect<never, FetchError, Response> =>
  Effect.tryCatchPromiseInterrupt(
    () => globalThis.fetch(url, init),
    _ => new FetchFailure(_, url, init),
  ).filterOrElseWith(
    _ => validStatusCode(_.status),
    _ => Effect.fail(new StatusCodeError(_)),
  )
