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
});

describe('snaxios against an unreachable host', () => {
  test('a network-level failure is caught and returns the generic snaxios error with a 500', async () => {
    const result = await snaxios<never>('http://localhost:1', { method: 'GET', headers: {} });

    expect(result.status).toBe(500);
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('snaxios_error');
  });
});
