package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"product-api/app/repository"
)

const sessionCookieName = "session_id"

// authenticate validates the session_id cookie against the sessions store and
// returns the authenticated user id. Protected handlers call this directly in
// place of auth middleware: the cookie's session_id is looked up (i.e.
// compared against) the stored sessions.
func authenticate(r *http.Request, sessionRepo repository.SessionRepository) (int, error) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil {
		return 0, errors.New("unauthorized")
	}

	sessionID, err := strconv.Atoi(cookie.Value)
	if err != nil {
		return 0, errors.New("unauthorized")
	}

	session, err := sessionRepo.SelectByID(r.Context(), sessionID)
	if err != nil {
		return 0, errors.New("unauthorized")
	}

	return session.UserID, nil
}

type AuthHandler struct {
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
}

func NewAuthHandler(userRepo repository.UserRepository, sessionRepo repository.SessionRepository) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
	}
}

type SignInRequest struct {
	Email    string
	Password string
}

type SignInResponse struct {
	SessionID int
	UserID    int
	Username  string
}

func parseSignInRequest(r *http.Request) (*SignInRequest, error) {
	req := &SignInRequest{
		Email:    r.FormValue("email"),
		Password: r.FormValue("password"),
	}

	if req.Email == "" {
		return nil, errors.New("email is required")
	}

	if req.Password == "" {
		return nil, errors.New("password is required")
	}

	return req, nil
}

func (h *AuthHandler) SignIn(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	// parse request
	req, err := parseSignInRequest(r)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// look up the user by email
	user, err := h.userRepo.SelectByEmail(ctx, req.Email)

	if err != nil {
		// do not reveal whether the email exists
		slog.Info("sign in failed: user not found", "email", req.Email)
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	// verify password
	// compare plain password
	// password should be hashed
	if user.Password != req.Password {
		slog.Info("sign in failed: wrong password", "email", req.Email)
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	// issue a session
	session := &repository.Session{
		UserID: user.UserID,
	}

	err = h.sessionRepo.Insert(ctx, session)

	if err != nil {
		slog.Error("failed to create session")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// set the session id as a cookie
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    strconv.Itoa(session.SessionID),
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	// parse response
	resp := &SignInResponse{
		SessionID: session.SessionID,
		UserID:    user.UserID,
		Username:  user.Username,
	}

	// encode response
	err = json.NewEncoder(w).Encode(resp)

	if err != nil {
		slog.Error("failed to encode sign in response")
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	return
}

func (h *AuthHandler) SignOut(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// read the session id from the cookie
	cookie, err := r.Cookie(sessionCookieName)

	if err != nil {
		// no cookie means there is nothing to sign out from
		http.Error(w, "not signed in", http.StatusUnauthorized)
		return
	}

	sessionID, err := strconv.Atoi(cookie.Value)

	if err != nil {
		http.Error(w, "invalid session", http.StatusBadRequest)
		return
	}

	// delete the session from the db
	err = h.sessionRepo.DeleteByID(ctx, sessionID)

	if err != nil {
		slog.Error("failed to delete session")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// expire the cookie on the client
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})

	w.WriteHeader(http.StatusOK)

	return
}
