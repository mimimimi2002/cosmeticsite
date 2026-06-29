package app

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
	"log/slog"
	"net/http"
	"os"
	"product-api/app/handlers"
	"product-api/app/repository"
)

type Server struct {
	Port      string
	ImagePath string
	DBPath    string
}

func (s Server) Run() int {
	// set up logger
	logger := slog.New(slog.NewJSONHandler(os.Stderr, nil))
	slog.SetDefault(logger)
	// set the log level to DEBUG
	slog.SetLogLoggerLevel(slog.LevelInfo)

	// CORS frontend
	// frontURL := "http://localhost:3000"

	// DB
	db, err := sql.Open("sqlite3", s.DBPath)

	if err != nil {
		slog.Error("failed to open db")
		return 1
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		slog.Error("failed to connect db", "error", err)
		return 1
	}

	// Repository
	productRepo := repository.NewProductRepository(db)

	// Handlers
	productHandler := handlers.NewProductHandler(s.ImagePath, productRepo)

	// multiplexer routing
	mux := http.NewServeMux()

	// handle func
	mux.HandleFunc("POST /products", productHandler.AddProduct)
	mux.HandleFunc("GET /products", productHandler.GetProducts)
	mux.HandleFunc("GET /products/{product_id}", productHandler.GetProductByID)

	// start the server
	slog.Info("http server started on", "port", s.Port)
	err = http.ListenAndServe(":"+s.Port, mux)
	// err = http.ListenAndServe(":"+s.Port, simpleCORSMiddleware(simpleLoggerMiddleware(mux), frontURL, []string{"GET", "HEAD", "POST", "OPTIONS"}))
	if err != nil {
		slog.Error("failed to start server: ", "error", err)
		return 1
	}

	return 0
}
