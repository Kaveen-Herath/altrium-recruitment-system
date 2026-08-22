const express = require("express");

const pool = require("./db");

const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json()); // allows Express to read that information.

const PORT = 3000; // Creates the backend application

// Allow Express to serve our frontend files
app.use(express.static(__dirname));

// Simple backend test route
app.get("/api/health", (req, res) => {
  res.json({
    message: "Altrium backend is working!"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "Database connected successfully!",
      databaseTime: result.rows[0].now
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      message: "Database connection failed."
    });
  }
});


app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // 1. Check required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    // 2. Clean the email
    const cleanEmail = email.trim().toLowerCase();

    // 3. Check whether the email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    // 4. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. Save the candidate to the online database
    const result = await pool.query(
      `INSERT INTO users
       (first_name, last_name, email, phone_number, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'candidate')
       RETURNING id, first_name, last_name, email, phone_number, role, created_at`,
      [
        firstName.trim(),
        lastName.trim(),
        cleanEmail,
        phone.trim(),
        passwordHash
      ]
    );

    // 6. Send success response
      res.status(201).json({
        success: true,
        message: "Account created successfully!",
        user: result.rows[0]
      });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Something went wrong while creating the account."
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});