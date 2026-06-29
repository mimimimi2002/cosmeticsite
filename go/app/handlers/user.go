package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"product-api/app/repository"
)

type UserHandler struct {
	userRepo repository.UserRepository
}

func NewUserHandler(userRepo repository.UserRepository) *UserHandler {
	return &UserHandler{
		userRepo: userRepo,
	}
}

type AddUserRequest struct {
	Username        string
	Email           string
	Password        string
	Phone           string
	CardNumber      string
	Fund            int
	ShippingAddress string
}

type AddUserResponse struct {
	UserID          int
	Username        string
	Email           string
	Phone           string
	CardNumber      string
	Fund            int
	ShippingAddress string
}

type GetUsersResponse struct {
	Users []*repository.User
}

type GetUserByIDRequest struct {
	UserID int
}

type GetUserByIDResponse struct {
	UserID          int
	Username        string
	Email           string
	Phone           string
	CardNumber      string
	Fund            int
	ShippingAddress string
}

func parseAddUserRequest(r *http.Request) (*AddUserRequest, error) {
	req := &AddUserRequest{
		Username:        r.FormValue("username"),
		Email:           r.FormValue("email"),
		Password:        r.FormValue("password"),
		Phone:           r.FormValue("phone"),
		CardNumber:      r.FormValue("card_number"),
		Fund:            0,
		ShippingAddress: r.FormValue("shipping_address"),
	}

	if req.Username == "" {
		return nil, errors.New("username is required")
	}

	if req.Email == "" {
		return nil, errors.New("email is required")
	}

	if req.Password == "" {
		return nil, errors.New("password is required")
	}

	return req, nil
}

func parseGetUserByIDRequest(r *http.Request) (*GetUserByIDRequest, error) {
	userIDStr := r.PathValue("user_id")
	userID, err := strconv.Atoi(userIDStr)

	if err != nil {
		return nil, errors.New("user id should be integer")
	}

	req := &GetUserByIDRequest{
		UserID: userID,
	}

	if req.UserID <= 0 {
		return nil, errors.New("user id should be positive number")
	}

	return req, nil
}

func (h *UserHandler) AddUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseAddUserRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// parse request to repo.User
	user := &repository.User{
		Username:        req.Username,
		Email:           req.Email,
		Password:        req.Password,
		Phone:           req.Phone,
		CardNumber:      req.CardNumber,
		Fund:            req.Fund,
		ShippingAddress: req.ShippingAddress,
	}

	// repository.insert
	err = h.userRepo.Insert(ctx, user)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)

	// parse response
	resp := &AddUserResponse{
		UserID:          user.UserID,
		Username:        user.Username,
		Email:           user.Email,
		Phone:           user.Phone,
		CardNumber:      user.CardNumber,
		Fund:            user.Fund,
		ShippingAddress: user.ShippingAddress,
	}

	// encode response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to parse add user response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// parse request : no format

	// repo.SelectAll
	users, err := h.userRepo.SelectAll(ctx)

	if err != nil {
		slog.Error("failed to get users from repo")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// parse response
	resp := &GetUsersResponse{
		Users: users,
	}

	// encode to response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode response to json")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *UserHandler) GetUserByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseGetUserByIDRequest(r)

	if err != nil {
		slog.Error("failed to parse request")
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	userID := req.UserID

	// repo.SelectByID
	user, err := h.userRepo.SelectByID(ctx, userID)

	if err != nil {
		slog.Error("failed to get user from repo")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if user == nil {
		slog.Error("user not found")
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// parse response
	resp := &GetUserByIDResponse{
		UserID:          user.UserID,
		Username:        user.Username,
		Email:           user.Email,
		Phone:           user.Phone,
		CardNumber:      user.CardNumber,
		Fund:            user.Fund,
		ShippingAddress: user.ShippingAddress,
	}

	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode user response when get user by id")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
