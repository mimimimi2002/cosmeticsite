"use strict";

const ResponseCode = {
  OK: 0,
  ERR: 1,
  NOT_FOUND: 2,
  WRONG_TYPE: 3,
  INVALID_ARG: 4,
};

const express = require("express");
const app = express();

const net = require("net");

const cache = net.createConnection({
  host: "127.0.0.1",
  port : 1234
})

const cache_client = require("./cache_client");

const { Pool } = require("pg");

const pool = new Pool ({
  user: "testuser",
  host: "localhost",
  database: "cmbeautydb",
  password: "password",
  port: 5432,
})

const multer = require("multer");

const bcrypt = require("bcrypt");

const USER_PARAMETER_ERROR = 400;
const SERVER_ERROR = 500;
const SALT_ROUNDS = 10;

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(multer().none());

/**
 * Return all products' information.
 */
app.get("/products", async (req, res) => {
  let category = req.query.category;

  try {

    let results;

    if (category) {
      results = await pool.query(
        "SELECT * FROM products WHERE category = $1",
        [category]
      );
    } else {
      results = await pool.query("SELECT * FROM products");
    }

    res.json({ products: results.rows });

  } catch (err) {
    res.status(500).send("Something is wrong with server");
  }
});

/**
 * Search products based on the search query and type. User can search either by brand name or
 * by product name that includes the search query or type that that matches exactly with
 * search query. User can also search products that match both name and type.
 * Returns all the information of products that matches query and type.
 */
app.get("/search", async (req, res) => {
  let query = req.query.query;
  let type = req.query.type;

  if (isInvalidSearchQuery(query, type)) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Search query or type is missing.");
  }

  try {
    query = query.trim();

    const results = await searchProducts(query, type);

    if (results.length > 0) {
      res.json({ products: results });
    } else {
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("No matching products found.");
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again.");
  }
});

/**
 * Return all information of product that matches the product_id.
 */
app.get("/products/:id", async (req, res) => {
  const productId = req.params.id;

  const { resCode, body } = await cache_client.get(`product:${productId}`);

  if (resCode === ResponseCode.OK) {
    const product = JSON.parse(body);
    return res.json(product);
  } else {
    try {
      const query = `
        SELECT * FROM products p
        JOIN inventory i ON i.product_id = p.product_id
        WHERE p.product_id = $1
      `;

      const result = await pool.query(query, [productId]);

      if (result.rows.length > 0) {
        const product = result.rows[0];
        await cache_client.set(
          `product:${productId}`,
          JSON.stringify(product)
        );

        await cache_client.pexpire(
          `product:${productId}`,
          100000,
        );

        return res.json(product);
      } else {
        res.status(USER_PARAMETER_ERROR).type("text")
          .send("Invalid Product ID");
      }
    } catch (err) {
      res.status(SERVER_ERROR).type("text")
        .send("Something is wrong with server. Please try again");
    }
  }
});

/**
 * Create a new account. If the information if unique, update database.
 */
