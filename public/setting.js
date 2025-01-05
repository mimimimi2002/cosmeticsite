/**
 * Name: Chuanqi Ma, Cecelia Chen
 * Date: December 10, 2024
 * Section: CSE 154 AB Peter Oh
 * This is the setting.js that handles behavior in setting.html. You can put the current user
 * information in setting page and modify the user information.
 */
"use strict";

(function() {

  // MODULE GLOBAL VARIABLES, CONSTANTS, AND HELPER FUNCTIONS CAN BE PLACED HERE

  /**
   * Add a function that will be called when the window is loaded.
   */
  window.addEventListener("load", init);

  /**
   * Initializes the user settings page
   * by adding event listeners to form elements, buttons, and icons.
   * This includes handlers for changing user details,
   * selecting icons, and retrieving user information.
   */
  async function init() {
    setupChangeEvent(".username-change", "#user-settings-form input[name=name", "username");
    setupChangeEvent(".email-change", "#user-settings-form input[name=email", "email");
    setupChangeEvent(".password-change", "#user-settings-form input[name=password", "password");
    setupChangeEvent(".phone-change", "#user-settings-form input[name=phone", "phone");
    setupChangeEvent(
      ".address-change",
      "#user-settings-form textarea[name=address",
      "shipping_address"
    );
    setupIconChangeEvent(".icon-change", ".selected", "imgpath");

    // if the user is sign in
    let sessionId = sessionStorage.getItem("session_id");
    if (sessionId) {
      try {
        await getUserInfo();
      } catch (err) {
        handleError(err);
      }
    }

    addEventToElements(".curr-info button", showEditForm);
    addEventToElements(".cancel-save div", cancelEdit);
    addEventToElements(".icon-img", selectIcon);
  }

  /**
   * Sets up an event listener for form submissions to handle user setting changes.
   * @param {string} formSelector - The selector for the form element.
   * @param {string} inputSelector - The selector for the input element within the form.
   * @param {string} changeType - The type of change being made (e.g., "username", "email").
   */
  function setupChangeEvent(formSelector, inputSelector, changeType) {
    let form = qs(formSelector);
    form.addEventListener("submit", async function(eve) {
      let input = qs(inputSelector).value;
      await submitChanges(eve, changeType, input);
    });
  }

  /**
   * Sets up an event listener for the icon change form to handle user icon updates.
   * @param {string} formSelector - The selector for the form element.
   * @param {string} iconSelector - The selector for the selected icon element.
   * @param {string} changeType - The type of change being made (e.g., "imgpath").
   */
  function setupIconChangeEvent(formSelector, iconSelector, changeType) {
    let form = qs(formSelector);
    form.addEventListener("submit", async function(eve) {
      let imgpath = qs(iconSelector).src;
      imgpath = new URL(imgpath).pathname;
      await submitChanges(eve, changeType, imgpath);
    });
  }

  /**
   * Adds an event listener to multiple elements matched by a selector.
   * @param {string} selector - The selector for the elements.
   * @param {Function} eventHandler - The event handler function to attach.
   */
  function addEventToElements(selector, eventHandler) {
    let elements = qsa(selector);
    for (let i = 0; i < elements.length; i++) {
      elements[i].addEventListener("click", eventHandler);
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
   * Cancels the editing process by hiding the current edit form and clearing its input.
   * This function hides the parent form of the clicked element,
   * clears any text input within the form,
   * and hides the status message. It is typically used to cancel changes in a user settings form.
   * @function cancelEdit
   * @returns {void} This function does not return a value.
   * It modifies the DOM by hiding the form and clearing the input field.
   */
  function cancelEdit() {
    qs(".status-message").classList.add("hidden");
    this.parentElement.parentElement.classList.add("hidden");

    // reset icon to defualt
    if (this.parentElement.parentElement.classList[0] === "icon-change") {
      let icons = qsa(".icon-img");
      for (let i = 0; i < icons.length; i++) {
        icons[i].classList.remove("selected");
      }
      icons[0].classList.add("selected");
    } else {
      this.parentElement.parentElement.children[0].value = "";
    }
  }

  /**
   * Displays the edit form corresponding to the clicked element.
   * This function hides all forms in the user settings section,
   * then shows the form that matches the class name
   * of the clicked element. It checks for an input or
   * textarea with a name matching the class name of the clicked
   * element and makes its parent element visible.
   * @function showEditForm
   * @returns {void} This function does not return a value.
   * It directly manipulates the DOM to show the relevant form.
   */
  function showEditForm() {
    qs(".status-message").classList.add("hidden");
    let allForms = qsa("form");
    for (let i = 0; i < allForms.length; i++) {
      allForms[i].classList.add("hidden");
    }
    let className = this.classList[0];
    if (className === "icon") {
      qs(".icon-change").classList.remove("hidden");
    } else {
      let editForm = qs("#user-settings-form input[name=" + className + "]");
      if (!editForm) {
        editForm = qs("#user-settings-form textarea[name=" + className + "]");
      }
      editForm.parentElement.classList.remove("hidden");
    }
  }

  /**
   * Submits changes to a specific column of user information.
   * This function prevents the default form submission, creates a `FormData` object,
   * and sends the provided input
   * to the server for updating the specified column of the user information.
   * Upon success, it checks the result
   * and displays the appropriate message. If an error occurs, it handles the error.
   * @async
   * @function submitChanges
   * @param {Event} eve - The event object representing the form submission event.
   * @param {string} column - The column of user information to be updated (e.g., "email", "phone").
   * @param {string} input - The new value to update the specified column with.
   * @returns {void} This function does not return a value. It performs a fetch request
   * and updates the UI based on the response.
   */
  async function submitChanges(eve, column, input) {
    eve.preventDefault();

    let data = new FormData();
    let sessionId = sessionStorage.getItem("session_id");
    data.append("input", input);
    data.append("column", column);
    try {
      let response = await fetch("/edit/userinfo/" + sessionId, {method: "POST", body: data});
      await statusCheck(response);
      response = await response.json();
      await checkResult(response);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Checks the result of an operation and displays a corresponding success or failure message.
   * This function checks the `success` and `fail` properties of the result object.
   * If a success message is present, it hides all forms and displays the success message.
   * It also calls the `getUserInfo` function.
   * If a failure message is present, it displays the failure message.
   * @function checkResult
   * @param {Object} result - The result object containing the outcome of an operation.
   * @param {string} result.success - The success message to be displayed
   * if the operation is successful.
   * @param {string} result.fail - The failure message to be displayed if the operation fails.
   * @returns {void} This function does not return a value. It updates the DOM based on the result.
   */
  async function checkResult(result) {
    let allForms = qsa("form");
    let successMessage = result.success;
    let failMessage = result.fail;
    if (successMessage) {
      try {
        for (let i = 0; i < allForms.length; i++) {
          allForms[i].classList.add("hidden");
        }
        qs(".status-message").classList.remove("hidden");
        qs(".status-message").textContent = successMessage;

        await getUserInfo();
      } catch (err) {
        handleError(err);
      }
    } else if (failMessage) {
      qs(".status-message").classList.remove("hidden");
      qs(".status-message").textContent = failMessage;
    }
  }

  /**
   * Fetches and displays user information based on the session ID.
   * This function retrieves the session ID from session storage,
   * and if it exists, it fetches the user information
   * from the server using the session ID. Upon success,
   * it calls the `displayUserInfo` function to display the user's information.
   * If an error occurs, the error is handled by the `handleError` function.
   * @async
   * @function getUserInfo
   * @returns {void} This function does not return a value.
   * It fetches user data and updates the DOM, or handles errors.
   */
  async function getUserInfo() {
    let sessionId = sessionStorage.getItem("session_id");
    if (sessionId) {
      try {
        let response = await fetch("/userinfo/" + sessionId);
        await statusCheck(response);
        response = await response.json();

        displayUserInfo(response);
      } catch (err) {
        handleError(err);
      }
    }
  }

  /**
   * Displays the user information on the webpage.
   * This function updates the content of various elements on the page with the user's information,
   * including username, email, phone, fund balance, and shipping address.
   * It expects an object with properties: `username`, `email`, `phone`, `fund`,
   * and `shipping_address`.
   * @function displayUserInfo
   * @param {Object} userInfo - An object containing the user's information.
   * @param {string} userInfo.username - The user's username.
   * @param {string} userInfo.email - The user's email address.
   * @param {string} userInfo.phone - The user's phone number.
   * @param {number} userInfo.fund - The user's fund balance.
   * @param {string} userInfo.shipping_address - The user's shipping address.
   * @returns {void} This function does not return a value.
   * It updates the DOM with the user information.
   */
  function displayUserInfo(userInfo) {
    qs(".currname .info").textContent = userInfo.username;
    qs(".curremail .info").textContent = userInfo.email;
    qs(".currphone .info").textContent = userInfo.phone;
    qs(".currfund .info").textContent = "$" + userInfo.fund;
    qs(".curraddress .info").textContent = userInfo["shipping_address"];
    qs(".curricon img").src = userInfo["imgpath"];
    qs(".curricon img").alt = "user icon";
  }

  /**
   * Checks the response status and throws an error if the response is not OK.
   * @async
   * @function statusCheck
   * @param {Response} res - The response object to be checked.
   * @returns {Promise<Response>} A promise that resolves to the response
   * object if the status is OK.
   * @throws {Error} If the response status is not OK, an error is thrown with the response text.
   */
  async function statusCheck(res) {
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res;
  }

  /**
   * Handles errors by logging them to the console.
   *
   * @function handleError
   * @param {Error} err - The error object to be logged.
   * @returns {void} This function does not return a value. It logs the error to the console.
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