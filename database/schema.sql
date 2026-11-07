CREATE DATABASE IF NOT EXISTS school_fee_db;
USE school_fee_db;

CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    class VARCHAR(30) NOT NULL,
    roll_no VARCHAR(30) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    UNIQUE KEY unique_class_roll (class, roll_no)
);

CREATE TABLE IF NOT EXISTS fee_details (
    fee_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    CONSTRAINT fk_fee_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    fee_id INT NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    CONSTRAINT fk_payment_fee FOREIGN KEY (fee_id)
        REFERENCES fee_details(fee_id) ON DELETE CASCADE
);

-- Optional sample student. Run this only once if you want sample data.
-- INSERT INTO students (name, class, roll_no, phone, email)
-- VALUES ('Rahul Kumar', '10th', '101', '9876543210', 'rahul@example.com');