app.post("/accounts", async (req, res) => {
  const {
    username, email, password, phone,
    cardNumber, fund, shippingAddress, imgpath
  } = req.body;

  if (!username || !email || !password || !phone ||
      !cardNumber || !fund || !shippingAddress) {
    return res.status(400).send("missing fields");
  }

  try {
    const duplicateField = await findDuplicateUserField(username);

    if (duplicateField) {
      return res.status(400).send(`duplicate ${duplicateField}`);
    }

    const query = `
      INSERT INTO users
      (username, email, password, phone, card_number, fund, shipping_address, imgpath)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const hashedPassword = await hashPassword(password);

    await pool.query(query, [
      username,
      email,
      hashedPassword,
      phone,
      cardNumber,
      fund,
      shippingAddress,
      imgpath || null
    ]);

    res.send("successful");

  } catch (err) {
    console.error(err);
    res.status(500).send("server error");
  }
});

/**
 * Check if username and password are valid. If they are valid, create a unique sessionID and
 * store sessionID and userID to database. Return unique sessionID.
 */
app.post("/signin", async (req, res) => {
  const {username, password} = req.body;

  if (!username || !password) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Username or password is missing");
  }

  try {
    const user = await validateUser(username, password);

    if (!user) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Username or password is wrong");
    }

    const sessionId = generateSessionId();
    const userId = user.user_id;

    await pool.query(
      "INSERT INTO sessions (session_id, user_id) VALUES ($1, $2)",
      [sessionId, userId]
    );

    res.type("text").send(String(sessionId));

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with the server. Please try again");
  }
});

/**
 * Returns the review information of the given product's id.
 */
app.get("/reviews", async (req, res) => {
  const productId = req.query.id;

  if (!productId) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Product ID is missing.");
  }

  try {
    const result = await pool.query(
      `SELECT u.username, u.imgpath, r.rating, r.comment
       FROM reviews r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.product_id = $1`,
      [productId]
    );

    const reviews = result.rows;

    let allratings = 0.0;

    for (let i = 0; i < reviews.length; i++) {
      allratings += parseInt(reviews[i].rating);
    }

    let avgRating = 0.0;

    if (reviews.length > 0) {
      avgRating = allratings / reviews.length;
    }

    const returnResults = {
      avgRating: avgRating,
      reviews: reviews
    };

    res.json(returnResults);

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again");
  }
});

/**
 * Returns a json file of information of user if the session ID is valid.
 */
app.post("/reviews", async (req, res) => {
  const {rating, comment, productId} = req.body;

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");

  // if the comment is "" it accepts it.
  if (!productId || !rating || (comment !== "" && !comment)) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Product ID or rating or comment is missing");
  }

  try {
    // check valid sessionID
    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return res.status(401).type("text")
        .send("Session ID is invalid.");
    }

    await pool.query(
      `INSERT INTO reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
      [userId, productId, rating, comment]
    );

    res.type("text")
      .send("successfully submit review");

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

app.get("/users/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");
  try {
    let userInfo = await getUserAllInfo(sessionId);

    if (userInfo.length === 0) {
      return handleInvalidSession(res);
    }
    res.json(userInfo);
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again.");
  }
});


/**
 * Get signed in user's histroy of shopping.
 */
