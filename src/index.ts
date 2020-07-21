import { GraphQLSchema, isObjectType, isScalarType, getNullableType } from 'graphql';

const toEntityStoreKey = (typeName: string, id: string) => `${typeName}:${id}`;

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line eqeqeq
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type MockStoreOptions = {
  schema: GraphQLSchema,
}

type Entity = {
  [key: string]: unknown
}

export class MockStore {
  private schema: GraphQLSchema;

  private store: { [key: string]: Entity } = {};

  constructor({ schema }:MockStoreOptions) {
    this.schema = schema;
  }

  get(typeName: string, id: string) {
    if (this.store[toEntityStoreKey(typeName, id)]) {
      return this.store[toEntityStoreKey(typeName, id)];
    }
    const type = this.schema.getType(typeName);
    if (!type || !isObjectType(type)) {
      throw new Error(`${typeName} does not exist on schema or is not an object`);
    }

    const entity: Entity = {};
    for (const fieldName in type.getFields()) {
      const field = type.getFields()[fieldName];
      console.log(field.type)
      if (fieldName === 'id') {
        entity[fieldName] = id;
      } else if (isScalarType(getNullableType(field.type))) {
        entity[fieldName] = uuidv4();
      }
    }

    this.store[toEntityStoreKey(typeName, id)] = entity;

    return entity;
  }

  modify(typeName: string, id: string, modifiers: Partial<Entity>) {
    const entity = this.store[toEntityStoreKey(typeName, id)];
    if (!entity) {
      throw new Error(`No ${ typeName } with id ${ id }`);
    }

    this.store[toEntityStoreKey(typeName, id)] = { ...entity, ...modifiers};

    return this.store[toEntityStoreKey(typeName, id)];
  }
}

