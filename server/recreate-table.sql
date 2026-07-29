DROP TABLE IF EXISTS grievance_assignments;

CREATE TABLE grievance_assignments (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  grievance_id INT NOT NULL,
  worker_id INT NOT NULL,
  admin_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('assigned', 'working', 'completed') DEFAULT 'assigned',
  completed_at TIMESTAMP NULL,
  notes TEXT,
  INDEX idx_grievance_id (grievance_id),
  INDEX idx_worker_id (worker_id),
  INDEX idx_status (status)
);