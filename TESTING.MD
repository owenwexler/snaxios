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
