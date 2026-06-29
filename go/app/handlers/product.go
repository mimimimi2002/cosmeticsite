package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"product-api/app/repository"
)

type Handlers struct {
	imgDirPath  string
	productRepo repository.ProductRepository
}

func NewHandlers(imgDirPath string, productRepo repository.ProductRepository) *Handlers {
	return &Handlers{
		imgDirPath:  imgDirPath,
		productRepo: productRepo,
	}
}

type AddProductRequest struct {
	Name     string
	Type     string
	Brand    string
	Color    string
	Cost     int
	Size     int
	Category string
}

type AddProductResponse struct {
	ProductID int
	Name      string
	Type      string
	Brand     string
	Color     string
	Cost      int
	Size      int
	Category  string
}

type GetProductsResponse struct {
	Products []*repository.Product
}

type GetProductByIDRequest struct {
	ProductID int
}

type GetProductByIDResponse struct {
	ProductID int
	Name      string
	Type      string
	Brand     string
	Color     string
	Cost      int
	Size      int
	Category  string
}

func parseAddProductRequest(r *http.Request) (*AddProductRequest, error) {
	costStr := r.FormValue("cost")
	cost, err := strconv.Atoi(costStr)
	if err != nil {
		return nil, errors.New("cost should be integer")
	}

	sizeStr := r.FormValue("size")
	size, err := strconv.Atoi(sizeStr)
	if err != nil {
		return nil, errors.New("size should be integer")
	}

	req := &AddProductRequest{
		Name:     r.FormValue("name"),
		Type:     r.FormValue("type"),
		Brand:    r.FormValue("brand"),
		Color:    r.FormValue("color"),
		Cost:     cost,
		Size:     size,
		Category: r.FormValue("category"),
	}

	if req.Name == "" {
		return nil, errors.New("name is required")
	}

	return req, nil
}

func parseGetProductByIDRequest(r *http.Request) (*GetProductByIDRequest, error) {
	productIDStr := r.PathValue("product_id")
	productID, err := strconv.Atoi(productIDStr)

	if err != nil {
		return nil, errors.New("product id should be integer")
	}

	req := &GetProductByIDRequest{
		ProductID: productID,
	}

	if req.ProductID <= 0 {
		return nil, errors.New("product id should be positive number")
	}

	return req, nil
}

func (h *Handlers) AddProduct(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseAddProductRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// parse request to repo.Product
	product := &repository.Product{
		Name:     req.Name,
		Type:     req.Type,
		Brand:    req.Brand,
		Color:    req.Color,
		Cost:     req.Cost,
		Size:     req.Size,
		Category: req.Category,
	}

	// repository.insert
	err = h.productRepo.Insert(ctx, product)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)

	// parse response
	resp := &AddProductResponse{
		ProductID: product.ProductID,
		Name:      product.Name,
		Type:      product.Type,
		Brand:     product.Brand,
		Color:     product.Color,
		Cost:      product.Cost,
		Size:      product.Size,
		Category:  product.Category,
	}

	// encode response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to parse add product response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *Handlers) GetProducts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// parse request : no format

	// repo.SelectAll
	products, err := h.productRepo.SelectAll(ctx)

	if err != nil {
		slog.Error("failed to get products from repo")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// parse response
	resp := &GetProductsResponse{
		Products: products,
	}

	// encode to response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode response to json")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *Handlers) GetProductByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseGetProductByIDRequest(r)

	if err != nil {
		slog.Error("failed to parse request")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	productID := req.ProductID

	// repo.SelectByID
	product, err := h.productRepo.SelectByID(ctx, productID)

	if err != nil {
		slog.Error("failed to get product from repo")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if product == nil {
		slog.Error("product not found")
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// parse response
	resp := &GetProductByIDResponse{
		ProductID: product.ProductID,
		Name:      product.Name,
		Type:      product.Type,
		Brand:     product.Brand,
		Color:     product.Color,
		Cost:      product.Cost,
		Size:      product.Size,
		Category:  product.Category,
	}

	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode product response when get product by id")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}