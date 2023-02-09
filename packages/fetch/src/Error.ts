export const FetchErrorTypeId = Symbol.for("@effect-http/fetch/FetchError")
export type FetchErrorTypeId = typeof FetchErrorTypeId

export type FetchError =
  | FetchFailure
  | StatusCodeError
  | ResponseDecodeError
  | SchemaDecodeError

export abstract class BaseFetchError {
  readonly [FetchErrorTypeId] = FetchErrorTypeId
}

export class FetchFailure extends BaseFetchError {
  readonly _tag = "FetchFailure"
  constructor(
    readonly error: unknown,
    readonly url: RequestInfo,
    readonly init?: RequestInit,
  ) {
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
    readonly response: Response,
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
