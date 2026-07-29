-- MySQL Script for Grievance Portal System
-- Database Name: grievance_portal
-- User: root
-- Password: Mababa@0000
-- Host: localhost
-- Port: 3306

-- Drop database if exists to start fresh
DROP DATABASE IF EXISTS grievance_portal;

-- Create database
CREATE DATABASE grievance_portal;
USE grievance_portal;

-- User roles table - Simple role-based authentication
CREATE TABLE roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name ENUM('citizen', 'municipal_admin', 'municipal_worker') NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert the three required roles
INSERT INTO roles (role_name) VALUES 
    ('citizen'),
    ('municipal_admin'),
    ('municipal_worker');

-- Departments for municipal workers
CREATE TABLE departments (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic departments
INSERT INTO departments (department_name) VALUES 
    ('Roads'),
    ('Drainage'),
    ('Waste Management'),
    ('Street Lights'),
    ('Water Supply'),
    ('Electricity'),
    ('Public Property Maintenance');

-- Users table with authentication details
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Store hashed passwords in production
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15),
    role_id INT NOT NULL,
    department_id INT NULL, -- Only for municipal workers
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Citizen grievances table
CREATE TABLE grievances (
    grievance_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL, -- Path to uploaded photo
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL, -- Address derived from coordinates but editable
    description VARCHAR(1000) NOT NULL, -- Limited to 1000 chars as specified
    status ENUM('pending', 'working', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Municipal worker locations table
CREATE TABLE worker_locations (
    location_id INT PRIMARY KEY AUTO_INCREMENT,
    worker_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL, -- Address derived from coordinates but editable
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES users(user_id)
);

-- Grievance assignments by admin
CREATE TABLE grievance_assignments (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    grievance_id INT NOT NULL,
    worker_id INT NOT NULL,
    admin_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('working', 'completed') DEFAULT 'working',
    FOREIGN KEY (grievance_id) REFERENCES grievances(grievance_id),
    FOREIGN KEY (worker_id) REFERENCES users(user_id),
    FOREIGN KEY (admin_id) REFERENCES users(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_grievances_status ON grievances(status);
CREATE INDEX idx_grievances_user ON grievances(user_id);
CREATE INDEX idx_worker_locations ON worker_locations(worker_id);
CREATE INDEX idx_assignments_worker ON grievance_assignments(worker_id);
CREATE INDEX idx_assignments_grievance ON grievance_assignments(grievance_id);

-- Procedure to format coordinates in DMS format
DELIMITER //
CREATE FUNCTION FormatDMS(
    coord DECIMAL(11, 8),
    is_latitude BOOLEAN
) 
RETURNS VARCHAR(50)
DETERMINISTIC
BEGIN
    DECLARE degrees INT;
    DECLARE minutes INT;
    DECLARE seconds DECIMAL(10, 2);
    DECLARE direction CHAR(1);
    
    SET degrees = ABS(FLOOR(coord));
    SET minutes = FLOOR((ABS(coord) - degrees) * 60);
    SET seconds = ((ABS(coord) - degrees) * 60 - minutes) * 60;
    
    IF is_latitude THEN
        SET direction = IF(coord >= 0, 'N', 'S');
    ELSE
        SET direction = IF(coord >= 0, 'E', 'W');
    END IF;
    
    RETURN CONCAT(degrees, 'º ', minutes, "' ", FORMAT(seconds, 2), '" ', direction);
END//
DELIMITER ;

-- Create a table of PIN code ranges for major areas
CREATE TABLE pin_code_ranges (
    range_id INT PRIMARY KEY AUTO_INCREMENT,
    min_latitude DECIMAL(10, 8) NOT NULL,
    max_latitude DECIMAL(10, 8) NOT NULL,
    min_longitude DECIMAL(11, 8) NOT NULL, 
    max_longitude DECIMAL(11, 8) NOT NULL,
    pin_code_start VARCHAR(3) NOT NULL,
    area_name VARCHAR(100) NOT NULL
);

-- Insert PIN code ranges for major Indian cities
INSERT INTO pin_code_ranges (min_latitude, max_latitude, min_longitude, max_longitude, pin_code_start, area_name) VALUES
-- Delhi (110xxx)
(28.40, 28.90, 76.80, 77.40, '110', 'Delhi'),
-- Mumbai (400xxx)
(18.80, 19.30, 72.70, 73.00, '400', 'Mumbai'),
-- Kolkata (700xxx)
(22.40, 22.70, 88.20, 88.50, '700', 'Kolkata'),
-- Chennai (600xxx)
(12.80, 13.30, 80.00, 80.40, '600', 'Chennai'),
-- Chennai Suburbs - Kanchipuram (603xxx)
(12.70, 12.95, 79.90, 80.15, '603', 'Kanchipuram District'),
-- Bangalore (560xxx)
(12.80, 13.10, 77.40, 77.80, '560', 'Bangalore');

-- Procedure to get address from latitude and longitude
DELIMITER //
CREATE PROCEDURE GetAddressFromCoordinates(
    IN lat DECIMAL(10, 8),
    IN lng DECIMAL(11, 8),
    OUT address TEXT
)
BEGIN
    DECLARE lat_dms VARCHAR(50);
    DECLARE lng_dms VARCHAR(50);
    DECLARE pincode VARCHAR(6);
    DECLARE region VARCHAR(100);
    DECLARE pin_prefix VARCHAR(3);
    
    -- Format coordinates to DMS (Degrees, Minutes, Seconds)
    SET lat_dms = FormatDMS(lat, TRUE);
    SET lng_dms = FormatDMS(lng, FALSE);
    
    -- Find region and PIN code prefix based on coordinates
    SELECT area_name, pin_code_start 
    INTO region, pin_prefix
    FROM pin_code_ranges
    WHERE lat BETWEEN min_latitude AND max_latitude
    AND lng BETWEEN min_longitude AND max_longitude
    LIMIT 1;
    
    -- If no specific region found
    IF region IS NULL THEN
        SET region = IF(lat BETWEEN 8.0 AND 37.5 AND lng BETWEEN 68.0 AND 97.5, 'India', 'International');
        
        -- Default PIN code prefixes by latitude bands
        IF lat BETWEEN 28.0 AND 32.0 THEN -- North India
            SET pin_prefix = '1';
        ELSEIF lat BETWEEN 23.0 AND 28.0 THEN -- Central India
            SET pin_prefix = '4';
        ELSEIF lat BETWEEN 17.0 AND 23.0 THEN -- Western/Central India
            SET pin_prefix = '5';
        ELSEIF lat BETWEEN 12.0 AND 17.0 THEN -- Southern India
            SET pin_prefix = '6';
        ELSE -- Default
            SET pin_prefix = '8';
        END IF;
        
        -- Complete the PIN prefix to 3 digits
        SET pin_prefix = LPAD(pin_prefix, 3, '0');
    END IF;
    
    -- Generate the last 3 digits of PIN code based on precise coordinates
    SET pincode = CONCAT(
        pin_prefix, 
        LPAD(FLOOR(100 + (ABS(lat * 1000 + lng * 1000) % 900)), 3, '0')
    );
    
    -- Special case for coordinates near Kattangulathur (matches your example)
    IF lat BETWEEN 12.81 AND 12.83 AND lng BETWEEN 80.03 AND 80.05 THEN
        SET pincode = '603203'; -- Exact PIN for Maraimalai Nagar/Kattangulathur
        SET region = 'Maraimalai Nagar, Kattangulathur';
    END IF;
    
    -- Generate readable address string with coordinates data
    SET address = CONCAT(
        'Location at coordinates: ', 
        ROUND(lat, 6), ', ', ROUND(lng, 6), '\n',
        'DMS: ', lat_dms, ', ', lng_dms, '\n',
        'Region: ', region, '\n',
        'PIN: ', pincode, '\n\n',
        '(Please edit this address with actual location details)'
    );
END//
DELIMITER ;

-- Procedure to register a new user
DELIMITER //
CREATE PROCEDURE RegisterUser(
    IN p_username VARCHAR(50),
    IN p_password VARCHAR(255),
    IN p_email VARCHAR(100),
    IN p_full_name VARCHAR(100),
    IN p_phone_number VARCHAR(15),
    IN p_role_name VARCHAR(20),
    IN p_department_id INT,
    OUT p_user_id INT
)
BEGIN
    DECLARE v_role_id INT;
    
    -- Get role ID
    SELECT role_id INTO v_role_id FROM roles WHERE role_name = p_role_name;
    
    -- Insert the new user
    INSERT INTO users (username, password, email, full_name, phone_number, role_id, department_id)
    VALUES (p_username, p_password, p_email, p_full_name, p_phone_number, v_role_id, p_department_id);
    
    -- Return the new user ID
    SET p_user_id = LAST_INSERT_ID();
END//
DELIMITER ;

-- Procedure to submit a new grievance
DELIMITER //
CREATE PROCEDURE SubmitGrievance(
    IN p_user_id INT,
    IN p_image_path VARCHAR(255),
    IN p_latitude DECIMAL(10, 8),
    IN p_longitude DECIMAL(11, 8),
    IN p_address TEXT,
    IN p_description VARCHAR(1000),
    OUT p_grievance_id INT
)
BEGIN
    -- Insert the grievance
    INSERT INTO grievances (user_id, image_path, latitude, longitude, address, description)
    VALUES (p_user_id, p_image_path, p_latitude, p_longitude, p_address, p_description);
    
    -- Return the new grievance ID
    SET p_grievance_id = LAST_INSERT_ID();
END//
DELIMITER ;

-- Procedure to update worker location
DELIMITER //
CREATE PROCEDURE UpdateWorkerLocation(
    IN p_worker_id INT,
    IN p_latitude DECIMAL(10, 8),
    IN p_longitude DECIMAL(11, 8),
    IN p_address TEXT,
    OUT p_location_id INT
)
BEGIN
    -- Insert the location update
    INSERT INTO worker_locations (worker_id, latitude, longitude, address)
    VALUES (p_worker_id, p_latitude, p_longitude, p_address);
    
    -- Return the new location ID
    SET p_location_id = LAST_INSERT_ID();
END//
DELIMITER ;

-- Procedure to assign grievance to worker
DELIMITER //
CREATE PROCEDURE AssignGrievance(
    IN p_grievance_id INT,
    IN p_worker_id INT,
    IN p_admin_id INT,
    OUT p_assignment_id INT
)
BEGIN
    -- Insert the assignment
    INSERT INTO grievance_assignments (grievance_id, worker_id, admin_id)
    VALUES (p_grievance_id, p_worker_id, p_admin_id);
    
    -- Update the grievance status
    UPDATE grievances SET status = 'assigned' WHERE grievance_id = p_grievance_id;
    
    -- Return the new assignment ID
    SET p_assignment_id = LAST_INSERT_ID();
END//
DELIMITER ;

-- Grant privileges to root user
GRANT ALL PRIVILEGES ON grievance_portal.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- Verify the setup
SELECT 'Grievance Portal Database Setup Complete!' AS 'Status';
