import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { snaxios } from '../snaxios';
import { createMockServer } from '../mockBackend/server';
import type { MockServer } from '../mockBackend/server';
import type { Todo } from '../typedefs/todo';

describe('snaxios against a read-only mock backend', () => {
  let server: MockServer;
  let baseUrl: string;

  beforeAll(() => {
    server = createMockServer();
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  test('request with no headers returns a 401 with the error propagated to the snaxios error shape', async () => {
    const result = await snaxios<Todo[]>(`${baseUrl}/todos`, { method: 'GET', headers: {} });

    expect(result.status).toBe(401);
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Missing or invalid API key');
  });

  test('GET with proper api key and no params returns the expected data with a 200', async () => {
    const result = await snaxios<Todo[]>(`${baseUrl}/todos`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);
    expect(result.data?.[0]?.title).toBe('Buy snacks');
  });

  test('GET with proper api key and a limit param returns data limited to that number with a 200', async () => {
    const result = await snaxios<Todo[]>(`${baseUrl}/todos`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
      params: { limit: 2 },
    });

    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  test('GET from a route with a thrown plain string error returns the generic snaxios error with a 500', async () => {
    const result = await snaxios<never>(`${baseUrl}/error/string`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('snaxios_error');
    expect(result.error?.message).toBe('Snaxios Error');
  });

  test('GET from a route with a returned error with only a message returns a modified snaxios error with a 500', async () => {
    const result = await snaxios<never>(`${baseUrl}/error/message`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('snaxios_error');
    expect(result.error?.message).toBe('a thrown error with only a message');
  });

  test('GET from a route with a dataerror-formatted error returns the dataerror-formatted error in full', async () => {
    const result = await snaxios<never>(`${baseUrl}/error/dataerror`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.error).toEqual({
      code: 'mock_dataerror',
      message: 'a fully-typed dataerror error',
      details: 'This error was thrown in the full dataerror shape.',
      hint: 'This is a mock hint for testing purposes.',
    });
  });

  test('GET for a todo that does not exist returns a propagated 404 in the snaxios error shape', async () => {
    const result = await snaxios<Todo>(`${baseUrl}/todos/999`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(result.status).toBe(404);
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Todo not found');
  });

  test("returned data is of the same shape as the type passed in as snaxios' generic", async () => {
    // generics erase at runtime, so the closest we can assert here is that every field
    // declared on Todo is present on the data with the right runtime type.
    const result = await snaxios<Todo[]>(`${baseUrl}/todos`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    for (const todo of result.data ?? []) {
      expect(typeof todo.id).toBe('number');
      expect(typeof todo.title).toBe('string');
      expect(typeof todo.completed).toBe('boolean');
    }
  });

  test('multiple params are all serialized onto the query string', async () => {
    const result = await snaxios<Record<string, string>>(`${baseUrl}/echo/query`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
      params: { limit: 2, completed: true },
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ limit: '2', completed: 'true' });
  });

  test('params with values needing URL-encoding are encoded and decoded back to the original value', async () => {
    const result = await snaxios<Record<string, string>>(`${baseUrl}/echo/query`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
      params: { search: 'snacks & chips = yummy 🍿' },
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ search: 'snacks & chips = yummy 🍿' });
  });

  test('an empty params object hits the same code path as no params at all', async () => {
    const result = await snaxios<Todo[]>(`${baseUrl}/todos`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
      params: {},
    });

    expect(result.status).toBe(200);
    expect(result.data).toHaveLength(3);
  });

  test('a response body that is not valid JSON is caught rather than crashing, and returns a snaxios error shape with a 500', async () => {
    const result = await snaxios<never>(`${baseUrl}/malformed-json`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    // the JSON parse failure is a real thrown SyntaxError, so it carries its own `.message` -
    // checkHasMessage surfaces that message rather than falling all the way back to the fully
    // generic snaxios error text, while code/details/hint stay generic.
    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('snaxios_error');
    expect(typeof result.error?.message).toBe('string');
    expect(result.error?.message.length).toBeGreaterThan(0);
  });
});

describe('snaxios against a mutating mock backend', () => {
  let server: MockServer;
  let baseUrl: string;

  beforeEach(() => {
    server = createMockServer();
    baseUrl = `http://localhost:${server.port}`;
  });

  afterEach(() => {
    server.stop();
  });

  test('POST with proper api key and body creates a todo, and a subsequent GET reflects it with a 200', async () => {
    const postResult = await snaxios<Todo>(`${baseUrl}/todos`, {
      method: 'POST',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'a new todo', completed: false }),
    });

    expect(postResult.status).toBe(201);
    expect(postResult.error).toBeNull();

    const getResult = await snaxios<Todo[]>(`${baseUrl}/todos`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(getResult.status).toBe(200);
    expect(getResult.data).toHaveLength(4);
    expect(getResult.data?.some((todo) => todo.title === 'a new todo')).toBe(true);
  });

  test('PUT with proper api key and body replaces a todo, and a subsequent GET reflects it with a 200', async () => {
    const putResult = await snaxios<Todo>(`${baseUrl}/todos/1`, {
      method: 'PUT',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'replaced todo', completed: true }),
    });

    expect(putResult.status).toBe(200);
    expect(putResult.error).toBeNull();

    const getResult = await snaxios<Todo>(`${baseUrl}/todos/1`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(getResult.status).toBe(200);
    expect(getResult.data).toEqual({ id: 1, title: 'replaced todo', completed: true });
  });

  test('PATCH with proper api key and body partially updates a todo, and a subsequent GET reflects it with a 200', async () => {
    const patchResult = await snaxios<Todo>(`${baseUrl}/todos/1`, {
      method: 'PATCH',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });

    expect(patchResult.status).toBe(200);
    expect(patchResult.error).toBeNull();

    const getResult = await snaxios<Todo>(`${baseUrl}/todos/1`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(getResult.status).toBe(200);
    expect(getResult.data).toEqual({ id: 1, title: 'Buy snacks', completed: true });
  });

  test('DELETE with proper api key removes a todo, and a subsequent GET of the list reflects it with a 200', async () => {
    const deleteResult = await snaxios<Todo>(`${baseUrl}/todos/1`, {
      method: 'DELETE',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(deleteResult.status).toBe(200);
    expect(deleteResult.error).toBeNull();

    const getResult = await snaxios<Todo[]>(`${baseUrl}/todos`, {
      method: 'GET',
      headers: { 'x-api-key': server.apiKey },
    });

    expect(getResult.status).toBe(200);
    expect(getResult.data).toHaveLength(2);
    expect(getResult.data?.some((todo) => todo.id === 1)).toBe(false);
  });

  test('PUT to a todo that does not exist returns a propagated 404 in the snaxios error shape', async () => {
    const result = await snaxios<Todo>(`${baseUrl}/todos/999`, {
      method: 'PUT',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'does not matter', completed: false }),
    });

    expect(result.status).toBe(404);
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Todo not found');
  });

  test('PATCH to a todo that does not exist returns a propagated 404 in the snaxios error shape', async () => {
    const result = await snaxios<Todo>(`${baseUrl}/todos/999`, {
      method: 'PATCH',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });

    expect(result.status).toBe(404);
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Todo not found');
  });

  test('a partial PUT body fully replaces the todo, dropping fields the body omitted', async () => {
    const putResult = await snaxios<Todo>(`${baseUrl}/todos/2`, {
      method: 'PUT',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'only a title' }),
    });

    expect(putResult.status).toBe(200);
    // todo 2 started as { title: 'Refactor Axios into Snaxios', completed: true } - PUT must not
    // carry `completed` forward from the old record just because the body omitted it.
    expect(putResult.data).toEqual({ id: 2, title: 'only a title', completed: false });
  });

  test('a partial PATCH body merges onto the existing todo instead of replacing it', async () => {
    const patchResult = await snaxios<Todo>(`${baseUrl}/todos/2`, {
      method: 'PATCH',
      headers: { 'x-api-key': server.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ completed: false }),
    });

    expect(patchResult.status).toBe(200);
    // unlike PUT, PATCH must preserve the pre-existing title since the body didn't include it.
    expect(patchResult.data).toEqual({ id: 2, title: 'Refactor Axios into Snaxios', completed: false });
  });
});

describe('snaxios against an unreachable host', () => {
  test('a network-level failure is caught and returns the generic snaxios error with a 500', async () => {
    const result = await snaxios<never>('http://localhost:1', { method: 'GET', headers: {} });

    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('snaxios_error');
  });
});
