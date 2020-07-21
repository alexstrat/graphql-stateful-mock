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
  schema
});

console.log(store.get('User', 'fooo'));

store.get({
  typeName: 'User'
  id: 'foo',
  fieldName: 'name',
  arguments: {u: 1},
})
store.modify('User', 'fooo', { name: 'Alexandre'})

console.log(store.get('User', 'fooo'));

console.log(store.get('User', 'fobaroo'));