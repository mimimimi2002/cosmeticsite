package repository

import (
	"context"
	"database/sql"
)

type User struct {
	UserID          int    `db:"user_id" json:"user_id"`
	Username        string `db:"username" json:"username"`
	Email           string `db:"email" json:"email"`
	Password        string `db:"password" json:"password"`
	Phone           string `db:"phone" json:"phone"`
	CardNumber      string `db:"card_number" json:"card_number"`
	Fund            int    `db:"fund" json:"fund"`
	ShippingAddress string `db:"shipping_address" json:"shipping_address"`
}

type UserRepository interface {
	SelectAll(ctx context.Context) ([]*User, error)
	SelectByID(ctx context.Context, userID int) (*User, error)
	Insert(ctx context.Context, user *User) error
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func (u *userRepository) SelectAll(ctx context.Context) ([]*User, error) {
	db := u.db

	// query
	query := "SELECT user_id, username, email, password, phone, card_number, fund, shipping_address FROM users"

	rows, err := db.Query(query)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	users := []*User{}

	for rows.Next() {
		var user User
		if err := rows.Scan(
			&user.UserID,
			&user.Username,
			&user.Email,
			&user.Password,
			&user.Phone,
			&user.CardNumber,
			&user.Fund,
			&user.ShippingAddress,
		); err != nil {
			return nil, err
		}

		users = append(users, &user)
	}

	return users, nil

}

func (u *userRepository) Insert(ctx context.Context, user *User) error {
	db := u.db

	// query
	query := `
		INSERT INTO users (username, email, password, phone, card_number, fund, shipping_address)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	result, err := db.Exec(query,
		user.Username,
		user.Email,
		user.Password,
		user.Phone,
		user.CardNumber,
		user.Fund,
		user.ShippingAddress,
	)

	if err != nil {
		return err
	}

	// read back the auto-incremented user_id and set it on the struct
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	user.UserID = int(id)

	return nil
}

func (u *userRepository) SelectByID(ctx context.Context, userID int) (*User, error) {
	db := u.db

	var user User
	// query
	query := `
		SELECT user_id, username, email, password, phone, card_number, fund, shipping_address
		FROM users
		WHERE user_id = ?
	`

	err := db.QueryRow(query, userID).Scan(
		&user.UserID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Phone,
		&user.CardNumber,
		&user.Fund,
		&user.ShippingAddress,
	)

	if err != nil {
		return nil, err
	}

	return &user, nil
}
