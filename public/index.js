/**
 * Name: Chuanqi Ma, Cecelia Chen
 * Date: December 10, 2024
 * Section: CSE 154 AB Peter Oh
 * This is the index.js that handles behavior in index.html. You can put all the information
 * of products, make a product page, search by name and type for products and add products
 * to shopping cart, and buy the products.
 */
"use strict";

(function() {

  window.addEventListener("load", init);

  let submitReviewHandler;
  let username;

  /**
   * Initializes the page with all necessary event listeners and API calls.
   */
  async function init() {
    try {
      await getAllProducts();
      setupEventListeners();
      await checkStatus();
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Sets up all event listeners for various UI components.
   */
  function setupEventListeners() {
    qs(".cm-beauty").addEventListener("click", async function() {
      await returnBackMainView();
    });
    qs(".grid-list").addEventListener("click", switchView);
    qs(".shopping-cart").addEventListener("click", shoppingCartPage);
    qs(".check-out").addEventListener("click", async function() {
      await buyProducts();
    });
    qs("#search-form").addEventListener("submit", async function(eve) {
      await handleSearch(eve);
    });

    setupFilterMenu();
    qs(".comment-open").addEventListener("click", openComment);
  }

  /**
   * Sets up event listeners for the filter menu.
   */
  function setupFilterMenu() {
    qs(".make-up").addEventListener("click", async function() {
      await filterMenu("makeup", "Make up");
    });
    qs(".skin-care").addEventListener("click", async function() {
      await filterMenu("skincare", "Skin Care");
    });
    qs(".hair").addEventListener("click", async function() {
      await filterMenu("hair", "Hair");
    });
    qs(".fragrance").addEventListener("click", async function() {
      await filterMenu("fragrance", "Fragrance");
    });
    qs(".bath-body").addEventListener("click", async function() {
      await filterMenu("bathbody", "Bath & Body");
    });
  }

  /**
   * Filters the menu based on the given category and updates the page title.
   * Fetches filtered menu data from the server,
   * checks the response status, and displays the products.
   * Handles errors if the fetch request fails.
   * @param {string} menu - The menu category to filter.
   * @param {string} title - The new title to display for the filtered menu.
   */
  async function filterMenu(menu, title) {
    changeTitle(title);
    try {
      let response = await fetch("/filter/" + menu);
      await statusCheck(response);
      response = await response.json();
      displayAllProducts(response.products);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Handles the search form submission, sends the query to the API, and displays results.
   * @param {Event} eve - The event object representing the submit action.
   */
  async function handleSearch(eve) {
    eve.preventDefault();

    // show the shopping cart page, hide main veiw and product page
    let mainView = id("main-view");
    mainView.classList.remove("hidden");

    let basketContainer = qs(".basket-container");
    basketContainer.classList.add("hidden");

    let productPage = id("product-page");
    productPage.classList.add("hidden");

    // get the search query and type.
    let query = qs("#search-input").value.trim();
    let type = qs("#search-type").value;

    // get the all the products that match query and type
    try {
      let response = await fetch(`/search?query=` + query + "&type=" + type);
      await statusCheck(response);
      let data = await response.json();
      if (query === "") {
        changeTitle("Filtered by type for \"" + type + "\"");
      } else {
        changeTitle("Filtered by \"" + query + "\" and type for \"" + type + "\"");
      }
      displayAllProducts(data.products);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Initiates the purchase process for the products in the user's cart.
   * Sends a request to the server to process the purchase based on the user's session ID,
   * and then updates the UI based on the transaction result (success or failure).
   *
   * @returns {void} This function does not return a value, but updates the UI by calling
   * `transactionResult`
   * with the response data from the server.
   */
  async function buyProducts() {

    // clean previous products in receipt before buying
    let previousProducts = qs(".success-products .products");
    previousProducts.innerHTML = "";

    try {
      let sessionId = sessionStorage.getItem("session_id");
      let res = await fetch("/buy/" + sessionId, {
        method: "POST"
      });
      await statusCheck(res);
      res = await res.json();
      transactionResult(res);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Handles the result of a transaction, including success and failure scenarios.
   * @param {Object} transaction - The transaction result object.
   */
  function transactionResult(transaction) {
    if (transaction.fail.products.length > 0) {
      handleFailedProducts(transaction.fail.products);
    } else if (transaction.fail.shortmoney) {
      handleShortMoney(transaction.fail.shortmoney);
    } else {
      handleSuccess(transaction.successful);
    }
  }

  /**
   * Handles the case where products are out of stock.
   * @param {Array} failedProducts - An array of products that failed due to being out of stock.
   */
  function handleFailedProducts(failedProducts) {
    let failedContainer = qs(".failed-container");
    failedContainer.classList.remove("hidden");

    let failedMessage = qs(".failed-message");
    failedMessage.textContent = "Sorry, your transaction is failed.";

    let failedProductContainer = qs(".failed-products");
    failedProductContainer.innerHTML = "";

    // show the stock of failed products
    failedProducts.forEach(product => {
      let failedProduct = gen("p");
      failedProduct.textContent = `We only have ${product.stock} for ${product.product_name}`;
      failedProductContainer.appendChild(failedProduct);
    });
  }

  /**
   * Handles the case where the user does not have enough money for the transaction.
   * @param {number} shortmoney - The amount the user is short on funds.
   */
  function handleShortMoney(shortmoney) {
    let failedProductContainer = qs(".failed-products");
    failedProductContainer.innerHTML = "";

    let failedContainer = qs(".failed-container");
    failedContainer.classList.remove("hidden");

    // show the short money for user
    let failedMessage = qs(".failed-message");
    failedMessage.textContent = `Sorry, your transaction is failed.
    Your fund is short by $${shortmoney}`;
  }

  /**
   * Handles the case of a successful transaction.
   * @param {Object} successfulTransaction - The object containing
   * details of the successful transaction.
   */
  function handleSuccess(successfulTransaction) {
    qs(".shopping-number").textContent = 0;
    qs(".shopping-number").classList.add("hidden");

    let failedMessage = qs(".failed-container");
    failedMessage.classList.add("hidden");

    let addedProducts = qs(".added-products");
    addedProducts.innerHTML = "";

    let successContainer = qs(".success-container");
    successContainer.classList.remove("hidden");

    let checkOut = qs(".check-out");
    checkOut.classList.add("hidden");

    // put the receipt with conformation ID and products list
    let confirmationCode = qs(".confirmation-id span");
    confirmationCode.textContent = successfulTransaction.confirmation[0];

    let purchasedProducts = qs(".success-products .products");
    successfulTransaction.products.forEach(product => {
      let productCard = makePurchasedProductPage(product);
      purchasedProducts.appendChild(productCard);
    });
  }

  /**
   * Creates a product card element to display purchased product details.
   * The card includes an image, name, cost, and quantity of the purchased product.
   *
   * @param {Object} productDetails - The details of the purchased product.
   * @param {string} productDetails.name - The name of the product.
   * @param {number} productDetails.cost - The cost of the product.
   * @param {number} productDetails.quantity - The quantity of the product purchased.
   * @returns {HTMLElement} The product card element containing the product details.
   */
  function makePurchasedProductPage(productDetails) {

    // create card
    let productCard = gen("article");
    productCard.classList.add("success-card");

    // image
    let productImg = gen("img");
    productImg.src = "img/" + productDetails.name.toLowerCase().replaceAll(" ", "") + ".png";
    productImg.alt = productDetails.name;

    // name
    let nameContainer = gen("p");
    nameContainer.textContent = productDetails.name;

    // cost
    let costContainer = gen("p");
    costContainer.textContent = "$" + productDetails.cost;

    // quantity
    let quantityContainer = gen("p");
    quantityContainer.textContent = productDetails.quantity;

    productCard.appendChild(productImg);
    productCard.appendChild(nameContainer);
    productCard.appendChild(costContainer);
    productCard.appendChild(quantityContainer);

    return productCard;
  }

  /**
   * Checks the current session status by retrieving the session ID from sessionStorage.
   * If the session ID is valid, it fetches the session details, updates the UI with the
   * user's name, displays the review form, removes the sign-in button, and restores
   * the user's previously added products to the cart.
   * @returns {Promise<void>} A promise that resolves when the status check and
   * related UI updates are complete.
   */
  async function checkStatus() {
    let sessionId = sessionStorage.getItem("session_id");
    if (sessionId) {
      try {
        let res = await fetch("/userinfo/" + sessionId);
        await statusCheck(res);
        res = await res.json();

        // session id is valid
        username = res.username;
        putUserName(res.imgpath);
        let reviewForm = qs(".write-review article");
        reviewForm.classList.remove("hidden");
        removeSignInButton();

        // replicate the added cart for previous cart
        await showPreviousCart();
      } catch (err) {
        handleError(err);
      }
    }
  }

  /**
   * Retrieves and adds previously added products to the cart.
   * It sends a request to the server with a list of previously added product names,
   * then adds those products back to the cart after receiving the server's response.
   * @param {Array<string>} previousAddedProducts - The array of product names to be
   * retrieved and added to the cart.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function showPreviousCart() {
    try {
      let sessionId = sessionStorage.getItem("session_id");
      if (sessionId) {
        let previousCartProducts = await fetch("/cart/get/" + sessionId);
        await statusCheck(previousCartProducts);
        previousCartProducts = await previousCartProducts.json();

        // add the previous products to cart
        for (let i = 0; i < previousCartProducts.length; i++) {
          addToCart(previousCartProducts[i], previousCartProducts[i]["product_id"]);
        }
      }
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Hides all elements with the class "sign-in-btn" by adding the "hidden" class to them.
   * This is typically used to hide the sign-in button after the user has signed in.
   */
  function removeSignInButton() {
    let signInButtons = qsa(".sign-in-btn");
    for (let i = 0; i < signInButtons.length; i++) {
      signInButtons[i].classList.add("hidden");
    }

  }

  /**
   * Updates the sign-in section with the user's information.
   * @param {string} imgpath - The path to the user's icon.
   */
  function putUserName(imgpath) {
    let signIn = qs(".sign-in");
    signIn.innerHTML = "";

    // put the Hi, username and icon
    let userContainer = createUserContainer(imgpath);
    let signOut = createSignOut();
    let link = createUserSettingLink();
    let shoppingHistory = createShoppingHistoryLink();

    signIn.appendChild(userContainer);
    signIn.appendChild(signOut);
    signIn.appendChild(link);
    signIn.appendChild(shoppingHistory);

    signOut.addEventListener("click", async function() {
      await signOutFunction();
    });
  }

  /**
   * Creates the user container with the username and user icon.
   * @param {string} imgpath - The path to the user's image.
   * @returns {HTMLElement} - The user container element.
   */
  function createUserContainer(imgpath) {
    let userContainer = gen("div");
    userContainer.classList.add("user-container");

    let userMessage = gen("div");
    userMessage.textContent = "Hi, " + username;

    let userIcon = gen("img");
    userIcon.src = imgpath;
    userIcon.alt = "user icon";
    userIcon.classList.add("icon-img");

    userContainer.appendChild(userMessage);
    userContainer.appendChild(userIcon);

    return userContainer;
  }

  /**
   * Creates the sign-out button.
   * @returns {HTMLElement} - The sign-out element.
   */
  function createSignOut() {
    let signOut = gen("div");
    signOut.classList.add("sign-out");
    signOut.textContent = "Sign Out";
    return signOut;
  }

  /**
   * Creates the link to the user settings page.
   * @returns {HTMLElement} - The user setting link element.
   */
  function createUserSettingLink() {
    let userSetting = gen("div");
    userSetting.classList.add("user-setting");
    userSetting.textContent = "User Setting";

    let link = gen("a");
    link.href = "setting.html";
    link.appendChild(userSetting);

    return link;
  }

  /**
   * Creates the shopping history link.
   * @returns {HTMLElement} - The shopping history link element.
   */
  function createShoppingHistoryLink() {
    let shoppingHistory = document.createElement("a");
    shoppingHistory.classList.add("shopping-history");
    shoppingHistory.textContent = "Shopping History";
    shoppingHistory.href = "shopping-history.html";

    return shoppingHistory;
  }

  /**
   * Handles the sign-out process for a user by clearing the session and redirecting to
   * the homepage.
   * This function retrieves the session ID from `sessionStorage`, sends a POST request to
   * the server to log the user out, removes the session ID from `sessionStorage`,
   * and updates the UI to show the
   * "Sign In" link. Finally, it redirects the user to the homepage.
   *
   * @returns {Promise<void>} A promise that resolves when the sign-out process is complete.
   */
  async function signOutFunction() {
    try {
      let sessionId = sessionStorage.getItem("session_id");
      let result = await fetch("/signout/" + sessionId, {
        method: "POST"
      });
      await statusCheck(result);
      result = await result.text();

      // if the signout is successful, remove session ID and reload index html
      sessionStorage.removeItem("session_id");
      let signIn = qs(".sign-in");
      signIn.innerHTML = "";
      let signInAElement = gen("a");
      signInAElement.href = "sign-in.html";
      signInAElement.textContent = "Sign In";
      signIn.appendChild(signInAElement);
      window.location.href = "index.html";
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Fetch the information of all products from API and display it in main view.
   */
  async function getAllProducts() {
    try {

      // get information of all products
      let result = await fetch("/all");
      await statusCheck(result);
      result = await result.json();
      displayAllProducts(result.products);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Display all the products that are fetched from API.
   * @param {JSON} allProducts a json file of informaiton of all the products.
   */
  function displayAllProducts(allProducts) {
    id("card-container").innerHTML = "";
    for (let i = 0; i < allProducts.length; i++) {
      let productCard = makeProductCard(allProducts[i]);
      let cardContainer = id("card-container");
      cardContainer.appendChild(productCard);
    }

    // add click event to all cards
    let cards = qsa(".card-body");
    for (let i = 0; i < cards.length; i++) {
      cards[i].addEventListener("click", async function() {
        await makeProductPage(this);
      });
    }
  }

  /**
   * Creates a product card element based on the provided product details.
   * This function generates a new card element that displays the product's image,
   * brand, name, and cost. It returns the created card element, which can be
   * appended to the DOM to display the product.
   *
   * @param {Object} productDetails - The details of the product to display.
   * @param {string} productDetails.name - The name of the product.
   * @param {string} productDetails.brand - The brand or company that made the product.
   * @param {number} productDetails.cost - The cost of the product.
   * @returns {HTMLElement} The generated product card element.
   */
  function makeProductCard(productDetails) {

    // create card
    let productCard = gen("article");
    productCard.classList.add("card-body");
    productCard.classList.add("grid-card");
    productCard.id = productDetails["product_id"];

    // image
    let productImg = gen("img");
    productImg.src = "img/" + productDetails.name.toLowerCase().replaceAll(" ", "") + ".png";
    productImg.alt = productDetails.name;

    // company
    let companyContainer = gen("p");
    companyContainer.textContent = productDetails.brand;

    // name
    let nameContainer = gen("p");
    nameContainer.textContent = productDetails.name;

    // cost
    let costContainer = gen("p");
    costContainer.textContent = "$" + productDetails.cost;

    productCard.appendChild(productImg);
    productCard.appendChild(companyContainer);
    productCard.appendChild(nameContainer);
    productCard.appendChild(costContainer);

    return productCard;
  }

  /**
   * Show the shopping cart page.
   */
  function shoppingCartPage() {
    let mainView = id("main-view");
    mainView.classList.add("hidden");
    let productPage = id("product-page");
    productPage.classList.add("hidden");
    let basketContainer = qs(".basket-container");
    basketContainer.classList.remove("hidden");
  }

  /**
   * Go back to main view.
   */
  async function returnBackMainView() {
    try {
      changeTitle("Main Page");
      let mainView = id("main-view");
      mainView.classList.remove("hidden");

      let basketContainer = qs(".basket-container");
      basketContainer.classList.add("hidden");

      let productPage = id("product-page");
      productPage.classList.add("hidden");

      await getAllProducts();
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * switch the view of the first page, decide grid or list.
   */
  function switchView() {
    id("card-container").classList.toggle("list-container");
    id("card-container").classList.toggle("grid-container");
    let cardBody = qsa(".card-body");
    for (let i = 0; i < cardBody.length; i++) {
      cardBody[i].classList.toggle("grid-card");
      cardBody[i].classList.toggle("list-card");
    }
  }

  /**
   * Updates the text content of the page title with the given message.
   * @param {string} message - The message to set as the page title.
   */
  function changeTitle(message) {
    qs(".page-title").textContent = message;
  }

  /**
   * Handles the display of the product page when a product card is clicked.
   *
   * - Retrieves the product name from the clicked card.
   * - Shows the review form if the user is logged in.
   * - Clears the previous review form inputs.
   * - Fetches the product details from the server using the product name.
   * - Calls the `displayProductPage` function to render the product details page
   *   with the fetched data.
   *
   * @param {HTMLElement} clickedCard - The DOM element representing the clicked product card.
   * @param {string} clickedCard.children[2].textContent - The product name displayed in the
   *                                                       clicked card.
   *
   * @throws {Error} If the fetch request or any subsequent operation fails, an error will be
   * thrown and handled.
   */
  async function makeProductPage(clickedCard) {
    let productId = clickedCard.id;

    // add review form
    let reviewForm = qs(".write-review article");
    if (username) {
      let commentContainer = qs(".comment");
      commentContainer.classList.add("hidden");
      reviewForm.classList.remove("hidden");
      let successReview = qs(".write-review p");
      successReview.classList.add("hidden");
    }

    qs(".review-form input[name=rating]").value = "";
    qs(".review-form textarea[name=review]").value = "";
    try {
      let res = await fetch("/product?id=" + productId);
      await statusCheck(res);
      res = await res.json();
      await displayProductPage(res, productId);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Toggles the visibility of the comment section by adding/removing the "hidden" class.
   */
  function openComment() {
    qs(".review-form .comment").classList.toggle("hidden");
  }

  /**
   * Displays the product details page and populates it with information about the given product.
   * - Hides the main view and shows the product page.
   * - Populates the product details container with product information.
   * - Sets up the "Add Cart" button and the review submission process.
   *
   * @param {Object} productDetails - The details of the product to display on the page.
   * @param {string} productDetails.brand - The brand of the product.
   * @param {string} productDetails.name - The name of the product.
   * @param {string} productDetails.size - The size of the product (in ml).
   * @param {string} productDetails.color - The color of the product.
   * @param {number} productDetails.cost - The cost of the product.
   * @param {string} productDetails.product_id - The ID of the product for review submission.
   * @param {number} productDetails.stock - The stock availability of the product.
   * @param {number} productId - The ID of the product being displayed.
   * @throws {Error} If any asynchronous operation fails, an error will be thrown and handled.
   */
  async function displayProductPage(productDetails, productId) {
    try {
      toggleViews();
      populateProductDetails(productDetails, productId);
      updateProductImage(productDetails);
      await checkSubmission(productDetails.product_id);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Toggles visibility of the main view and product page.
   */
  function toggleViews() {
    id("main-view").classList.add("hidden");
    id("product-page").classList.remove("hidden");
  }

  /**
   * Populates the product details container
   * with product information and sets up the "Add Cart" button.
   *
   * @param {Object} productDetails - The details of the product to display.
   * @param {string} productId - The ID of the product.
   */
  function populateProductDetails(productDetails, productId) {
    let productDetailsContainer = qs(".product-details");
    productDetailsContainer.innerHTML = "";

    const details = [
      {text: productDetails.brand},
      {text: productDetails.name},
      {text: `${productDetails.size}ml`},
      {text: productDetails.color},
      {text: `$${productDetails.cost}`}
    ];

    details.forEach(detail => {
      let paragraph = gen("p");
      paragraph.textContent = detail.text;
      productDetailsContainer.appendChild(paragraph);
    });

    let cart = createCartSection(productDetails, productId);
    productDetailsContainer.appendChild(cart);
  }

  /**
   * Creates the cart section for the product page,
   * including the "Add Cart" button and stock message.
   *
   * @param {Object} productDetails - The details of the product to display.
   * @param {string} productId - The ID of the product.
   * @returns {HTMLElement} The cart section element.
   */
  function createCartSection(productDetails, productId) {
    let cart = gen("div");
    cart.classList.add("add-cart-container");

    let addCart = gen("div");
    let addCartMessage = gen("div");

    if (productDetails.stock === 0) {
      addCart.classList.add("out-of-stock");
      addCartMessage.textContent = "Out of stock";
      addCart.textContent = "Add Cart";
    } else {
      addCart.classList.add("add-cart");
      addCart.textContent = "Add Cart";
      addCartMessage.classList.add("hidden", "add-cart-message");
      addCartMessage.textContent = "Already in your cart";

      cart.addEventListener("click", async function() {
        let sessionId = sessionStorage.getItem("session_id");
        if (!sessionId) {
          addToCart(productDetails, productId);
        } else {
          await checkCartInfo(productDetails, productId);
        }
      });
    }

    cart.appendChild(addCart);
    cart.appendChild(addCartMessage);

    return cart;
  }

  /**
   * Updates the product image with the appropriate source and alt text.
   *
   * @param {Object} productDetails - The details of the product to display.
   */
  function updateProductImage(productDetails) {
    let productImg = qs(".product-img");
    productImg.src = "img/" + productDetails.name.toLowerCase().replaceAll(" ", "") + ".png";
    productImg.alt = productDetails.name;
  }

  /**
   * Checks the cart information for a given product and updates the shopping cart accordingly.
   * - Sends a POST request with the product ID to add the product to the cart.
   * - If the response indicates success ("TRUE"), the product is added to the cart.
   * - If the response indicates failure ("FALSE"), an error message is displayed.
   * - Handles errors during the request.
   * @param {Object} productDetails - The details of the product being added to the cart.
   * @param {string} productDetails.name - The name of the product.
   * @param {string} productDetails.brand - The brand of the product.
   * @param {string} productDetails.size - The size of the product (in milliliters or other units).
   * @param {string} productDetails.color - The color of the product.
   * @param {number} productDetails.cost - The cost of the product.
   * @param {string} productId - The unique identifier for the product.
   */
  async function checkCartInfo(productDetails, productId) {
    try {
      let data = new FormData();
      data.append("productId", productId);
      let sessionId = sessionStorage.getItem("session_id");
      let response = await fetch("/cart/add/" + sessionId, {
        method: "POST",
        body: data
      });
      await statusCheck(response);
      response = await response.text();

      // if the product is not in the cart yet, add to cart
      if (response === "TRUE") {
        addToCart(productDetails, productId);

      // if the product has already been in the cart, pop up message
      } else if (response === "FALSE") {
        qs(".add-cart-message").classList.remove("hidden");
      }
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Checks and sets up the submission handler for a product review form.
   * - Removes any existing form submission handler to avoid multiple listeners.
   * - Sets up a new submission handler that calls the `submitReviewFunction` with
   *   the provided product ID.
   * - Fetches the latest rating for the product using the `getRating` function.
   * @param {string} productId - The ID of the product for which the review is being submitted.
   * @throws {Error} If fetching the rating fails, an error will be thrown and handled.
   */
  async function checkSubmission(productId) {
    let submitReview = qs(".review-form");

    try {

      // Remove the previous listener if it exists
      submitReview.removeEventListener("submit", submitReviewHandler);
      submitReviewHandler = async function(eve) {
        await submitReviewFunction(eve, productId);
      };
      submitReview.addEventListener("submit", submitReviewHandler);
      await getRating(productId);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Submits a review for a product by sending the rating, comment, and session ID to the server.
   * - Prevents the default form submission behavior.
   * - Collects the rating, comment, and session ID from the form and session storage.
   * - Sends the data as a POST request to the server.
   * - Updates the review section with the latest rating for the product.
   * - Hides the review form and displays a success message upon successful submission.
   *
   * @param {Event} event - The form submission event.
   * @param {string} productId - The ID of the product being reviewed.
   * @throws {Error} If the review submission fails, an error is thrown and handled.
   */
  async function submitReviewFunction(event, productId) {
    event.preventDefault();
    let rating = qs(".review-form input[name=rating]").value;
    let comment = qs(".review-form textarea[name=review]").value;
    let sessionId = sessionStorage.getItem("session_id");

    try {
      let data = new FormData();
      data.append("rating", rating);
      data.append("comment", comment);

      let res = await fetch("/newreview/" + sessionId + "?id=" + productId, {
        method: "POST",
        body: data
      });
      await statusCheck(res);
      res = await res.text();

      // put average rating
      await getRating(productId);
      let reviewForm = qs(".write-review article");
      reviewForm.classList.add("hidden");
      let successReview = qs(".write-review p");
      successReview.classList.remove("hidden");
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Adds a product to the shopping cart and saves it to local storage.
   * - Displays the shopping cart section if the user is logged in.
   * - Adds the product to the local storage history.
   * - Creates a new cart item element with the product details, including name, brand, size,
   *   color, cost, and quantity selector.
   * - Appends the new cart item to the DOM.
   * @param {Object} productDetails - The details of the product being added to the cart.
   * @param {string} productDetails.name - The name of the product.
   * @param {string} productDetails.brand - The brand of the product.
   * @param {string} productDetails.size - The size of the product (in milliliters or other units).
   * @param {string} productDetails.color - The color of the product.
   * @param {number} productDetails.cost - The cost of the product.
   * @param {string} productId - The unique identifier for the product.
   */
  function addToCart(productDetails, productId) {
    updateCartStatus();
    hideMessages();
    displayCheckoutButtonIfLoggedIn();

    let cartCard = createCartCard(productDetails, productId);
    let addedProduct = qs(".added-products");
    addedProduct.appendChild(cartCard);
  }

  /**
   * Updates the cart status by incrementing the item count and showing the cart icon.
   */
  function updateCartStatus() {
    qs(".shopping-number").classList.remove("hidden");
    qs(".shopping-number").textContent = parseInt(qs(".shopping-number").textContent) + 1;
  }

  /**
   * Hides any previous success or error messages in the basket container.
   */
  function hideMessages() {
    qs(".empty-message").classList.add("hidden");
    qs(".basket-container .failed-container").classList.add("hidden");
    qs(".basket-container .success-container").classList.add("hidden");
  }

  /**
   * Displays the checkout button if the user is logged in.
   */
  function displayCheckoutButtonIfLoggedIn() {
    if (username) {
      let checkOut = qs(".check-out");
      checkOut.classList.remove("hidden");
    }
  }

  /**
   * Creates a cart card element for the given product details and product ID.
   * @param {Object} productDetails - The details of the product.
   * @param {string} productId - The ID of the product.
   * @returns {HTMLElement} - The generated cart card element.
   */
  function createCartCard(productDetails, productId) {
    let cartCard = gen("div");
    cartCard.classList.add("cart-card");

    let productImg = gen("img");
    productImg.src = "img/" + productDetails.name.toLowerCase().replaceAll(" ", "") + ".png";
    productImg.alt = productDetails.name;

    let productDetailsContainer = createProductDetails(productDetails, productId);

    cartCard.appendChild(productImg);
    cartCard.appendChild(productDetailsContainer);

    return cartCard;
  }

  /**
   * Creates a product details container with the product's information and controls.
   * @param {Object} productDetails - The details of the product.
   * @param {string} productId - The ID of the product.
   * @returns {HTMLElement} - The product details container element.
   */
  function createProductDetails(productDetails, productId) {
    let productDetailsContainer = gen("p");

    let brand = gen("p");
    brand.textContent = productDetails.brand;

    let name = gen("p");
    name.textContent = productDetails.name;

    let size = gen("p");
    size.textContent = productDetails.size + "ml";

    let color = gen("p");
    color.textContent = productDetails.color;

    let cost = gen("p");
    cost.textContent = "$" + productDetails.cost;

    let buttonsStockContainer = createButtonsStockContainer(productId);

    productDetailsContainer.appendChild(brand);
    productDetailsContainer.appendChild(name);
    productDetailsContainer.appendChild(size);
    productDetailsContainer.appendChild(color);
    productDetailsContainer.appendChild(cost);
    productDetailsContainer.appendChild(buttonsStockContainer);

    return productDetailsContainer;
  }

  /**
   * Creates a container for the product's buttons and stock information.
   * @param {string} productId - The ID of the product.
   * @returns {HTMLElement} - The buttons and stock container element.
   */
  function createButtonsStockContainer(productId) {
    const star = 5;
    let buttonsStockContainer = gen("p");

    let select = gen("select");
    for (let i = 1; i <= star; i++) {
      const option = gen("option");
      option.value = i;
      option.textContent = i;
      select.appendChild(option);
    }
    select.addEventListener("change", async function() {
      await saveQuantityCart(this, productId);
    });

    let removeButton = gen("button");
    removeButton.textContent = "remove";
    removeButton.addEventListener("click", async function() {
      await removeFromCart(this, productId);
    });

    let stock = gen("span");
    stock.classList.add("stock");
    stock.classList.add("hidden");

    buttonsStockContainer.appendChild(select);
    buttonsStockContainer.appendChild(removeButton);
    buttonsStockContainer.appendChild(stock);

    return buttonsStockContainer;
  }

  /**
   * Updates the quantity of a product in the cart both on the server and the client.
   * This function is triggered when the user modifies the quantity input for a cart item.
   * @param {HTMLInputElement} clickedQuantity - The input element where the quantity was updated.
   * @param {string} productId - The ID of the product for which the quantity is being updated.
   */
  async function saveQuantityCart(clickedQuantity, productId) {
    let quantity = clickedQuantity.value;
    try {
      let data = new FormData();
      data.append("quantity", quantity);
      data.append("productId", productId);

      let sessionId = sessionStorage.getItem("session_id");
      let response = await fetch("/cart/update/quantity/" + sessionId, {
        method: "POST",
        body: data
      });
      await statusCheck(response);
      response = await response.text();
    } catch (err) {
      handleError(err);
    }

  }

  /**
   * Removes the closest cart item (cart card) from the DOM when called.
   * This function is typically used with an event listener on a button or item inside the cart.
   * It also updates the cart information on the server for the given product ID.
   * @param {HTMLElement} clickedRemoveButton - The button that was clicked to trigger the removal.
   * @param {string} productId - The ID of the product to be removed from the cart on the server.
   */
  async function removeFromCart(clickedRemoveButton, productId) {
    qs(".failed-container").classList.add("hidden");
    let closestCartCard = clickedRemoveButton.closest('.cart-card');
    closestCartCard.remove();

    qs(".shopping-number").textContent = parseInt(qs(".shopping-number").textContent) - 1;

    // if cart is 0 products, put empty mesage
    let addedProducts = qs(".added-products");
    if (addedProducts.children.length === 0) {
      let checkOut = qs(".check-out");
      checkOut.classList.add("hidden");

      let emptyMessage = qs(".empty-message");
      emptyMessage.classList.remove("hidden");

      qs(".shopping-number").classList.add("hidden");
    }

    // if user is sign in, update the cart database
    let sessionId = sessionStorage.getItem("session_id");
    if (sessionId) {
      try {
        let data = new FormData();
        data.append("productId", productId);
        let response = await fetch("/cart/remove/" + sessionId, {
          method: "POST",
          body: data
        });
        await statusCheck(response);
        response = await response.text();
      } catch (err) {
        handleError(err);
      }
    }

  }

  /**
   * Fetches the reviews and ratings for a product based on its ID, then displays them.
   * @param {string} productId - The unique identifier of the product for which the reviews
   *                             are being fetched.
   * @throws {Error} Throws an error if the fetch request fails or the response is not valid.
   */
  async function getRating(productId) {
    try {
      let response = await fetch("/review?id=" + productId);
      await statusCheck(response);
      response = await response.json();
      displayReviews(response);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Displays reviews and ratings for a product, updating the UI with the total reviews,
   * average rating, and user comments.
   * @param {Object} allReviews - An object containing review data and average rating.
   * @param {Array<Object>} allReviews.reviews - An array of review objects.
   * @param {string} allReviews.reviews[].username - The username associated with each review.
   * @param {string} allReviews.reviews[].comment - The comment content of each review.
   * @param {number} allReviews.avgRating - The average rating value for the product.
   */
  function displayReviews(allReviews) {
    qs(".rating-num").textContent = allReviews.reviews.length;
    showReviewForm(allReviews.reviews);
    const avgRating = allReviews.avgRating;
    const stars = qsa('.rating-group .star');
    for (let i = 0; i < stars.length; i++) {
      const starValue = stars[i].getAttribute('data-value');
      if (starValue <= avgRating) {
        stars[i].classList.add('filled');
      } else {
        stars[i].classList.remove('filled');
      }
    }

    showComments(allReviews.reviews);

  }

  /**
   * Displays or hides the review form based on whether the user has already submitted a review.
   *
   * @param {Array<Object>} reviews - An array of review objects to check against.
   * @param {string} reviews[].username - The username associated with each review.
   */
  function showReviewForm(reviews) {
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].username === username) {
        let reviewForm = qs(".write-review article");
        reviewForm.classList.add("hidden");
        let successReview = qs(".write-review p");
        successReview.classList.remove("hidden");
      }
    }
  }

  /**
   * Displays a list of user reviews in the comments section by dynamically
   * generating comment cards.
   * @param {Array<Object>} reviews - An array of review objects to be displayed.
   * @param {string} reviews[].username - The username of the person who left the review.
   * @param {string} reviews[].comment - The comment or review text provided by the user.
   */
  function showComments(reviews) {
    let commentsContainer = qs(".comments-container");
    commentsContainer.innerHTML = "";
    for (let i = 0; i < reviews.length; i++) {

      // Create the outer div for the comment card
      let commentCard = gen('div');
      commentCard.classList.add('comment-card');

      // create the img element for the usericon
      let userIconContainer = gen('img');
      userIconContainer.classList.add("icon-img");
      userIconContainer.src = reviews[i].imgpath;
      userIconContainer.alt = "user icon";

      // Create the p element for the username
      let usernameContainer = gen('p');
      usernameContainer.textContent = reviews[i].username;

      // Create the div element for the comment
      let comment = gen('div');
      comment.classList.add('comment');
      comment.textContent = reviews[i].comment;

      // Create the div element for rating
      let rating = gen('div');
      rating.classList.add("star-container");
      let star = gen("span");
      star.textContent = "⭐" + reviews[i].rating;
      star.classList.add("star");
      star.classList.add("filled");
      rating.appendChild(star);

      // Append the username and comment to the comment card
      commentCard.appendChild(userIconContainer);
      commentCard.appendChild(usernameContainer);
      commentCard.appendChild(comment);
      commentCard.append(rating);

      // Append the comment card to the body or a specific container
      commentsContainer.appendChild(commentCard);
    }
  }

  /**
   * Handles errors by sending an appropriate response.
   * @param {Error} err - The error object.
   * @param {Object} res - The Express response object.
   */
  function handleError(err) {
    if (err.message === "Session ID is invalid") {
      changeTitle(err.message + " Please close the browser and try again.");
    } else {
      changeTitle(err.message);
    }
    id("card-container").innerHTML = "";
  }

  /**
   * Checks the status of a fetch response and throws an error if the response is not OK.
   * @async
   * @param {Response} res - The response object returned by the fetch API.
   * @returns {Promise<Response>} Resolves with the response if the status is OK.
   * @throws {Error} Throws an error containing the response text if the status is not OK.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} selector - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Returns a new element with the given tag name.
   * @param {string} tagName - HTML tag name for new DOM element.
   * @returns {object} New DOM object for given HTML tag.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }
})();
