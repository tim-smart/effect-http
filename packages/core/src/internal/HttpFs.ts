import { RouteNotFound } from "../router.js"

export interface ToResponseOptions {
  readonly status?: number
  readonly contentType?: string
  readonly range?: readonly [start: number, end: number]
  readonly headers?: Headers
}

export class HttpFsError {
  readonly _tag = "HttpFsError"
  constructor(readonly error: unknown) {}
}

export interface HttpFs {
  toResponse: (
    path: string,
    opts?: ToResponseOptions,
  ) => Effect<never, RouteNotFound | HttpFsError, HttpResponse>
}

export const HttpFs = Tag<HttpFs>()
