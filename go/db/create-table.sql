CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  card_number TEXT NOT NULL,
  fund INTEGER NOT NULL,
  shipping_address TEXT NOT NULL,
  imgpath TEXT
);

CREATE TABLE sessions (
  session_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(user_id)
);

CREATE TABLE reviews (
  review_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  FOREIGN KEY(user_id) REFERENCES user(user_id),
  FOREIGN KEY(product_id) REFERENCES products(product_id)
);

CREATE TABLE purchases (
  history_id INTEGER PRIMARY KEY,
  confirmation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(user_id),
  FOREIGN KEY(product_id) REFERENCES products(product_id)
);

CREATE TABLE products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  color TEXT NOT NULL,
  cost INTEGER NOT NULL,
  size INTEGER NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE inventory (
  product_id INTEGER PRIMARY KEY,
  stock INTEGER NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(product_id)
);

CREATE TABLE cart (
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  PRIMARY KEY(product_id, user_id),
  FOREIGN KEY(product_id) REFERENCES products(product_id),
  FOREIGN KEY(user_id) REFERENCES user(user_id)
);