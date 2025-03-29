-- Step 1: Create a sequence for unique username numbering
CREATE SEQUENCE user_unique_name_seq START 1;

-- Step 2: Create the users table without GENERATED ALWAYS AS
CREATE TABLE users (
    record_id TEXT PRIMARY KEY DEFAULT ('user_' || uuid_generate_v4()),
    employee_code TEXT,
    name VARCHAR(120) NOT NULL,
    username TEXT UNIQUE,  -- Will be set via trigger
    email VARCHAR(120) NOT NULL, 
    mobileno BIGINT, 
    cnic BIGINT,
    password VARCHAR(120) NOT NULL, 
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at DATE,
    status BOOLEAN DEFAULT TRUE
);

-- Step 3: Create a trigger function to auto-generate username
CREATE OR REPLACE FUNCTION generate_username()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username IS NULL THEN
        NEW.username := LOWER(NEW.name) || '_' || LPAD(nextval('user_unique_name_seq')::TEXT, 2, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Attach the trigger to the users table
CREATE TRIGGER set_username
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION generate_username();

select * from users;

  


