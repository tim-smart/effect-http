import {
  HttpFs,
  HttpFsError,
  HttpFsNotFound,
} from "@effect-http/core/internal/HttpFs"
import { HttpResponse, HttpStreamError } from "@effect-http/core/Response"
import * as Fs from "./fs.js"
import type { Layer } from "@effect/io/Layer"

export const nodeHttpFsImpl: HttpFs = {
  toResponse: (path, { status, range, contentType }) =>
    Do($ => {
      const headers = new Headers()
      const stats = $(Fs.stat(path))

      if (range) {
        const [start, end] = range
        headers.set("content-length", `${end - start}`)
      } else {
        headers.set("content-length", stats.size.toString())
      }

      const stream = Fs.stream(path, {
        offset: range ? range[0] : undefined,
        bytesToRead: range ? range[1] - range[0] : undefined,
      }).mapError(e => new HttpStreamError(e))

      return HttpResponse.stream(stream, {
        status,
        headers,
        contentType,
      })
    }).mapError(e =>
      e.error.code === "ENOENT"
        ? new HttpFsNotFound(path, e)
        : new HttpFsError(e),
    ),
}

export const NodeHttpFsLive = Layer.succeed(HttpFs, nodeHttpFsImpl)
