import { GraphQLSchema, GraphQLFieldResolver, defaultFieldResolver, GraphQLObjectType } from 'graphql';
import { mapSchema, MapperKind, IResolvers } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { isRef, IMockStore } from './types';

type IMockOptions = {
  schema: GraphQLSchema,
  store: IMockStore,
  resolvers?: IResolvers,
}

// todo: add option to preserve resolver
/**
 * Given a `schema` and a `MockStore`, returns an executable schema that
 * will use the provided `MockStore` to execute queries.
 * 
 * ```ts
 * const schema = buildSchema(`
 *  type User {
 *    id: ID!
 *    name: String!
 *  }
 *  type Query {
 *    me: User!
 *  }
 * `)
 * 
 * const store = createMockStore({ schema });
 * const mockedSchema = addMocksToSchema({ schema, store });
 * ```
 *
 *
 * If a `resolvers` parameter is passed, the query execution will use
 * the provided `resolvers` if, one exists, instead of the default mock
 * resolver.
 * 
 * 
 * ```ts
 * const schema = buildSchema(`
 *   type User {
 *     id: ID!
 *     name: String!
 *   }
 *   type Query {
 *     me: User!
 *   }
 *   type Mutation {
 *     setMyName(newName: String!): User!
 *   }
 * `)
 *
 * const store = createMockStore({ schema });
 * const mockedSchema = addMocksToSchema({
 *   schema,
 *   store,
 *   resolvers: {
 *     Mutation: {
 *       setMyName: (_, { newName }) => {
 *          const ref = store.get('Query', 'ROOT', 'viewer');
 *          store.set(ref, 'name', newName);
 *          return ref;
 *       }
 *     }
 *   }
 *  });
 * ```
 * 
 * 
 * `Query` and `Mutation` type will use `key` `'ROOT'`. 
 */
export function addMocksToSchema({ schema, store, resolvers }: IMockOptions): GraphQLSchema {

  const mockResolver:GraphQLFieldResolver<any, any> = (source, args, contex, info) => {
    if (isRef(source)) {
      return store.get({
        typeName: source.$ref.typeName,
        key: source.$ref.key,
        fieldName: info.fieldName,
        fieldArgs: args,
      });
    }

    // we have to handle the root mutation and root query types differently,
    // because no resolver is called at the root
    if (isQueryOrMuationType(info.parentType, info.schema)) {
      return store.get({
        typeName: info.parentType.name,
        key: 'ROOT',
        fieldName: info.fieldName,
        fieldArgs: args,
      });
    }

    return defaultFieldResolver(source, args, contex, info);
  }

  const schemaWithMocks = mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      return {
        ...fieldConfig,
        resolve: mockResolver,
      };
      },
  });

  return resolvers ? addResolversToSchema(schemaWithMocks, resolvers) : schemaWithMocks;
}


const isQueryOrMuationType = (type: GraphQLObjectType, schema: GraphQLSchema) => {
  const queryType = schema.getQueryType();
  const isOnQueryType = queryType != null && queryType.name === type.name;

  const mutationType = schema.getMutationType();
  const isOnMutationType = mutationType != null && mutationType.name === type.name;

  return isOnQueryType || isOnMutationType;
};
