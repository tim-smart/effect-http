import { Request } from "./Request.js"
import { Response } from "./Response.js"

export const HttpClientErrorTypeId = Symbol.for(
  "@effect-http/client/HttpClientError",
)
export type HttpClientErrorTypeId = typeof HttpClientErrorTypeId

export type HttpClientError =
  | RequestError
  | StatusCodeError
  | ResponseDecodeError
  | SchemaDecodeError

export abstract class BaseFetchError {
  readonly [HttpClientErrorTypeId] = HttpClientErrorTypeId
}

export class RequestError extends BaseFetchError {
  readonly _tag = "FetchFailure"
  constructor(readonly request: Request, readonly error: unknown) {
    super()
  }
}

export class StatusCodeError extends BaseFetchError {
  readonly _tag = "StatusCodeError"
  readonly status: number
  constructor(readonly response: Response) {
    super()
    this.status = response.status
  }
}

export class ResponseDecodeError extends BaseFetchError {
  readonly _tag = "ResponseDecodeError"
  constructor(
    readonly error: unknown,
    readonly source: Response,
    readonly kind:
      | "json"
      | "text"
      | "blob"
      | "arrayBuffer"
      | "formData"
      | "stream",
  ) {
    super()
  }
}

export class SchemaDecodeError extends BaseFetchError {
  readonly _tag = "SchemaDecodeError"
  constructor(
    readonly errors: NonEmptyReadonlyArray<ParseError>,
    readonly response: Response,
  ) {
    super()
  }
}
