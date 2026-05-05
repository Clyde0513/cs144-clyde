# CS 144 Project 2 -- Spring 2026 -- Prof. Rosario

**Due Wednesday, May 6, 2026 -- 11:59 PM on Gradescope**

## **APIs, Databases, Caching, Auth and Web Storage**

In this project, you will practice several of the concepts we have been discussing in lecture. In particular:

- Creating a solid end-to-end REST API that is used to populate a simple web page.
- Gaining hands-on practice with TypeScript and end-to-end type safety via tRPC.
- Using MongoDB, via an ODM, as a persistent store backing the API.
- Implementing a common web architecture using a caching layer applied to the REST API only.
- Issuing anonymous bearer tokens and rate-limiting API access using Redis.
- Implementing local or session storage to maintain state on a simple webpage using HTML5.

**While you will do a little bit of web development in this project, that is not the overall goal. The web development is used to test your REST API and show the full integration of technologies.**

<span style="color:red">*Note that this is a significantly different spec from last year. Please let us know if there are any issues, and we thank you in advance for your patience. Try to have fun with this project. If you want to implement additional functionality for your own learning, please do so and let us know in the README.*</span>

<div style="background-color: #f0f0f0; padding: 1em; border-radius: 4px; color: red;">

**NOTE:** You may not use AI to complete this entire project. Use of AI is restricted to the following:

- Understanding the spec.
- Understanding the skeleton code.
- Asking general questions about approach.

You may not copy/paste your own code into the AI, or copy/paste code from the AI. All submissions will be processed by plagiarism detection software.

</div>

---

## Materials

