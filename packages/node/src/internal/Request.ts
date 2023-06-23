import type { Effect } from "@effect/io/Effect"
import { HttpRequest, RequestBodyError } from "@effect-http/core/Request"
import { IncomingMessage } from "http"
import * as Body from "./body.js"
import { fromReadable } from "./stream.js"
import { Readable } from "stream"
import * as MP from "./multipart.js"

export class NodeHttpRequest implements HttpRequest {
  constructor(
    readonly source: IncomingMessage,
    readonly originalUrl: string,
    readonly url: string,
    readonly options: MP.MultipartOptions,
  ) {}

  readonly text = Body.utf8String(
    this.source,
    this.options.limits.fieldSize,
  ).mapError(e => new RequestBodyError(e)).cached.runSync

  get method() {
    return this.source.method!
  }

  get headers() {
    return new Headers(this.source.headers as any)
  }

  setUrl(url: string): HttpRequest {
    return new NodeHttpRequest(this.source, this.originalUrl, url, this.options)
  }

  get json() {
    return this.text.flatMap(_ =>
      Effect.tryCatch(
        () => JSON.parse(_) as unknown,
        reason => new RequestBodyError(reason),
      ),
    )
  }

  get formData(): any {
    return MP.formData(this.source, this.options)
  }

  get formDataStream(): any {
    return MP.fromRequest(this.source, this.options)
  }

  get stream() {
    return fromReadable<Uint8Array>(this.source).mapError(
      _ => new RequestBodyError(_),
    )
  }

  get webStream() {
    return Readable.toWeb(this.source) as any
  }
}
