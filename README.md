# WHAT IS SNAXIOS?
Snaxios is a minimal one-file zero-dependency HTTP library that can serve as a drop-in replacement for Axios in most common use cases.  It is a minimal type-safe wrapper around the JavaScript/TypeScript fetch API that returns a similar data shape to Axios, but excludes some functionality.  Think of it as the Preact to Axios' React.

# WHY SNAXIOS?
Axios has been hit with supply chain attacks recently, causing some developers to consider moving away.  A one-file zero dependency library that is copied into the project manually without the intervention of package managers or post-install scripts inherently removes the vulnerability to supply chain attacks.  However, there are some issues with type safety around the standard Fetch library, so Snaxios takes in a generic type to ensure end-to-end type safety with its use.  Like Axios, Snaxios also allows users to skip the ```response.json``` step while still supplying all needed information to the user.

Snaxios was developed by the DANCENAV team for internal use originally and open-sourced.

# DEVELOPMENT STACK
Testing runtime: Bun
Testing framework: bun:test

# INSTALLATION
**Users**:
Copy ```snaxios.ts``` into a folder of your choosing within your project.  That's it.

**Developers/maintainers**:
1. Have Bun installed.  You must have Bun installed, we use Bun because it less vulnerable to supply chain attacks than Node.  Version 1.3 is recommended until version 1.4 and later is confirmed stable.
2. Clone the repo
3. Run ```bun test``` to ensure the tests pass.

# DATAERROR
Snaxios returns a data type similar to that of the ```dataerror``` library, which is developed and maintained by the same developers as Snaxios, and duplicates these data types within the snaxios.ts file, in order to preserve the zero-dependency paradigm.  There is commented out code wherever this duplication exists that allows users to have the dataerror library installed in their projects to use dataerror as a single source of truth in these cases.

# HEADERS/BODY
The current Snaxios implementation uses the ```HeadersInit``` and ```BodyInit``` types from Bun as types for the input headers and body.  Identical equivalent types also exist in Node and Deno but the imports from Bun should be replaced in ```snaxios.ts``` if using a different runtime.

# NEXTREVALIDATETIME
Snaxios also includes an optional ```nextRevalidateTime``` field designed for use in NextJS projects, to tell the NextJS cache when to revalidate the response.
