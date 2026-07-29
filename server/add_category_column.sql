-- Add category column to grievances table if it doesn't exist
-- First check if the column exists
SELECT COUNT(*) INTO @column_exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'grievances' 
AND column_name = 'category';

-- Add the column only if it doesn't exist
SET @alter_sql = IF(@column_exists = 0, 
    'ALTER TABLE grievances ADD COLUMN category VARCHAR(100) DEFAULT "General" AFTER description', 
    'SELECT "Category column already exists"');

PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;