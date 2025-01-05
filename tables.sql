CREATE TABLE "user" (
	"user_id"	INTEGER NOT NULL UNIQUE,
	"username"	TEXT NOT NULL UNIQUE,
	"email"	TEXT NOT NULL UNIQUE,
	"password"	TEXT NOT NULL,
	"phone"	INTEGER NOT NULL UNIQUE,
	"card_number"	INTEGER NOT NULL,
	"fund"	INTEGER NOT NULL,
	"shipping_address"	TEXT NOT NULL,
	"imgpath"	TEXT,
	PRIMARY KEY("user_id")
);

CREATE TABLE "session" (
	"session_id"	INTEGER NOT NULL UNIQUE,
	"user_id"	TEXT NOT NULL,
	PRIMARY KEY("session_id"),
	CONSTRAINT "fk_user_id" FOREIGN KEY("user_id") REFERENCES "reviews"("user_id")
);

CREATE TABLE "reviews" (
	"review_id"	INTEGER NOT NULL UNIQUE,
	"user_id"	INTEGER NOT NULL,
	"product_id"	INTEGER NOT NULL,
	"rating"	INTEGER NOT NULL,
	"comment"	TEXT,
	PRIMARY KEY("review_id"),
	CONSTRAINT "fk_product_id" FOREIGN KEY("product_id") REFERENCES "products"("product_id"),
	CONSTRAINT "fk_user_id" FOREIGN KEY("user_id") REFERENCES "session"("user_id")
);

CREATE TABLE "purchase" (
	"history_id"	INTEGER NOT NULL UNIQUE,
	"confirmation_id"	INTEGER NOT NULL,
	"user_id"	INTEGER NOT NULL,
	"product_id"	INTEGER NOT NULL,
	"quantity"	INTEGER NOT NULL,
	PRIMARY KEY("history_id"),
	CONSTRAINT "fk_product_id" FOREIGN KEY("product_id") REFERENCES "products"("product_id"),
	CONSTRAINT "fk_user_id" FOREIGN KEY("user_id") REFERENCES "user"("user_id")
);

CREATE TABLE "products" (
	"product_id"	INTEGER NOT NULL UNIQUE,
	"name"	TEXT NOT NULL UNIQUE,
	"type"	TEXT NOT NULL,
	"brand"	TEXT NOT NULL,
	"color"	TEXT NOT NULL,
	"cost"	INTEGER NOT NULL,
	"size"	INTEGER NOT NULL,
	"category"	TEXT NOT NULL,
	PRIMARY KEY("product_id")
);

CREATE TABLE "inventory" (
	"product_id"	INTEGER NOT NULL UNIQUE,
	"stock"	INTEGER NOT NULL,
	PRIMARY KEY("product_id"),
	CONSTRAINT "fk_product_id" FOREIGN KEY("product_id") REFERENCES "products"("product_id")
);

CREATE TABLE "cart" (
	"product_id"	INTEGER NOT NULL,
	"user_id"	INTEGER NOT NULL,
	"quantity"	INTEGER NOT NULL,
	PRIMARY KEY("product_id","user_id"),
	CONSTRAINT "fk_product_id" FOREIGN KEY("product_id") REFERENCES "products"("product_id"),
	CONSTRAINT "fk_user_id" FOREIGN KEY("user_id") REFERENCES "session"("user_id")
);
