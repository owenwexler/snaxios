/*
 * Self-contained mock CRUD backend used only for testing snaxios.ts.
 * Route handlers throw errors instead of returning them, so that the
 * central toErrorResponse() converter is the single place that shapes
 * error responses - this is what lets our tests exercise snaxios'
 * handling of thrown/non-2xx errors coming back from a real HTTP server.
 */
import todosFixture from './fixtures/todos.json';
import type { Todo } from '../typedefs/todo';

interface DataErrorExtra {
  code: string;
  details: string;
  hint: string;
}

class HttpError extends Error {
  status: number;
  code?: string;
  details?: string;
  hint?: string;

  constructor(status: number, message: string, extra?: DataErrorExtra) {
    super(message);

    this.status = status;

    if (extra) {
      this.code = extra.code;
      this.details = extra.details;
      this.hint = extra.hint;
    }
  }
}

const requireApiKey = (req: Request, apiKey: string) => {
  const suppliedKey = req.headers.get('x-api-key');

  if (suppliedKey !== apiKey) {
    throw new HttpError(401, 'Missing or invalid API key');
  }
};

const toErrorResponse = (err: unknown): Response => {
  if (err instanceof HttpError) {
    const body =
      err.code && err.details && err.hint
        ?
          { code: err.code, message: err.message, details: err.details, hint: err.hint }
        :
          { message: err.message };

    return Response.json(body, { status: err.status });
  }

  if (typeof err === 'string') {
    return Response.json({ error: err }, { status: 500 });
  }

  return Response.json({ error: 'Unknown mock server error' }, { status: 500 });
};

export interface MockServer {
  port: number;
  apiKey: string;
  stop: () => void;
}

const DEFAULT_PORT = 4400;

export const createMockServer = (): MockServer => {
  const apiKey = process.env.MOCK_API_KEY ?? 'snaxios-test-key';

  let todos: Todo[] = structuredClone(todosFixture) as Todo[];
  let nextId = todos.length + 1;

  const buildServer = (port: number) => Bun.serve({
    port,
    routes: {
      '/todos': {
        GET: (req) => {
          try {
            requireApiKey(req, apiKey);

            const url = new URL(req.url);
            const limitParam = url.searchParams.get('limit');
            const limit = limitParam ? Number(limitParam) : undefined;
            const result = limit ? todos.slice(0, limit) : todos;

            return Response.json(result, { status: 200 });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
        POST: async (req) => {
          try {
            requireApiKey(req, apiKey);

            const body = (await req.json()) as Partial<Todo>;
            const todo: Todo = {
              id: nextId++,
              title: body.title ?? '',
              completed: body.completed ?? false,
            };

            todos.push(todo);

            return Response.json(todo, { status: 201 });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
      },
      '/todos/:id': {
        GET: (req) => {
          try {
            requireApiKey(req, apiKey);

            const id = Number(req.params.id);
            const todo = todos.find((candidate) => candidate.id === id);

            if (!todo) {
              throw new HttpError(404, 'Todo not found');
            }

            return Response.json(todo, { status: 200 });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
        PUT: async (req) => {
          try {
            requireApiKey(req, apiKey);

            const id = Number(req.params.id);
            const index = todos.findIndex((candidate) => candidate.id === id);

            if (index === -1) {
              throw new HttpError(404, 'Todo not found');
            }

            const body = (await req.json()) as Partial<Todo>;
            const updated: Todo = { id, title: body.title ?? '', completed: body.completed ?? false };
            todos[index] = updated;

            return Response.json(updated, { status: 200 });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
        PATCH: async (req) => {
          try {
            requireApiKey(req, apiKey);

            const id = Number(req.params.id);
            const index = todos.findIndex((candidate) => candidate.id === id);

            if (index === -1) {
              throw new HttpError(404, 'Todo not found');
            }

            const body = (await req.json()) as Partial<Todo>;
            const updated: Todo = { ...todos[index]!, ...body, id };
            todos[index] = updated;

            return Response.json(updated, { status: 200 });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
        DELETE: (req) => {
          try {
            requireApiKey(req, apiKey);

            const id = Number(req.params.id);
            const index = todos.findIndex((candidate) => candidate.id === id);

            if (index === -1) {
              throw new HttpError(404, 'Todo not found');
            }

            const [deleted] = todos.splice(index, 1);

            return Response.json(deleted, { status: 200 });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
      },
      '/error/string': {
        GET: (req) => {
          try {
            requireApiKey(req, apiKey);
            throw 'a plain string error was thrown';
          } catch (err) {
            return toErrorResponse(err);
          }
        },
      },
      '/error/message': {
        GET: (req) => {
          try {
            requireApiKey(req, apiKey);
            throw new HttpError(500, 'a thrown error with only a message');
          } catch (err) {
            return toErrorResponse(err);
          }
        },
      },
      '/error/dataerror': {
        GET: (req) => {
          try {
            requireApiKey(req, apiKey);
            throw new HttpError(500, 'a fully-typed dataerror error', {
              code: 'mock_dataerror',
              details: 'This error was thrown in the full dataerror shape.',
              hint: 'This is a mock hint for testing purposes.',
            });
          } catch (err) {
            return toErrorResponse(err);
          }
        },
      },
    },
  });

  // 4400 is the default so the mock backend is predictable to hit manually during development;
  // fall back to an OS-assigned port if something else already has 4400 bound.
  const server = (() => {
    try {
      return buildServer(DEFAULT_PORT);
    } catch {
      return buildServer(0);
    }
  })();

  return {
    port: server.port ?? 0,
    apiKey,
    stop: () => server.stop(true),
  };
};
