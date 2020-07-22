import { MockStore } from './MockStore';
import { GraphQLSchema, GraphQLFieldResolver, defaultFieldResolver, GraphQLObjectType } from 'graphql';
import { mapSchema, MapperKind } from '@graphql-tools/utils';

type IMockOptions = {
  schema: GraphQLSchema,
  store: MockStore,
}
// todo: add option to preserver resolver 
// todo: add resolver option
// todo: make optional passing store as option
export function addMocksToSchema({ schema, store }: IMockOptions): GraphQLSchema {

  const mockResolver:GraphQLFieldResolver<any, any> = (source, args, contex, info) => {
    if (source && typeof source === 'object' && typeof source['$ref'] === 'string') {
      return store.get(
        info.parentType.name,
        source['$ref'],
        info.fieldName,
        args
      )
    }

    // we have to handle the root mutation and root query types differently,
    // because no resolver is called at the root
    if (isQueryOrMuationType(info.parentType, info.schema)) {
      return store.get(
        info.parentType.name,
        'ROOT',
        info.fieldName,
        args
      )
    }

    return defaultFieldResolver(source, args, contex, info);
  }

 return mapSchema(schema, {
   [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
     return {
       ...fieldConfig,
       resolve: mockResolver,
     };
    },
 });
}


const isQueryOrMuationType = (type: GraphQLObjectType, schema: GraphQLSchema) => {
  const queryType = schema.getQueryType();
  const isOnQueryType = queryType != null && queryType.name === type.name;

  const mutationType = schema.getMutationType();
  const isOnMutationType = mutationType != null && mutationType.name === type.name;

  return isOnQueryType || isOnMutationType;
};
