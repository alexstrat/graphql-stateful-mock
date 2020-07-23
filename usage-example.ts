import { buildSchema } from 'graphql';
import { MockStore } from './src';

const typeDefs = `
type User {
  id: ID!
  name: String!
}

type Query {
  viewer: User!
  userById(id: ID!): User!
}
`;

const schema = buildSchema(typeDefs);

const store = new MockStore({
  schema,
  mocks : {
    User: {
      // @ts-ignore
      name: () => 'Supername',
    }
  }
});

console.log(store.get('User', 'me', 'name'));



store.set('User', 'me', 'name', 'Alexandre');
console.log(store.get('User', 'me', 'name'));
console.log(store.get('User', 'other', 'name'));

console.log(store.get('Query', 'ROOT', 'viewer'));

// @ts-ignore
console.log(store.store)