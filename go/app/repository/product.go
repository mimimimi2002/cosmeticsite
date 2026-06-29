package repository

import (
	"context"
	"database/sql"
)

type Product struct {
	ProductID int    `db:"product_id" json:"product_id"`
	Name      string `db:"name" json:"name"`
	Type      string `db:"type" json:"type"`
	Brand     string `db:"brand" json:"brand"`
	Color     string `db:"color" json:"color"`
	Cost      int    `db:"cost" json:"cost"`
	Size      int    `db:"size" json:"size"`
	Category  string `db:"category" json:"category"`
	ImageName string `db:"image_name" json:"image_name"`
}

type ProductRepository interface {
	SelectAll(ctx context.Context) ([]*Product, error)
	SelectByID(ctx context.Context, ProductID int) (*Product, error)
	Insert(ctx context.Context, Product *Product) error
}

type productRepository struct {
	db *sql.DB
}

func NewProductRepository(db *sql.DB) ProductRepository {
	return &productRepository{db: db}
}

func (p *productRepository) SelectAll(ctx context.Context) ([]*Product, error) {
	db := p.db

	// query
	query := "SELECT product_id, name, type, brand, color, cost, size, category image_name FROM products"

	rows, err := db.Query(query)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	products := []*Product{}

	for rows.Next() {
		var product Product
		if err := rows.Scan(
			&product.ProductID,
			&product.Name,
			&product.Type,
			&product.Brand,
			&product.Color,
			&product.Cost,
			&product.Size,
			&product.Category,
			&product.ImageName,
		); err != nil {
			return nil, err
		}

		products = append(products, &product)
	}

	return products, nil

}

func (p *productRepository) Insert(ctx context.Context, product *Product) error {
	db := p.db

	// query
	query := `
		INSERT INTO products (name, type, brand, color, cost, size, category)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	result, err := db.Exec(query,
		product.Name,
		product.Type,
		product.Brand,
		product.Color,
		product.Cost,
		product.Size,
		product.Category,
	)

	if err != nil {
		return err
	}

	// read back the auto-incremented product_id and set it on the struct
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	product.ProductID = int(id)

	return nil
}

func (p *productRepository) SelectByID(ctx context.Context, productID int) (*Product, error) {
	db := p.db

	var product Product
	// query
	query := `
		SELECT product_id, name, type, brand, color, cost, size, category, image_name
		FROM products
		WHERE product_id = ?
	`

	err := db.QueryRow(query, productID).Scan(
		&product.ProductID,
		&product.Name,
		&product.Type,
		&product.Brand,
		&product.Color,
		&product.Cost,
		&product.Size,
		&product.Category,
		&product.ImageName,
	)

	if err != nil {
		return nil, err
	}

	return &product, nil
}
