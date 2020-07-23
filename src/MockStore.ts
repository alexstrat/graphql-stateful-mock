import { GraphQLSchema, isObjectType, isScalarType, getNullableType, isListType, GraphQLOutputType } from 'graphql';
import invariant from 'ts-invariant';
import { assertIsDefined } from 'ts-is-defined';
import stringify from 'fast-json-stable-stringify';

import { IMockStore, GetArgs, SetArgs } from './types';

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

// tooo: add configuration
const randomListLength = () => Math.round(Math.random() * 10);

const defaultMocks = {
  'Int': () => Math.round(Math.random() * 200) - 100,
  'Float': () => Math.random() * 200 - 100,
  'String': () => 'Hello World',
  'Boolean': () => Math.random() > 0.5,
  'ID': () => uuidv4(),
}

type TypePolicy = {
  keyField?: string| false;
};

type MockStoreOptions = {
  schema: GraphQLSchema,
  mocks?: Mocks,
  typePolicies?: {
    [typeName: string]: TypePolicy
  }
}

type Entity = {
  [key: string]: unknown
}

export class MockStore implements IMockStore{
  private schema: GraphQLSchema;
  private mocks: Mocks;
  private typePolicies: {
    [typeName: string]: TypePolicy
  };

  private store: { [typeName: string]: { [key: string]: Entity } } = {};

  constructor({ schema, mocks, typePolicies }:MockStoreOptions) {
    this.schema = schema;
    this.mocks = {...defaultMocks, ...mocks};
    this.typePolicies = typePolicies || {};
  }

  get(
    _typeName: string | GetArgs,
    _key?: string,
    _fieldName?: string,
  ) {

    // agument normalization
    let args: GetArgs;
    if (typeof _typeName === 'string') {
      assertIsDefined(_key, 'key was not provided');
      assertIsDefined(_fieldName, 'fieldName was not provided');
      args = {
        typeName: _typeName,
        key: _key,
        fieldName: _fieldName,
      }
    } else {
      args = _typeName;
    }

    const { typeName, key, fieldName, fieldArgs} = args;


    let fieldNameInStore: string = getFieldNameInStore(fieldName, fieldArgs);

    if (
      this.store[typeName] === undefined
      ||
      this.store[typeName][key] === undefined
      ||
      this.store[typeName][key][fieldNameInStore] === undefined
    ) {
      let value;
      if (this.isKeyField(typeName, fieldName)) {
        value = key;
      } else {
        value = this.generateFieldValue(typeName, fieldName);
      }

      this.set({typeName, key, fieldName, fieldArgs, value});
    }

    return this.store[typeName][key][fieldNameInStore];
  }
 
  set(
    _typeName: string | SetArgs,
    _key?: string,
    _fieldName?: string,
    _value?: unknown
  ): void {

    // agument normalization
    let args: SetArgs;
    if (typeof _typeName === 'string') {
      assertIsDefined(_key, 'key was not provided');
      assertIsDefined(_fieldName, 'fieldName was not provided');
      args = {
        typeName: _typeName,
        key: _key,
        fieldName: _fieldName,
        value: _value,
      }
    } else {
      args = _typeName;
    }

    const { typeName, key, fieldName, fieldArgs, value } = args;

    let fieldNameInStore: string = getFieldNameInStore(fieldName, fieldArgs);

    if (this.isKeyField(typeName, fieldName) && value !== key) {
      throw new Error(`Field ${fieldName} is a key field of ${typeName} and you are trying to set it to ${value} while the key is ${key}`);
    }

    if (this.store[typeName] === undefined) {
      this.store[typeName] = {};
    }

    if (this.store[typeName][key] === undefined) {
      this.store[typeName][key] = {};
    }

    this.store[typeName][key] = {
      ...this.store[typeName][key],
      [fieldNameInStore]: value,
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
    

    const fieldType = this.getFieldType(typeName, fieldName);
    return this.generateValueFromType(fieldType);
  }

  private generateValueFromType(fieldType: GraphQLOutputType): unknown {
    const nullableType = getNullableType(fieldType);

    if (isScalarType(nullableType)) {
      invariant(typeof this.mocks[nullableType.name] === 'function', `No mock provided for type ${nullableType.name}`);
      // @ts-ignore don't know
      return this.mocks[nullableType.name]();
    } else if (isObjectType(nullableType)) {
      return { $ref: uuidv4() };
    } else if (isListType(nullableType)) {
      return [...new Array(randomListLength())].map(() => this.generateValueFromType(nullableType.ofType));
    } else {
      throw new Error(`${nullableType} not implemented`,);
    }
  }

  private getFieldType(typeName: string, fieldName: string) {
    const type = this.schema.getType(typeName);

    if (!type || !isObjectType(type)) {
      throw new Error(`${typeName} does not exist on schema or is not an object`);
    }

    const field = type.getFields()[fieldName];

    if(!field) {
      throw new Error(`${fieldName} does not exist on type ${typeName}`);
    }


    return field.type;
  }

  private isKeyField(typeName: string, fieldName: string) {
    if (this.typePolicies[typeName] && this.typePolicies[typeName].keyField !== undefined) {
      if (this.typePolicies[typeName].keyField === false) return false;
      return this.typePolicies[typeName].keyField === fieldName;
    }

    return fieldName === 'id' || fieldName === '_id';
  }
}


const getFieldNameInStore = (fieldName: string, fieldArgs?: string | { [argName: string]: any }) => {
  if (!fieldArgs) return fieldName;

  if (typeof fieldArgs === 'string') {
    return `${fieldName}:${fieldArgs}`;
  }

  // empty args
  if (Object.keys(fieldArgs).length === 0) {
    return fieldName;
  }

  return `${fieldName}:${stringify(fieldArgs)}`;
};
