import { buildSchema } from 'graphql';
import { MockStore } from '..';

const typeDefs = `
type User {
  id: ID!
  age: Int!
  name: String!
}

type Query {
  viewer: User!
  userById(id: ID!): User!
}
`;

const schema = buildSchema(typeDefs);

describe('MockStore', () => {
  it('should generate a value properly without provided mocks', () => {
    const store = new MockStore({ schema });
    expect(store.get('User', '123', 'name')).toEqual('Hello World');
  });

  it('should generate an id that matches key', () => {
    const store = new MockStore({ schema });
    store.get('User', '123', 'name');

    expect(store.get('User', '123', 'id')).toEqual('123');
  });

  it('should return the same value when called multiple times', () => {
    const store = new MockStore({ schema });
    expect(store.get('User', '123', 'age')).toEqual(store.get('User', '123', 'age'));

  })
  it('should respect provided mocks', () => {
    const store = new MockStore({
      schema,
      mocks: {
        User: {
          name: () => 'Superman',
        }
      }
    });
    expect(store.get('User', '123', 'name')).toEqual('Superman');
  });

  it('should generate a ref when the field is a type', () => {
    const store = new MockStore({ schema });
    const value = store.get('Query', 'ROOT', 'viewer');
    expect(value).toHaveProperty('$ref');
  });
});