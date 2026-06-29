package repository

import (
	"context"
	"database/sql"
)

type Session struct {
	SessionID int `db:"session_id" json:"session_id"`
	UserID    int `db:"user_id" json:"user_id"`
}

type SessionRepository interface {
	Insert(ctx context.Context, session *Session) error
	SelectByID(ctx context.Context, sessionID int) (*Session, error)
	DeleteByID(ctx context.Context, sessionID int) error
}

type sessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) SessionRepository {
	return &sessionRepository{db: db}
}

func (s *sessionRepository) Insert(ctx context.Context, session *Session) error {
	db := s.db

	// query
	query := `
		INSERT INTO sessions (user_id)
		VALUES (?)
	`

	result, err := db.Exec(query, session.UserID)

	if err != nil {
		return err
	}

	// read back the auto-incremented session_id and set it on the struct
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	session.SessionID = int(id)

	return nil
}

func (s *sessionRepository) SelectByID(ctx context.Context, sessionID int) (*Session, error) {
	db := s.db

	var session Session
	// query
	query := `
		SELECT session_id, user_id
		FROM sessions
		WHERE session_id = ?
	`

	err := db.QueryRow(query, sessionID).Scan(
		&session.SessionID,
		&session.UserID,
	)

	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (s *sessionRepository) DeleteByID(ctx context.Context, sessionID int) error {
	db := s.db

	// query
	query := "DELETE FROM sessions WHERE session_id = ?"

	_, err := db.Exec(query, sessionID)

	if err != nil {
		return err
	}

	return nil
}
