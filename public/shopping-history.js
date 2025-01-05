/**
 * Name: Chuanqi Ma, Cecelia Chen
 * Date: December 10, 2024
 * Section: CSE 154 AB Peter Oh
 * This is the shopping-history.js that handles behavior in shopping-hisoty.html.
 * Get the all the transaction of the signed in user and display it.
 */
"use strict";

(function() {

  // MODULE GLOBAL VARIABLES, CONSTANTS, AND HELPER FUNCTIONS CAN BE PLACED HERE

  /**
   * Add a function that will be called when the window is loaded.
   */
  window.addEventListener("load", init);

  /**
   * CHANGE: Describe what your init function does here.
   */
  async function init() {
    try {
      await getHistoryInfo();
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Fetches the user's shopping history based on the session ID and displays it.
   * It sends a request to the server to get the history data, processes the response,
   * and then calls `showHistory` to display the data on the page.
   * If an error occurs during the fetch or processing, it is caught and logged.
   * @async
   * @function getHistoryInfo
   * @returns {void} Does not return anything. Updates the DOM with the user's shopping history.
   */
  async function getHistoryInfo() {
    try {
      let sessionId = sessionStorage.getItem("session_id");

      let response = await fetch("/history/" + sessionId);
      await statusCheck(response);
      response = await response.json();
      showHistory(response);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }

  /**
   * Displays the shopping history by creating and appending history cards
   * to the shopping history container.
   * Each history card includes the confirmation code and associated product cards.
   * @param {Object} shoppingHistory - The shopping history data object.
   * @param {Object[]} shoppingHistory.history - An array of shopping history entries.
   * @param {string} shoppingHistory.history[].confirmationId
   * - The confirmation code for the shopping entry.
   * @param {Object[]} shoppingHistory.history[].products
   * - The list of products in the shopping history entry.
   * @param {string} shoppingHistory.history[].products[].name - The name of the product.
   * @param {number} shoppingHistory.history[].products[].cost - The cost of the product.
   * @param {number} shoppingHistory.history[].products[].quantity
   * - The quantity of the product purchased.
   */
  function showHistory(shoppingHistory) {
    let shoppingHistoryContainer = qs(".shopping-history-container");
    let shoppingMessage = qs(".shopping-history-container p");
    if (shoppingHistory.history.length > 0) {
      shoppingMessage.classList.add("hidden");
    }
    for (let i = 0; i < shoppingHistory.history.length; i++) {
      let historyCard = gen("article");
      historyCard.classList.add("history-card");
      let confirmationContainer = gen("p");
      let confirmationId = shoppingHistory.history[i].confirmationId;
      confirmationContainer.textContent = "Confirmation code: " + confirmationId;

      let products = shoppingHistory.history[i].products;
      let productCardContainer = gen("div");
      for (let j = 0; j < products.length; j++) {
        let productCard = makePurchasedProductPage(products[j]);
        productCardContainer.appendChild(productCard);
      }

      historyCard.appendChild(confirmationContainer);
      historyCard.appendChild(productCardContainer);
      shoppingHistoryContainer.appendChild(historyCard);
    }

  }

  /**
   * Creates and returns a product card element for a purchased product.
   * The card includes the product's image, name, cost, and quantity.
   * @param {Object} productDetails - An object containing details about the product.
   * @param {string} productDetails.name - The name of the product.
   * @param {number} productDetails.cost - The cost of the product.
   * @param {number} productDetails.quantity - The quantity of the product purchased.
   * @returns {HTMLElement} An article element representing the product card.
   */
  function makePurchasedProductPage(productDetails) {

    // create card
    let productCard = gen("article");
    productCard.classList.add("product-card");

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
   * Checks the status of a fetch response and throws an error if the response is not OK.
   * @async
   * @param {Response} res - The fetch response object to check.
   * @throws {Error} Throws an error with the response text if the status is not OK.
   * @returns {Promise<Response>} The original response object if the status is OK.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Handles and logs an error to the console.
   * @param {Error} err - The error object to be logged.
   */
  function handleError(err) {
    console.error(err);
  }

  /** ------------------------------ Helper Functions  ------------------------------ */
  /**
   * Note: You may use these in your code, but remember that your code should not have
   * unused functions. Remove this comment in your own code.
   */

  /**
   * Returns a new element with the given tag name.
   * @param {string} tagName - HTML tag name for new DOM element.
   * @returns {object} New DOM object for given HTML tag.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }
})();