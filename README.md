# graphql-stateful-mock

[![npm version](https://badge.fury.io/js/graphql-stateful-mock.svg)](https://badge.fury.io/js/graphql-stateful-mock)

**🚧 still at proof of concept stage**

Mock a GraphQL schema — but in a stateful way.

Very similar to [GraphQL tools mocking](https://www.graphql-tools.com/docs/mocking/) but produce a schema that is:
- **consistent**: the same query with the same arguments will, by default, return the exact same result
- **mutable**: developer can implement mutations that will modify the results for other queries

## Install

```sh
npm install graphql-stateful-mock -D
```

## Usage

```ts
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createMockStore, addMocksToSchema } from 'graphql-stateful-mock';
import { graphql } from 'graphql';

// Fill this in with the schema string
const schemaString = `...`;

// Make a GraphQL schema with no resolvers
const schema = makeExecutableSchema({ typeDefs: schemaString });

// Create a mocks store for this schema
const store = createMockStore({ schema });

// Create a new schema with mocks
const schemaWithMocks = addMocksToSchema({ schema, store });

const query = `
query tasksForUser {
  user(id: 6) { id, name }
}
`;

graphql(schemaWithMocks, query).then((result) => console.log('Got result', result));

// the same query will produce the exact same result 
graphql(schemaWithMocks, query).then((result) => console.log('Got result 2n time', result));
```

## Recipes

### Customize mock generators

### Dealing with mutations

### Dealing with arguments

### Dealing with lists

### Dealing with pagination

#### Relay-style pagination

## Caveats

- Abstract types are not handled properly

## Related
- [graphql-tools#1682](https://github.com/ardatan/graphql-tools/issues/1682): [Feature request] Mocking: access generated mock objects for individual queries and mutations.
- [`fejk-ql`](https://github.com/alepek/fejk-ql): a stateless GraphQL mock with stateful capabilities.
