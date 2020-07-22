import { GraphQLSchema, isObjectType, isScalarType, getNullableType } from 'graphql';
import invariant from 'ts-invariant';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line eqeqeq
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type Mocks = {
    [typeOrScalarName: string]:
      (() => { [fieldName: string]: unknown } | unknown)
      |
      { [fieldName: string]: () => unknown}
};

const defaultMocks = {
  'Int': () => Math.round(Math.random() * 200) - 100,
  'Float': () => Math.random() * 200 - 100,
  'String': () => 'Hello World',
  'Boolean': () => Math.random() > 0.5,
  'ID': () => uuidv4(),
}

type MockStoreOptions = {
  schema: GraphQLSchema,
  mocks?: Mocks,
}

type Entity = {
  [key: string]: unknown
}

export class MockStore {
  private schema: GraphQLSchema;
  private mocks: Mocks;

  private store: { [typeName: string]: { [key: string]: Entity } } = {};

  constructor({ schema, mocks }:MockStoreOptions) {
    this.schema = schema;
    this.mocks = {...defaultMocks, ...mocks};
  }

  get(
    typeName: string,
    key: string,
    fieldName: string,
    args?: object
  ) {
    // invariant(variables, 'Not implemented');

    if (
      this.store[typeName] === undefined
      ||
      this.store[typeName][key] === undefined
      ||
      this.store[typeName][key][fieldName] === undefined
    ) {
      const value = this.generateFieldValue(typeName, fieldName);
      this.modify(typeName, key, fieldName, value);
    }

    return this.store[typeName][key][fieldName];
  }

  modify(typeName: string, key: string, fieldName: string, value: unknown) {
    if (this.store[typeName] === undefined) {
      this.store[typeName] = {};
    }

    if (this.store[typeName][key] === undefined) {
      this.store[typeName][key] = {};
    }

    this.store[typeName][key] = {
      ...this.store[typeName][key],
      [fieldName]: value,
    };
  }

  private generateFieldValue(typeName: string, fieldName: string): (unknown | undefined) {
    let value = undefined

    const mock = this.mocks ? this.mocks[typeName] : undefined;
    if (mock) {
      if (typeof mock === 'function') {
        const values = mock();
        // TODO: handle other values

        if (typeof values !== 'object' || values == null) {
          throw new Error(`Value return by the mock for ${typeName} is not an object`);
        }
        // @ts-ignore don't know
        value = values[fieldName];
      } else if (typeof mock[fieldName] === 'function') {
        // @ts-ignore don't know
        value = mock[fieldName]();
      }
    }

    if (value) return value;

    const fieldType = this.getNonNullableFieldType(typeName, fieldName);
    if(isScalarType(fieldType)) {
      invariant(typeof this.mocks[fieldType.name] === 'function', `No mock provided for type ${fieldType.name}`);
      // @ts-ignore don't know
      value = this.mocks[fieldType.name]();
    } else if (isObjectType(fieldType)) {
      value = { $ref: uuidv4() };
    } else {
      throw new Error(`${fieldType} not implemented`, );
    }

    return value;
  }

  private getNonNullableFieldType(typeName: string, fieldName: string) {
    const type = this.schema.getType(typeName);

    if (!type || !isObjectType(type)) {
      throw new Error(`${typeName} does not exist on schema or is not an object`);
    }

    const field = type.getFields()[fieldName];

    if(!field) {
      throw new Error(`${fieldName} does not exist on type ${typeName}`);
    }

    return getNullableType(field.type);
  }
}

