package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"product-api/app/repository"
)

type ProductHandler struct {
	imgDirPath  string
	productRepo repository.ProductRepository
}

func NewProductHandler(imgDirPath string, productRepo repository.ProductRepository) *ProductHandler {
	return &ProductHandler{
		imgDirPath:  imgDirPath,
		productRepo: productRepo,
	}
}

type AddProductRequest struct {
	Name      string
	Type      string
	Brand     string
	Color     string
	Cost      int
	Size      int
	Category  string
	ImageData []byte
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
	ImageName string
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
	ImgName   string
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

	// validate image byte file
	f, _, err := r.FormFile("image_name")

	if err != nil {
		return nil, errors.New("failed to open image file")
	}

	data, err := io.ReadAll(f)

	if err != nil {
		return nil, errors.New("failed to read data from file")
	}

	req := &AddProductRequest{
		Name:      r.FormValue("name"),
		Type:      r.FormValue("type"),
		Brand:     r.FormValue("brand"),
		Color:     r.FormValue("color"),
		Cost:      cost,
		Size:      size,
		Category:  r.FormValue("category"),
		ImageData: data,
	}

	if req.Name == "" {
		return nil, errors.New("name is required")
	}

	if len(req.ImageData) == 0 {
		return nil, errors.New("image data is empty")
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

func (h *ProductHandler) storeImage(data []byte) (string, error) {
	// hash for image data
	hash := sha256.Sum256(data)
	fileName := hex.EncodeToString(hash[:]) + `.jpg`
	filePath := filepath.Join(h.imgDirPath, fileName)

	err := os.WriteFile(filePath, data, 0644)

	if err != nil {
		return "", err
	}

	return fileName, nil

}

func (h *ProductHandler) AddProduct(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseAddProductRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	fileName, err := h.storeImage(req.ImageData)

	if err != nil {
		slog.Error("failed to store image")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// parse request to repo.Product
	product := &repository.Product{
		Name:      req.Name,
		Type:      req.Type,
		Brand:     req.Brand,
		Color:     req.Color,
		Cost:      req.Cost,
		Size:      req.Size,
		Category:  req.Category,
		ImageName: fileName,
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
		ImageName: product.ImageName,
	}

	// encode response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to parse add product response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *ProductHandler) GetProducts(w http.ResponseWriter, r *http.Request) {
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

func (h *ProductHandler) GetProductByID(w http.ResponseWriter, r *http.Request) {
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
