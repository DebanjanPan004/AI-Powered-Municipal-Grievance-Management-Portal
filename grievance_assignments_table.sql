-- Create grievance_assignments table for proper assignment tracking
CREATE TABLE IF NOT EXISTS grievance_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    grievance_id INT NOT NULL,
    worker_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('assigned', 'working', 'completed') DEFAULT 'assigned',
    completed_at TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (grievance_id) REFERENCES grievances(grievance_id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_grievance_id (grievance_id),
    INDEX idx_worker_id (worker_id),
    INDEX idx_status (status)
);

-- Update grievances table to have simpler status tracking
ALTER TABLE grievances 
MODIFY COLUMN status ENUM('pending', 'assigned', 'completed', 'rejected') DEFAULT 'pending';

-- Add a view to easily get grievance assignment details
CREATE OR REPLACE VIEW grievance_assignment_details AS
SELECT 
    g.grievance_id,
    g.description,
    g.category,
    g.status as grievance_status,
    g.latitude,
    g.longitude,
    g.image_path,
    g.created_at,
    ga.assignment_id,
    ga.status as assignment_status,
    ga.assigned_at,
    ga.completed_at,
    ga.notes,
    w.user_id as worker_id,
    w.full_name as worker_name,
    w.phone_number as worker_phone,
    d.department_name,
    admin.full_name as assigned_by_name
FROM grievances g
LEFT JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
LEFT JOIN users w ON ga.worker_id = w.user_id
LEFT JOIN departments d ON w.department_id = d.department_id
LEFT JOIN users admin ON ga.assigned_by = admin.user_id;