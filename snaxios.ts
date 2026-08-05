/*
TODO: JSDoc here
*/

import type { BodyInit, HeadersInit } from 'bun';
// import type { ErrorType, DataErrorReturnType } from 'dataerror';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ErrorType {
  code: string;
  message: string;
  details: string;
  hint: string;
}

interface SnaxiosFetchObject {
  method: Method;
  headers: HeadersInit; 
  body?: BodyInit | null | undefined; 
  next?: { revalidate: number };
}

interface SnaxiosArgs {
  method: Method;
  headers: HeadersInit; 
  body?: BodyInit | null | undefined; 
  params?: { [key: string]: unknown };
  nextRevalidateTime?: number;
}

/*
interface SnaxiosReturnObject<T> extends DataErrorReturnType<T> {
  status: number;
}
*/

interface SnaxiosReturnObject<T> {
  data: T | null;
  error: ErrorType | null;
  status: number;
}

const snaxiosError = {
  code: 'snaxios_error',
  message: 'Snaxios Error',
  details: 'An error has occurred during a snaxios fetch',
  hint: 'Log the output of this fetch to see what is happening'
}

// trying to convert this to an arrow function threw errors so it will stay an old-style function
// time wasted trying to make this an arrow function so far (hh:mm:ss)
// 00:12:30
//  add any time you waste trying to make this an arrow function to the count above.
async function snaxios<T>(url: string, args: SnaxiosArgs): Promise<SnaxiosReturnObject<T>> {
  const { method, headers, body, params, nextRevalidateTime } = args;

  const typedParams = params ? params : {};

  let urlWithParams = url + '?';

  for (const key in typedParams) {
    if (typedParams.hasOwnProperty(key)) {
      urlWithParams += `${key}=${typedParams[key]}&`;
    }
  }

  const finalUrl = Object.keys(typedParams).length > 0 ? urlWithParams : url;

  const fetchObject: SnaxiosFetchObject =
    {
      method,
      body,
      headers
    };

  if (nextRevalidateTime) {
    fetchObject['next'] = { revalidate: Number(nextRevalidateTime) }
  }

  try {
    const response = await fetch(finalUrl, fetchObject)
    const result = await response.json();
    return { status: response.status, data: result as T, error: null } as SnaxiosReturnObject<T>;
  } catch (error) {
    console.error(error);
    return { status: 500, data: null, error: snaxiosError }
  }
}

export {
  snaxios
}

