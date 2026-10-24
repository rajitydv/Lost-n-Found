"""
Lost & Found Web Application
Backend Server built with Python Flask & Dual Database Support (SQLite & MySQL).
Flat project structure: All files located in the root directory.
"""

import os
import time
import sqlite3
import pymysql
from werkzeug.utils import secure_filename
from flask import Flask, render_template, send_from_directory, request, jsonify

# -----------------------------------------------------------------------------
# Configuration & Flat Structure Setup
# -----------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Flask is configured to serve templates and static assets directly from the root directory
app = Flask(__name__, template_folder=BASE_DIR, static_folder=BASE_DIR, static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload limit

# -----------------------------------------------------------------------------
# Database Configuration (MySQL with seamless SQLite fallback)
# -----------------------------------------------------------------------------
# Set DB_TYPE to 'mysql' or 'sqlite'. You can change this or set the DB_TYPE env var.
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()

MYSQL_CONFIG = {
    'host': os.getenv("MYSQL_HOST", "localhost"),
    'port': int(os.getenv("MYSQL_PORT", 3306)),
    'user': os.getenv("MYSQL_USER", "root"),
    'password': os.getenv("MYSQL_PASSWORD", ""),
    'database': os.getenv("MYSQL_DB", "lost_and_found"),
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True
}

SQLITE_PATH = os.path.join(BASE_DIR, "lost_and_found.db")
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

# Global indicator of active database in use
CURRENT_ACTIVE_DB = "sqlite"


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_db_connection():
    """
    Connects to MySQL if configured and available,
    otherwise gracefully falls back to SQLite.
    """
    global CURRENT_ACTIVE_DB
    if DB_TYPE == "mysql":
        try:
            conn = pymysql.connect(**MYSQL_CONFIG)
            CURRENT_ACTIVE_DB = "mysql"
            return conn, "mysql"
        except Exception as e:
            print(f"[Database Notice] MySQL connection failed ({e}). Falling back to SQLite.")
            CURRENT_ACTIVE_DB = "sqlite"

    # SQLite connection
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    CURRENT_ACTIVE_DB = "sqlite"
    return conn, "sqlite"


def query_db(query, args=(), one=False, commit=False):
    """
    Unified database query executor supporting both SQLite and MySQL.
    Automatically handles placeholder conversion (? to %s for MySQL).
    """
    conn, db_flavor = get_db_connection()
    cursor = conn.cursor()

    # Convert SQLite '?' placeholders to MySQL '%s' placeholders if using MySQL
    adapted_query = query
    if db_flavor == "mysql":
        adapted_query = query.replace('?', '%s')

    try:
        cursor.execute(adapted_query, args)
        if commit:
            if db_flavor == "sqlite":
                conn.commit()
            last_id = cursor.lastrowid
            cursor.close()
            conn.close()
            return last_id

        rv = cursor.fetchall()
        cursor.close()
        conn.close()

        # Convert SQLite Row objects to standard Python dictionaries
        if db_flavor == "sqlite":
            rv = [dict(row) for row in rv]
        return (rv[0] if rv else None) if one else rv
    except Exception as err:
        cursor.close()
        conn.close()
        raise err


# -----------------------------------------------------------------------------
# Database Initialization & Starter Seed Data
# -----------------------------------------------------------------------------
def init_db():
    """
    Initializes tables and seeds initial lost & found items if empty.
    """
    conn, db_flavor = get_db_connection()
    cursor = conn.cursor()

    if db_flavor == "mysql":
        table_sql = """
        CREATE TABLE IF NOT EXISTS items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            type VARCHAR(10) NOT NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            location VARCHAR(255) NOT NULL,
            item_date VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            contact_name VARCHAR(100) NOT NULL,
            contact_phone VARCHAR(50) NOT NULL,
            contact_email VARCHAR(120),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
    else:
        table_sql = """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type VARCHAR(10) NOT NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT,
            location VARCHAR(255) NOT NULL,
            item_date VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            contact_name VARCHAR(100) NOT NULL,
            contact_phone VARCHAR(50) NOT NULL,
            contact_email VARCHAR(120),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """

    cursor.execute(table_sql)
    if db_flavor == "sqlite":
        conn.commit()

    # Check if sample seed items are needed
    cursor.execute("SELECT COUNT(*) AS total FROM items")
    count_row = cursor.fetchone()
    total_count = count_row['total'] if isinstance(count_row, dict) else count_row[0]

    if total_count == 0:
        print("[Database] Seeding initial sample items...")
        sample_items = [
            (
                'lost',
                'Silver MacBook Air M2 in Black Sleeve',
                'Electronics',
                'Lost my 13-inch silver MacBook Air inside a black padded zip sleeve. Has a small mountain sticker on the lid. Left it on the desk.',
                'University Main Library, 2nd Floor Study Desk',
                '2026-10-22',
                'lost',
                'Emily Watson',
                '+1 (555) 234-5678',
                'emily.w@example.com',
                'sample_macbook.jpg'
            ),
            (
                'found',
                'Classic Brown Leather Bi-fold Wallet',
                'Wallets & Bags',
                'Found a men genuine brown leather wallet with a couple of store cards and cash. Kept safe with building security desk.',
                'Student Cafeteria, Booth #4',
                '2026-10-23',
                'found',
                'David Miller',
                '+1 (555) 876-5432',
                'david.m@example.com',
                'sample_wallet.jpg'
            ),
            (
                'lost',
                'Brass House Keys with Red Lanyard',
                'Keys & Cards',
                'Set of 4 brass Yale keys connected to a red paracord lanyard and a mini silver carabiner clip.',
                'Sports Complex near Gym Locker Room',
                '2026-10-21',
                'lost',
                'Liam Johnson',
                '+1 (555) 432-1098',
                'liam.j@example.com',
                'sample_keys.jpg'
            ),
            (
                'found',
                'Friendly Golden Retriever "Cooper"',
                'Pets',
                'Friendly male golden retriever puppy found wandering near the park fountain. Wearing a blue nylon collar with tag named Cooper.',
                'City Central Park, North Fountain',
                '2026-10-24',
                'found',
                'Sarah Jenkins',
                '+1 (555) 901-2345',
                'sarah.j@example.com',
                'sample_dog.jpg'
            )
        ]

        insert_sql = """
        INSERT INTO items (type, title, category, description, location, item_date, status, contact_name, contact_phone, contact_email, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        if db_flavor == "mysql":
            insert_sql = insert_sql.replace('?', '%s')

        for item in sample_items:
            cursor.execute(insert_sql, item)

        if db_flavor == "sqlite":
            conn.commit()

    cursor.close()
    conn.close()
    print(f"[Database] Ready using {db_flavor.upper()}.")


# -----------------------------------------------------------------------------
# Web Page & Static File Routes (Flat root directory)
# -----------------------------------------------------------------------------
@app.route('/')
def home():
    """Serves the main single-page application dashboard."""
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serves uploaded item images stored in root."""
    return send_from_directory(BASE_DIR, filename)


# -----------------------------------------------------------------------------
# REST API Endpoints
# -----------------------------------------------------------------------------
@app.route('/api/db-status', methods=['GET'])
def get_db_status():
    """Returns database connection status."""
    return jsonify({
        'active_db': CURRENT_ACTIVE_DB,
        'configured_db': DB_TYPE,
        'sqlite_file': 'lost_and_found.db',
        'mysql_target': f"{MYSQL_CONFIG['user']}@{MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}/{MYSQL_CONFIG['database']}"
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Returns aggregate statistics for the dashboard counter cards."""
    try:
        total = query_db("SELECT COUNT(*) as count FROM items", one=True)['count']
        lost = query_db("SELECT COUNT(*) as count FROM items WHERE type = 'lost' AND status != 'claimed' AND status != 'returned'", one=True)['count']
        found = query_db("SELECT COUNT(*) as count FROM items WHERE type = 'found' AND status != 'claimed' AND status != 'returned'", one=True)['count']
        reunited = query_db("SELECT COUNT(*) as count FROM items WHERE status = 'claimed' OR status = 'returned'", one=True)['count']

        return jsonify({
            'total': total,
            'lost': lost,
            'found': found,
            'reunited': reunited
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/items', methods=['GET'])
def get_items():
    """
    List items with optional search, category, type and sort filters.
    """
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    item_type = request.args.get('type', '').strip().lower()  # 'all', 'lost', 'found', 'claimed'
    sort = request.args.get('sort', 'newest').strip().lower()

    sql = "SELECT * FROM items WHERE 1=1"
    params = []

    # Type / Status filter
    if item_type == 'lost':
        sql += " AND type = 'lost' AND status = 'lost'"
    elif item_type == 'found':
        sql += " AND type = 'found' AND status = 'found'"
    elif item_type == 'claimed':
        sql += " AND (status = 'claimed' OR status = 'returned')"

    # Category filter
    if category and category.lower() != 'all':
        sql += " AND category = ?"
        params.append(category)

    # Search filter (matches title, description, or location)
    if search:
        sql += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])

    # Sorting
    if sort == 'oldest':
        sql += " ORDER BY id ASC"
    else:
        sql += " ORDER BY id DESC"

    try:
        items = query_db(sql, tuple(params))
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    """Retrieve full details for a single item."""
    try:
        item = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        return jsonify(item)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/items', methods=['POST'])
def add_item():
    """
    Create a new lost or found item with optional photo upload.
    """
    try:
        # Collect form fields
        item_type = request.form.get('type', 'lost').strip().lower()
        title = request.form.get('title', '').strip()
        category = request.form.get('category', 'Other').strip()
        description = request.form.get('description', '').strip()
        location = request.form.get('location', '').strip()
        item_date = request.form.get('item_date', '').strip()
        status = request.form.get('status', item_type).strip()
        contact_name = request.form.get('contact_name', '').strip()
        contact_phone = request.form.get('contact_phone', '').strip()
        contact_email = request.form.get('contact_email', '').strip()

        # Simple validation
        if not title or not location or not item_date or not contact_name or not contact_phone:
            return jsonify({'error': 'Please fill in all required fields (title, location, date, contact name, and phone).'}), 400

        # Handle image file upload
        image_url = ''
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename and allowed_file(file.filename):
                safe_name = secure_filename(file.filename)
                # Keep files flat in root directory
                unique_filename = f"upload_{int(time.time())}_{safe_name}"
                target_path = os.path.join(BASE_DIR, unique_filename)
                file.save(target_path)
                image_url = unique_filename

        insert_sql = """
        INSERT INTO items (type, title, category, description, location, item_date, status, contact_name, contact_phone, contact_email, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        new_id = query_db(
            insert_sql,
            (item_type, title, category, description, location, item_date, status, contact_name, contact_phone, contact_email, image_url),
            commit=True
        )

        created_item = query_db("SELECT * FROM items WHERE id = ?", (new_id,), one=True)
        return jsonify({'message': 'Item reported successfully!', 'item': created_item}), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/items/<int:item_id>', methods=['PUT', 'POST'])
def update_item(item_id):
    """
    Update details of an existing item.
    """
    try:
        existing = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
        if not existing:
            return jsonify({'error': 'Item not found'}), 404

        item_type = request.form.get('type', existing['type']).strip().lower()
        title = request.form.get('title', existing['title']).strip()
        category = request.form.get('category', existing['category']).strip()
        description = request.form.get('description', existing['description']).strip()
        location = request.form.get('location', existing['location']).strip()
        item_date = request.form.get('item_date', existing['item_date']).strip()
        status = request.form.get('status', existing['status']).strip()
        contact_name = request.form.get('contact_name', existing['contact_name']).strip()
        contact_phone = request.form.get('contact_phone', existing['contact_phone']).strip()
        contact_email = request.form.get('contact_email', existing['contact_email']).strip()

        # Check if new photo was uploaded
        image_url = existing['image_url']
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename and allowed_file(file.filename):
                safe_name = secure_filename(file.filename)
                unique_filename = f"upload_{int(time.time())}_{safe_name}"
                target_path = os.path.join(BASE_DIR, unique_filename)
                file.save(target_path)
                image_url = unique_filename

        update_sql = """
        UPDATE items
        SET type = ?, title = ?, category = ?, description = ?, location = ?,
            item_date = ?, status = ?, contact_name = ?, contact_phone = ?,
            contact_email = ?, image_url = ?
        WHERE id = ?
        """
        query_db(
            update_sql,
            (item_type, title, category, description, location, item_date, status, contact_name, contact_phone, contact_email, image_url, item_id),
            commit=True
        )

        updated_item = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
        return jsonify({'message': 'Item updated successfully!', 'item': updated_item})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/items/<int:item_id>/status', methods=['PATCH'])
def update_status(item_id):
    """
    Quick status toggle (e.g. mark as claimed or returned).
    """
    try:
        data = request.get_json() or {}
        new_status = data.get('status', 'claimed').strip()

        query_db("UPDATE items SET status = ? WHERE id = ?", (new_status, item_id), commit=True)
        updated_item = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
        return jsonify({'message': f'Status updated to {new_status}', 'item': updated_item})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """
    Delete an item and optionally remove its uploaded photo if not a sample asset.
    """
    try:
        existing = query_db("SELECT * FROM items WHERE id = ?", (item_id,), one=True)
        if not existing:
            return jsonify({'error': 'Item not found'}), 404

        # Clean up uploaded image if it was an uploaded file
        img = existing.get('image_url')
        if img and img.startswith('upload_'):
            img_path = os.path.join(BASE_DIR, img)
            if os.path.exists(img_path):
                try:
                    os.remove(img_path)
                except Exception:
                    pass

        query_db("DELETE FROM items WHERE id = ?", (item_id,), commit=True)
        return jsonify({'message': 'Item deleted successfully!', 'deleted_id': item_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# -----------------------------------------------------------------------------
# Application Entry Point
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    # Initialize database tables and sample records
    init_db()
    print("\n" + "=" * 60)
    print(" [Findr] Lost & Found App is running!")
    print(f" [*] Flat Root Directory: {BASE_DIR}")
    print(f" [*] Active Database Engine: {CURRENT_ACTIVE_DB.upper()}")
    print(" [*] Access application at: http://127.0.0.1:5000")
    print("=" * 60 + "\n")
    app.run(host='127.0.0.1', port=5000, debug=True)
