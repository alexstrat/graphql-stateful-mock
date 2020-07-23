type Ref = {
  $ref: string,
};

export type GetArgs = {
  typeName: string,
  key: string,
  fieldName: string,
    // args?: object,
    // defaultValue?: unknown todo
}

export type SetArgs = {
  typeName: string,
  key: string,
  fieldName: string,
  value?: unknown,
}

export interface IMockStore {
  get(typeName: string, key: string, fieldName: string): unknown | Ref;
  get(args: GetArgs): unknown | Ref;
  set(typeName: string, key: string, fieldName: string, value?: unknown): void;
  set(args: SetArgs): void;
}

export function isRef(maybeRef: unknown): maybeRef is Ref {
  return maybeRef && typeof maybeRef === 'object' && maybeRef.hasOwnProperty('$ref');
};

export function assertIsRef(maybeRef: unknown, message?: string): asserts maybeRef is Ref {
  if (!isRef(maybeRef)) {
    throw new Error(message || `Expected ${maybeRef} to be a valid Ref.`);
  }
};
