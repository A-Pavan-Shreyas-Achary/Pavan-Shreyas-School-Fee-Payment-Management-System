# Pavan Shreyas – School Fee Payment Management System

A mini project built with HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js and MySQL.

## Features
- Dashboard with total students, fees assigned, collected amount and pending balance
- Add, edit, search and delete student records
- Assign fee records to students
- Record full or partial payments with unique receipt numbers
- Prevent payments that exceed the remaining balance
- Student-wise fee report with Paid, Partial and Pending status
- Export report data to CSV

## Database tables
1. `students`
2. `fee_details`
3. `payments`

The SQL schema and foreign keys are in `database/schema.sql`.

## Requirements
- Node.js and npm
- MySQL Server and MySQL Workbench (or another MySQL client)

## Setup (Windows / VS Code)

1. Extract this ZIP file.
2. Open the extracted `Pavan_Shreya_School_Fee_Payment_Management_System` folder in VS Code.
3. Open MySQL Workbench and run all statements in `database/schema.sql`.
4. In VS Code terminal, install packages:

   ```bash
   npm install
   ```

5. Create a file named `.env` in the project root. Copy the contents of `.env.example` and enter your own MySQL password:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=school_fee_db
   PORT=3000
   ```

   Do not upload `.env` to GitHub. It is excluded by `.gitignore`.

6. Start the server:

   ```bash
   npm start
   ```

7. Open this address in your browser:

   `http://localhost:3000`

## Suggested testing order
1. Add a student.
2. Assign a fee to that student.
3. Record a partial payment.
4. Check the Fee Details and Reports pages to see the remaining balance.
5. Record the remaining amount and verify that the status changes to Paid.
6. Try entering a payment greater than the balance; the server should reject it.

## Project structure

```text
Pavan_Shreya_School_Fee_Payment_Management_System/
├── database/
│   └── schema.sql
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Notes
- This is an academic mini project, not a production payment gateway.
- It records payment details manually; it does not process real online payments.
- Add authentication, role permissions, backups and audit logging before real-world deployment.
