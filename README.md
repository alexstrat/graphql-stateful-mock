# Usage


```ts
import { MockStore } from 'graphql-mock-store';

const schema = buildClientSchema(introspectionResult);

const store = new MockStore({
  schema,
  mocks: {
  }
});

store.get('User', id, 'name');

store.modify('User', id, 'name', newName);

// store.getList('User', id, { defaultLength: 10 });

addMockToSchema({
  schema,
  mockStore,
});


const mockResolver = (obj, ) => {
  if(scalar) return obj[fieldName];
  if (isRef(obj[fieldName])) {
    const { typeName, id } = obj[fieldName]);
    return store.get(typeName, id)
  }

}