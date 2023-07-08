import { Json, Schema } from "@effect/schema/Schema"
import type { HttpRequest } from "./Request.js"
import * as Effect from "@effect/io/Effect"

export class DecodeSchemaError {
  readonly _tag = "DecodeSchemaError"
  constructor(
    readonly error: ParseError,
    readonly request: HttpRequest,
    readonly body: unknown,
  ) {}
}

const decodeEither =
  <ParentI>() =>
  <I extends ParentI, A>(schema: Schema<I, A>) => {
    const decode = schema.parseEither

    return (
      input: unknown,
      request: HttpRequest,
    ): Either<DecodeSchemaError, A> =>
      decode(input).mapLeft(_ => new DecodeSchemaError(_, request, input))
  }

const decodeEffect =
  <ParentI>() =>
  <I extends ParentI, A>(schema: Schema<I, A>) => {
    const decode = schema.parse
    return (input: unknown, request: HttpRequest) =>
      decode(input).mapError(_ => new DecodeSchemaError(_, request, input))
  }

export const decode = <I extends Json, A>(schema: Schema<I, A>) => {
  const decode = decodeEffect<Json>()(schema)

  return Do($ => {
    const ctx = $(Effect.map(RouteContext, identity))
    const params = $(parseBodyWithParams(ctx))

    return $(decode(params, ctx.request))
  })
}

export const decodeHeaders = <I extends Record<string, string>, A>(
  schema: Schema<I, A>,
) => {
  const decode = decodeEffect<Record<string, string>>()(schema)
  return Do($ => {
    const ctx = $(Effect.map(RouteContext, identity))
    return $(decode(Object.fromEntries(ctx.request.headers), ctx.request))
  })
}

export const decodeParams = <I extends Record<string, string | undefined>, A>(
  schema: Schema<I, A>,
) => {
  const decode = decodeEffect<Record<string, string | undefined>>()(schema)

  return Do($ => {
    const { request, params, searchParams } = $(
      Effect.map(RouteContext, identity),
    )
    return $(decode({ ...searchParams, ...params }, request))
  })
}

export class FormDataKeyNotFound {
  readonly _tag = "FormDataKeyNotFound"
  constructor(readonly key: string) {}
}

const jsonParse = (_: string) =>
  Effect.try({
    try: () => JSON.parse(_) as unknown,
    catch: _ => new RequestBodyError(_),
  })

export const decodeJsonFromFormData =
  <I extends Json, A>(schema: Schema<I, A>) =>
  (key: string, formData?: FormData) => {
    const decode = decodeEither<Json>()(schema)

    return Do($ => {
      const { request } = $(Effect.map(RouteContext, identity))
      const data = $(formData ? Effect.succeed(formData) : request.formData)

      const result = Maybe.fromNullable(data.get(key))
        .mapError(() => new RequestBodyError(new FormDataKeyNotFound(key)))
        .flatMap(_ => jsonParse(_.toString()))
        .flatMap(_ => decode(_, request))
        .map(value => [value, data] as const)

      return $(result)
    })
  }

export const parseBodyWithParams = ({
  request,
  params,
  searchParams,
}: RouteContext) =>
  Do(($): unknown => {
    const allParams = { ...searchParams, ...params }
    const body = $(parseBody(request))

    return body._tag === "Some"
      ? {
          ...allParams,
          ...(body.value as any),
        }
      : allParams
  })

export const parseBody = (request: HttpRequest) => {
  const contentType = request.headers.get("content-type")?.toLowerCase()

  if (contentType?.includes("application/json")) {
    return request.json.asSome
  } else if (contentType?.includes("application/x-www-form-urlencoded")) {
    return queryStringBody(request).asSome
  }

  return Effect.succeed(Maybe.none())
}

export const queryStringBody = (request: HttpRequest) =>
  request.text.flatMap(_ =>
    Effect.try({
      try: () => Object.fromEntries(new URLSearchParams(_).entries()),
      catch: reason => new RequestBodyError(reason),
    }),
  )
