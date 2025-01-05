/**
 * Name: Chuanqi Ma, Cecelia Chen
 * Date: December 10, 2024
 * Section: CSE 154 AB Peter Oh
 * This is the sign-in.js that handles behavior in sign-in.html.
 * Call the api to compare the user name and password for signin in and
 * create a new user.
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
  function init() {

    // sign-in button
    let signInSubmitButton = qs("#sign-in-form");
    signInSubmitButton.addEventListener("submit", async function(eve) {
      await submitSignIn(eve);
    });

    // go to craete new account page
    let goToNewAccountPageButton = qs(".new-account button");
    goToNewAccountPageButton.addEventListener("click", goToNewAccountPage);

    // submit new account button
    let submitNewAccountButton = qs("#new-account-form");
    submitNewAccountButton.addEventListener("submit", async function(eve) {
      await submitNewAccount(eve);
    });

    // hide success container
    let success = qs(".success");
    success.classList.add("hidden");

    let icons = qsa(".icon-img");
    for (let i = 0; i < icons.length; i++) {
      icons[i].addEventListener("click", selectIcon);
    }
  }

  /**
   * Handles the selection of an icon by toggling the "selected" class.
   * - Removes the "selected" class from all icons.
   * - Adds the "selected" class to the icon that triggered the event.
   * This function is typically used as an event handler for click events on icon elements.
   */
  function selectIcon() {
    let icons = qsa(".icon-img");
    for (let i = 0; i < icons.length; i++) {
      icons[i].classList.remove("selected");
    }
    this.classList.add("selected");
  }

  /**
   * Call api to check the information in form is valid.
   * @param {Event} eve - The event object representing the submit action.
   */
  async function submitSignIn(eve) {
    eve.preventDefault();

    let data = new FormData();
    let username = qs("#sign-in-form input[name=username]").value;
    let password = qs("#sign-in-form input[name=password]").value;

    data.append("username", username);
    data.append("password", password);

    try {
      let response = await fetch("/signin", {method: "POST", body: data});
      await statusCheck(response);

      // get the sessionID if successful
      let sessionId = await response.text();

      // delete the input
      qs("#sign-in-form input[name=username]").value = "";
      qs("#sign-in-form input[name=password]").value = "";

      let newAccount = qs(".new-account");
      newAccount.classList.add("hidden");

      let errorMessage = qs(".error-message");
      errorMessage.classList.add("hidden");

      let success = qs(".sign-in-container .success");
      success.classList.remove("hidden");

      sessionStorage.setItem("session_id", parseInt(sessionId));
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * The new account page is poped up, and sign in page is hidden.
   * @param {Event} eve - The event object representing the submit action.
   */
  function goToNewAccountPage(eve) {
    eve.preventDefault();
    let signInView = qs(".sign-in-container");
    let newAccountView = qs(".new-account-container");
    signInView.classList.toggle("hidden");
    newAccountView.classList.toggle("hidden");
  }

  /**
   * Clears all input fields in the new account form.
   */
  function clearFormInputs() {
    qs("#new-account-form input[name=username]").value = "";
    qs("#new-account-form input[name=email]").value = "";
    qs("#new-account-form input[name=password]").value = "";
    qs("#new-account-form input[name=phone]").value = "";
    qs("#new-account-form input[name=cardNumber]").value = "";
    qs("#new-account-form input[name=fund]").value = "";
    qs("#new-account-form textarea[name=shippingAddress]").value = "";
  }

  /**
   * Creates a FormData object with the values from the new account form.
   * @returns {FormData} A FormData object with the form values.
   */
  function createFormData() {
    let username = qs("#new-account-form input[name=username]").value;
    let email = qs("#new-account-form input[name=email]").value;
    let password = qs("#new-account-form input[name=password]").value;
    let phone = qs("#new-account-form input[name=phone]").value;
    let cardNumber = qs("#new-account-form input[name=cardNumber]").value;
    let fund = qs("#new-account-form input[name=fund]").value;
    let shippingAddress = qs("#new-account-form textarea[name=shippingAddress]").value;
    let imgpath = qs(".selected").src; // Get the full src value

    // Create a URL object
    let url = new URL(imgpath);

    // Get the relative path (removes the domain part)
    imgpath = url.pathname.substring(1);

    let data = new FormData();
    data.append("username", username);
    data.append("email", email);
    data.append("password", password);
    data.append("phone", phone);
    data.append("cardNumber", cardNumber);
    data.append("fund", fund);
    data.append("shippingAddress", shippingAddress);
    data.append("imgpath", imgpath);

    return data;
  }

  /**
   * Handles the success of the new account submission.
   */
  function handleSuccess() {
    let errorMessage = qs(".error-message");
    errorMessage.classList.add("hidden");

    let success = qs(".new-account-container .success");
    success.classList.remove("hidden");
  }

  /**
   * Handles the submission of a new account.
   * @param {Event} eve - The form submit event.
   */
  async function submitNewAccount(eve) {
    eve.preventDefault();

    let data = createFormData();

    try {
      let response = await fetch("/newaccount/icon", {method: "POST", body: data});
      await statusCheck(response);
      response = await response.text();

      // Clear the form after submission
      clearFormInputs();

      // Handle success
      handleSuccess();
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Checks the status of a fetch response and throws an error if the response is not OK.
   * @param {*} res - The response object from a fetch request.
   * @returns {Promise<Response>} The original response if it is OK.
   * @throws {Error} Throws an error with the response text if the status is not OK.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Handles and displays error messages in the user interface.
   * @param {Error} err - The error object containing the error message to display.
   */
  function handleError(err) {
    let errorMessage = qs(".error-message");
    errorMessage.classList.remove("hidden");
    errorMessage.textContent = err.message;
  }

  /** ------------------------------ Helper Functions  ------------------------------ */
  /**
   * Note: You may use these in your code, but remember that your code should not have
   * unused functions. Remove this comment in your own code.
   */

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Returns the array of elements that match the given CSS selector.
   * @param {string} selector - CSS query selector
   * @returns {object[]} array of DOM objects matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

})();