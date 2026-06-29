package repository

import (
	"context"
	"database/sql"
)

type Review struct {
	ReviewID  int    `db:"review_id" json:"review_id"`
	UserID    int    `db:"user_id" json:"user_id"`
	ProductID int    `db:"product_id" json:"product_id"`
	Rating    int    `db:"rating" json:"rating"`
	Comment   string `db:"comment" json:"comment"`
}

type ReviewRepository interface {
	SelectAll(ctx context.Context) ([]*Review, error)
	Insert(ctx context.Context, review *Review) error
	SelectByProductID(ctx context.Context, productID int) ([]*Review, error)
}

type reviewRepository struct {
	db *sql.DB
}

func NewReviewRepository(db *sql.DB) ReviewRepository {
	return &reviewRepository{db: db}
}

func (r *reviewRepository) SelectAll(ctx context.Context) ([]*Review, error) {
	db := r.db

	// query
	query := "SELECT review_id, user_id, product_id, rating, comment FROM reviews"

	rows, err := db.Query(query)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	reviews := []*Review{}

	for rows.Next() {
		var review Review
		if err := rows.Scan(
			&review.ReviewID,
			&review.UserID,
			&review.ProductID,
			&review.Rating,
			&review.Comment,
		); err != nil {
			return nil, err
		}

		reviews = append(reviews, &review)
	}

	return reviews, nil
}

func (r *reviewRepository) Insert(ctx context.Context, review *Review) error {
	db := r.db

	// query
	query := `
		INSERT INTO reviews (user_id, product_id, rating, comment)
		VALUES (?, ?, ?, ?)
	`

	result, err := db.Exec(query,
		review.UserID,
		review.ProductID,
		review.Rating,
		review.Comment,
	)

	if err != nil {
		return err
	}

	// read back the auto-incremented review_id and set it on the struct
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	review.ReviewID = int(id)

	return nil
}

func (r *reviewRepository) SelectByProductID(ctx context.Context, productID int) ([]*Review, error) {
	db := r.db

	// query
	query := "SELECT review_id, user_id, product_id, rating, comment FROM reviews WHERE product_id = ?"

	rows, err := db.Query(query, productID)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	reviews := []*Review{}

	// for rows, scan review
	for rows.Next() {
		var review Review
		err := rows.Scan(
			&review.ReviewID,
			&review.UserID,
			&review.ProductID,
			&review.Rating,
			&review.Comment,
		)

		if err != nil {
			return nil, err
		}

		reviews = append(reviews, &review)

	}

	return reviews, nil
}
