import csv
import sqlite3

DB_PATH = "cmbeauty.db"

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    # products
    with open("database/seed/products.csv", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            cursor.execute(
                """
                INSERT OR IGNORE INTO products
                (product_id, name, type, brand, color, cost, size, category)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                INSERT OR IGNORE INTO inventory
                (product_id, stock)
                VALUES (?, ?)
                """,
                (
                    int(row["product_id"]),
                    int(row["stock"]),
                )
            )

    conn.commit()
    print("SQLite seed completed.")

except Exception:
    conn.rollback()
    raise

finally:
    conn.close()