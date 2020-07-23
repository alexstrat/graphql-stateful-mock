import { GraphQLSchema, GraphQLFieldResolver, defaultFieldResolver, GraphQLObjectType } from 'graphql';
import { mapSchema, MapperKind, IResolvers } from '@graphql-tools/utils';
import { addResolversToSchema } from '@graphql-tools/schema';
import { MockStore } from './MockStore';
import { isRef } from './types';

type IMockOptions = {
  schema: GraphQLSchema,
  store: MockStore,
  resolvers?: IResolvers,
}
// todo: add option to preserver resolver
// todo: make optional passing store as option
export function addMocksToSchema({ schema, store, resolvers }: IMockOptions): GraphQLSchema {

  const mockResolver:GraphQLFieldResolver<any, any> = (source, args, contex, info) => {
    if (isRef(source)) {
      return store.get({
        typeName: info.parentType.name,
        key: source.$ref,
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
