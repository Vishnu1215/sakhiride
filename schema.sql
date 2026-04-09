-- ============================================
-- SAKHI RIDE - DATABASE SCHEMA
-- Run this file in MySQL before starting server
-- ============================================

CREATE DATABASE IF NOT EXISTS sakhi_ride;
USE sakhi_ride;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(15) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('passenger', 'rider', 'admin') DEFAULT 'passenger',
  is_approved TINYINT(1) DEFAULT 0,
  profile_photo VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RIDES TABLE
CREATE TABLE IF NOT EXISTS rides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  passenger_id INT NOT NULL,
  rider_id INT DEFAULT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NOT NULL,
  status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  fare DECIMAL(10,2) DEFAULT NULL,
  distance_km DECIMAL(5,2) DEFAULT NULL,
  scheduled_time DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (passenger_id) REFERENCES users(id),
  FOREIGN KEY (rider_id) REFERENCES users(id)
);

-- SOS ALERTS TABLE
CREATE TABLE IF NOT EXISTS sos_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ride_id INT DEFAULT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  location_text VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'resolved') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (ride_id) REFERENCES rides(id)
);

-- RATINGS TABLE
CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ride_id INT NOT NULL,
  rated_by INT NOT NULL,
  rated_user INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_id) REFERENCES rides(id),
  FOREIGN KEY (rated_by) REFERENCES users(id),
  FOREIGN KEY (rated_user) REFERENCES users(id)
);

-- RIDER DETAILS TABLE
CREATE TABLE IF NOT EXISTS rider_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rider_id INT NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL,
  vehicle_number VARCHAR(20) NOT NULL,
  license_number VARCHAR(50) NOT NULL,
  is_available TINYINT(1) DEFAULT 1,
  current_location VARCHAR(255) DEFAULT NULL,
  total_rides INT DEFAULT 0,
  FOREIGN KEY (rider_id) REFERENCES users(id)
);

-- INSERT DEFAULT ADMIN USER
-- Password: admin123
INSERT IGNORE INTO users (name, email, phone, password, role, is_approved)
VALUES ('Admin', 'admin@sakhi.com', '9999999999', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'admin', 1);

-- Note: Default admin password is "admin123"
-- You can change it after logging in

SELECT 'Database setup complete!' AS message;
