const express = require("express");

const pool = require("./db");

const bcrypt = require("bcryptjs");

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);




const app = express();

app.use(
    session({
        store: new pgSession({
            pool: pool,
            createTableIfMissing: true
        }),

        secret: process.env.SESSION_SECRET,

        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

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


app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        // 1. Make sure email and password were entered
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email and password."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 2. Find the user in the online database
        const result = await pool.query(
            `SELECT
                id,
                first_name,
                last_name,
                email,
                password_hash,
                role
             FROM users
             WHERE email = $1`,
            [cleanEmail]
        );

        // 3. If email doesn't exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        // 4. Compare entered password with stored hash
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // 5. Create the login session
        req.session.userId = user.id;
        req.session.role = user.role;

        // Remember me = 30 days
        // Normal login = 24 hours
        req.session.cookie.maxAge = rememberMe
            ? 1000 * 60 * 60 * 24 * 30
            : 1000 * 60 * 60 * 24;

        // 6. Save the session before responding
        req.session.save((error) => {

            if (error) {
                console.error("Session save error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Unable to log you in."
                });
            }

            // NEVER send password_hash back to browser
            res.json({
                success: true,
                message: "Login successful!",
                user: {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    role: user.role
                }
            });
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Something went wrong while logging in."
        });
    }
});


app.get("/api/auth/me", async (req, res) => {

    try {

        if (!req.session.userId) {

            return res.status(401).json({
                success: false,
                message: "You are not logged in."
            });

        }


        const result = await pool.query(
            `SELECT
                id,
                first_name,
                last_name,
                email,
                phone_number,
                role,
                created_at
             FROM users
             WHERE id = $1`,
            [req.session.userId]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User not found."
            });

        }


        const user = result.rows[0];


        res.json({
            success: true,

            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.phone_number,
                role: user.role,
                createdAt: user.created_at
            }
        });

    }

    catch (error) {

        console.error(
            "Current user error:",
            error
        );


        res.status(500).json({
            success: false,
            message: "Unable to load your profile."
        });

    }

});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});