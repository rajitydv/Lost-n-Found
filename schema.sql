-- ====================================================================
-- Lost & Found Database Schema
-- Compatible with both MySQL and SQLite
-- ====================================================================

-- 1. Table structure for 'items'
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- For MySQL, replace AUTOINCREMENT with AUTO_INCREMENT
    type VARCHAR(10) NOT NULL,            -- 'lost' or 'found'
    title VARCHAR(255) NOT NULL,          -- e.g. "Silver MacBook Air"
    category VARCHAR(100) NOT NULL,       -- e.g. "Electronics", "Wallets & Bags", "Keys", etc.
    description TEXT,                     -- Detailed description of item
    location VARCHAR(255) NOT NULL,       -- Place where lost or found
    item_date VARCHAR(50) NOT NULL,       -- Date lost or found (YYYY-MM-DD)
    status VARCHAR(20) DEFAULT 'active',  -- 'lost', 'found', 'claimed', 'returned'
    contact_name VARCHAR(100) NOT NULL,   -- Contact person name
    contact_phone VARCHAR(50) NOT NULL,   -- Contact phone number
    contact_email VARCHAR(120),           -- Contact email address
    image_url VARCHAR(255),               -- Path to item photo or filename
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- Note for MySQL Users:
-- If importing manually into MySQL / phpMyAdmin, use this syntax:
--
-- CREATE DATABASE IF NOT EXISTS lost_and_found;
-- USE lost_and_found;
--
-- CREATE TABLE IF NOT EXISTS items (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     type VARCHAR(10) NOT NULL,
--     title VARCHAR(255) NOT NULL,
--     category VARCHAR(100) NOT NULL,
--     description TEXT,
--     location VARCHAR(255) NOT NULL,
--     item_date VARCHAR(50) NOT NULL,
--     status VARCHAR(20) DEFAULT 'active',
--     contact_name VARCHAR(100) NOT NULL,
--     contact_phone VARCHAR(50) NOT NULL,
--     contact_email VARCHAR(120),
--     image_url VARCHAR(255),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- ====================================================================

-- 2. Sample Starter Data (optional manual seed)
INSERT INTO items (type, title, category, description, location, item_date, status, contact_name, contact_phone, contact_email, image_url)
VALUES 
('lost', 'Silver MacBook Air M2 in Black Sleeve', 'Electronics', 'Lost my silver 13-inch MacBook Air inside a black padded zip sleeve. Has a small sticker of a mountain on the back.', 'University Main Library, 2nd Floor Study Desk', '2026-10-22', 'lost', 'Emily Watson', '+1 (555) 234-5678', 'emily.w@example.com', 'sample_macbook.jpg'),

('found', 'Classic Brown Leather Bi-fold Wallet', 'Wallets & Bags', 'Found a men brown genuine leather wallet with a couple of store cards and cash. Safe with building security.', 'Student Cafeteria, Booth #4', '2026-10-23', 'found', 'David Miller', '+1 (555) 876-5432', 'david.m@example.com', 'sample_wallet.jpg'),

('lost', 'Brass House Keys with Red Lanyard', 'Keys & Cards', 'Ring of 4 brass keys attached to a red paracord lanyard and a mini silver carabiner clip.', 'Campus Sports Complex near Gym Locker Room', '2026-10-21', 'lost', 'Liam Johnson', '+1 (555) 432-1098', 'liam.j@example.com', 'sample_keys.jpg'),

('found', 'Friendly Golden Retriever "Cooper"', 'Pets', 'Friendly male golden retriever found wandering near the park fountain. Wearing a blue nylon collar with no phone tag.', 'City Central Park, North Fountain', '2026-10-24', 'found', 'Sarah Jenkins', '+1 (555) 901-2345', 'sarah.j@example.com', 'sample_dog.jpg');
