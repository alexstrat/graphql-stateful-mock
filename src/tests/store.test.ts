import { buildSchema } from 'graphql';
import { createMockStore } from '..';
import { assertIsRef, Ref } from '../types';

const typeDefs = `
type User {
  id: ID!
  age: Int!
  name: String!
  surnames: [String!]!

  friends: [User!]!

  sex: Sex
}

enum Sex {
  Male,
  Female,
  Other
}

type Query {
  viewer: User!
  userById(id: ID!): User!
}
`;

const schema = buildSchema(typeDefs);

describe('MockStore', () => {
  it('should generate a value properly without provided mocks', () => {
    const store = createMockStore({ schema });
    expect(store.get('User', '123', 'name')).toEqual('Hello World');
  });

  it('should generate a value properly without provided mocks (enum)', () => {
    const store = createMockStore({ schema });
    const value = store.get('User', '123', 'sex') as string;
    expect(['Male', 'Female', 'Other'].indexOf(value)).not.toEqual(-1);
  });

  it('should generate an id that matches key', () => {
    const store = createMockStore({ schema });
    store.get('User', '123', 'name');

    expect(store.get('User', '123', 'id')).toEqual('123');
  });

  it('should return the same value when called multiple times', () => {
    const store = createMockStore({ schema });
    expect(store.get('User', '123', 'age')).toEqual(store.get('User', '123', 'age'));
  });

  it('should return the same value when called multiple times with same args', () => {
    const store = createMockStore({ schema });
    const user1 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '1' }
    });

    assertIsRef(user1);

    const user1Bis = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '1' }
    });

    assertIsRef(user1Bis);

    expect(user1.$ref).toEqual(user1Bis.$ref);
  });

  it('should treat empty object args the same as no arg', () => {
    const store = createMockStore({ schema });
    const user1 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'viewer',
      fieldArgs: {}
    });

    assertIsRef(user1);

    const user1Bis = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'viewer',
    });

    assertIsRef(user1Bis);

    expect(user1.$ref).toEqual(user1Bis.$ref);
  })

  it('sould return a different value if called with different field args', () => {
    const store = createMockStore({ schema });
    const user1 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '1' }
    });

    assertIsRef(user1);

    const user2 = store.get({
      typeName: 'Query',
      key: 'ROOT',
      fieldName: 'userById',
      fieldArgs: { id: '2' }
    });

    assertIsRef(user2);

    expect(user1.$ref).not.toEqual(user2.$ref);
  });

  it('should return a ref when called with no `fieldName`', () => {
    const store = createMockStore({ schema });

    const user = store.get('User', '123');

    expect(user).toHaveProperty('$ref');
    assertIsRef(user);

    expect(user.$ref.key).toEqual('123');
  })

  it('should return a random ref when called with no `fieldName` nor `key`', () => {
    const store = createMockStore({ schema });

    const user = store.get('User');

    expect(user).toHaveProperty('$ref');
  })

  it('should support multiple `fieldnames` for ref traversal', () => {
    const store = createMockStore({ schema });

    const friends = store.get('Query', 'ROOT', ['viewer', 'friends']);

    expect(Array.isArray(friends)).toBeTruthy();
  })

  it('should respect provided mocks', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: {
          name: () => 'Superman',
        }
      }
    });
    expect(store.get('User', '123', 'name')).toEqual('Superman');
  });

  it('with type level mocks, it should produce consistant values', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: () => {
          const charCode = 65 + Math.round(Math.random() * 25);
          return {
            age: charCode,
            name: String.fromCharCode(charCode),
          }
        }
      }
    });

    const age = store.get('User', '123', 'age') as number;
    
    expect(store.get('User', '123', 'name')).toEqual(String.fromCharCode(age));
  })

  it('should support nested mocks', () => {
    const store = createMockStore({
      schema,
      mocks: {
        User: {
          friends: () => [{ age: 21 }, { age: 22 }]
        }
      }
    });

    const friendsRefs = store.get('User', '123', 'friends') as Ref[];
    expect(friendsRefs).toHaveLength(2);
    const friendsAges = friendsRefs.map(ref => store.get('User', ref.$ref.key, 'age')).sort();
    expect(friendsAges).toEqual([21, 22]);
  });

  it('should generate a ref when the field is a type', () => {
    const store = createMockStore({ schema });
    const value = store.get('Query', 'ROOT', 'viewer');
    expect(value).toHaveProperty('$ref');
  });

  it('should be able to generate a list of scalar types', () => {
    const store = createMockStore({ schema });
    const surnames = store.get('User', '123', 'surnames') as string[];

    expect(surnames).toBeInstanceOf(Array);
    expect(typeof surnames[0]).toBe('string');
  });


  it('should be able to generate a list of Object type', () => {
    const store = createMockStore({ schema });
    const friends = store.get('User', '123', 'friends');

    expect(friends).toBeInstanceOf(Array);
    //@ts-ignore
    expect(friends[0]).toHaveProperty('$ref');
  });

  it('should support multiple field set', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', {
      name: 'Alexandre',
      age: 31,
    });

    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('should support nested set', () => {
    const store = createMockStore({ schema });

    store.set('Query', 'ROOT', 'viewer', {
      id: 'me',
      name: 'Alexandre',
      age: 31,
    });

    expect(store.get('Query', 'ROOT', 'viewer')).toEqual({ $ref: { key: 'me', typeName: 'User' }});
    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('nested set should not override ref', () => {
    const store = createMockStore({ schema });

    store.set('Query', 'ROOT', 'viewer', {
      id: 'me',
    });

    store.set('Query', 'ROOT', 'viewer', {
      name: 'Alexandre',
    });

    expect(store.get('Query', 'ROOT', 'viewer')).toEqual({ $ref: { key: 'me', typeName: 'User' } });
    expect(store.get('User', 'me', 'name')).toEqual('Alexandre');
  });

  it('should support nested set with list', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', 'friends', [
      {
        name: 'Ross'
      }, {
        name: 'Nico'
      }, {
        name: 'Trev'
    }]);

    const myFriendsRefs = store.get('User', 'me', 'friends') as Ref[];
    expect(myFriendsRefs).toHaveLength(3);

    const MyFriendsNames = myFriendsRefs.map(ref => store.get('User', ref.$ref.key, 'name')).sort();
    expect(MyFriendsNames).toEqual(['Nico', 'Ross', 'Trev']);
  });

  it('should support nested set with empyt list', () => {
    const store = createMockStore({ schema });

    store.set('User', 'me', 'friends', [...new Array(2)]);

    const myFriendsRefs = store.get('User', 'me', 'friends') as Ref[];
    expect(myFriendsRefs).toHaveLength(2);

    // should retrurn array of valid refs
    expect(myFriendsRefs[0]).toHaveProperty('$ref')
  });

  it('should support ID of type number', () => {
    const typeDefs = `
      type User {
        id: Int!
        name: String!
      }

      type Query {
        viewer: User!
        userById(id: Int!): User!
      }
    `;

    const schema = buildSchema(typeDefs);

    const store = createMockStore({ schema });
    const user = store.get('Query', 'ROOT', 'viewer') as Ref<number>;
    expect(typeof user.$ref.key).toBe('number');
  });

  describe('default values', () => {
    it('should be inserted when called with no key', () => {
      const store = createMockStore({ schema });

      const alexRef = store.get('User', { name: 'Alexandre'}) as Ref;

      expect(store.get('User', alexRef.$ref.key, 'name')).toEqual('Alexandre');
    });

    it('should be inserted when called with a key', () => {
      const store = createMockStore({ schema });

      const alexRef = store.get('User', 'me', { name: 'Alexandre'}) as Ref;

      expect(store.get('User','me', 'name')).toEqual('Alexandre');
    });

    it('should not override', () => {
      const store = createMockStore({ schema });

      store.set('User', 'me', 'name', 'Alexandre');
      store.get('User', 'me', { name: 'Matthias'}) as Ref;

      expect(store.get('User','me', 'name')).toEqual('Alexandre');
    });
  })
});