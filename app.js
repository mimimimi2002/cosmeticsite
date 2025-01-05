"use strict";

const express = require("express");
const app = express();

const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");

const multer = require("multer");

const USER_PARAMETER_ERROR = 400;
const SERVER_ERROR = 500;

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(multer().none());

/**
 * Return all products' information.
 */
app.get("/all", async (req, res) => {
  try {

    let db = await getDBConnection();

    // select all rows from products table
    let results = await db.all("SELECT * FROM products");
    if (results.length > 0) {
      let returnResults = {
        "products": results
      };
      await db.close();
      res.json(returnResults);

    // no products in database
    } else {
      await db.close();
      res.status(SERVER_ERROR).type('text')
        .send('No products are in database. Please try again');
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again");
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
    let db = await getDBConnection();
    query = query.trim();
    let results = await searchProducts(db, query, type);

    if (results.length > 0) {
      res.json({"products": results});
    } else {
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("No matching products found.");
    }

    await db.close();
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again.");
  }
});

/**
 * Filter products based on the category.
 * Returns all the information of products that matches category.
 */
app.get("/filter/:category", async (req, res) => {
  let category = req.params.category;
  try {
    let db = await getDBConnection();

    // Use a parameterized query to prevent SQL injection
    let results = await db.all("SELECT * FROM products WHERE category = ?", category);

    // Check if results are found
    if (results.length > 0) {
      let returnResults = {"products": results};
      await db.close();
      res.json(returnResults);
    } else {
      await db.close();
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("No matching products found.");
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again");
  }
});

/**
 * Return all information of product that matches the product_id.
 */
app.get("/product", async (req, res) => {
  let productId = req.query.id;
  if (!productId) {
    res.status(USER_PARAMETER_ERROR).type("text")
      .send("Product ID is missing.");
  } else {
    try {
      let db = await getDBConnection();

      // get all information of product that matches product_id
      let query = `SELECT * FROM products p
      JOIN inventory i ON i.product_id = p.product_id
      WHERE p.product_id = ?`;
      let results = await db.all(query, productId);
      if (results.length > 0) {
        await db.close();
        res.json(results[0]);
      } else {
        await db.close();
        res.status(USER_PARAMETER_ERROR).type('text')
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
app.post("/newaccount/noicon", async (req, res) => {
  const {username, email, password, phone, cardNumber, fund, shippingAddress} = req.body;

  if (!username || !email || !password || !phone || !cardNumber || !fund || !shippingAddress) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Username, email, password, phone, cardNumber, fund, or shippingAddress is missing");
  }

  try {
    let db = await getDBConnection();
    let duplicateField = await findDuplicateUserField(db, username, email, phone);

    if (duplicateField) {
      await db.close();
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send(`Please enter a different ${duplicateField}`);
    }

    let query = `
    INSERT INTO user (username, email, password, phone, card_number, fund, shipping_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)`;
    await db.run(query, [username, email, password, phone, cardNumber, fund, shippingAddress]);

    await db.close();
    res.type("text").send("successful");
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with the server");
  }
});

/**
 * Create a new account. If the information if unique, update database.
 */
app.post("/newaccount/icon", async (req, res) => {
  const {username, email, password, phone, cardNumber, fund, shippingAddress, imgpath} = req.body;

  if (!username || !email || !password || !phone || !cardNumber || !fund ||
    !shippingAddress || !imgpath) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send(`Username, email, password, phone, cardNumber, fund, or shippingAddress or
      imgpath is missing`);
  }

  try {
    let db = await getDBConnection();
    let duplicateField = await findDuplicateUserField(db, username, email, phone);

    if (duplicateField) {
      await db.close();
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send(`Please enter a different ${duplicateField}`);
    }

    let query = `
    INSERT INTO user
    (username, email, password, phone, card_number, fund, shipping_address, imgpath)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await db.run(query, [username, email, password, phone, cardNumber, fund,
    shippingAddress, imgpath]);
    await db.close();
    res.type("text").send("successful");
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with the server");
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
    const db = await getDBConnection();

    const user = await validateUser(db, username, password);
    if (!user) {
      await db.close();
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Username or password is wrong");
    }

    const sessionId = generateSessionId();
    const userId = user.user_id;

    await db.run(
      "INSERT INTO session (session_id, user_id) VALUES (?, ?)",
      [sessionId, userId]
    );
    await db.close();

    res.type("text").send(String(sessionId));
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with the server. Please try again");
  }
});

/**
 * Returns the reveiew information of the given product's id.
 */
app.get("/review", async (req, res) => {
  let productId = req.query.id;
  if (!productId) {
    res.status(USER_PARAMETER_ERROR).type("text")
      .send("Product ID is missing.");
  } else {
    try {
      let db = await getDBConnection();

      let results = await db.all(`SELECT u.username, u.imgpath, r.rating, r.comment FROM review r
        JOIN user u ON r.user_id = u.user_id WHERE product_id = ?`, productId);
      let allratings = 0.0;
      for (let i = 0; i < results.length; i++) {
        allratings += parseInt(results[i].rating);
      }
      let avgRating = 0.0;
      if (results.length > 0) {
        avgRating = allratings / results.length;
      }
      let returnResults = {
        "avgRating": avgRating,
        "reviews": results
      };

      await db.close();
      res.json(returnResults);
    } catch (err) {
      res.status(SERVER_ERROR).type("text")
        .send("Something is wrong with server. Please try again");
    }
  }
});

/**
 * Submit the review of specific product and  update the database if sessionID is valid.
 */
app.post("/newreview/:sessionId", async (req, res) => {
  const productId = req.query.id;
  const {rating, comment} = req.body;
  const sessionId = req.params.sessionId;

  // if the comment is "" it accepts it.
  if (!productId || !rating || (comment !== "" && !comment)) {
    res.status(USER_PARAMETER_ERROR).type("text")
      .send("Product ID or rating or comment is missing");
  } else {
    try {
      const db = await getDBConnection();

      const userId = await getUserIdFromSession(db, sessionId);

      if (!userId) {
        await db.close();
        return res.status(USER_PARAMETER_ERROR).type("text")
          .send("Session ID is invalid.");
      }

      await db.run(
        "INSERT INTO review (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)"
        , [userId, productId, rating, comment]
      );
      await db.close();
      res.type("text")
        .send("successfully submit review");
    } catch (err) {
      res.status(SERVER_ERROR).type('text')
        .send('Something is wrong with server');
    }
  }
});

/**
 * Returns a json file of information of user if the session ID is valid.
 */
app.get("/userinfo/:sessionId", async (req, res) => {
  let sessionId = req.params.sessionId;
  try {
    let db = await getDBConnection();
    let userInfo = await getUserAllInfo(db, sessionId);

    if (userInfo.length === 0) {
      return handleInvalidSession(db, res);
    }
    await db.close();
    res.json(userInfo);
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again.");
  }
});

/**
 * Get signed in user's histroy of shopping.
 */
app.get("/history/:sessionId", async (req, res) => {
  let sessionId = req.params.sessionId;
  try {
    let db = await getDBConnection();

    // Get the userId from session
    const userId = await getUserIdFromSession(db, sessionId);
    if (!userId) {
      await db.close();
      return res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is invalid.");
    }

    // Get purchase history
    let results = await getPurchaseHistory(db, userId);
    let returnResult = {history: []};

    // For each purchase, fetch product details
    for (let i = 0; i < results.length; i++) {
      let confirmationId = results[i]["confirmation_id"];
      let productIds = results[i]["product_ids"].split(",");
      let products = [];
      for (let j = 0; j < productIds.length; j++) {
        let productId = parseInt(productIds[j]);
        let productDetails = await getProductDetails(db, confirmationId, productId);
        products.push(productDetails);
      }
      returnResult.history.push({confirmationId: confirmationId, products: products});
    }

    await db.close();
    res.json(returnResult);
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Fetches the purchase history for a given user.
 * @param {Object} db - The database connection object.
 * @param {number} userId - The ID of the user for whom to retrieve purchase history.
 * @returns {Array} - An array of purchase history records, each containing a confirmation
 *                    ID and a list of product IDs.
 */
async function getPurchaseHistory(db, userId) {
  let query = `SELECT confirmation_id, GROUP_CONCAT(product_id) AS product_ids FROM purchase
    WHERE user_id = ? GROUP BY confirmation_id ORDER BY history_id`;
  let results = await db.all(query, userId);
  return results;
}

/**
 * Fetches the details of a specific product from a purchase based on confirmation ID
 * and product ID.
 * @param {Object} db - The database connection object.
 * @param {number} confirmationId - The confirmation ID of the purchase.
 * @param {number} productId - The product ID of the specific product.
 * @returns {Object|null} - The details of the product, or null if not found.
 */
async function getProductDetails(db, confirmationId, productId) {
  let query = `SELECT p.name, p.brand, p.color, p.cost, pur.quantity FROM products p
    JOIN purchase pur ON pur.product_id = p.product_id
    WHERE pur.confirmation_id = ? AND p.product_id = ?`;
  let productDetails = await db.all(query, [confirmationId, productId]);
  return productDetails[0];
}

/**
 * Sign out the user if they are signed in.
 */
app.post("/signout/:sessionId", async (req, res) => {
  let sessionId = req.params.sessionId;
  try {
    let db = await getDBConnection();
    let results = await db.all("SELECT * FROM session WHERE session_id = ?", sessionId);

    // session ID is not valid
    if (results.length === 0) {
      await db.close();
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is invalid. Please close the browser and try again.");
    } else {

      // delete sessionID from session table
      let query = "DELETE FROM session WHERE session_id = ?";
      await db.all(query, sessionId);
      res.type("text").send("succcessfully sign out");
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Edit user information when sessionId is valid.
 */
app.post("/edit/userinfo/:sessionId", async (req, res) => {
  const sessionId = req.params.sessionId;
  const {column, input} = req.body;
  const allowedColumns = ['username', 'email', 'password', 'shipping_address', 'phone', 'imgpath'];
  if (!column || !input || !allowedColumns.includes(column)) {
    return res.status(USER_PARAMETER_ERROR).type("text")
      .send("Invalid column or input");
  }

  try {
    let db = await getDBConnection();
    let userId = await getUserIdFromSession(db, sessionId);

    if (!userId) {
      await db.close();
      return handleInvalidSession(res);
    }

    let returnResults = {"success": null, "fail": null};

    // user name and email and phone should check if there is same input in database
    if (column === "username" || column === "email" || column === "phone") {

      returnResults = await checkAndUpdateUserInfo(db, column, input, userId);

    // for other column, update without checking duplication
    } else {
      await db.run("UPDATE user SET " + column + " = ? WHERE user_id = ?", [input, userId]);
      returnResults.success = ("Successfully update " + column + " information!");
    }

    await db.close();
    res.json(returnResults);
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Store the added product to database when session ID is valid.
 */
app.post("/cart/add/:sessionId", async (req, res) => {
  try {
    let sessionId = req.params.sessionId;
    let productId = req.body.productId;

    if (!productId) {
      return handleMissingProductId(res);
    }

    let db = await getDBConnection();
    let userId = await getUserIdFromSession(db, sessionId);

    if (!userId) {
      await db.close();
      return handleInvalidSession(res);
    }

    let isProductInCart = await checkIfProductInCart(db, productId, userId);

    if (isProductInCart) {
      await db.close();
      return res.type("text").send("FALSE");
    }

    await addProductToCart(db, productId, userId);
    await db.close();
    res.type("text").send("TRUE");

  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Remove the product from cart when session ID is valid.
 */
app.post("/cart/remove/:sessionId", async (req, res) => {
  try {
    let sessionId = req.params.sessionId;
    let productId = req.body.productId;

    if (!sessionId || !productId) {
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("SessionId or productId is missing");
    } else {
      let db = await getDBConnection();

      let query = "SELECT * FROM session WHERE session_id = ?";
      let results = await db.all(query, sessionId);

      if (results.length === 0) {
        await db.close();
        res.status(USER_PARAMETER_ERROR).type("text")
          .send("Session ID is is invalid");
      } else {
        let userId = results[0]["user_id"];
        query = "DELETE FROM cart WHERE product_id = ? AND user_id = ?";
        await db.run(query, [productId, userId]);

        await db.close();
        res.type("text").send("Successfully remove from cart");
      }
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Update the products of quantity in cart when session ID is valid.
 */
app.post("/cart/update/quantity/:sessionId", async (req, res) => {
  try {
    let sessionId = req.params.sessionId;
    let quantity = req.body.quantity;
    let productId = req.body.productId;

    if (!productId || !quantity) {
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("productId or quantity is missing");
    } else {
      let db = await getDBConnection();

      let query = "SELECT * FROM session WHERE session_id = ?";
      let results = await db.all(query, sessionId);

      if (results.length === 0) {
        await db.close();
        res.status(USER_PARAMETER_ERROR).type("text")
          .send("Session ID is is invalid");
      } else {
        let userId = results[0]["user_id"];
        query = "UPDATE cart SET quantity = ? WHERE product_id = ? AND user_id = ?";
        await db.run(query, [quantity, productId, userId]);

        await db.close();
        res.type("text").send("Successfully update quantity");
      }
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Get the cart information when session ID is valid.
 */
app.get("/cart/get/:sessionId", async (req, res) => {
  let sessionId = req.params.sessionId;
  try {
    let db = await getDBConnection();

    let query = "SELECT * FROM session WHERE session_id = ?";
    let results = await db.all(query, sessionId);

    if (results.length === 0) {
      await db.close();
      res.status(USER_PARAMETER_ERROR).type("text")
        .send("Session ID is is invalid");
    } else {
      let userId = results[0]["user_id"];
      query = `SELECT p.product_id, p.name, p.brand, p.color, p.size, p.cost FROM cart c 
      JOIN products p ON p.product_id = c.product_id
      WHERE c.user_id = ?`;
      results = await db.all(query, userId);
      await db.close();
      res.json(results);
    }
  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server");
  }
});

/**
 * Buy the products that are in cart when session ID is valid.
 */
app.post("/buy/:sessionId", async (req, res) => {
  let sessionId = req.params.sessionId;
  try {
    let db = await getDBConnection();
    let userInfo = await getUserInfo(db, sessionId);

    if (userInfo.length === 0) {
      return handleInvalidSession(db, res);
    }

    let userId = userInfo[0].user_id;
    let cartItems = await getCartInfo(db, userId);
    if (cartItems.length === 0) {
      return handleEmptyCart(db, res);
    }

    let transaction = await processPurchase(db, userId, cartItems);
    await db.close();
    res.json(transaction);

  } catch (err) {
    res.status(SERVER_ERROR).type("text")
      .send("Something is wrong with server. Please try again.");
  }
});

/**
 * Handles an invalid session by closing the database connection and sending an error response.
 * This function is invoked when the session ID is not valid, ensuring that the database
 * connection is closed
 * and an appropriate error message is sent to the client.
 *
 * @param {Object} db - The database connection object.
 * @param {Object} res - The response object to send an error response to the client.
 * @returns {Promise} - A promise that resolves after closing the database and sending
 *                      the error response.
 */
async function handleInvalidSession(db, res) {
  await db.close();
  res.status(USER_PARAMETER_ERROR).type("text")
    .send("Session ID is invalid");
}

/**
 * Handles the case when the cart is empty or a server error occurs during the cart processing.
 * This function closes the database connection and sends a server error response to the client,
 * indicating that something went wrong with the server.
 *
 * @param {Object} db - The database connection object.
 * @param {Object} res - The response object used to send an error message to the client.
 * @returns {Promise} - A promise that resolves after closing the database and sending the error
 *                      response.
 */
async function handleEmptyCart(db, res) {
  await db.close();
  res.status(SERVER_ERROR).type("text")
    .send("Something is wrong with server. Please try again.");
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
 * @param {Object} db - The database connection object.
 * @param {string} userId - The unique identifier of the user making the purchase.
 * @param {Array} cartItems - An array of objects representing the items in the user's cart.
 * @returns {Object} - A transaction object that contains information about the successful or
 *                     failed purchase.
 */
async function processPurchase(db, userId, cartItems) {
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

  let userFund = await checkUserFunds(db, cartItems, userId);
  if (userFund < 0) {
    transaction.fail.shortmoney = -1 * userFund;
    return transaction;
  }

  let {confirmationId, successfulProducts} =
  await handleSuccessfulPurchase(db, cartItems, userFund, userId);
  transaction.successful.confirmation.push(confirmationId);
  transaction.successful.products = successfulProducts;

  await deleteCartInfo(db, userId);
  return transaction;
}

/**
 * Retrieves user information based on the session ID.
 * This function queries the database to fetch the username and user_id from the 'user' table
 * by joining it with the 'session' table. The session ID is used to identify the active session
 * and match it with the corresponding user.
 * @param {Object} db - The database connection object.
 * @param {string} sessionId - The unique identifier for the session.
 * @returns {Promise<Object[]>} - A promise that resolves to an array of user information objects,
 *                                 where each object contains the 'username' and 'user_id' of
 *                                 the user
 *                                 associated with the provided session ID.
 */
async function getUserInfo(db, sessionId) {
  let query = `SELECT u.username, u.user_id FROM session s
    JOIN user u ON u.user_id = s.user_id
    WHERE s.session_id = ?`;
  let results = await db.all(query, sessionId);
  return results;
}

/**
 * Fetches all user information based on the session ID.
 * @param {Object} db - The database connection object.
 * @param {string} sessionId - The session ID to retrieve the associated user's information.
 * @returns {Object|null} - Returns the user information if found, otherwise null.
 */
async function getUserAllInfo(db, sessionId) {
  const query = `
    SELECT u.username, u.email, u.password, u.phone, u.fund, u.shipping_address, u.imgpath
    FROM session s
    JOIN user u ON u.user_id = s.user_id
    WHERE s.session_id = ?`;

  const results = await db.all(query, sessionId);
  return results.length > 0 ? results[0] : null;
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
 * @param {Object} db - The database connection object.
 * @param {string} sessionId - The unique identifier for the session.
 * @returns {Promise} - A promise that resolves to the user ID if the session is found,
 *                      or null if not.
 */
async function getUserIdFromSession(db, sessionId) {
  let query = "SELECT * FROM session WHERE session_id = ?";
  let results = await db.all(query, sessionId);
  return results.length === 0 ? null : results[0]["user_id"];
}

/**
 * Checks if a product is already in the user's shopping cart.
 * This function queries the cart table to check whether a given product ID
 * already exists in the user's cart.
 *
 * @param {Object} db - The database connection object.
 * @param {number} productId - The ID of the product to check.
 * @param {number} userId - The ID of the user to check for the product in their cart.
 * @returns {Promise<boolean>} - Returns a promise that resolves to true if the product
 *                               is in the cart, false otherwise.
 */
async function checkIfProductInCart(db, productId, userId) {
  let query = "SELECT * FROM cart WHERE product_id = ? AND user_id = ?";
  let results = await db.all(query, [productId, userId]);
  return results.length > 0;
}

/**
 * Adds a product to the user's shopping cart.
 * This function inserts a new entry into the cart table for the given product ID
 * and user ID with an initial quantity of 1.
 *
 * @param {Object} db - The database connection object.
 * @param {number} productId - The ID of the product to add to the cart.
 * @param {number} userId - The ID of the user adding the product to their cart.
 * @returns {Promise<void>} - A promise that resolves when the product is added to the cart.
 */
async function addProductToCart(db, productId, userId) {
  let query = "INSERT INTO cart (product_id, user_id, quantity) VALUES (?, ?, 1)";
  await db.run(query, [productId, userId]);
}

/**
 * Retrieves the information of a user's cart.
 * This function queries the database to fetch the product details (name, quantity, and product ID)
 * from the 'cart', 'inventory', and 'products' tables. It joins these tables to provide relevant
 * details, including stock information for each product in the user's cart.
 *
 * @param {Object} db - The database connection object.
 * @param {string} userId - The unique identifier for the user whose cart information is being
 *                          retrieved.
 * @returns {Promise<Object[]>} - A promise that resolves to an array of cart items, where each item
 *                                 includes the product's name, user_id, quantity, stock,
 *                                 and product_id.
 */
async function getCartInfo(db, userId) {
  let query = `SELECT p.name, c.user_id, c.quantity, i.stock, p.product_id FROM cart c
    JOIN inventory i ON i.product_id = c.product_id
    JOIN products p ON i.product_id = p.product_id
    WHERE c.user_id = ?`;
  let resutls = await db.all(query, userId);
  return resutls;
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
 * @param {Object} db - The database connection object.
 * @param {Array} cartItems - An array of cart items, where each item contains a 'product_id',
 *                            'quantity', and 'cost'.
 * @param {string} userId - The unique identifier of the user whose funds are being checked.
 * @returns {Promise<number>} - A promise that resolves to the user's remaining funds after
 *                              accounting for the cart items' cost.
 */
async function checkUserFunds(db, cartItems, userId) {
  let userFundQuery = "SELECT fund FROM user WHERE user_id = ?";
  let userFundInfo = await db.all(userFundQuery, userId);
  let userFund = parseInt(userFundInfo[0].fund);

  for (let item of cartItems) {
    let query = `SELECT u.fund, c.quantity, p.cost FROM user u
      JOIN cart c ON u.user_id = c.user_id
      JOIN products p ON c.product_id = p.product_id
      WHERE c.product_id = ? AND c.user_id = ?`;
    let purchaseInfo = await db.all(query, [item.product_id, userId]);
    userFund -= (purchaseInfo[0].quantity * purchaseInfo[0].cost);
  }

  return userFund;
}

/**
 * Handles a successful purchase by updating stock, user funds, and recording the purchase.
 * This function processes each cart item, updates the inventory stock, deducts the user's funds,
 * and records the purchase in the database. It also returns the details of the successful products
 * along with a confirmation ID for the transaction.
 *
 * @param {Object} db - The database connection object.
 * @param {Array} cartItems - An array of cart items, where each item contains 'product_id' and
 *                            'quantity'.
 * @param {number} userFund - The remaining funds of the user after checking their balance.
 * @param {string} userId - The unique identifier for the user making the purchase.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the confirmation ID
 *                              and an array of successful product details (name, brand, color,
 *                              cost, quantity).
 */
async function handleSuccessfulPurchase(db, cartItems, userFund, userId) {
  let confirmationId = generateConfirmationNumber();
  let successfulProducts = [];

  for (let item of cartItems) {
    let updateStockQuery = `UPDATE inventory SET stock = stock - ? WHERE product_id = ?`;
    await db.run(updateStockQuery, [item.quantity, item.product_id]);

    let updateUserFundQuery = `UPDATE user SET fund = ? WHERE user_id = ?`;
    await db.run(updateUserFundQuery, [userFund, userId]);

    let insertPurchaseQuery = `INSERT INTO purchase (confirmation_id, user_id, product_id, quantity)
      VALUES (?, ?, ?, ?)`;
    await db.run(insertPurchaseQuery, [confirmationId, userId, item.product_id, item.quantity]);

    let productDetailsQuery = `SELECT p.name, p.brand, p.color, p.cost, pur.quantity
      FROM products p JOIN purchase pur ON pur.product_id = p.product_id
      WHERE pur.confirmation_id = ? AND p.product_id = ?`;
    let productDetails = await db.all(productDetailsQuery, confirmationId, item.product_id);
    successfulProducts.push(productDetails[0]);
  }
  return {confirmationId, successfulProducts};
}

/**
 * Deletes all items in the user's cart.
 * This function removes all entries in the 'cart' table associated with the specified user ID.
 *
 * @param {Object} db - The database connection object.
 * @param {string} userId - The unique identifier for the user whose cart is being cleared.
 * @returns {Promise} - A promise that resolves when the operation is complete.
 */
async function deleteCartInfo(db, userId) {
  let query = "DELETE FROM cart WHERE user_id = ?";
  let results = await db.run(query, userId);
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
 * @param {Object} db - The database connection object.
 * @param {string} query - The search query entered by the user (can be empty).
 * @param {string} type - The type/category of the products (e.g., blush).
 * @returns {Promise} - A promise that resolves to the search results from the database.
 */
async function searchProducts(db, query, type) {
  let results;
  if (query === "") {
    results = await searchByType(db, type);
  } else {
    results = searchByQueryAndType(db, query, type);
  }
  return results;
}

/**
 * Searches for products based on the given query and type.
 * If the query is an empty string, it performs a search based on the type only.
 * If the query is not empty, it performs a search using both the query and type.
 * @param {Object} db - The database connection object.
 * @param {string} type - The type/category of the products (e.g., makeup).
 * @returns {Promise} - A promise that resolves to the search results from the database.
 */
async function searchByType(db, type) {
  let results;
  if (type === "all") {
    results = await db.all("SELECT * FROM products");
  } else {
    results = await db.all("SELECT * FROM products WHERE type = ?", type);
  }
  return results;
}

/**
 * Searches for products based on the provided query and type.
 * If the type is "all", it searches for products where the name or brand matches the query.
 * If the type is not "all", it also filters by product type in addition to name or brand.
 * @param {Object} db - The database connection object.
 * @param {string} searchQuery - The search query entered by the user.
 * @param {string} type - The type/category of the products (e.g., electronics, clothing, or
 *                        "all" for all product types).
 * @returns {Promise} - A promise that resolves to the search results from the database.
 */
async function searchByQueryAndType(db, searchQuery, type) {
  let results;
  if (type === "all") {
    let query = `SELECT * FROM products WHERE name LIKE ? OR brand LIKE ?`;
    results = await db.all(query, [`%${searchQuery}%`, `%${searchQuery}%`]);
  } else {
    results = await db.all(
      "SELECT * FROM products WHERE (name LIKE ? OR brand LIKE ?) AND type = ?",
      [`%${searchQuery}%`, `%${searchQuery}%`, type]
    );
  }
  return results;
}

/**
 * Checks for duplicate user fields in the database.
 * Verifies if the provided username, email, or phone number already exists in the `user` table.
 *
 * @param {object} db - The database connection object.
 * @param {string} username - The username to check for duplicates.
 * @param {string} email - The email to check for duplicates.
 * @param {string} phone - The phone number to check for duplicates.
 * @returns {Promise<string|null>} - Returns the name of the duplicate field
 *                                   ("username", "email", or "phone number"),
 *                                   or `null` if no duplicates are found.
 */
async function findDuplicateUserField(db, username, email, phone) {
  let usernameResult = await db.all("SELECT * FROM user WHERE username = ?", username);
  if (usernameResult.length > 0) {
    return "username";
  }

  let emailResult = await db.all("SELECT * FROM user WHERE email = ?", email);
  if (emailResult.length > 0) {
    return "email";
  }

  let phoneResult = await db.all("SELECT * FROM user WHERE phone = ?", phone);
  if (phoneResult.length > 0) {
    return "phone number";
  }

  return null;
}

/**
 * Checks if a given input is unique for a specific user field and updates the user's
 * information if valid.
 * @param {Object} db - The database connection object.
 * @param {string} column - The user field/column to be updated (e.g., 'username', 'email', etc.).
 * @param {string} input - The new input value to be checked and updated.
 * @param {number} userId - The unique user ID for identifying the user whose information is
 *                           to be updated.
 * @returns {Object} - An object containing success and failure messages.
 */async function checkAndUpdateUserInfo(db, column, input, userId) {
  const checkUniqueQuery = `SELECT * FROM user WHERE ${column} = ?`;
  const checkUniqueResults = await db.all(checkUniqueQuery, input);

  if (checkUniqueResults.length > 0) {
    return {success: null, fail: `Please enter a different ${column}`};
  }
  const updateQuery = `UPDATE user SET ${column} = ? WHERE user_id = ?`;
  await db.run(updateQuery, [input, userId]);
  return {success: `Successfully updated ${column} information!`, fail: null};
}

/**
 * Validates a user's credentials by checking the username and password against the database.
 * @param {object} db - The database connection object.
 * @param {string} username - The username provided by the user.
 * @param {string} password - The password provided by the user.
 * @returns {Promise<object|null>} - Returns the user object if credentials are valid, otherwise
 *                                   `null`.
 */
async function validateUser(db, username, password) {
  const results = await db.all(
    "SELECT * FROM user WHERE username = ? AND password = ?",
    [username, password]
  );
  return results.length > 0 ? results[0] : null;
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

/**
 * Establishes a database connection to the database and returns the database object.
 * Any errors that occur should be caught in the function that calls this one.
 * @returns {Object} - The database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: 'cmbeauty.db', // THIS IS NOT THE TABLE NAME
    driver: sqlite3.Database
  });
  return db;
}

app.use(express.static('public'));
const PORT_NUMBER = 8000;
const PORT = process.env.PORT || PORT_NUMBER;
app.listen(PORT);