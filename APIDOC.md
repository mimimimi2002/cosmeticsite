# Cosmetics API Documentation
This API allows provides the list of all available cosmetic products, search for different kind products, and it will lead you to the page that contains all the products including the kind you search. In addition, you can fetch the all information for specific product.

## Get all kinds of cosmetics
**Request Format:** /all

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns a json file that includes all the information of all products in server.

**Example Request:** /all

**Example Response:**

```json
{
  "products": [
    ...
    {
      "product_id": 21,
      "name": "Special Edition Airwrap",
      "type": "hairairwrap",
      "brand": "Dyson",
      "color": "black",
      "cost": 599,
      "size": 0,
      "category": "hair",
      "stock": 0
    },
    {
      "product_id": 22,
      "name": "English Pear and Sweet Pea Cologne",
      "type": "perfume",
      "brand": "Jo Malone",
      "color": "clear",
      "cost": 165,
      "size": 100,
      "category": "fragrance",
      "stock": 3
    },
    {
      "product_id": 23,
      "name": "Lost Cherry Eau de Parfum Fragrance",
      "type": "perfume",
      "brand": "Tom Ford",
      "color": "clear",
      "cost": 615,
      "size": 100,
      "category": "fragrance",
      "stock": 2
    },
    ...
  ]
}

```

**Error Handling:**
- Possible 500 errors (all plain text):
  - If there is no products in the database of the server, returns error with `No products are in database. Please try again`
  - If something goes wrong on the server, returns error with `Something is wrong with server. Please try again`

## Search for products by search query and type
**Request Format:** /products/search

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns a json file of all information of products that match the search query and 
 * type with two query parameters "query" and "type". Users use query parameters "query" and "type" 
 * to filter results. 
 * "query" parameter can be empty string. "type" paremter should be one of the follwoing list
 * ["all", "blush", "foundation", "hairtreatment", "handcream", "handsanitizer", "perfume", "handsanitizer", "skincare", "lipstick", "powder", "eyeliner", "eyeshadow", "bronzer", "highlighter", "shampoo", "hairmask", "hairairwrap", "bodycream", "bodyoil", "bodysoap", "bodywash"]
 * If type is all, returns all the products' information.
 * User can search products by brand name or by product name that includes the search query and that match the type.

**Example Request:** /products/search?query="english"&type="all"
                     /products/search?query=""&type="bodycream"

**Example Response:**

```json
{
  "products": [
    {
      "product_id": 8,
      "name": "Infusion d'Iris Eau de Parfum",
      "type": "perfume",
      "brand": "Prada",
      "color": "green",
      "cost": 180,
      "size": 100,
      "category": "skincare"
    },
    {
      "product_id": 23,
      "name": "Lost Cherry Eau de Parfum Fragrance",
      "type": "perfume",
      "brand": "Tom Ford",
      "color": "clear",
      "cost": 615,
      "size": 100,
      "category": "fragrance"
    },
    {
      "product_id": 24,
      "name": "Miss Dior Eau de Parfum",
      "type": "perfume",
      "brand": "Dior",
      "color": "clear",
      "cost": 172,
      "size": 50,
      "category": "fragrance"
    }
  ]
}

```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If query (except it is emtpy string) or type is missing (400), an error is returned with the message `Search query or type is missing.`
  - If there is no products that matches query and type (400), an error is returned with the message `No matching products found.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Filter the products by category
**Request Format:** /filter/:category

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Return a json file of all information of products that matches the category.
* Category parameter should be one of the following list
* ["makeup", "skincare", "hair", "fragrance", "bathbody"]

**Example Request:** /filter/hair

**Example Response:**

```json
{
  "products": [
    {
      "product_id": 4,
      "name": "Hydrating Treatment for hair",
      "type": "hairtreatment",
      "brand": "Kérastase",
      "color": "brown",
      "cost": 60,
      "size": 90,
      "category": "hair"
    },
    {
      "product_id": 19,
      "name": "Strengthening Hair Repair Shampoo",
      "type": "shampoo",
      "brand": "Olaplex",
      "color": "white",
      "cost": 30,
      "size": 250,
      "category": "hair"
    },
    {
      "product_id": 20,
      "name": "Molecular Repair Hair Mask",
      "type": "hairmask",
      "brand": "K18",
      "color": "white",
      "cost": 75,
      "size": 50,
      "category": "hair"
    }
  ]
}

```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If there is no products that match the category (400), an error is returned with the message `No matching products found.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Get a specific product's information
**Request Format:** /product

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns all of the information of the product that matches productID with query paramter "id".

**Example Request:** /products/?id=1

**Example Response:**

