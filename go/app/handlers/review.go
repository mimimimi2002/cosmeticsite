package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"product-api/app/repository"
)

type ReviewHandler struct {
	reviewRepo  repository.ReviewRepository
	sessionRepo repository.SessionRepository
}

func NewReviewHandler(reviewRepo repository.ReviewRepository, sessionRepo repository.SessionRepository) *ReviewHandler {
	return &ReviewHandler{
		reviewRepo:  reviewRepo,
		sessionRepo: sessionRepo,
	}
}

type AddReviewRequest struct {
	UserID    int
	ProductID int
	Rating    int
	Comment   string
}

type AddReviewResponse struct {
	ReviewID  int
	UserID    int
	ProductID int
	Rating    int
	Comment   string
}

type GetReviewsResponse struct {
	Reviews []*repository.Review
}

type GetReviewsByProductIDRequest struct {
	ProductID int
}

type GetReviewsByProductIDResponse struct {
	Reviews []*repository.Review
}

func parseAddReviewRequest(r *http.Request) (*AddReviewRequest, error) {
	userIDStr := r.FormValue("user_id")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return nil, errors.New("user id should be integer")
	}

	productIDStr := r.FormValue("product_id")
	productID, err := strconv.Atoi(productIDStr)
	if err != nil {
		return nil, errors.New("product id should be integer")
	}

	ratingStr := r.FormValue("rating")
	rating, err := strconv.Atoi(ratingStr)
	if err != nil {
		return nil, errors.New("rating should be integer")
	}

	req := &AddReviewRequest{
		UserID:    userID,
		ProductID: productID,
		Rating:    rating,
		Comment:   r.FormValue("comment"),
	}

	if req.UserID <= 0 {
		return nil, errors.New("user id should be positive number")
	}

	if req.ProductID <= 0 {
		return nil, errors.New("product id should be positive number")
	}

	if req.Rating < 1 || req.Rating > 5 {
		return nil, errors.New("rating should be between 1 and 5")
	}

	return req, nil
}

func parseGetReviewsByProductIDRequest(r *http.Request) (*GetReviewsByProductIDRequest, error) {
	productIDStr := r.PathValue("product_id")
	productID, err := strconv.Atoi(productIDStr)

	if err != nil {
		return nil, errors.New("product id should be integer")
	}

	req := &GetReviewsByProductIDRequest{
		ProductID: productID,
	}

	if req.ProductID <= 0 {
		return nil, errors.New("product id should be positive number")
	}

	return req, nil
}

func (h *ReviewHandler) AddReview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// require a valid session (login)
	if _, err := authenticate(r, h.sessionRepo); err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// parse request
	req, err := parseAddReviewRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// parse request to repo.Review
	review := &repository.Review{
		UserID:    req.UserID,
		ProductID: req.ProductID,
		Rating:    req.Rating,
		Comment:   req.Comment,
	}

	// repository.Insert
	err = h.reviewRepo.Insert(ctx, review)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)

	// parse response
	resp := &AddReviewResponse{
		ReviewID:  review.ReviewID,
		UserID:    review.UserID,
		ProductID: review.ProductID,
		Rating:    review.Rating,
		Comment:   review.Comment,
	}

	// encode response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to parse add review response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *ReviewHandler) GetReviews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// parse request : no format

	// repo.SelectAll
	reviews, err := h.reviewRepo.SelectAll(ctx)

	if err != nil {
		slog.Error("failed to get reviews from repo")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// parse response
	resp := &GetReviewsResponse{
		Reviews: reviews,
	}

	// encode to response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode response to json")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *ReviewHandler) GetReviewsByProductID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseGetReviewsByProductIDRequest(r)

	if err != nil {
		slog.Error("failed to parse request")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	productID := req.ProductID

	// repo.SelectByProductID
	reviews, err := h.reviewRepo.SelectByProductID(ctx, productID)

	if err != nil {
		slog.Error("failed to get reviews from repo")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// parse response
	resp := &GetReviewsByProductIDResponse{
		Reviews: reviews,
	}

	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode review response when get reviews by product id")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
