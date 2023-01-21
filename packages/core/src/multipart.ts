export type FormDataPart = FormDataField | FormDataFile

export class FormDataField {
  readonly _tag = "FormDataField"

  constructor(
    readonly key: string,
    readonly contentType: string,
    readonly value: string,
  ) {}
}

export class FormDataFile {
  readonly _tag = "FormDataFile"

  constructor(
    readonly key: string,
    readonly name: string,
    readonly contentType: string,
    readonly content: LazyArg<ReadableStream<Uint8Array>>,
    readonly source?: unknown,
  ) {}

  get stream() {
    return fromReadableStream(this.content)
  }
}
