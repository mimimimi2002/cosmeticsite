# CM Beauty — Cosmetics E-Commerce Site

A full-stack e-commerce website for selling cosmetics. Users can browse and search products, register / log in, manage a cart, make purchases, post reviews, and view their order history. The frontend is built with vanilla HTML / CSS / JavaScript, the backend with Node.js (Express), and data is stored in SQLite.

## Demo
https://github.com/user-attachments/assets/c3ef1c43-2e84-45a1-951f-3950d88fe61b

## Features

- **Product listing & category filtering** — browse products by category (skincare, fragrance, haircare, etc.)
- **Product search** — search products by keyword
- **Product details** — view brand, color, size, price, and stock for each product
- **Account registration / login** — passwords hashed with bcrypt, authenticated via session ID
- **Cart** — add / remove items and manage quantities
- **Checkout** — purchase all items in the cart, updating the user's funds and product stock
- **Reviews** — post and read ratings and comments for products
- **Order history** — review past purchases
- **User settings** — upload a profile image (via multer) and more

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML / CSS / Vanilla JavaScript |
| Backend | Node.js, Express |
| Database | SQLite (`cmbeauty.db`), PostgreSQL (`app_postgres.js`) |
| Cache | Custom Redis-like server (`redis/server.cpp`) via `cache_client.js` |
| Auth | bcrypt (password hashing), session IDs |
| File upload | multer |

## Requirements

- Node.js 18 or higher

## Setup & Run

```bash
npm install sqlite sqlite3 multer bcrypt
node app.js
```

Once started, open http://localhost:8000 in your browser.

To use a different port:

```bash
PORT=9000 node app.js
```

## Project Structure

```
.
├── app.js                    # Express backend (SQLite, no cache)
├── app_postgres.js           # Express backend (PostgreSQL + cache)
├── app_postgres_no_cache.js  # Same as app_postgres.js, but no cache
├── cache_client.js           # TCP client for the custom cache server
├── cmbeauty.db               # SQLite database file
├── tables.sql                # Table definitions (CREATE statements)
├── APIDOC.md                 # Detailed Web API documentation
├── package.json
├── redis/                    # Custom in-memory cache server
│   ├── server.cpp
│   └── client.cpp
├── public/                   # Frontend
│   ├── index.html            # Home (product listing)
│   ├── index.js
│   ├── sign-in.html          # Login / registration
│   ├── sign-in.js
│   ├── setting.html          # User settings
│   ├── setting.js
│   ├── shopping-history.html # Order history
│   ├── shopping-history.js
│   ├── style.css
│   └── img/                  # Product & site images
└── data/                     # Screenshots and other assets
```

## Database

All table definitions live in `tables.sql`. The main tables are:

| Table | Purpose |
|-------|---------|
| `user` | User information (credentials, funds, shipping address, etc.) |
| `session` | Login sessions (session_id ↔ user_id) |
| `products` | Product information (name, type, brand, color, price, size, category) |
| `inventory` | Stock count per product |
| `cart` | User carts (user_id × product_id × quantity) |
| `purchase` | Purchase history |
| `reviews` | Product reviews (rating & comment) |

To recreate the database, run `tables.sql` with SQLite to rebuild the tables:

```bash
sqlite3 cmbeauty.db < tables.sql
```

## API Overview

All APIs are implemented in `app.js`. For request formats, parameters, and example responses for each endpoint, see [APIDOC.md](APIDOC.md).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get all products (filterable by `category`) |
| GET | `/search` | Search products by keyword |
| GET | `/products/:id` | Get details for a specific product |
| POST | `/accounts` | Register a new account |
| POST | `/signin` | Log in |
| POST | `/signout` | Log out |
| GET | `/users/me` | Get the logged-in user's information |
| GET | `/reviews` | Get the list of reviews |
| POST | `/reviews` | Post a review |
| GET | `/carts` | Get the contents of the cart |
| POST | `/carts` | Add an item to the cart |
| DELETE | `/carts/:productId` | Remove an item from the cart |
| POST | `/purchases` | Purchase the items in the cart |
| GET | `/histories` | Get order history |

## Cache

`app_postgres.js` caches product reads in a custom Redis-like server (`redis/server.cpp`) over a **single persistent TCP connection** (`cache_client.js`, port `1234`).

Cached endpoints:

| Endpoint | Cache key |
|----------|-----------|
| `GET /products` | `products` (or `products:{category}` when filtered) |
| `GET /products/:id` | `product:{id}` |

On a hit, the handler returns the cached JSON. On a miss, it queries PostgreSQL, then `SET` + `PEXPIRE` (TTL 100000 ms). After a successful purchase, `product:{id}` entries for bought items are deleted so stock does not stay stale.

`app_postgres_no_cache.js` is the same API against PostgreSQL, with all cache reads and writes removed.

Run the cache server first, then the cached app:

```bash
# cache server listens on 1234
# then:
node app_postgres.js
```

For a no-cache comparison:

```bash
node app_postgres_no_cache.js
```

A single browser click is usually one (or a few sequential) HTTP requests. In that case a cache hit skips PostgreSQL and tends to feel faster. That is **one-request latency**, not the same as throughput under many concurrent clients.

The Node process uses **one TCP connection** to the cache and pipelines `GET`s on it. The cache server itself is **single-threaded**. Extra cache TCP connections would not add real parallelism there; they mostly add `poll` overhead. Under high concurrency, that one cache connection becomes a queue, while PostgreSQL can use a connection pool.

## Load test (`GET /products/1`)

Compared `app_postgres_no_cache.js` (No Cache) and `app_postgres.js` (Cache ×1, one TCP connection to the cache) with autocannon:

```bash
npx autocannon -c 1 -d 30 http://localhost:8000/products/1
npx autocannon -c 30 -d 30 http://localhost:8000/products/1
```

| Concurrency |        No Cache |        Cache ×1 | Result             |
| ----------: | --------------: | --------------: | ------------------ |
|       `c=1` |     3,461 req/s | **3,991 req/s** | Cache **+15.3%**   |
|      `c=30` | **7,514 req/s** |     5,050 req/s | Cache **−32.8%**   |

- **`c=1`**: Cache is faster. Matches the UI case (one request at a time).
- **`c=30`**: No-cache PostgreSQL is faster. Concurrent requests serialize on the single cache TCP connection and single-threaded cache server, so throughput drops even though a lone request was cheaper.

