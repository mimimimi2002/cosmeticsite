package main

import (
	"product-api/app"
	"os"
)

const (
	port         = "9000"
	imageDirPath = "images"
	dbPath       = "./db/cosmetic.sqlite3"
)

func main() {
	os.Exit(app.Server{
		Port:      port,
		ImagePath: imageDirPath,
		DBPath:    dbPath,
	}.Run())
}
