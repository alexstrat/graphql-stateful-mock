import { GraphQLSchema, isObjectType, isScalarType, getNullableType, isListType, GraphQLOutputType } from 'graphql';
import invariant from 'ts-invariant';
import { assertIsDefined, isDefined } from 'ts-is-defined';
import stringify from 'fast-json-stable-stringify';

import { IMockStore, GetArgs, SetArgs, isRef, assertIsRef, Ref } from './types';

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
        value = this.generateFieldValue(typeName, fieldName, (otherFieldName, otherValue) => {
          // if we get a key field in the mix we don't care
          if (this.isKeyField(typeName, otherFieldName)) return;

          this.set(typeName, key, otherFieldName, otherValue);
        });
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

    let valueToStore: unknown;
    const fieldType = getNullableType(this.getFieldType(typeName, fieldName));
    
    if (isObjectType(fieldType) && isDefined(value)) {
      if (typeof value !== 'object') throw new Error(`Value to set for ${typeName}.${fieldName} should be an object or null or undefined`);
      assertIsDefined(value, 'Should not be null at this point');
      const joinedTypeName = fieldType.name;

      // @ts-ignore
      valueToStore = this.insert(joinedTypeName, value);
    } else if (isListType(fieldType) && isObjectType(getNullableType(fieldType.ofType)) && isDefined(value)){
      if (!Array.isArray(value)) throw new Error(`Value to set for ${typeName}.${fieldName} should be an array or null or undefined`);

      const joinedTypeName = getNullableType(fieldType.ofType).name;

      valueToStore = value.map((v, index) => {
        if (v === null) return null;
        if (v !== undefined && typeof v !== 'object' ) throw new Error(`Value to set for ${typeName}.${fieldName}[${index}] should be an object or null or undefined but got ${v}`);
        // if v is undefined (empty array slot) it means we just want to generate something
        return this.insert(joinedTypeName, v || {});
      });
    } else {
      valueToStore = value;
    }

    this.store[typeName][key] = {
      ...this.store[typeName][key],
      [fieldNameInStore]: valueToStore,
    };
  }

  private insert(typeName: string, values: { [fieldName: string]: unknown}): Ref {
    const keyFieldName = this.getKeyFieldName(typeName);

    let key: string;
    if (isRef(values)) {
      key = values.$ref;
    } else if (keyFieldName && keyFieldName in values) {
      // @ts-ignore don't know
      key = values[keyFieldName];
    } else {
      key = uuidv4();
    }

    for (const joinedFieldName of Object.keys(values)) {
      if (joinedFieldName === '$ref') continue;
      this.set(
        typeName,
        key,
        joinedFieldName,
        // @ts-ignore don't know
        values[joinedFieldName]
      );
    };

    return { $ref: key };
  }

  private generateFieldValue(
    typeName: string,
    fieldName: string,
    onOtherFieldsGenerated?: (fieldName: string, value: unknown) => void
  ): (unknown | undefined) {
    let value = undefined

    const mock = this.mocks ? this.mocks[typeName] : undefined;
    if (mock) {
      if (typeof mock === 'function') {
        const values = mock();
        if (typeof values !== 'object' || values == null) {
          throw new Error(`Value returned by the mock for ${typeName} is not an object`);
        }
        
        for (const otherFieldName of Object.keys(values)) {
          if (otherFieldName === fieldName) continue;
          onOtherFieldsGenerated && onOtherFieldsGenerated(otherFieldName, (values as any)[otherFieldName]);
        }

        value = (values as any)[fieldName];
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
    const type = this.getType(typeName);

    const field = type.getFields()[fieldName];

    if(!field) {
      throw new Error(`${fieldName} does not exist on type ${typeName}`);
    }


    return field.type;
  }

  private getType(typeName: string) {
    const type = this.schema.getType(typeName);

    if (!type || !isObjectType(type)) {
      throw new Error(`${typeName} does not exist on schema or is not an object`);
    }

    return type;
  }

  private isKeyField(typeName: string, fieldName: string) {
    return this.getKeyFieldName(typeName) === fieldName;
  }

  private getKeyFieldName(typeName: string): string | null {
    const typePolicyKeyField = this.typePolicies[typeName]?.keyField;
    if (typePolicyKeyField !== undefined) {
      if (typePolicyKeyField === false) return null;
      return typePolicyKeyField;
    }

    const gqlType = this.getType(typeName);
    const fieldNames = Object.keys(gqlType.getFields());

    if (fieldNames.includes('id')) return 'id';
    if (fieldNames.includes('_id')) return '+id';

    return null;
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
