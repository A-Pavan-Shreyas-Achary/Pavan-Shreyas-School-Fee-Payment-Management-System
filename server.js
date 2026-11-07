require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "school_fee_db",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

function badRequest(res, message) {
  return res.status(400).json({ message });
}

// Dashboard summary
app.get("/api/dashboard", async (req, res) => {
  try {
    const [[students]] = await pool.query("SELECT COUNT(*) AS totalStudents FROM students");
    const [[fees]] = await pool.query("SELECT COALESCE(SUM(total_amount),0) AS totalFees FROM fee_details");
    const [[paid]] = await pool.query("SELECT COALESCE(SUM(amount_paid),0) AS totalPaid FROM payments");
    const [[pending]] = await pool.query(`
      SELECT COALESCE(SUM(GREATEST(f.total_amount - COALESCE(p.paid,0),0)),0) AS pendingAmount
      FROM fee_details f
      LEFT JOIN (SELECT fee_id, SUM(amount_paid) AS paid FROM payments GROUP BY fee_id) p
      ON p.fee_id = f.fee_id
    `);
    res.json({
      totalStudents: students.totalStudents,
      totalFees: Number(fees.totalFees),
      totalPaid: Number(paid.totalPaid),
      pendingAmount: Number(pending.pendingAmount)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load dashboard." });
  }
});

// Students
app.get("/api/students", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students ORDER BY student_id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch students." });
  }
});

app.post("/api/students", async (req, res) => {
  const { name, class: studentClass, roll_no, phone, email } = req.body;
  if (!name?.trim() || !studentClass?.trim() || !roll_no?.trim()) {
    return badRequest(res, "Name, class and roll number are required.");
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, class, roll_no, phone, email) VALUES (?,?,?,?,?)",
      [name.trim(), studentClass.trim(), roll_no.trim(), phone || null, email || null]
    );
    res.status(201).json({ message: "Student added.", student_id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return badRequest(res, "That roll number already exists in this class.");
    console.error(err);
    res.status(500).json({ message: "Could not add student." });
  }
});

app.put("/api/students/:id", async (req, res) => {
  const { name, class: studentClass, roll_no, phone, email } = req.body;
  if (!name?.trim() || !studentClass?.trim() || !roll_no?.trim()) {
    return badRequest(res, "Name, class and roll number are required.");
  }
  try {
    const [result] = await pool.query(
      "UPDATE students SET name=?, class=?, roll_no=?, phone=?, email=? WHERE student_id=?",
      [name.trim(), studentClass.trim(), roll_no.trim(), phone || null, email || null, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
    res.json({ message: "Student updated." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return badRequest(res, "That roll number already exists in this class.");
    console.error(err);
    res.status(500).json({ message: "Could not update student." });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM students WHERE student_id=?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Student not found." });
    res.json({ message: "Student and related fee records deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete student." });
  }
});

// Fee assignment and fee report rows
app.get("/api/fees", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT f.fee_id, f.student_id, s.name, s.class, s.roll_no,
             f.academic_year, f.fee_type, f.total_amount, f.due_date,
             COALESCE(SUM(p.amount_paid),0) AS amount_paid,
             GREATEST(f.total_amount - COALESCE(SUM(p.amount_paid),0),0) AS balance
      FROM fee_details f
      JOIN students s ON s.student_id=f.student_id
      LEFT JOIN payments p ON p.fee_id=f.fee_id
      GROUP BY f.fee_id
      ORDER BY f.fee_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch fee details." });
  }
});

app.post("/api/fees", async (req, res) => {
  const { student_id, academic_year, fee_type, total_amount, due_date } = req.body;
  if (!student_id || !academic_year?.trim() || !fee_type?.trim() ||
      !Number.isFinite(Number(total_amount)) || Number(total_amount) <= 0 || !due_date) {
    return badRequest(res, "Enter a student, academic year, fee type, valid amount and due date.");
  }
  try {
    const [result] = await pool.query(
      "INSERT INTO fee_details (student_id, academic_year, fee_type, total_amount, due_date) VALUES (?,?,?,?,?)",
      [student_id, academic_year.trim(), fee_type.trim(), Number(total_amount), due_date]
    );
    res.status(201).json({ message: "Fee assigned.", fee_id: result.insertId });
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") return badRequest(res, "Selected student does not exist.");
    console.error(err);
    res.status(500).json({ message: "Could not assign fee." });
  }
});

// Payments
app.get("/api/payments", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.payment_id, p.fee_id, p.amount_paid, p.payment_date,
             p.payment_method, p.receipt_no, s.name, s.class, f.fee_type
      FROM payments p
      JOIN fee_details f ON f.fee_id=p.fee_id
      JOIN students s ON s.student_id=f.student_id
      ORDER BY p.payment_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not fetch payments." });
  }
});

app.post("/api/payments", async (req, res) => {
  const { fee_id, amount_paid, payment_date, payment_method, receipt_no } = req.body;
  if (!fee_id || !Number.isFinite(Number(amount_paid)) || Number(amount_paid) <= 0 ||
      !payment_date || !payment_method?.trim() || !receipt_no?.trim()) {
    return badRequest(res, "Complete all payment fields with a valid amount.");
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [feeRows] = await connection.query(
      "SELECT total_amount FROM fee_details WHERE fee_id=? FOR UPDATE", [fee_id]
    );
    if (!feeRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Fee record not found." });
    }
    const [[paidRow]] = await connection.query(
      "SELECT COALESCE(SUM(amount_paid),0) AS paid FROM payments WHERE fee_id=?", [fee_id]
    );
    const balance = Number(feeRows[0].total_amount) - Number(paidRow.paid);
    if (Number(amount_paid) > balance) {
      await connection.rollback();
      return badRequest(res, `Payment exceeds the remaining balance of ₹${Math.max(balance, 0).toFixed(2)}.`);
    }
    await connection.query(
      "INSERT INTO payments (fee_id, amount_paid, payment_date, payment_method, receipt_no) VALUES (?,?,?,?,?)",
      [fee_id, Number(amount_paid), payment_date, payment_method.trim(), receipt_no.trim()]
    );
    await connection.commit();
    res.status(201).json({ message: "Payment recorded successfully." });
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") return badRequest(res, "Receipt number already exists.");
    console.error(err);
    res.status(500).json({ message: "Could not record payment." });
  } finally {
    connection.release();
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.student_id, s.name, s.class, s.roll_no,
             f.fee_id, f.academic_year, f.fee_type, f.total_amount, f.due_date,
             COALESCE(SUM(p.amount_paid),0) AS amount_paid,
             GREATEST(f.total_amount - COALESCE(SUM(p.amount_paid),0),0) AS balance
      FROM students s
      LEFT JOIN fee_details f ON f.student_id=s.student_id
      LEFT JOIN payments p ON p.fee_id=f.fee_id
      GROUP BY s.student_id, f.fee_id
      ORDER BY s.class, s.roll_no
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not generate report." });
  }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Pavan Shreyas School Fee System running at http://localhost:${PORT}`));
