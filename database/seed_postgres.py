import csv
import psycopg

conn = psycopg.connect(
    host="localhost",
    port=5432,
    dbname="cmbeautydb",
    user="testuser",
    password="password",
)

try:
    with conn.cursor() as cursor:

        # products
        with open("database/seed/products.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                cursor.execute(
                    """
                    INSERT INTO products
                    (product_id, name, type, brand, color, cost, size, category)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (product_id) DO NOTHING
                    """,
                    (
                        int(row["product_id"]),
                        row["name"],
                        row["type"],
                        row["brand"],
                        row["color"],
                        int(row["cost"]),
                        float(row["size"]),
                        row["category"],
                    )
                )

        # inventory
        with open("database/seed/inventory.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row in reader:
                cursor.execute(
                    """
                    INSERT INTO inventory
                    (product_id, stock)
                    VALUES (%s, %s)
                    ON CONFLICT (product_id) DO NOTHING
                    """,
                    (
                        int(row["product_id"]),
                        int(row["stock"]),
                    )
                )

    conn.commit()
    print("PostgreSQL seed completed.")

except Exception:
    conn.rollback()
    raise

finally:
    conn.close()