app.get("/histories", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");

  try {
    // Get the userId from session
    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return res.status(401).type("text")
        .send("Session ID is invalid.");
    }

    // Get purchase history
    const results = await getPurchaseHistory(userId);
    const returnResult = {history: []};

    // For each purchase, fetch product details
    for (let i = 0; i < results.length; i++) {
      const confirmationId = results[i]["confirmation_id"];
      const productIds = results[i]["product_ids"].split(",");
      const products = [];

      for (let j = 0; j < productIds.length; j++) {
        const productId = parseInt(productIds[j]);

        const productDetails = await getProductDetails(
          confirmationId,
          productId
        );

        products.push(productDetails);
      }

      returnResult.history.push({
        confirmationId: confirmationId,
        products: products
      });
    }

    res.json(returnResult);

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Fetches the purchase history for a given user.
 * @param {number} userId - The ID of the user for whom to retrieve purchase history.
 * @returns {Array} - An array of purchase history records, each containing a confirmation
 *                    ID and a list of product IDs.
 */
async function getPurchaseHistory(userId) {
  let query = `SELECT confirmation_id, STRING_AGG(product_id::text, ',') AS product_ids FROM purchases
    WHERE user_id = $1 GROUP BY confirmation_id ORDER BY MIN(history_id)`;
  let results = await pool.query(query, [userId]);
  return results.rows;
}

/**
 * Fetches the details of a specific product from a purchase based on confirmation ID
 * and product ID.
 * @param {number} confirmationId - The confirmation ID of the purchase.
 * @param {number} productId - The product ID of the specific product.
 * @returns {Object|null} - The details of the product, or null if not found.
 */
async function getProductDetails(confirmationId, productId) {
  let query = `SELECT p.name, p.brand, p.color, p.cost, pur.quantity FROM products p
    JOIN purchases pur ON pur.product_id = p.product_id
    WHERE pur.confirmation_id = $1 AND p.product_id = $2`;
  let productDetails = await pool.query(query, [confirmationId, productId]);
  return productDetails.rows[0];
}

/**
 * Sign out the user if they are signed in.
 */
app.post("/signout", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");

  try {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE session_id = $1",
      [sessionId]
    );

    // session ID is not valid
    if (result.rows.length === 0) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is invalid. Please close the browser and try again.");
    }

    // delete session ID
    await pool.query(
      "DELETE FROM sessions WHERE session_id = $1",
      [sessionId]
    );

    res.type("text").send("successfully sign out");

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Edit user information when sessionId is valid.
 */
app.patch("/users", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");
  const {column, input} = req.body;

  const allowedColumns = [
    "username",
    "email",
    "password",
    "shipping_address",
    "phone",
    "imgpath"
  ];

  if (!column || !input || !allowedColumns.includes(column)) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Invalid column or input");
  }

  try {
    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return handleInvalidSession(res);
    }

    let returnResults = {
      success: null,
      fail: null
    };

    // username, email, phone must be unique
    if (
      column === "username" ||
      column === "email" ||
      column === "phone"
    ) {
      returnResults = await checkAndUpdateUserInfo(
        column,
        input,
        userId
      );

    } else {
      const value =
        column === "password"
          ? await hashPassword(input)
          : input;

      await pool.query(
        `UPDATE users SET ${column} = $1 WHERE user_id = $2`,
        [value, userId]
      );

      returnResults.success =
        `Successfully update ${column} information!`;
    }

    res.json(returnResults);

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Store the added product to database when session ID is valid.
 */
app.post("/carts", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");

  try {
    const productId = req.body.productId;

    if (!productId) {
      return handleMissingProductId(res);
    }

    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return handleInvalidSession(res);
    }

    const isProductInCart = await checkIfProductInCart(productId, userId);

    if (isProductInCart) {
      return res.type("text").send("FALSE");
    }

    await addProductToCart(productId, userId);
    res.type("text").send("TRUE");

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Remove the product from cart when session ID is valid.
 */
app.delete("/carts/:productId", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");
  const productId = req.params.productId;

  if (!productId) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("productId is missing");
  }

  try {
    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is is invalid");
    }

    await pool.query(
      "DELETE FROM cart WHERE product_id = $1 AND user_id = $2",
      [productId, userId]
    );

    res.type("text").send("Successfully remove from cart");

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Update the products of quantity in cart when session ID is valid.
 */
app.patch("/carts/:productId", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");
  const quantity = req.body.quantity;
  const productId = req.params.productId;

  if (!productId || !quantity) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("productId or quantity is missing");
  }

  try {
    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is is invalid");
    }

    await pool.query(
      "UPDATE cart SET quantity = $1 WHERE product_id = $2 AND user_id = $3",
      [quantity, productId, userId]
    );

    res.type("text").send("Successfully update quantity");

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Get the cart information when session ID is valid.
 */
app.get("/carts", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");

  try {
    const userId = await getUserIdFromSession(sessionId);

    if (!userId) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is is invalid");
    }

    const result = await pool.query(
      `SELECT p.product_id, p.name, p.brand, p.color, p.size, p.cost, c.quantity FROM cart c
      JOIN products p ON p.product_id = c.product_id
      WHERE c.user_id = $1`,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Buy the products that are in cart when session ID is valid.
 */
app.post("/purchases", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("no token");
  }

  const sessionId = authHeader.replace("Bearer ", "");

  try {
    const userInfo = await getUserInfo(sessionId);

    if (userInfo.length === 0) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is invalid");
    }

    const userId = userInfo[0].user_id;
    const cartItems = await getCartInfo(userId);

    if (cartItems.length === 0) {
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Cart is empty");
    }

    const transaction = await processPurchase(userId, cartItems);
    res.json(transaction);

  } catch (err) {
    console.error(err);
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again.");
  }
});

/**
 * Handles an invalid session by sending an error response to the client.
 *
 * @param {Object} res - The response object to send an error response to the client.
 * @returns {void}
 */
function handleInvalidSession(res) {
  res.status(USER_PARAMETER_ERROR).type("text")
    .send("Session ID is invalid");
}

/**
 * Processes a purchase by verifying product stock, user funds, and then completing the
 * transaction.
 * This function first checks whether the items in the cart are available and if the user
 * has enough funds.
 * If both conditions are satisfied, it proceeds with the purchase and updates the database
 * accordingly.
 * If any check fails, the transaction is halted, and appropriate failure information is returned.
 *
 * @param {string} userId - The unique identifier of the user making the purchase.
 * @param {Array} cartItems - An array of objects representing the items in the user's cart.
 * @returns {Object} - A transaction object that contains information about the successful or
 *                     failed purchase.
 */
async function processPurchase(userId, cartItems) {
  let transaction = {
    "fail":
      {
        "products": [],
        "shortmoney": null
      },
    "successful":
      {
        "confirmation": [],
        "products": []
      }
  };

  let fail = checkProductStock(cartItems);
  if (fail.length > 0) {
    transaction.fail.products = fail;
    return transaction;
  }

  let userFund = await checkUserFunds(cartItems, userId);
  if (userFund < 0) {
    transaction.fail.shortmoney = -1 * userFund;
    return transaction;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let {confirmationId, successfulProducts} =
    await handleSuccessfulPurchase(client, cartItems, userFund, userId);
    await deleteCartInfo(client, userId);
    await client.query("COMMIT");

    transaction.successful.confirmation.push(confirmationId);
    transaction.successful.products = successfulProducts;

    return transaction;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// hash the password
async function hashPassword(password, saltRounds=10) {
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

// check hashed password is valid
async function checkPassword(password, hashedPassword) {
  const isMatch = await bcrypt.compare(password, hashedPassword);

  if (isMatch) {
    return true;
  } else {
    return false;
  }
}

/**
 * Retrieves user information based on the session ID.
 * This function queries the database to fetch the username and user_id from the 'user' table
 * by joining it with the 'session' table. The session ID is used to identify the active session
 * and match it with the corresponding user.
 * @param {string} sessionId - The unique identifier for the session.
 * @returns {Promise<Object[]>} - A promise that resolves to an array of user information objects,
 *                                 where each object contains the 'username' and 'user_id' of
 *                                 the user
 *                                 associated with the provided session ID.
 */
async function getUserInfo(sessionId) {
  const query = `SELECT u.username, u.user_id FROM sessions s
    JOIN users u ON u.user_id = s.user_id
    WHERE s.session_id = $1`;
  const results = await pool.query(query, [sessionId]);
  return results.rows;
}

/**
 * Fetches all user information based on the session ID.
 * @param {string} sessionId - The session ID to retrieve the associated user's information.
 * @returns {Object|null} - Returns the user information if found, otherwise null.
 */
async function getUserAllInfo(sessionId) {
  const query = `
    SELECT u.username, u.email, u.phone, u.fund, u.shipping_address, u.imgpath
    FROM sessions s
    JOIN users u ON u.user_id = s.user_id
    WHERE s.session_id = $1`;

  const results = await pool.query(query, [sessionId]);
  return results.rows.length > 0 ? results.rows[0] : null;
}

/**
 * Handles the case when the product ID is missing in the request.
 * This function sends an error response to the client indicating that the product ID is required.
 *
 * @param {Object} res - The response object used to send an error message to the client.
 * @returns {void} - Does not return anything. It sends a response directly to the client.
 */
function handleMissingProductId(res) {
  res.status(USER_PARAMETER_ERROR).type("text")
    .send("Product ID is missing");
}

/**
 * Retrieves the user ID associated with a given session ID from the database.
 * This function queries the session table to check if the session ID exists,
 * and if it does, returns the user ID linked to that session. If no session is found,
 * it returns null.
 *
 * @param {string} sessionId - The unique identifier for the session.
 * @returns {Promise} - A promise that resolves to the user ID if the session is found,
 *                      or null if not.
 */
async function getUserIdFromSession(sessionId) {
  const query = "SELECT * FROM sessions WHERE session_id = $1";
  const results = await pool.query(query, [sessionId]);
  return results.rows.length === 0 ? null : results.rows[0]["user_id"];
}

/**
 * Checks if a product is already in the user's shopping cart.
 * This function queries the cart table to check whether a given product ID
 * already exists in the user's cart.
 *
 * @param {number} productId - The ID of the product to check.
 * @param {number} userId - The ID of the user to check for the product in their cart.
 * @returns {Promise<boolean>} - Returns a promise that resolves to true if the product
 *                               is in the cart, false otherwise.
 */
async function checkIfProductInCart(productId, userId) {
  const query = "SELECT * FROM cart WHERE product_id = $1 AND user_id = $2";
  const results = await pool.query(query, [productId, userId]);
  return results.rows.length > 0;
}

/**
 * Adds a product to the user's shopping cart.
 * This function inserts a new entry into the cart table for the given product ID
 * and user ID with an initial quantity of 1.
 *
 * @param {number} productId - The ID of the product to add to the cart.
 * @param {number} userId - The ID of the user adding the product to their cart.
 * @returns {Promise<void>} - A promise that resolves when the product is added to the cart.
 */
async function addProductToCart(productId, userId) {
  const query = "INSERT INTO cart (product_id, user_id, quantity) VALUES ($1, $2, 1)";
  await pool.query(query, [productId, userId]);
}

/**
 * Retrieves the information of a user's cart.
 * This function queries the database to fetch the product details (name, quantity, and product ID)
 * from the 'cart', 'inventory', and 'products' tables. It joins these tables to provide relevant
 * details, including stock information for each product in the user's cart.
 *
 * @param {string} userId - The unique identifier for the user whose cart information is being
 *                          retrieved.
 * @returns {Promise<Object[]>} - A promise that resolves to an array of cart items, where each item
 *                                 includes the product's name, user_id, quantity, stock,
 *                                 and product_id.
 */
async function getCartInfo(userId) {
  const query = `SELECT p.name, c.user_id, c.quantity, i.stock, p.product_id FROM cart c
    JOIN inventory i ON i.product_id = c.product_id
    JOIN products p ON i.product_id = p.product_id
    WHERE c.user_id = $1`;
  const results = await pool.query(query, [userId]);
  return results.rows;
}

/**
 * Checks the stock availability for each item in the cart.
 * This function iterates through the cart items and compares the quantity of each item
 * with its available stock. If the quantity exceeds the stock, the item is added to a
 * 'fail' list.
 *
 * @param {Array} cartItems - An array of cart items, where each item contains 'name',
 *                            'quantity', and 'stock'.
 * @returns {Array} - An array of objects where each object represents an item with
 *                    insufficient stock.
 *                    The object contains 'product_name' (the name of the product) and
 *                    'stock' (the available stock).
 */
function checkProductStock(cartItems) {
  let fail = [];
  for (let item of cartItems) {
    if (item.quantity > item.stock) {
      fail.push({"product_name": item.name, "stock": item.stock});
    }
  }
  return fail;
}

/**
 * Checks if the user has enough funds to cover their cart items.
 * This function first retrieves the user's current fund, then iterates over each item in the cart
 * to calculate the total cost of the items. It subtracts the cost of each item from the user's
 * available funds.
 *
 * @param {Array} cartItems - An array of cart items, where each item contains a 'product_id',
 *                            'quantity', and 'cost'.
 * @param {string} userId - The unique identifier of the user whose funds are being checked.
 * @returns {Promise<number>} - A promise that resolves to the user's remaining funds after
 *                              accounting for the cart items' cost.
 */
async function checkUserFunds(cartItems, userId) {
  const userFundQuery = "SELECT fund FROM users WHERE user_id = $1";
  const userFundInfo = await pool.query(userFundQuery, [userId]);
  let userFund = parseInt(userFundInfo.rows[0].fund);

  for (let item of cartItems) {
    const query = `SELECT u.fund, c.quantity, p.cost FROM users u
      JOIN cart c ON u.user_id = c.user_id
      JOIN products p ON c.product_id = p.product_id
      WHERE c.product_id = $1 AND c.user_id = $2`;
    const purchaseInfo = await pool.query(query, [item.product_id, userId]);
    userFund -= (purchaseInfo.rows[0].quantity * purchaseInfo.rows[0].cost);
  }

  return userFund;
}

/**
 * Handles a successful purchase by updating stock, user funds, and recording the purchase.
 * This function processes each cart item, updates the inventory stock, deducts the user's funds,
 * and records the purchase in the database. It also returns the details of the successful products
 * along with a confirmation ID for the transaction.
 *
 * @param {Object} client - PostgreSQL client used for the transaction.
 * @param {Array} cartItems - An array of cart items, where each item contains 'product_id' and
 *                            'quantity'.
 * @param {number} userFund - The remaining funds of the user after checking their balance.
 * @param {string} userId - The unique identifier for the user making the purchase.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the confirmation ID
 *                              and an array of successful product details (name, brand, color,
 *                              cost, quantity).
 */
async function handleSuccessfulPurchase(client, cartItems, userFund, userId) {
  let confirmationId = generateConfirmationNumber();
  let successfulProducts = [];

  for (let item of cartItems) {
    const updateStockQuery = `UPDATE inventory SET stock = stock - $1 WHERE product_id = $2 AND stock >= $3`;
    const result = await client.query(updateStockQuery, [item.quantity, item.product_id, item.quantity]);

    // prevent race condition
    if (result.rowCount === 0) {
      throw new Error("Insufficient stock");
    }

    const updateUserFundQuery = `UPDATE users SET fund = $1 WHERE user_id = $2`;
    await client.query(updateUserFundQuery, [userFund, userId]);

    const insertPurchaseQuery = `INSERT INTO purchases (confirmation_id, user_id, product_id, quantity)
      VALUES ($1, $2, $3, $4)`;
    await client.query(insertPurchaseQuery, [confirmationId, userId, item.product_id, item.quantity]);

    const productDetailsQuery = `SELECT p.name, p.brand, p.color, p.cost, pur.quantity
      FROM products p JOIN purchases pur ON pur.product_id = p.product_id
      WHERE pur.confirmation_id = $1 AND p.product_id = $2`;
    const productDetails = await client.query(productDetailsQuery, [confirmationId, item.product_id]);
    successfulProducts.push(productDetails.rows[0]);
  }
  return {confirmationId, successfulProducts};
}

/**
 * Deletes all items in the user's cart.
 * This function removes all entries in the 'cart' table associated with the specified user ID.
 *
 * @param {Object} client - PostgreSQL client used for the transaction.
 * @param {string} userId - The unique identifier for the user whose cart is being cleared.
 * @returns {Promise} - A promise that resolves when the operation is complete.
 */
async function deleteCartInfo(client, userId) {
  const query = "DELETE FROM cart WHERE user_id = $1";
  const results = await client.query(query, [userId]);
  return results;
}

/**
 * Validates if the search query and type are valid.
 * This function checks if the query is not empty or falsy (e.g., null, undefined, or empty
 * string),
 * and if the type is provided (not falsy).
 *
 * @param {string} query - The search query entered by the user.
 * @param {string} type - The type associated with the query (e.g., category, keyword).
 * @returns {boolean} - Returns true if the query or type is invalid (falsy), otherwise false.
 */
function isInvalidSearchQuery(query, type) {
  return (query !== "" && !query) || !type;
}

/**
 * Searches for products based on the provided query and type.
 * If the query is empty, it searches for products based on the type only.
 * If the query is not empty, it searches based on both the query and type.
 *
 * @param {string} query - The search query entered by the user (can be empty).
 * @param {string} type - The type/category of the products (e.g., blush).
 * @returns {Promise} - A promise that resolves to the search results from the database.
 */
async function searchProducts(query, type) {
  let results;
  if (query === "") {
    results = await searchByType(type);
  } else {
    results = await searchByQueryAndType(query, type);
  }
  return results;
}

/**
 * Searches for products based on the given query and type.
 * If the query is an empty string, it performs a search based on the type only.
 * If the query is not empty, it performs a search using both the query and type.
 * @param {string} type - The type/category of the products (e.g., makeup).
 * @returns {Promise} - A promise that resolves to the search results from the database.
 */
async function searchByType(type) {
  let results;
  if (type === "all") {
    results = await pool.query("SELECT * FROM products");
  } else {
    results = await pool.query("SELECT * FROM products WHERE type = $1", [type]);
  }
  return results.rows;
}

/**
 * Searches for products based on the provided query and type.
 * If the type is "all", it searches for products where the name or brand matches the query.
 * If the type is not "all", it also filters by product type in addition to name or brand.
 * @param {string} searchQuery - The search query entered by the user.
 * @param {string} type - The type/category of the products (e.g., electronics, clothing, or
 *                        "all" for all product types).
 * @returns {Promise} - A promise that resolves to the search results from the database.
 */
async function searchByQueryAndType(searchQuery, type) {
  let results;
  if (type === "all") {
    const query = `SELECT * FROM products WHERE name LIKE $1 OR brand LIKE $2`;
    results = await pool.query(query, [`%${searchQuery}%`, `%${searchQuery}%`]);
  } else {
    results = await pool.query(
      "SELECT * FROM products WHERE (name LIKE $1 OR brand LIKE $2) AND type = $3",
      [`%${searchQuery}%`, `%${searchQuery}%`, type]
    );
  }
  return results.rows;
}

/**
 * Checks for duplicate user fields in the database.
 * Verifies if the provided username already exists in the `user` table.
 *
 * @param {string} username - The username to check for duplicates.
 * @returns {Promise<string|null>} - Returns the name of the duplicate field
 *                                   ("username", "email", or "phone number"),
 *                                   or `null` if no duplicates are found.
 */
async function findDuplicateUserField(username) {
  const usernameResult = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  if (usernameResult.rows.length > 0) {
    return "username";
  }

  return null;
}

/**
 * Checks if a given input is unique for a specific user field and updates the user's
 * information if valid.
 * @param {string} column - The user field/column to be updated (e.g., 'username', 'email', etc.).
 * @param {string} input - The new input value to be checked and updated.
 * @param {number} userId - The unique user ID for identifying the user whose information is
 *                           to be updated.
 * @returns {Object} - An object containing success and failure messages.
 */async function checkAndUpdateUserInfo(column, input, userId) {
  const checkUniqueQuery = `SELECT * FROM users WHERE ${column} = $1`;
  const checkUniqueResults = await pool.query(checkUniqueQuery, [input]);

  if (checkUniqueResults.rows.length > 0) {
    return {success: null, fail: `Please enter a different ${column}`};
  }
  const updateQuery = `UPDATE users SET ${column} = $1 WHERE user_id = $2`;
  await pool.query(updateQuery, [input, userId]);
  return {success: `Successfully updated ${column} information!`, fail: null};
}

/**
 * Hashes a plaintext password using bcrypt so that raw passwords are never stored.
 * @param {string} password - The plaintext password to hash.
 * @returns {Promise<string>} - A promise that resolves to the bcrypt hash of the password.
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Validates a user's credentials by checking the username and password against the database.
 * @param {string} username - The username provided by the user.
 * @param {string} password - The password provided by the user.
 * @returns {Promise<object|null>} - Returns the user object if credentials are valid, otherwise
 *                                   `null`.
 */
async function validateUser(username, password) {
  const results = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  if (results.rows.length === 0) {
    return null;
  }

  const user = results.rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password);
  return passwordMatches ? user : null;
}

/**
 * Generates a random session ID.
 * @returns {int} - A randomly generated session ID consisting of up to 8 digits.
 */
function generateSessionId() {
  const digit = 100000000;
  return Math.floor(Math.random() * digit);
}

/**
 * Generates a random confirmation number consisting of alphanumeric characters.
 * @returns {string} A randomly generated 12-character confirmation number.
 */
function generateConfirmationNumber() {
  const length = 12;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let confirmationNumber = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    confirmationNumber += characters[randomIndex];
  }

  return confirmationNumber;
}

app.use(express.static('public'));
const PORT_NUMBER = 8000;
const PORT = process.env.PORT || PORT_NUMBER;
app.listen(PORT);