**⚠️ DEPRECATED**: the principles of `graphql-stateful-mock` are now part of [GraphQL Tools mocking](https://www.graphql-tools.com/docs/mocking/) v8. See [graphql-tools#2229](https://github.com/ardatan/graphql-tools/pull/2229).

# graphql-stateful-mock

[![npm version](https://badge.fury.io/js/graphql-stateful-mock.svg)](https://badge.fury.io/js/graphql-stateful-mock)

Mock a GraphQL schema — but in a stateful way.

Very similar to [GraphQL Tools mocking](https://www.graphql-tools.com/docs/mocking/) but produce a schema that is:
- **consistent**: the same query with the same arguments will, by default, return the exact same result
- **mutable**: developer can implement mutations that will modify the results for other queries

## Install

```sh
npm install graphql-stateful-mock -D
```

## Usage

```ts
import { makeExecutableSchema } from '@graphql-tools/schema';
import { addMocksToSchema } from 'graphql-stateful-mock';
import { graphql } from 'graphql';

// Fill this in with the schema string
const schemaString = `...`;

// Make a GraphQL schema with no resolvers
const schema = makeExecutableSchema({ typeDefs: schemaString });

// Create a new schema with mocks
const schemaWithMocks = addMocksToSchema({ schema });

const query = `
query tasksForUser {
  user(id: 6) { id, name }
}
`;

graphql(schemaWithMocks, query).then((result) => console.log('Got result', result));

// the same query will produce the exact same result 
graphql(schemaWithMocks, query).then((result) => console.log('Got result 2n time', result));
```

Internally, the state is stored in a `MockStore` that user can use to `get` and `set` mocks values. You can initiate the store independently to access it:

```ts

// Create a MockStore for this schema
const store = createMockStore({ schema });

// Create a new schema with the mock store
const schemaWithMocks = addMocksToSchema({ schema, store });
```

## Recipes

### Customizing mocks

Use the `mocks` option on `addMocksToSchema` to customize the generated mock values.

Define mocks with one function by field:

```ts
const mocks = {
  User: {
    name: () => casual.name(),
  }
}
```

Or by defining one function by type:
```ts
const mocks = {
  User: () => ({
    name: casual.name(),
    age: casual.integer(0, 120),
  }),
}
```

#### Custom scalar

```ts
const mocks = {
  DateTime: () => casual.date(),
}
```

#### Lists

To define a mock for a list, simply return an empty array of the desired length as mock value for the field:

```ts
const mocks = {
  User: {
    friends: () => [...new Array(casual.integer(2, 6))],
  }
}
```

Optionally, you can specify field values for the elements of the list:

```ts
const mocks = {
  User: {
    friends: () => [
      ...new Array(casual.integer(2, 6))
    ]
    // all my friends are between 21 and 30
    .map(() => ({ age: casual.integer(21, 30)})),
  }
}
```

#### Abstract types
If you'd like to provide a mock for an `Union` or `Interface` type, you need to provide the type with an extra `__typename`.

```ts
const typeDefs = `
  ...
  union Result = User | Book
`;
const mocks = {
  Result: () => ({
    __typename: 'User',
    name: casual.name(),
  })
}
```

### Appplying mutations

Use `resolvers` option of `addMocksToSchema` to implement custom resolvers that interact with the store, especially to mutate field values in store.


```ts
const typeDefs = `
type User {
  id: Id!
  name: String!
}
type Query {
  me: User!
}
type Mutation {
  changeMyName(newName: String!): User!
}
`
const schema = makeExecutableSchema({ typeDefs: schemaString });
const schemaWithMocks = addMocksToSchema({
  schema,
  resolvers: (store) => ({
    Mutation: {
      changeMyName: (_, { newName }) => {
        // special singleton types `Query` and `Mutation` will use the key `ROOT`

        // this will set the field value for the `User` entity referenced in field
        // `me` of the singleton `Query`
        store.set('Query', 'ROOT', 'me', { name: newName });

        return store.get('Query', 'ROOT', 'me');
      }
    }
  })
});
```

As a result, any query that queries the field `name` of the `User` referenced in `me` will get the updated value.

Note the sugar signature of `set`:

```ts
store.set('Query', 'ROOT', 'me', { name: newName });

// is equivalent to:
const meRef = store.get('Query', 'ROOT', `me`) as Ref;
store.set(meRef, 'name', newName);
```

### Handling `*byId` fields

By default, `*byId` (like `userById(id: ID!)`) field will return an entity that does not have the same `id` as the one queried. We can fix that:

```ts
const typeDefs = `
type User {
  id: Id!
  name: String!
}
type Query {
  userById(id: ID!): User!
}
`
const schema = makeExecutableSchema({ typeDefs: schemaString });
const schemaWithMocks = addMocksToSchema({
  schema,
  store,
  resolvers: (store) => ({
    Query {
      userById(_, { id }) => store.get('User', id),
    }
  })
});
```

Note that, by default, the `id` or `_id` field will be used as storage key and the store will make sure the storage key and the field value are equal. You can change the key field using the option `typePolicies`.

### Implementing a pagination

The idea is that the store contains the full list, as field value, and that the resolver queries the store and slice the results:

```ts
const typeDefs = `
type User {
  id: Id!
  name: String!
  friends(offset: Int!, limit: Int!): [User!]!
}
type Query {
  me: User!
}
`
const schema = makeExecutableSchema({ typeDefs: schemaString });
const schemaWithMocks = addMocksToSchema({
  schema,
  store,
  resolvers: (store) => ({
    User: {
      // `addMocksToSchema` resolver will pass a `Ref` as `parent`
      // it contains a key to the `User` we are dealing with
      friends: (userRef, { offset, limit }) => {
        // this will generate and store a list of `Ref`s to some `User`s
        // next time we go thru this resolver (with same parent), the list
        // will be the same
        const fullList = store.get(userRef, 'friends') as Ref[];

        // actually apply pagination slicing
        return fullList.slice(offset, offset + limit)
      }
    }
  })
});
```

#### Relay-style pagination
The principles stay the same than for basic pagination:

```ts
const typeDefs = `
type User {
  id: Id!
  name: String!
  friends(offset: Int!, limit: Int!): FriendsConnection;
}
type FriendsConnection {
  totalCount: Int!
  edges: [FriendConnectionEdge!]!
}
type FriendsConnectionEdge {
  node: User!
}
type Query {
  me: User!
}
`
const schema = makeExecutableSchema({ typeDefs: schemaString });
const store = createMockStore({ schema });
const schemaWithMocks = addMocksToSchema({
  schema,
  store,
  resolvers: (store) => ({
    User: {
      friends: (userRef, { offset, limit }) => {

        const connectionRef = store.get(userRef, 'friends', 'edges');

        return {
          totalCount: edgesFullList.length,
          edges: edgesFullList.slice(offset, offset + limit)
      }
    }
  })
});
```

## Related
- [graphql-tools#1682](https://github.com/ardatan/graphql-tools/issues/1682): [Feature request] Mocking: access generated mock objects for individual queries and mutations.
- [`fejk-ql`](https://github.com/alepek/fejk-ql): a stateless GraphQL mock with stateful capabilities.
