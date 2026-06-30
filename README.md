# CM Beauty — Cosmetics E-Commerce Site

A full-stack e-commerce website for selling cosmetics. Users can browse and search products, register / log in, manage a cart, make purchases, post reviews, and view their order history. The frontend is built with vanilla HTML / CSS / JavaScript, the backend with Node.js (Express), and data is stored in SQLite.

![Screenshot of the site](data/screenshot.png)

## Demo
https://drive.google.com/file/d/1mLw3twmyVkwkMYlypkbivFtBmiVQuAKV/view?usp=sharing

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
| Database | SQLite (`cmbeauty.db`) |
| Auth | bcrypt (password hashing), session IDs |
| File upload | multer |

## Requirements

- Node.js 18 or higher

## Setup & Run

```bash
npm install
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
├── app.js              # Express backend (API server)
├── cmbeauty.db         # SQLite database file
├── tables.sql          # Table definitions (CREATE statements)
├── APIDOC.md           # Detailed Web API documentation
├── package.json
├── public/             # Frontend
│   ├── index.html      # Home (product listing)
│   ├── index.js
│   ├── sign-in.html    # Login / registration
│   ├── sign-in.js
│   ├── setting.html    # User settings
│   ├── setting.js
│   ├── shopping-history.html  # Order history
│   ├── shopping-history.js
│   ├── style.css
│   └── img/            # Product & site images
└── data/               # Screenshots and other assets
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
