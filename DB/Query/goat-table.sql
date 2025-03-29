-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
CREATE TABLE user (
 record_id TEXT PRIMARY KEY DEFAULT ('user_' || uuid_generate_v4()),
 employee_code 
 user_name VARCHAR(120) NOT NULL,
 mobileno INT,
 cnic INT,
 password   VARCHAR(120) NOT NULL, 
 Rol
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at DATE,
 status BOOLEAN DEFAULT TRUE,
 pass:abc@123
);


DROP TABLE users;







  
INSERT INTO goat (name, sex, birth_date, breed,color,weight,height,health_status,mother_id,father_id,notes,updated_at) VALUES
('gulabu', 'Male', '03-05-2000', 'order_01JKT7Y1E768800BBCC9V7G11Z')