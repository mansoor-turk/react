-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
INSERT INTO goat (
    name, sex, birth_date, breed, color, weight, height, 
    health_status, mother_id, father_id, notes, updated_at, status
) 
VALUES 
    ('Billy', 'Male', '2023-05-15', 'Boer', 'Brown', 45.30, 60.50, 
    'Healthy', NULL, NULL, 'Strong and active', CURRENT_DATE, TRUE) 
	

 