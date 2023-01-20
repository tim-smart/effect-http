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
    readonly size: number,
    readonly content: ReadableStream<Uint8Array>,
  ) {}

  get stream() {
    return fromReadableStream(this.content)
  }
}
