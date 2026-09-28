# CM Beauty — Cosmetics E-Commerce Site

A full-stack e-commerce site for cosmetics. Users can browse and search products, register / log in, manage a cart, check out, post reviews, and view order history.

The frontend is vanilla HTML / CSS / JavaScript. The backend is Node.js (Express). Data can live in **SQLite** (`app.js`) or **PostgreSQL** (`app_postgres.js` / `app_postgres_no_cache.js` / `app_postgres_s3_profile.js`). The PostgreSQL app can optionally sit in front of a **custom in-memory cache** (`redis/server.cpp`). Profile-image upload to **Amazon S3** is implemented in `app_postgres_s3_profile.js`.

## Demo

[https://github.com/user-attachments/assets/c3ef1c43-2e84-45a1-951f-3950d88fe61b
](https://drive.google.com/file/d/1aZP3SXXyeqfSM-UR60ycJ27ThczCbOk5/view?usp=sharing)

## Features

- **Product listing & category filtering** — browse by category (makeup, skincare, fragrance, hair, bath & body)
- **Product search** — search by name or brand, optionally filtered by type
- **Product details** — brand, color, size, price, remaining stock, reviews
- **Account registration / login** — passwords hashed with bcrypt; requests authenticated with a Bearer session ID
- **Cart** — add / remove items and change quantities (stock is shown on cart cards)
- **Checkout** — buy cart items, deduct funds, decrease inventory
- **Reviews** — ratings and comments
- **Order history** — past purchases
- **User settings** — update profile fields (`PATCH /users`); optional custom icon uploaded to S3

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML / CSS / vanilla JavaScript (`public/`) |
| Backend | Node.js, Express |
| Database | SQLite (`app.js`) or PostgreSQL (`cmbeautydb`) |
| Cache | Custom Redis-like TCP server (`redis/server.cpp`) via `cache_client.js` |
| Auth | bcrypt, session IDs in `sessions` |
| Uploads | multer (form fields; `none()`) |
| Object storage | Amazon S3 (`ap-northeast-1`), presigned PUT/GET (`app_postgres_s3_profile.js`) |

## Requirements

- Node.js 18+
- npm packages: `express`, `multer`, `bcrypt`, plus `sqlite` + `sqlite3` (SQLite app) or `pg` (PostgreSQL apps)
- PostgreSQL 14+ (for `app_postgres.js` / `app_postgres_no_cache.js` / `app_postgres_s3_profile.js`)
- For S3 profile upload: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `dotenv`; an S3 bucket in **ap-northeast-1**; AWS credentials on the machine that runs the app
- A C++ compiler (to build the cache server)
- Python 3, with `psycopg` if seeding PostgreSQL

There is no `package.json` in the repo; install dependencies yourself.

## Setup & Run

Default HTTP port is **8000** (`PORT` overrides it). Open http://localhost:8000.

### SQLite (`app.js`)

```bash
sqlite3 cmbeauty.db < schema_sqlite.sql
python3 database/seed_sqlite.py
npm install express sqlite sqlite3 multer bcrypt
node app.js
```

`cmbeauty.db` is gitignored.

### PostgreSQL without cache (`app_postgres_no_cache.js`)

Default connection in the app:

| | |
|---|---|
| host | `localhost` |
| port | `5432` |
| database | `cmbeautydb` |
| user | `testuser` |
| password | `password` |

```bash
createdb cmbeautydb
psql -d cmbeautydb -f schema_posgres.sql
python3 database/seed_postgres.py
npm install express pg multer bcrypt
node app_postgres_no_cache.js
```

(The schema file is named `schema_posgres.sql`.)

### PostgreSQL with cache (`app_postgres.js`)

Build and start the cache (listens on **1234**), then the app:

```bash
g++ -std=c++17 redis/server.cpp redis/thread_pool.cpp -o redis/server -lpthread
./redis/server
# in another terminal:
node app_postgres.js
```

`cache_client.js` connects to `127.0.0.1:1234` when the app process starts.

### PostgreSQL with cache and S3 profile images (`app_postgres_s3_profile.js`)

Same as `app_postgres.js`, plus avatar upload. The S3 client region is hardcoded to **ap-northeast-1**.

```bash
export S3_BUCKET_NAME="your-bucket-name"
# credentials: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, or ~/.aws/credentials
npm install express pg multer bcrypt dotenv @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
node app_postgres_s3_profile.js
```

`S3_BUCKET_NAME` can also be set in a local `.env` (loaded by `dotenv`). Cloning the repo does **not** include AWS keys; each developer needs their own credentials and bucket.

The bucket must allow a browser `PUT` from the app origin (CORS), for example `http://localhost:8000`. Objects are **not** public; the app never sends the file through Express.

## Project Structure

```
.
├── app.js                       # Express + SQLite
├── app_postgres.js              # Express + PostgreSQL + cache
├── app_postgres_no_cache.js     # Same as app_postgres.js, no cache
├── app_postgres_s3_profile.js   # Same as app_postgres.js, plus S3 avatars
├── cache_client.js           # One persistent TCP client to the cache
├── schema_sqlite.sql
├── schema_posgres.sql        # PostgreSQL DDL
├── APIDOC.md
├── database/
│   ├── seed_sqlite.py
│   ├── seed_postgres.py
│   └── seed/
│       ├── products.csv
│       └── inventory.csv
├── redis/                    # Custom cache server
│   ├── server.cpp
│   ├── client.cpp
│   ├── thread_pool.cpp
│   ├── thread_pool.h
│   ├── list.h
│   └── zset.h
└── public/
    ├── index.html            # Home / product listing / cart
    ├── index.js
    ├── sign-in.html
    ├── sign-in.js
    ├── setting.html
    ├── setting.js
    ├── shopping-history.html
    ├── shopping-history.js
    ├── style.css
    └── img/
```

## Database

Schemas are `schema_sqlite.sql` and `schema_posgres.sql`. Table names are the same on both:

| Table | Purpose |
|-------|---------|
| `users` | Credentials, funds, shipping address, profile image path |
| `sessions` | `session_id` ↔ `user_id` |
| `products` | Name, type, brand, color, price, size, category |
| `inventory` | Stock per `product_id` |
| `cart` | `user_id` × `product_id` × quantity |
| `purchases` | Order history (`confirmation_id`, quantity) |
| `reviews` | Rating and comment |

Seed scripts load `database/seed/products.csv` and `database/seed/inventory.csv`.

## API Overview

The same product / account / cart routes exist on `app.js`, `app_postgres.js`, `app_postgres_no_cache.js`, and `app_postgres_s3_profile.js`. Older examples live in [APIDOC.md](APIDOC.md); the table below matches the current handlers. `POST /profile/presigned-url` exists only on `app_postgres_s3_profile.js`.

Authenticated routes expect `Authorization: Bearer <session_id>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | All products; optional `?category=` |
| GET | `/search` | Search by `query` and `type` |
| GET | `/products/:id` | Product + inventory `stock` |
| POST | `/accounts` | Register |
| POST | `/signin` | Log in; returns session ID |
| POST | `/signout` | Log out |
| GET | `/users/me` | Current user (S3 avatars returned as a GetObject presigned URL) |
| PATCH | `/users` | Update a profile field (`imgpath` stores the S3 key after an upload) |
| POST | `/profile/presigned-url` | S3 app only: PutObject presigned URL + object `key` |
| GET | `/reviews` | Reviews for `?id=` (product id) |
| POST | `/reviews` | Submit a review |
| GET | `/carts` | Cart (includes `stock`) |
| POST | `/carts` | Add item |
| PATCH | `/carts/:productId` | Update quantity |
| DELETE | `/carts/:productId` | Remove item |
| POST | `/purchases` | Checkout |
| GET | `/histories` | Order history |

## S3 profile upload

Used only by `app_postgres_s3_profile.js` (settings page, `public/setting.js`). The file never goes through the Node server. Express only signs URLs; the browser talks to S3.

S3 has no real folders. The object key `avatars/{userId}/{uuid}.jpg` only *looks* like a path in the console. You do not create directories in the bucket first.

Allowed `Content-Type` values: `image/jpeg`, `image/png`, `image/webp`.

### Upload (presigned PUT)

1. The user picks a file on **Account Information**. The preview `<img>` stays hidden until a file is chosen.
2. The browser calls `POST /profile/presigned-url` with `{ contentType }` and the session Bearer token.
3. The server builds key `avatars/{userId}/{uuid}.{ext}` and signs a **PutObject** URL (`expiresIn` **300** seconds). It returns `{ presignedUrl, key }` only — no GetObject URL at this step.
4. The browser `PUT`s the file bytes to `presignedUrl` with the same `Content-Type`.
5. The page shows a local `blob:` preview. Save has not run yet, so `users.imgpath` is unchanged.

### Save and display (presigned GET)

6. **Save Changes** sends `PATCH /users` with `column=imgpath` and `input` equal to the S3 `key` (preset icons still save a local path such as `/img/icondefault.png`).
7. `GET /users/me` reads `imgpath`. If it is an S3 key (or an `amazonaws.com` URL), the handler signs a **GetObject** URL (`expiresIn` **3600** seconds) and returns that as `imgpath`. Local preset paths are returned as-is.
8. The settings page (and the home header) use that `imgpath` as the icon `src`.

```
browser                    Express                         S3
   |                          |                             |
   | POST /profile/presigned-url                            |
   |------------------------->|                             |
   |      { presignedUrl, key }                             |
   |<-------------------------|                             |
   | PUT object (file bytes)                                |
   |------------------------------------------------------>|
   | PATCH /users  imgpath = key                            |
   |------------------------->|                             |
   | GET /users/me            | GetObject presign           |
   |------------------------->|                             |
   |      { ..., imgpath: GET URL }                         |
   |<-------------------------|                             |
   | GET image                                              |
   |------------------------------------------------------>|
```

Why two different signatures: the PUT URL is short-lived and only needed to upload. The object stays private, so a GET URL is created later, when something actually needs to *show* the image.

## Cache

Used only by `app_postgres.js`. The Node process keeps **one TCP connection** to `redis/server.cpp` and pipelines commands on it.

Cached endpoints:

| Endpoint | Cache key |
|----------|-----------|
| `GET /products` | `products`, or `products:{category}` when filtered |
| `GET /products/:id` | `product:{id}` |

Hit: parse cached JSON and return. Miss: query PostgreSQL, then `SET` + `PEXPIRE` (TTL **100000 ms**). After a successful purchase, `product:{id}` keys for bought items are deleted so stock does not stay stale.

`app_postgres_no_cache.js` is the same PostgreSQL API with those cache calls removed.

A browser click is usually one or a few sequential HTTP requests. A cache hit skips PostgreSQL, so **single-request latency** (and the UI) can feel faster. That is not the same as throughput with many concurrent clients.

The cache server is **single-threaded**. Extra cache TCP connections would not add real parallelism; they add `poll` overhead. Under high concurrency the one cache connection becomes a queue, while PostgreSQL can use a connection pool.

## Load test (`GET /products/1`)

`app_postgres_no_cache.js` (No Cache) vs `app_postgres.js` (Cache ×1):

```bash
npx autocannon -c 1 -d 30 http://localhost:8000/products/1
npx autocannon -c 30 -d 30 http://localhost:8000/products/1
```

| Concurrency |        No Cache |        Cache ×1 | Result             |
| ----------: | --------------: | --------------: | ------------------ |
|       `c=1` |     3,461 req/s | **3,991 req/s** | Cache **+15.3%**   |
|      `c=30` | **7,514 req/s** |     5,050 req/s | Cache **−32.8%**   |

- **`c=1`**: Cache is faster. Same pattern as the UI (one request at a time).
- **`c=30`**: PostgreSQL without cache is faster. Concurrent requests serialize on the single cache TCP connection and single-threaded cache server.
