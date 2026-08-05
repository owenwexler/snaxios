# WHAT IS SNAXIOS?
Please refer to README.md for extensive info about what Snaxios is and other project related particulars.
SUMMARY: Snaxios is a lightweight minimal no-dependency one-file manual install HTTP library that is a type-safe wrapper around the fetch API.

# USE A MOCK BACKEND?
Option 1: Test with a mock backend CRUD API that lives self-contained in a separate directory within the Snaxios repo, runs on a port on the local machine, is gated by an API key to be sent in the headers, and uses JSON fixtures to return data.  Should be zero-dependency and use Bun's internal http library instead of a framework like Hono or Elysia.  Mock API should throw errors instead of returning them, to test that Snaxios handles thrown errors properly.  (Probably the best option)
Option 2: Test using a reliable live API like jsonplaceholder. Could destabilize tests in the future if jsonplaceholder ever goes offline.  Maybe one or two tests should use jsonplaceholder to test against an external API? 

# TEST CASES
* Snaxios request to mock backend with no headers returns 401 error with proper status code.  Error message is propagated to returned Snaxios error shape.
* Snaxios GET request with proper API key in the headers and no params returns expected data with a 200 response.
* Snaxios GET request with proper API key in the headers and a limit: number param in params returns expected data limited to that number with a 200 response.
* Snaxios POST request with proper API key in the headers and body posts to backend successfully and a subsequent GET request returns expected data with a 200 response.
* Snaxios PUT request with proper API key in the headers and body puts to backend successfully and a subsequent GET request returns expected data with a 200 response.
* Snaxios PATCH request with proper API key in the headers and body patches to backend successfully and a subsequent GET request returns expected data with a 200 response.
* Snaxios DELETE request with proper API key in the headers and body deletes to backend successfully and a subsequent GET request returns expected data with a 200 response.
* GET request from an /error route with a thrown plain string error returns the generic Snaxios errorwith a 500 status code.
* GET request from an /error route with a returned error with a ```message``` property and nothing else returns a modified Snaxios error with the error's message in place of the generic Snaxios error message and a 500 status code.
* GET request from an /error route with a returned dataerror-formatted error returns the dataerror-formatted error in full.
* Snaxios' returned data object is of the same type that was passed in to Snaxios as a generic.

Please suggest any other necessary test cases that may have been missed here.

# SUGGESTED ADDITIONAL TEST CASES
The following were implemented alongside the test cases above, in ```tests/snaxios.test.ts```:
* GET request for a resource that does not exist (404) returns the propagated error message in the Snaxios error shape with the proper status code. This exercises the same non-2xx/response.ok code path as the ```/error``` routes, but from an ordinary CRUD route rather than a route dedicated to throwing.
* A network-level failure (request to an unreachable host, no HTTP response at all) is still caught and returns the generic Snaxios error with a 500 status code. This exercises the original ```catch``` branch (```fetch``` itself rejecting), as distinct from the non-2xx-response branch the ```/error``` routes and the 401/404 cases exercise.
* A PATCH/PUT to a nonexistent id returns a 404, propagated the same way as the GET 404 case.
* Params serialization: multiple params in the same request, and params with values needing URL-encoding (spaces, ```&```, ```=```, unicode), verified against a dedicated ```/echo/query``` mock route. Implementing this test surfaced a real bug: Snaxios' param serialization did not URL-encode keys/values at all, so a value containing ```&``` or ```=``` would corrupt the query string. Fixed in ```snaxios.ts``` with ```encodeURIComponent```.
* An empty params object (```params: {}```) hits the same code path as omitting params entirely (no trailing ```?```).
* A response body that isn't valid JSON (a mock ```/malformed-json``` route returning a 200 with a non-JSON body) confirms ```response.json()``` throwing is still caught rather than crashing. Note the resulting error message is the JSON parser's own message (e.g. "Failed to parse JSON"), not the fully generic Snaxios error text - ```checkHasMessage``` only overrides ```message```, since a real thrown ```SyntaxError``` does carry one; ```code```/```details```/```hint``` stay generic.
* A deliberately partial PUT body confirms PUT fully replaces the record (dropping fields the body omitted), while an equivalent partial PATCH body confirms PATCH merges onto the existing record instead.

The following were intentionally not implemented:
* ```nextRevalidateTime``` being forwarded to ```fetch``` as ```{ next: { revalidate } }``` - not testable from a plain Bun mock server, since that field only has meaning to Next.js' patched fetch. Per project owner: already acceptance-tested and confirmed working during internal use, so no automated test was added here.
* Option 2 (a live API such as jsonplaceholder) - the mock backend covers all listed cases without the flakiness risk this document itself calls out, so no external-API test was added.
