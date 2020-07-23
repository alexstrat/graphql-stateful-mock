import { buildSchema, graphql } from 'graphql';
import { MockStore, addMocksToSchema, assertIsRef } from '..';

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

type Mutation {
  changeViewerName(newName: String!): User!
}
`;

const schema = buildSchema(typeDefs);

describe('addMocksToSchema', () => {
  it('basic', async () => {
    const query = `
      query {
        viewer {
          id
          name
          age
        }
      }
      `;
    const store = new MockStore({ schema });

    const mockedSchema = addMocksToSchema({ schema, store });
    const { data, errors } = await graphql({
      schema: mockedSchema,
      source: query,
    });


    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    expect(typeof data!['viewer']['id']).toBe('string')
    expect(typeof data!['viewer']['name']).toBe('string')
    expect(typeof data!['viewer']['age']).toBe('number');

    const { data: data2 } = await graphql({
      schema: mockedSchema,
      source: query,
    });

    expect(data2!['viewer']['id']).toEqual(data!['viewer']['id']);
  });

  it('mutations resolver', async () => {
    const store = new MockStore({ schema });
    const mockedSchema = addMocksToSchema({ schema, store, resolvers: {
      Mutation: {
        changeViewerName: (_, { newName }: { newName: string} ) => {
          const viewer = store.get('Query', 'ROOT', 'viewer');
          assertIsRef(viewer);

          store.set('User', viewer.$ref, 'name', newName);
          return store.get('Query', 'ROOT', 'viewer');
        }
      }
    }});

    const { data: data1 } = await graphql({
      schema: mockedSchema,
      source: `query { viewer { name }}`,
    });

    const { data: data2 } = await graphql({
      schema: mockedSchema,
      source: `mutation { changeViewerName(newName: "Alexandre") { name } }`,
    });

    const { data: data3 } = await graphql({
      schema: mockedSchema,
      source: `query { viewer { name }}`,
    });

    expect(data3!['viewer']['name']).toEqual('Alexandre');
    expect(data3!['viewer']['name']).toEqual('Alexandre');
  });
});