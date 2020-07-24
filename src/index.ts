import { GraphQLSchema } from 'graphql';

import { IMockStore, Mocks, TypePolicy } from './types';
import { MockStore } from './MockStore';

export * from './MockStore';
export * from './addMocksToSchema';
export * from './types';

/**
 * Will create `MockStore` for the given `schema`.
 * 
 * A `MockStore` will generate mock values for the given schem when queried.
 *
 * It will stores generated mocks, so that, provided with same arguments
 * the returned values will be the same.
 * 
 * Its API also allows to modify the stored values.
 * 
 * Basic example:
 * ```ts
 * store.get('User', 1, 'name');
 * // > "Hello World"
 * store.set('User', 1, 'name', 'Alexandre');
 * store.get('User', 1, 'name');
 * // > "Alexandre"
 * ```
 */
export function createMockStore(options: {
  /**
   * The `schema` to based mokcks on.
   */
  schema: GraphQLSchema,

  /**
   * The mocks functions to use.
   */
  mocks?: Mocks,

  typePolicies?: {
    [typeName: string]: TypePolicy
  }
}): IMockStore {
  return new MockStore(options);
};