The Github repository [here](https://github.com/Prof-Rosario-UCLA/ucla-cs144-project2) provides the skeleton code for this project. Issue a `git pull` often in case we make changes. If you fork, please only do so into a private repo.

1. `api.js` — main entrypoint for the Express server. Wires up REST, auth, rate limiting, tRPC, and static file serving.
2. `utils/mongodb.js` — Mongoose-backed data access. You will write the MongoDB queries here.
3. `utils/redis.js` — Redis cache helpers. You will write the cache reads and writes here.
4. `utils/fixtures.js` — fixture loader. **Do not modify.** Used by `mongodb.js` when `USE_DB=false`.
5. `utils/dbconfig.js` — env-driven configuration. **Do not modify** unless adding a new env var.
6. `utils/dates.js` — small date utility. May be useful when implementing updates.
7. `fixtures/` — JSON fixture data (`trails.json`, `lifts.json`). Read by `utils/fixtures.js`. **Do not modify.**
8. `models/` — Mongoose schemas. **Do not modify.**
9. `rest/routes/` — REST route handlers (`lift.js`, `trail.js`). You will write code here.
10. `auth/` — bearer-token issuance (`issue.js`), verification middleware (`bearer.js`), and rate-limit middlewares (`limits.js`). You will write code here.
11. `trpc/` — tRPC routers, services, types, and a test client. You will write code here.
12. `public/index.html` — the simple web page. You will modify several functions here.
13. `sample/mammoth.bson` — sample MongoDB dump for local testing. See `sample/README.md`.
14. `.env.example` — checked-in environment template. Copy to `.env` and edit values there. **See the Google Docs spec for the read-only username and password for MongoDB.**

---

## Setting Up The Dev Environment

Due to the way this project was implemented, it's possible to complete it on your laptop. If you choose to use your laptop, [please **stop** your GCE instance](https://docs.google.com/document/d/1c0T2JAZOWkqJ-R9mZM9UbCeKrMX4jh_DMuMf7DTygRo/edit?tab=t.0#bookmark=id.1scc73po5yv4) until you need to use it. It is worth practicing on your GCE instance to get real life experience communicating with a server over the Internet.

### Install dependencies

```bash
npm install
cp .env.example .env
```

### Run the server

```bash
npm start          # run once
npm run dev        # run with auto-restart on file changes (recommended for development)
npm run build      # produce dist/ for submission
```

`npm start` runs the project end-to-end via `tsx`, which transparently handles both JavaScript and TypeScript files. There is **no** "switch from `node` to `tsc` mid-project" — one command for everything.

You can run your server in the background using `pm2` if you prefer. There are also ways to run Express using Nginx as a reverse proxy. In any case, the project must execute correctly in a standard Node project environment.

### A note on the data-source progression

This project supports three data sources, configured in `.env`:

| `USE_DB` | `DEBUG` | What it does |
|---|---|---|
| `false` | (ignored) | Reads from `fixtures/*.json`. **No database required.** |
| `true`  | `true`  | Reads from local MongoDB at `localhost:27017`. Load `sample/mammoth.bson` first (see `sample/README.md`). |
| `true`  | `false` | Reads from the class production server at `cs144.org:27017`. |

**Use the progression in this exact order as you build the project:**

1. **`USE_DB=false` first.** Build everything — routes, caching, auth, the webpage — against the JSON fixtures shipped in the skeleton. The fixture loader (`utils/fixtures.js`) is already implemented; the fixture-backed paths in `utils/mongodb.js` already work. You don't need MongoDB installed at all.
2. **`USE_DB=true`, `DEBUG=true`.** Once you've covered MongoDB in lecture and validated everything against fixtures, install MongoDB locally, restore the sample dump, write your Mongoose queries, and switch over.
3. **`USE_DB=true`, `DEBUG=false`.** When local works, point at `cs144.org` for final validation.

---

## Task 1: Create the MongoDB Queries

**Goal:** implement the Mongoose-backed branches in `utils/mongodb.js`. The fixture-backed branches are already implemented, so the project works end-to-end during your earlier tasks. Only switch `USE_DB=true` once you're ready to write these queries.

You must use Mongoose. The credentials for the production server (`MONGO_USER` and `MONGO_PASS`) are documented separately on Piazza. Add them to your `.env` when you switch to `DEBUG=false`.

You will implement two functions:

- **`getLatestBatch(type)`** — fetches the latest batch of lift or trail information from MongoDB. The batch contains a `type` discriminator, a `timestamp`, and an array of `lifts` or `trails`.
- **`getNearestBatch(type, ts)`** — fetches the most recent batch with `timestamp <= ts`. Example: if there is a 9am batch and you query for 11am with no batches between 9am and 11am, return the 9am batch.

The skeleton already gives you the `getBatchModel(type)` helper. The `USE_DB` branch is wired; just replace the `// TODO` blocks with Mongoose queries.

---

## Task 2A: Implement the REST API Endpoints

You will implement the following endpoints, all mounted at `/api/lifts` and `/api/trails`:

| Method | Path | Returns |
|---|---|---|
| GET   | `/api/lifts`                  | latest `LiftBatch`  |
| GET   | `/api/lifts/:name`            | a single lift, or 404 |
| GET   | `/api/lifts/:name/:field`     | one field of a single lift, or 404 |
| GET   | `/api/lifts/at/:timestamp`    | historical batch (NOT cached) |
| `???` | `/api/lifts/:name/status`     | update lift status (you choose the verb) |

The same five endpoints exist for `/api/trails`. Names and timestamps in URLs must be URL-encoded (e.g. `Roma's%20Glades`).

There is no skeleton for the update endpoint. Choose the correct HTTP verb and document your choice in the README.

### Error handling

For both REST and tRPC update endpoints, the incoming status must be validated against the `LiftStatus` / `TrailStatus` enum. Reject invalid values with **HTTP 400** and a JSON error body.

If a requested lift, trail, field, or batch does not exist, return **HTTP 404** with a JSON `{ error: "..." }` body.

---

## Task 2B: Add the Information to the Basic Webpage

The webpage at `public/index.html` is mostly built. You'll fill in:

- **`fetchAndRender`** — call `GET /api/trails` and `GET /api/lifts`, populate the on-page state.
- **`submitStatus`** — call your update endpoint when the user submits the status form.
- The Web Storage and rate-limit banner functions (Tasks 5 and 6).

All API calls in the page must go through the `apiFetch` helper (see Task 6A), not raw `fetch`. While you're working on Tasks 2–5, `apiFetch` can be a thin pass-through; you'll fill in its real behavior in Task 6.

> Outside the hours of approximately 7:30am to 2pm, most lifts and trails will be listed as `CLOSED` or `EXPECTED`. The webpage auto-refreshes every 15 seconds.

---

## Task 3: tRPC

The TypeScript build is already configured. You don't need to rename files or run `tsc` manually — `npm start` (and `npm run dev`) handles both `.js` and `.ts` files transparently.

### Part A: Implement the procedures

The TODOs are split between `trpc/routers/` and `trpc/services/`. The routers handle Zod validation and tRPC error mapping; the services do the data work (read/write the cache, look up by name).

You will implement procedures for both `lift` and `trail`:

- `getLatest` — query, no input, returns the array of items.
- `getByName` — query, takes `{ name }`, returns the single item or throws `TRPCError({ code: 'NOT_FOUND' })`.
- `updateStatus` — mutation, takes `{ name, status }`, returns `{ success, message }`.

The shape of the cached batch is already documented in `utils/redis.js`. Use the same `fetchFromCache` / `cacheResult` helpers you used for REST.

### Part B: Zod input validation

The skeleton ships with `liftStatusValidator = z.nativeEnum(LiftStatus)` and a basic `name: z.string().min(1).max(100)`. Tighten further if you wish — at minimum, your `updateStatus` must use the `nativeEnum` validator so an invalid status is rejected by Zod **before** the resolver runs. If your resolver runs and crashes on a bad status, you didn't wire validation correctly.

### Testing

A test client lives at `trpc/client/client.ts`. After implementing the procedures, run:

```bash
npx tsx trpc/client/client.ts
```

The client exercises every procedure and includes a Zod rejection test. See the testing section below for what to look for.

---

## Task 4: Implement the Caching Layer

> **NOTE:** You will use Redis on your own GCE instance, or your laptop. Only MongoDB uses the class server.

You will add a **look-aside Redis cache** in front of the REST API. tRPC's services use the same cache helpers — they get caching for free.

### What you implement

In `utils/redis.js`:

- `fetchFromCache(type)` — return the parsed blob, or `null` on miss.
- `cacheResult(type, blob, expiration)` — JSON-stringify and set with a 5-minute TTL.

In `rest/routes/lift.js` and `rest/routes/trail.js`:

- Wrap each cached read handler in the look-aside pattern: check Redis first, on miss query the data source, write the result back to Redis, then return it.
- Apply the cache to **every read endpoint except `/at/:timestamp`** — historical queries are not cached.

For the update endpoint:

1. Read the cached blob (or query and warm cache on miss).
2. Find the named item.
3. Mutate its `status` (and `lastUpdated` for lifts).
4. Write the entire blob back with `cacheResult`.

### Required cache log lines (graded)

You **must** emit these exact strings to demonstrate the cache architecture is being used:

- `"Attempting to fetch data from cache"`
- `"Data found in cache"` (on hit)
- `"Data not found in cache"` (on miss)
- `"Fetching data from MongoDB"` (on miss, before the Mongo query)
- `"Writing data to cache"` (on miss, before the cache write)

### Cache shape

We cache one JSON-encoded blob per resource type:

| Key | Value |
|---|---|
| `mammoth:lift:all`  | full latest `LiftBatch` document, JSON-encoded |
| `mammoth:trail:all` | full latest `TrailBatch` document, JSON-encoded |

Per-item lookups (`GET /api/lifts/:name`) read the cached blob and filter in JavaScript. There are **no** per-item Redis keys, and we do **not** use Redis hashes.

---

## Task 5: Web Storage API

Add tab persistence to the simple web page. When the user switches to the **Lifts** tab and refreshes (or closes and reopens the browser), the page should still show the Lifts tab.

The skeleton has `saveTabSelection` and `loadTabSelection` as TODOs in `public/index.html`. You will implement both.

### Requirements

- Use the storage type that survives a browser restart.
- The active tab must survive both a page refresh and a browser back-navigation.
- When the user clicks a tab, update the URL to reflect it.
- On page load, resolve the active tab: URL first, then storage, then default to `trail`.
- Validate the value against the known list (`'trail'`, `'lift'`) before applying it; an unknown value falls through to the default.

---

## Task 6: Bearer Token Auth and Rate Limiting

The previous tasks left your API wide open: anyone who finds the URL can hammer the trail and lift endpoints as hard as they want. In this task you will add a lightweight **anonymous bearer-token** scheme and **rate-limit** the public endpoints. Both layers are backed by the same Redis instance you set up in Task 4.

### Task 6A: Anonymous Bearer Tokens

#### Endpoint

| Method | Path | Auth required | Returns |
|---|---|---|---|
| POST | `/api/auth/token` | no | `{ token: string, expiresIn: number }` |

On request, the server:

1. Generates a cryptographically random token.
2. Stores it in Redis under `auth:token:<token>` with a TTL of `TOKEN_TTL_SECONDS` (default 3600). Value is a small JSON string with `{ issuedAt, ip }` for diagnostics.
3. Returns `{ token, expiresIn: TOKEN_TTL_SECONDS }`.

#### Middleware

`auth/bearer.js` exports a middleware that verifies the token against Redis and rejects with 401 if invalid or missing. It attaches `req.token` for the rate limiter.

Apply this middleware to all `/api/lifts/*` and `/api/trails/*` routes. Leave `/api/auth/token`, tRPC, and the static webpage unauthenticated.

#### Client-side flow

In `public/index.html`, implement `getToken()` and `apiFetch(path, init)`. All API calls must go through `apiFetch`. See the TODOs in the skeleton.

Don't roll your own JWT for this project. Opaque random tokens stored in Redis are sufficient.

### Task 6B: Rate Limiting

#### Limits (configurable via `.env`, graded against defaults)

| Route | Default limit | Key |
|---|---|---|
| `POST /api/auth/token` | 10 / minute | client IP |
| `/api/lifts/*` and `/api/trails/*` | **5 / minute** | bearer token |

You may **raise** these locally for your own testing, but please commit the defaults — we test against 5/min and 10/min. Use `express-rate-limit` with `rate-limit-redis` so that limits are shared across processes and survive restarts. Configure both limiters against the same Redis instance you set up in Task 4.

#### 429 response

Return **HTTP 429** with:

- A `Retry-After` header (in seconds).
- A JSON body:
  ```json
  {
    "error":      "rate_limit_exceeded",
    "limit":      <requests per minute this endpoint allows>,
    "retryAfter": <seconds until the window resets>
  }
  ```

The webpage uses `limit` and `retryAfter` to show a clear, actionable message. A bare 429 with no body is not acceptable. `apiFetch` is responsible for catching 429 responses and calling `showRateLimitBanner`.

#### Webpage handling: rate-limit banner

A `<div id="rateLimitBanner">` is provided in the markup, hidden by default. Implement `showRateLimitBanner(limit, retryAfter)` so that the page shows a countdown banner when rate-limited.

---

## Challenges for You

These are **ungraded** extensions for students who finish early or want to push further. Document your choice and approach in the README so we can take a look — and brag a little, if you'd like.

### Challenge 1: OpenAPI 3.1 + Swagger UI

Generate an OpenAPI 3.1 specification for your REST endpoints and host Swagger UI at `/api/docs`.

Use any tool you like:

- **Hand-written YAML.** Most rigorous; you'll learn the spec format.
- **`swagger-jsdoc`** — annotate your route handlers with JSDoc comments and generate the spec.
- **`zod-to-openapi`** — derive the spec from your existing Zod schemas. Most DRY; the contract you already have *is* the documentation.
- Anything else you find. Document your tool choice in the README.

Mount Swagger UI at `/api/docs` (e.g. via `swagger-ui-express`) so visiting `http://localhost:1919/api/docs` renders interactive documentation. Cover at least the `/api/lifts` and `/api/trails` endpoints, including the auth scheme (bearer token) and the response shapes.

### Challenge 2: Containerize and deploy

Package the project into a Docker image and run it on a GCE instance.

Concretely:

1. Write a `Dockerfile` for the Node application. Multi-stage if you're feeling thorough.
2. Write a `docker-compose.yml` (or equivalent) that brings up the app, Redis, and (optionally) MongoDB locally with one command.
3. Build the image, push it somewhere accessible (Docker Hub, GCR, GHCR), pull it onto your GCE instance, and run it there.
4. Verify the deployed instance is reachable from the public internet, talks to its Redis, and serves both the REST API and the static webpage.

Document the public URL, the image name, and any deployment notes in the README.

> Cloud Run is the obvious next step (managed, autoscaling, no instance to babysit) and it's a better fit for this kind of stateless web service. Save your GCP credits — we'll do that together later in the quarter.

---

## Testing Your Work

An automated test suite covers REST endpoints, tRPC procedures, caching, auth, rate limiting, web storage, and browser behavior.

**First-time setup** — from your project directory:

```bash
bash tests/setup_test_env.sh
```

This checks Node.js, runs `npm install`, starts Redis and MongoDB if needed, and loads the sample database. See `tests/STUDENT_TESTER.md` for full details.

**Run the tests:**

```bash
python3 tests/run.py
```

> **⚠ Important:** The test runner starts its own server on **port 1919**. Make sure nothing else is listening on that port before running:
>
> ```bash
> lsof -i :1919
> ```
>
> If a process is listed, kill it first (`kill <PID>`), then re-run the tests.

The suite runs two phases:

1. **Fixtures** (`USE_DB=false`) — tests against the JSON fixtures shipped in the skeleton. No database needed.
2. **Production** (`DEBUG_DB=true`) — connects to your local MongoDB with the sample data loaded. Only runs if all fixture tests pass.

To run Phase 2, set `DEBUG_DB=true`:

```bash
DEBUG_DB=true python3 tests/run.py
```

The tRPC test client can also be run standalone:

```bash
npx tsx trpc/client/client.ts
```

### Debugging tips

- **`redis-cli MONITOR`** in a second terminal shows every Redis operation in real time. Invaluable for debugging caching and rate limiting.
- **`redis-cli FLUSHDB`** resets all caches, tokens, and rate-limit counters.
- **`redis-cli TTL "mammoth:trail:all"`** checks your cache TTL. `-1` means no TTL (bug). `-2` means the key doesn't exist.

---

## Submitting Your Assignment

If you choose to do your development on Github, please use a private repo and submit the link on Gradescope. Otherwise, create a zip file keeping the project structure intact.

Do not submit:

- `dist/`
- `node_modules/`
- `package-lock.json`
- `.env`

You can use `npm run prepare-dist` to clean up before zipping. To test your submission, create a fresh directory, `cp -r` your files, then run:

```bash
npm install
cp .env.example .env
npm start
```

### README.md

Create a `README` or `README.md` in the project root. Brief notes *you must include for a grade*:

- For **Task 2A**: which HTTP method you chose for the update endpoint, and a one-sentence justification.
- Task 2A: I chose PATCH HTTP because I am just updating the name status of lift/trail

- For **Task 4**: confirm your TTL and key shape match the spec; flag any deviation.

- Task 4: The cache TTL is 300 seconds (5 minutes) and the keys are `mammoth:lift:all` and `mammoth:trail:all`.


- For **Task 5**: which storage type you used for the active-tab preference.

- Task 5: I used `localStorage` to store the active tab preference because it persists across browser restarts.


- For **Task 6A**: which storage type you used for the bearer token.

- Task 6A: I used `sessionStorage` to store the bearer token, because it should be cleared when the browser session ends.


- For **Task 6B**: any non-default limit values you used while testing (please commit the defaults).

- Task 6B: I used the default limits (5 requests per minute) for `/api/lifts/*` and `/api/trails/*` and 10 requests per minute for `POST /api/auth/token`.

- Anything special about how to grade your project.
