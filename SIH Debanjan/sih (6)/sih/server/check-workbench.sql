-- Run this in your MySQL Workbench
-- This will show the ACTUAL current state

-- First, check current session settings
SELECT @@autocommit as autocommit_status;
SELECT @@transaction_isolation as isolation_level;

-- Force commit any pending transactions
COMMIT;

-- Check if grievances table exists and its structure
SHOW TABLES LIKE 'grievances';
DESCRIBE grievances;

-- Get all grievances with explicit ordering
SELECT 
    grievance_id,
    user_id, 
    image_path,
    latitude,
    longitude,
    address,
    description,
    status,
    created_at
FROM grievances 
ORDER BY created_at DESC;

-- Check total count
SELECT COUNT(*) as total_grievances FROM grievances;

-- Check if there are any uncommitted transactions
SHOW ENGINE INNODB STATUS\G