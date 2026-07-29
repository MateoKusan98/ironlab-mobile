/**
 * React Native's `FormData` accepts a `{ uri, name, type }` object for file
 * uploads — the runtime reads it and streams the file — but the DOM lib's
 * `append` is typed as `(name, value: string | Blob)`, so every call site used
 * to end in `as any`.
 *
 * This narrows that lie to one place and gives the shape a name.
 */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

/** Append a local file to a FormData body. */
export function appendFile(form: FormData, field: string, file: UploadFile): void {
  // The cast is unavoidable: RN's FormData is not the DOM's, but the ambient
  // types are. Keeping it here means no screen or service needs `any`.
  form.append(field, file as unknown as Blob);
}
