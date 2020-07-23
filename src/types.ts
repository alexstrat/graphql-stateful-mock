import { GraphQLSchema } from 'graphql';

export type Ref<KeyT = string> = {
  $ref: KeyT,
};

export type Mocks = {
  [typeOrScalarName: string]:
  (() => { [fieldName: string]: unknown } | unknown)
  |
  { [fieldName: string]: () => unknown }
};

export type TypePolicy = {
  keyField?: string | false;
};

export type MockStoreOptions = {
  schema: GraphQLSchema,
  mocks?: Mocks,
  typePolicies?: {
    [typeName: string]: TypePolicy
  }
}

export type GetArgs<KeyT = string> = {
  typeName: string,
  key: KeyT,
  fieldName: string,
  fieldArgs?: string | { [argName: string]: any },
}

export type SetArgs<KeyT = string> = {
  typeName: string,
  key: KeyT,
  fieldName: string,
  fieldArgs?: string | { [argName: string]: any },
  value?: unknown,
  /**
   * If the value for this field is alreay set, it won't
   * be overriden.
   * 
   * Propagates down do nested `set`.
   */
  noOverride?: boolean;
}

export interface IMockStore {
  get<KeyT = string>(typeName: string, key: KeyT, fieldName: string): unknown | Ref<KeyT>;
  get<KeyT = string>(args: GetArgs): unknown | Ref<KeyT>;
  set(typeName: string, key: string, fieldName: string, value?: unknown): void;
  set(args: SetArgs): void;
}

export function isRef<KeyT = string>(maybeRef: unknown): maybeRef is Ref<KeyT> {
  return maybeRef && typeof maybeRef === 'object' && maybeRef.hasOwnProperty('$ref');
};

export function assertIsRef<KeyT = string>(maybeRef: unknown, message?: string): asserts maybeRef is Ref<KeyT> {
  if (!isRef(maybeRef)) {
    throw new Error(message || `Expected ${maybeRef} to be a valid Ref.`);
  }
};

export function isRecord(obj: unknown): obj is {[key: string]: unknown } {
  return typeof obj === 'object' && obj !== null;
}