```json
{
  "product_id": 1,
  "name": "Soft Pinch Liquid Blush",
  "type": "blush",
  "brand": "Rare Beauty",
  "color": "pink",
  "cost": 23,
  "size": 7.5,
  "category": "makeup"
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If id is missing (400), an error is returned with the message `Product ID is missing.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Create New Account with image
**Request Format:** /newaccount/icon endpoint with POST parameters of five information for users, username, email, password, phone number, card, number, fund, shipping address and image path formed `username`, `email`, `password`, `phone`, `cardNumber`, `fund`, `shippingAddress`, `imgpath`.

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Update user database if the informaiton of new account is unique. Returns "successful" if it updates the data successfully.


**Example Request:** POST parameters of `username=miki` and `email=example@uw.edu` and `password=mimi` and `phone=1231231234` and `cardNumber=123321123321123321` and `fund=60` and `shippingAddress=landerdesk`
and `imgpath=/img/icondog.png`

**Example Response:**

```
successful
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If either username or email or password or phone or cardNumber or fund or shippingAddress or image path is missing (400), an error is returned with the message `Username or email or password or phone or cardNumber or fun or shippingAddress or imgpath is missing.`
  - If the username is duplicated, (400), an error is returned with the message `Please enter different username`
  - If the email is duplicated, (400), an error is returned with the message `Please enter different email`
  - If the phoneNumber is duplicated, (400), an error is returned with the message `Please enter different phone number`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Create New Account without image
**Request Format:** /newaccount/noicon endpoint with POST parameters of five information for users, username, email, password, phone number, card, number, fund, shipping address formed `username`, `email`, `password`, `phone`, `cardNumber`, `fund`, `shippingAddress`,.

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Update user database if the informaiton of new account is unique. Returns "successful" if it updates the data successfully.


**Example Request:** POST parameters of `username=miki` and `email=example@uw.edu` and `password=mimi` and `phone=1231231234` and `cardNumber=123321123321123321` and `fund=60` and `shippingAddress=landerdesk`

**Example Response:**

```
successful
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If either username or email or password or phone or cardNumber or fund or shippingAddress is missing (400), an error is returned with the message `Username or email or password or phone or cardNumber or fun or shippingAddress is missing.`
  - If the username is duplicated, (400), an error is returned with the message `Please enter different username`
  - If the email is duplicated, (400), an error is returned with the message `Please enter different email`
  - If the phoneNumber is duplicated, (400), an error is returned with the message `Please enter different phone number`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Sing in
**Request Format:** /signin endpoint with POST parameters of two information for users, username and password, formed `username`, `password`.

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Returns unique 8 digit session ID if the username and password are valid.


**Example Request:** POST parameters of `username=mimi` and `password=mimi1003`

**Example Response:**

```
42342773
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If username or password is missing (400), an error is returned with the message `Username or password is missing`
  - If username or password is invalid (400), an error is returned with the message `Username or password is wrong`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Get reviews of the specific product
**Request Format:** /review

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns the reveiew information of the given product's id with query pamater `id`.

**Example Request:** /review?id=1

**Example Response:**

```json
{
  "avgRating": 3.5,
  "reviews": [
    {
      "username": "a",
      "rating": 3,
      "comment": "not bad"
    },
    {
      "username": "z",
      "rating": 4,
      "comment": "much better than other products"
    }
  ]
}

```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If username or password is missing (400), an error is returned with the message `Product ID is missing.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Submit the review of the specific product
**Request Format:** /newreview/:sessionId endpoint with POST parameters of two information of rating and comment, formed `rating`, `comment` and query parameter of productID formed 'id';

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Submit the review of specific product and  update the database if sessionID is valid.


**Example Request:** /newriview/12354399?id=1 POST parameters of  `rating=5`, and `comment="It was good. The blush was very smooth"`.

**Example Response:**

```
successfully submit review
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If missing either id or rating or comment (400), an error is returned with the message `Product ID or rating or comment is missing`
  - If session ID is invalid (400), an error is returned with the message `Session ID is invalid.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Get user information if signed in
**Request Format:** /userinfo/:sessionId 

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns a json file of information of user if the session ID is valid.


**Example Request:** /userinfo/43268557

**Example Response:**

```json
{
  "username": "z",
  "email": "z",
  "password": "z",
  "phone": 1233214324,
  "fund": 70,
  "shipping_address": "f"
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If sessionId is invalid (400), an error is returned with the message `Session ID is invalid.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Get history of shopping if user is signed in
**Request Format:** /userinfo/:sessionId 

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Returns a json file of information of history of shopping including the confirmation ID and products inforamtion


**Example Request:** /history/43268557

**Example Response:**

