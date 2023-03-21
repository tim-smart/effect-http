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
  | SchemaEncodeError

export abstract class BaseHttpError {
  readonly [HttpClientErrorTypeId]: (_: HttpClientErrorTypeId) => unknown =
    identity
}

export class RequestError extends BaseHttpError {
  readonly _tag = "RequestError"
  constructor(readonly request: Request, readonly error: unknown) {
    super()
  }
}

export class StatusCodeError extends BaseHttpError {
  readonly _tag = "StatusCodeError"
  readonly status: number
  constructor(readonly response: Response) {
    super()
    this.status = response.status
  }
}

export class ResponseDecodeError extends BaseHttpError {
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

export class SchemaEncodeError extends BaseHttpError {
  readonly _tag = "SchemaEncodeError"
  constructor(readonly error: ParseError, readonly request: Request) {
    super()
  }
}

export class SchemaDecodeError extends BaseHttpError {
  readonly _tag = "SchemaDecodeError"
  constructor(readonly error: ParseError, readonly response: Response) {
    super()
  }
}
