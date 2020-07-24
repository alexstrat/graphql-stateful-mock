export type Mocks = {
  [typeOrScalarName: string]:
  (() => { [fieldName: string]: unknown } | unknown)
  |
  { [fieldName: string]: () => unknown }
};

export type TypePolicy = {
  /**
   * The name of the field that should be used as store `key`.
   * 
   * If `false`, no field will be used and we'll generate a random string
   * as key. 
   */
  keyFieldName?: string | false;
};

export type GetArgs<KeyT = string> = {
  typeName: string;
  key: KeyT;
  fieldName: string;
  /**
  * Optionnal arguments when querying the field.
  *
  * Querying the field with the same arguments will return
  * the same value. Deep equality is checked.
  * 
  * ```ts
  * store.get('User', 1, 'friend', { id: 2 }) === store.get('User', 1, 'friend', { id: 2 })
  * store.get('User', 1, 'friend', { id: 2 }) !== store.get('User', 1, 'friend')
  * ```
  * 
  * Args can be a record, just like `args` argument of field resolver or an
  * arbitraty string.
  */
  fieldArgs?: string | { [argName: string]: any };
}

export type SetArgs<KeyT = string> = {
  typeName: string,
  key: KeyT,
  fieldName: string,
  /**
   * Optionnal arguments when querying the field.
   * 
   * @see GetArgs#fieldArgs
   */
  fieldArgs?: string | { [argName: string]: any },
  value?: unknown,
  /**
   * If the value for this field is already set, it won't
   * be overriden.
   * 
   * Propagates down do nested `set`.
   */
  noOverride?: boolean;
}

export interface IMockStore {
  /**
   * Get a field value from the store for the given type, key and field
   * name — and optionnally field arguments.
   * 
   * If the the value for this field is not set, a value will be
   * generated according to field return type and mock functions.
   * 
   * If the field's output type is a `ObjectType` (or list of `ObjectType`),
   * it will return a `Ref` (or array of `Ref`), ie a reference to an entity
   * in the store.
   * 
   * Example:
   * ```ts
   * store.get('Query', 'ROOT', 'viewer');
   * > { $ref: 'abc-737dh-djdjd' }
   * store.get('User', 'abc-737dh-djdjd', 'name')
   * > "Hello World"
   * ``` 
   */
  get<KeyT = string>(args: GetArgs): unknown | Ref<KeyT>;
  /**
   * Shorthand for `get({typeName, key, fieldName, fieldArgs})`.
   */
  get<KeyT = string>(
    typeName: string,
    key: KeyT,
    fieldName: string,
    fieldArgs?: string | { [argName: string]: any }
  ): unknown | Ref<KeyT>;

  /**
   * Set a field value in the store for the given type, key and field
   * name — and optionnally field arguments.
   * 
   * If the the field return type is an `ObjectType` or a list of
   * `ObjectType`, you can set references to other entity as value:
   * 
   * ```ts
   * // set the viewer name
   * store.set('User', 1, 'name', 'Alexandre);
   * store.set('Query', 'ROOT', 'viewer', makeRef(1));
   *
   * // set the friends of viewer
   * store.set('User', 2, 'name', 'Emily');
   * store.set('User', 3, 'name', 'Caroline');
   * store.set('User', 1, 'friends', [makeRef(2), makeRef(3)]);
   * ```
   * 
   * But it also supports nested set:
   * 
   * ```ts
   * store.set('Query', 'ROOT', 'viewer', {
   *  name: 'Alexandre',
   *  friends: [
   *    { name: 'Emily' }
   *    { name: 'Caroline }
   *  ]
   * });
   * ```
   */
  set(args: SetArgs): void;

  /**
   * Shorthand for `set({typeName, key, fieldName, value})`.
   */
  set(
    typeName: string,
    key: string,
    fieldName: string,
    value?: unknown
  ): void;
}

export type Ref<KeyT = string> = {
  $ref: KeyT,
};

export function isRef<KeyT = string>(maybeRef: unknown): maybeRef is Ref<KeyT> {
  return maybeRef && typeof maybeRef === 'object' && maybeRef.hasOwnProperty('$ref');
};

export function assertIsRef<KeyT = string>(maybeRef: unknown, message?: string): asserts maybeRef is Ref<KeyT> {
  if (!isRef(maybeRef)) {
    throw new Error(message || `Expected ${maybeRef} to be a valid Ref.`);
  }
};

export function makeRef<KeyT = string>(key: KeyT): Ref<KeyT> {
  return { $ref: key };
}

export function isRecord(obj: unknown): obj is {[key: string]: unknown } {
  return typeof obj === 'object' && obj !== null;
}