```
{
  "history": [
    {
      "confirmationId": "10AhZW33Sien",
      "products": [
        {
          "name": "Brightening and Cleansing Body Bar",
          "brand": "Topicals",
          "color": "pink",
          "cost": 28,
          "quantity": 1
        }
      ]
    },
    {
      "confirmationId": "bwTVZ0MYoJwd",
      "products": [
        {
          "name": "Oil Control Serum",
          "brand": "The Ordinary",
          "color": "clear",
          "cost": 6,
          "quantity": 2
        },
        {
          "name": "Watermelon Juice Moisturizer",
          "brand": "Glow Recipe",
          "color": "pink",
          "cost": 20,
          "quantity": 1
        }
      ]
    }
  ]
}

```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If sessionId is invalid (400), an error is returned with the message `Session ID is invalid.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Sign out
**Request Format:** /signout/:sessionId 

**Request Type:** GET

**Returned Data Format**: Plain Text

**Description:** Sign out the user if the sessionID is valid.


**Example Request:** /signout/43268557

**Example Response:**
successfully sign out

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If sessionId is invalid (400), an error is returned with the message `Session ID is invalid.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Edit user information
**Request Format:** /edit/userinfo/:sessionId endpoint with POST parameters of input information, formed `input`,

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Returns a json file that includes whether the edition is successful or fail.


**Example Request:** /edit/userinfo/12388866?column=username with POST parameter of `input=mimi`

**Example Response:**

```json
{
  "success": "Successfully update username information!",
  "fail": null
}
```

```json
{
    "success": null,
    "fail": "Please enter different username"
}
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If column or input is missing (400), an error is returned with the message `Please enter fullname and itemID of the product.`
  - If column name is not valid (400), an error is returned with the message `Column is invalid`
  - If sessionId is not valid (400), an error is returned with the message `Session ID is invalid`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Update database for products that are added to cart
**Request Format:** /cart/add/:sessionId endpoint with POST parameter of product ID  information, formed `productId`,

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Returns "TRUE" if the product with product id is successfully added to cart, returns "FALSE" if there is already same product in cart.


**Example Request:** /cart/add/12388866 with POST paramter of "productId=1"

**Example Response:**

```
TRUE
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If productId is missing (400), an error is returned with the message `Product ID is missing.`
  - If sessionId is not valid (400), an error is returned with the message `Session ID is invalid`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`


## Update quantity for products that are in the cart
**Request Format:** /cart/update/quantity/:sessionId endpoint with POST parameter of product ID  information, formed `productId`,

**Request Type:** POST

**Returned Data Format**: Plain Text

**Description:** Update the products of quantity in cart when session ID is valid. Returns "Succcessfully update quantity" when database was successully updated for the quantity of product with product id.


**Example Request:** /cart/update/quantity/12388866 with POST paramter of "productId=1"

**Example Response:**

```
Successfully update quantity
```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If productId is missing (400), an error is returned with the message `Product ID is missing.`
  - If sessionId is not valid (400), an error is returned with the message `Session ID is invalid`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Get productions information in cart
**Request Format:** /cart/get/:sessionId

**Request Type:** GET

**Returned Data Format**: JSON

**Description:** Get the production information in cart when session ID is valid.


**Example Request:** /cart/get/12388866

**Example Response:**

```json
[
  {
    "product_id": 1,
    "name": "Soft Pinch Liquid Blush",
    "brand": "Rare Beauty",
    "color": "pink",
    "size": 7.5,
    "cost": 23
  },
  {
    "product_id": 3,
    "name": "Naturally Longwear Foundation",
    "brand": "Fenty Beauty",
    "color": "nude",
    "size": 31,
    "cost": 40
  }
]


```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If sessionId is not valid (400), an error is returned with the message `Session ID is invalid`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`

## Buy the specific product
**Request Format:** /buy/:sessionId

**Request Type:** POST

**Returned Data Format**: JSON

**Description:** Returns a json file of information whether the transaction was succeedded or failed. If the transaction was successful, in successful key, it has product information, if it was failed, in fail key, it has either products information that are out of stock or shortmoney which the money you are short for buying all the products.


**Example Request:** /buy/48422200

**Example Response:**

```json
{
  "fail": {
      "products": [
        {
          "product_name": "Soft Pinch Liquid Blush",
          "stock": 0
        },
        {
          "product_name": "Naturally Longwear Foundation",
          "stock": 0
        }
      ],
      "shortmoney": 3
  }
  "successful": {
    "confirmation": null,
    "products": []
  }
}

```

```json
{
  "fail": {
      "products": [],
      "shortmoney": null
  },
  "successful": {
    "confirmation": "K0OKDRmoHSQJ",
    "products": [
        {
          "brand": "Salt and Stone",
          "color": "clear",
          "cost": 36,
          "name": "Body Wash with Niacinamide + Probiotic",
          "quantity": 1
        },
        {
          "brand": "Topicals",
          "color": "pink",
          "cost": 28,
          "name": "Brightening and Cleansing Body Bar",
          "quantity": 1
        }
    ]
  }
}

```

**Error Handling:**
- Possible 400 (invalid request) errors (all plain text):
  - If session ID is invalid (400), an error is returned with the message `Session ID is invalid.`
- Possible 500 errors (all plain text):
  - If something goes wrong on the server, returns error with `Something went wrong; please try again.`
