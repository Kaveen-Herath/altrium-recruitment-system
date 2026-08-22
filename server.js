const express = require("express");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const crypto = require("crypto");
const transporter = require("./email");




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

    const verificationCode =
    crypto.randomInt(100000, 1000000).toString();

  const verificationCodeHash =
    await bcrypt.hash(verificationCode, 10);

  const verificationExpiresAt =
    new Date(Date.now() + 10 * 60 * 1000);

    // 5. Save the candidate to the online database
    const result = await pool.query(
      `INSERT INTO users
              (
                  first_name,
                  last_name,
                  email,
                  phone_number,
                  password_hash,
                  role,
                  email_verified,
                  verification_code_hash,
                  verification_expires_at,
                  verification_sent_at
              )
              VALUES
              (
                  $1,
                  $2,
                  $3,
                  $4,
                  $5,
                  'candidate',
                  FALSE,
                  $6,
                  $7,
                  NOW()
              )
              RETURNING
                  id,
                  first_name,
                  last_name,
                  email,
                  phone_number,
                  role,
                  email_verified,
                  created_at`,
      [
          firstName.trim(),
          lastName.trim(),
          cleanEmail,
          phone.trim(),
          passwordHash,
          verificationCodeHash,
          verificationExpiresAt
      ]
      );

      await transporter.sendMail({
    from: `"Altrium" <${process.env.EMAIL_FROM}>`,

    to: cleanEmail,

    subject: "Verify your Altrium account",

    html: `
        <div style="
            font-family: Arial, sans-serif;
            max-width: 520px;
            margin: auto;
            padding: 32px;
        ">

            <h2>
                Verify your email
            </h2>

            <p>
                Welcome to Altrium.
            </p>

            <p>
                Use the verification code below
                to complete your account:
            </p>

            <div style="
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                margin: 28px 0;
            ">
                ${verificationCode}
            </div>

            <p>
                This code expires in 10 minutes.
            </p>

            <p style="
                color: #777;
                font-size: 12px;
                margin-top: 30px;
            ">
                If you did not create an Altrium
                account, you can ignore this email.
            </p>

        </div>
    `
});

    // 6. Send success response
      res.status(201).json({
        success: true,
        requiresVerification: true,
        message: "Verification code sent to your email.",
        email: cleanEmail
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

// ---------------------------------------------------------------------------------
// Backend Verification for the 6 Digit Verfitication Popup

app.post("/api/auth/verify-email", async (req, res) => {

    try {

        const { email, code } = req.body;


        // Check required information
        if (!email || !code) {

            return res.status(400).json({
                success: false,
                message: "Please enter the verification code."
            });

        }


        const cleanEmail =
            email.trim().toLowerCase();

        const cleanCode =
            code.trim();


        // Make sure it is exactly 6 digits
        if (!/^\d{6}$/.test(cleanCode)) {

            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit code."
            });

        }


        // Find the user
        const result = await pool.query(
            `SELECT
                id,
                role,
                email_verified,
                verification_code_hash,
                verification_expires_at
             FROM users
             WHERE email = $1`,
            [cleanEmail]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Account not found."
            });

        }


        const user = result.rows[0];


        // Already verified
        if (user.email_verified) {

            return res.json({
                success: true,
                message: "Your email is already verified."
            });

        }


        // Check that a code actually exists
        if (!user.verification_code_hash) {

            return res.status(400).json({
                success: false,
                message: "No verification code is available."
            });

        }


        // Check expiry
        const expiryTime =
            new Date(
                user.verification_expires_at
            );


        if (expiryTime < new Date()) {

            return res.status(400).json({
                success: false,
                message:
                    "This verification code has expired."
            });

        }


        // Compare entered code with stored hash
        const codeMatches =
            await bcrypt.compare(
                cleanCode,
                user.verification_code_hash
            );


        if (!codeMatches) {

            return res.status(400).json({
                success: false,
                message:
                    "The verification code is incorrect."
            });

        }


        // Mark email as verified
        await pool.query(
            `UPDATE users
             SET
                email_verified = TRUE,
                verification_code_hash = NULL,
                verification_expires_at = NULL
             WHERE id = $1`,
            [user.id]
        );


        // Log the user in automatically
        req.session.userId = user.id;
        req.session.role = user.role;


        req.session.save((error) => {

            if (error) {

                console.error(
                    "Verification session error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Email verified, but we could not start your session."
                });

            }


            res.json({
                success: true,
                message:
                    "Email verified successfully!"
            });

        });

    }

    catch (error) {

        console.error(
            "Email verification error:",
            error
        );


        res.status(500).json({
            success: false,
            message:
                "Something went wrong while verifying your email."
        });

    }

});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});