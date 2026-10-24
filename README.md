# Findr — Modern Lost & Found Web Application 🔍🎒

A sleek, responsive, and beginner-friendly **Lost & Found Web Application** built with **HTML5, CSS3, Vanilla JavaScript, Python Flask**, and **dual database support for MySQL and SQLite**.

---

## 🌟 Key Features

1. **Dashboard Overview & Metrics**: Real-time summary cards displaying Total Reports, Lost Items, Found Items, and Reunited Possessions.
2. **Lost & Found Reporting Form**: Easy modal form with dynamic themes for reporting lost or found items.
3. **Photo Upload with Live Instant Preview**: Drag & drop or click-to-upload item photos with real-time thumbnail preview before submission.
4. **Live Search & Category Filters**:
   - Instant search by title, location, or description with debounce.
   - Segmented buttons: *All Items*, *Lost*, *Found*, and *Reunited*.
   - Category filtering: *Electronics, Wallets & Bags, Keys & Cards, Documents, Pets, Clothing, Jewelry, Other*.
   - Sorting by newest or oldest reports.
5. **Detailed Item View**: Dedicated modal with large photo display, date/location tags, detailed description, and clickable contact links (`tel:` and `mailto:`).
6. **Complete CRUD Operations**:
   - **Create**: Report new lost/found items with photo upload.
   - **Read**: Browse item cards and inspect full details.
   - **Update**: Edit item info, change status, or upload a replacement photo.
   - **Delete**: Safe deletion with a confirmation prompt.
   - **Quick Action**: One-click status update to mark items as *Claimed / Returned*.
7. **Dual Database Architecture (SQLite & MySQL)**:
   - **SQLite (Default)**: Runs immediately out of the box with zero database setup required!
   - **MySQL (Optional)**: Seamless switch to MySQL with automatic placeholder conversion (`?` to `%s`).

---

## 📁 Flat Project Structure (All in Root Directory)

All files reside directly in the root directory—no subfolders for frontend or backend:

```text
Lost n found/
├── app.py                 # Flask web server, API routes & dual DB engine
├── index.html             # Responsive frontend dashboard & modals
├── style.css              # Modern CSS styles with design tokens & responsive grid
├── script.js              # Vanilla JS for live search, preview, and CRUD calls
├── schema.sql             # SQL database table schema & seed data
├── requirements.txt       # Python dependencies (Flask, PyMySQL)
├── README.md              # Project documentation & setup guide
├── lost_and_found.db      # SQLite database file (created automatically)
├── sample_macbook.jpg     # Starter item image
├── sample_wallet.jpg      # Starter item image
├── sample_keys.jpg        # Starter item image
└── sample_dog.jpg         # Starter item image
```

---

## 🚀 Quick Start Guide

### Step 1: Install Dependencies
Open your terminal or PowerShell in this project folder and run:

```bash
pip install -r requirements.txt
```

### Step 2: Run with SQLite (Zero Setup — Recommended)
Simply execute:

```bash
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

*Note: The app will automatically create `lost_and_found.db` and seed 4 sample records if the database is empty.*

---

## 🐬 Running with MySQL (Optional)

If you have MySQL or XAMPP installed and want to use MySQL:

1. **Start your MySQL server** (e.g., click "Start" on MySQL in the XAMPP Control Panel).
2. **Create the database** in phpMyAdmin or the MySQL command line:
   ```sql
   CREATE DATABASE lost_and_found;
   ```
3. **Configure MySQL in `app.py` or via Environment Variables**:
   In `app.py` (Line 29), set:
   ```python
   DB_TYPE = "mysql"
   ```
   Or launch in PowerShell with:
   ```powershell
   $env:DB_TYPE="mysql"; python app.py
   ```
4. **Run the server**:
   ```bash
   python app.py
   ```
   *The server will automatically generate the `items` table in MySQL upon launch.*

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the main web dashboard |
| `GET` | `/api/stats` | Returns aggregate statistics (total, lost, found, reunited) |
| `GET` | `/api/items` | Query items with `search`, `category`, `type`, `sort` |
| `GET` | `/api/items/<id>` | Fetch detailed record of a single item |
| `POST` | `/api/items` | Add new item (supports multipart image upload) |
| `PUT` | `/api/items/<id>` | Update item details, status, or replace photo |
| `PATCH`| `/api/items/<id>/status`| Quick status toggle (e.g. mark as claimed) |
| `DELETE`| `/api/items/<id>` | Delete an item |
| `GET` | `/api/db-status` | Check current active database engine (SQLite or MySQL) |

---

## 💡 Code Highlights & Architecture Notes

- **Flat Architecture Support**: Flask is initialized with `template_folder='.'` and `static_folder='.'` so all HTML, CSS, JS, and image assets are served directly from the root workspace without nested directories.
- **Unified Query Helper**: The `query_db()` function in `app.py` handles both SQLite and MySQL seamlessly, converting placeholder syntax automatically so queries stay consistent and easy to read.
- **Micro-Animations & Responsive Design**: Built with pure Vanilla CSS using CSS Grid and Flexbox, modern Google Fonts (*Outfit* and *Plus Jakarta Sans*), smooth hover transitions, and glassmorphic overlays.
- **Accessible & Beginner-Friendly**: Clean naming conventions, thorough code comments, and zero external frontend build steps or complicated frameworks.
