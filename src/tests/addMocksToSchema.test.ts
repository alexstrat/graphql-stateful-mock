import { buildSchema, graphql } from 'graphql';
import { MockStore, addMocksToSchema } from '..';

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

    const newSchema = addMocksToSchema({ schema, store });
    const { data, errors } = await graphql({
      schema: newSchema,
      source: query,
    });


    expect(errors).not.toBeDefined();
    expect(data).toBeDefined();
    expect(typeof data!['viewer']['id']).toBe('string')
    expect(typeof data!['viewer']['name']).toBe('string')
    expect(typeof data!['viewer']['age']).toBe('number');

    const { data: data2 } = await graphql({
      schema: newSchema,
      source: query,
    });

    expect(data2!['viewer']['id']).toEqual(data!['viewer']['id']);
  });

});