import type { Effect } from "@effect/io/Effect"
import type { HttpApp } from "@effect-http/core"
import { HttpRequest } from "@effect-http/core/Request"
import type { ListenOptions } from "net"
import { EarlyResponse, HttpResponse } from "@effect-http/core/Response"
import * as Http from "http"
import { Readable } from "stream"
import { LazyArg } from "@fp-ts/data/Function"

export interface RequestOptions {
  // TODO: Implement body size limit
  bodyLimit: number
}

/**
 * @tsplus pipeable effect-http/HttpApp serveNode
 */
export const make =
  (
    makeServer: LazyArg<Http.Server>,
    options: ListenOptions & { port: number } & Partial<RequestOptions>,
  ) =>
  <R>(httpApp: HttpApp<R, EarlyResponse>): Effect<R, never, never> =>
    Effect.runtime<R>().flatMap((rt) =>
      Effect.asyncInterrupt<never, never, never>(() => {
        const server = makeServer()

        server.on("request", (request, response) => {
          rt.unsafeRun(
            httpApp(convertRequest(request, options.port)),
            (exit) => {
              if (exit.isSuccess()) {
                handleResponse(exit.value, response)
              } else {
                console.error("@effect-http/node", exit.cause.pretty())
                response.writeHead(500)
                response.end()
              }
            },
          )
        })

        server.listen(options)

        return Effect.async((resume) => {
          server.close(() => resume(Effect.unit()))
        })
      }),
    )

const convertRequest = (source: Http.IncomingMessage, port: number) => {
  const url = requestUrl(source, port)
  const noBody = source.method === "GET" || source.method === "HEAD"

  return HttpRequest.fromStandard(
    () =>
      new Request(url, {
        method: source.method,
        body: noBody ? null : (source as any),
        headers: new Headers(source.headers as any),
        duplex: noBody ? undefined : "half",
      } as any),
    source.method!,
    url,
  )
}

const handleResponse = (source: HttpResponse, dest: Http.ServerResponse) => {
  const headers: Record<string, string> =
    source.headers._tag === "Some"
      ? Object.fromEntries(source.headers.value.entries())
      : {}
  let body: string | null = null

  switch (source._tag) {
    case "TextResponse":
      headers["content-type"] = source.contentType
      body = source.body
      headers["content-length"] = Buffer.byteLength(body).toString()
      break

    case "FormDataResponse":
      const response = new Response(source.body)
      headers["content-type"] = response.headers.get("content-type")!
      dest.writeHead(source.status, headers)
      Readable.fromWeb(source.body as any).pipe(dest)
      return

    case "StreamResponse":
      headers["content-type"] = source.contentType
      if (source.contentLength._tag === "Some") {
        headers["content-length"] = source.contentLength.value.toString()
      }
      dest.writeHead(source.status, headers)
      Readable.fromWeb(source.body as any).pipe(dest)
      return
  }

  dest.writeHead(source.status, headers)
  dest.end(body)
}

const requestUrl = (source: Http.IncomingMessage, port: number) => {
  const proto = requestProtocol(source)
  const host = requestHost(source, port)

  return `${proto}://${host}${source.url}`
}

const requestProtocol = (source: Http.IncomingMessage) => {
  if ((source.socket as any).encrypted) {
    return "https"
  } else if (typeof source.headers["x-forwarded-proto"] === "string") {
    return source.headers["x-forwarded-proto"].trim()
  }

  return "http"
}

const requestHost = (source: Http.IncomingMessage, port: number) => {
  if (typeof source.headers["x-forwarded-host"] === "string") {
    return source.headers["x-forwarded-host"].trim()
  } else if (typeof source.headers["host"] === "string") {
    return source.headers["host"].trim()
  }

  return `localhost:${port}`
}
