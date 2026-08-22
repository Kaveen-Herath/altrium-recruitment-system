const express = require("express");
const pool = require("./db");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const crypto = require("crypto");
const transporter = require("./email");
const multer = require("multer");
const supabase = require("./supabase");


const app = express();


app.use(express.json()); // allows Express to read that information.


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

const profilePhotoUpload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },

    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
    }
});

// ===============================================================================
// ADMIN ========================================================================

function requireAdmin(req, res, next) {

    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: "You must be logged in."
        });
    }

    if (req.session.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });
    }

    next();
}

// ADMIN CREATE JOB VACANCIES

app.post(
    "/api/admin/jobs",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                jobTitle,
                department,
                location,
                employmentType,
                salary,
                applicationDeadline,
                experienceRequired,
                educationRequired,
                description,
                responsibilities,
                skills,
                numberOfOpenings
            } = req.body;


            // Required fields
            if (
                !jobTitle ||
                !department ||
                !location ||
                !employmentType ||
                !description
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Please complete all required job fields."
                });

            }


            const openings =
                Number(numberOfOpenings) || 1;


            if (openings < 1) {

                return res.status(400).json({
                    success: false,
                    message: "Number of openings must be at least 1."
                });

            }


            const result = await pool.query(
                `
                INSERT INTO jobs (

                    job_title,
                    department,
                    location,
                    employment_type,
                    salary,
                    application_deadline,
                    experience_required,
                    education_required,
                    description,
                    responsibilities,
                    skills,
                    number_of_openings,
                    created_by

                )

                VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11, $12,
                    $13
                )

                RETURNING *
                `,
                [
                    jobTitle.trim(),
                    department.trim(),
                    location.trim(),
                    employmentType.trim(),

                    salary?.trim() || null,

                    applicationDeadline || null,

                    experienceRequired?.trim() || null,

                    educationRequired?.trim() || null,

                    description.trim(),

                    responsibilities?.trim() || null,

                    skills?.trim() || null,

                    openings,

                    req.session.userId
                ]
            );


            return res.status(201).json({
                success: true,
                message: "Job vacancy created successfully.",
                job: result.rows[0]
            });

        }

        catch (error) {

            console.error(
                "Create job error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to create job vacancy."
            });

        }

    }
);

// ================================= TEMP TEST ROUTE

app.get(
    "/api/admin/test",
    requireAdmin,
    (req, res) => {

        res.json({
            success: true,
            message: "Admin access confirmed."
        });

    }
);

// ===============================================================================
// ROUTES ========================================================================

app.post(
    "/api/profile/photo",
    profilePhotoUpload.single("profilePhoto"),
    async (req, res) => {
        try {
            // User must be logged in
            if (!req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: "You must be logged in."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a profile photo."
                });
            }

            const extensionMap = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            };

            const extension = extensionMap[req.file.mimetype];

            const filePath =
                `user-${req.session.userId}/profile-${crypto.randomUUID()}.${extension}`;

            // Upload actual image to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("profile-photos")
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                console.error("Profile photo upload error:", uploadError);

                return res.status(500).json({
                    success: false,
                    message: "Unable to upload profile photo."
                });
            }

            // Save only the file path in PostgreSQL
            await pool.query(
                `
                UPDATE users
                SET profile_photo_path = $1
                WHERE id = $2
                `,
                [filePath, req.session.userId]
            );

            // Because your bucket is public, get its display URL
            const { data: publicUrlData } = supabase.storage
                .from("profile-photos")
                .getPublicUrl(filePath);

            return res.json({
                success: true,
                message: "Profile photo updated successfully.",
                profilePhotoUrl: publicUrlData.publicUrl
            });

        } catch (error) {
            console.error("Profile photo error:", error);

            return res.status(500).json({
                success: false,
                message: "Something went wrong while uploading the photo."
            });
        }
    }
);

app.post("/api/profile", async (req, res) => {

    try {

        // User must be logged in
        if (!req.session.userId) {
            return res.status(401).json({
                success: false,
                message: "You must be logged in."
            });
        }


        const {
            firstName,
            lastName,
            phone,
            education,
            skills,
            preferredJobType,
            experience
        } = req.body;


        // Update only fields that were actually sent
        const result = await pool.query(
            `
            UPDATE users
            SET
                first_name =
                    COALESCE($1, first_name),

                last_name =
                    COALESCE($2, last_name),

                phone_number =
                    COALESCE($3, phone_number),

                education =
                    COALESCE($4, education),

                skills =
                    COALESCE($5, skills),

                preferred_job_type =
                    COALESCE($6, preferred_job_type),

                work_experience =
                    COALESCE($7, work_experience)

            WHERE id = $8

            RETURNING
                id,
                first_name,
                last_name,
                email,
                phone_number,
                role,
                created_at,
                profile_photo_path,
                education,
                skills,
                preferred_job_type,
                work_experience
            `,
            [
                firstName ?? null,
                lastName ?? null,
                phone ?? null,
                education ?? null,
                skills ?? null,
                preferredJobType ?? null,
                experience ?? null,
                req.session.userId
            ]
        );


        const dbUser = result.rows[0];


        if (!dbUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }


        // Get profile photo URL if user has one
        let profilePhotoUrl = null;

        if (dbUser.profile_photo_path) {

            const { data } = supabase.storage
                .from("profile-photos")
                .getPublicUrl(
                    dbUser.profile_photo_path
                );

            profilePhotoUrl =
                data.publicUrl;
        }


        return res.json({
            success: true,
            message: "Profile updated successfully.",

            user: {
                id: dbUser.id,

                firstName:
                    dbUser.first_name,

                lastName:
                    dbUser.last_name,

                email:
                    dbUser.email,

                phoneNumber:
                    dbUser.phone_number,

                role:
                    dbUser.role,

                createdAt:
                    dbUser.created_at,

                education:
                    dbUser.education,

                skills:
                    dbUser.skills,

                preferredJobType:
                    dbUser.preferred_job_type,

                experience:
                    dbUser.work_experience,

                profilePicture:
                    profilePhotoUrl
            }
        });

    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update profile."
        });
    }
});

// ================ LOGOUT ============================================

app.post(
    "/api/auth/logout",
    (req, res) => {

        if (!req.session) {
            return res.json({
                success: true,
                message: "Logged out successfully."
            });
        }

        req.session.destroy((error) => {

            if (error) {

                console.error(
                    "Logout error:",
                    error
                );

                return res.status(500).json({
                    success: false,
                    message: "Unable to log out."
                });
            }


            res.clearCookie("connect.sid");


            return res.json({
                success: true,
                message: "Logged out successfully."
            });

        });
    }
);

// ================= FORGOT PASSWORD =============================================

app.post(
    "/api/auth/forgot-password",
    async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter your email address."
                });
            }

            const cleanEmail = email.trim().toLowerCase();

            const userResult = await pool.query(
                `
                SELECT id, first_name, email
                FROM users
                WHERE email = $1
                `,
                [cleanEmail]
            );

            /*
             * Security:
             * We return the same response even if the email
             * does not exist, so people cannot discover
             * which emails are registered.
             */
            if (userResult.rows.length === 0) {
                return res.json({
                    success: true,
                    message:
                        "If an account exists for this email, a reset code has been sent."
                });
            }

            const user = userResult.rows[0];

            const resetCode =
                crypto.randomInt(
                    100000,
                    1000000
                ).toString();

            const resetCodeHash =
                await bcrypt.hash(
                    resetCode,
                    10
                );

            const resetExpiresAt =
                new Date(
                    Date.now() +
                    10 * 60 * 1000
                );

            await pool.query(
                `
                UPDATE users
                SET
                    password_reset_code_hash = $1,
                    password_reset_expires_at = $2,
                    password_reset_sent_at = NOW()
                WHERE id = $3
                `,
                [
                    resetCodeHash,
                    resetExpiresAt,
                    user.id
                ]
            );

            await transporter.sendMail({
                from:
                    `"Altrium" <${process.env.EMAIL_FROM}>`,

                to:
                    user.email,

                subject:
                    "Reset your Altrium password",

                html: `
                    <div style="
                        font-family: Arial, sans-serif;
                        background: #0b0b0b;
                        color: #ffffff;
                        padding: 32px;
                    ">

                        <h2 style="
                            margin-bottom: 12px;
                            color: #ff841f;
                        ">
                            Reset your password
                        </h2>

                        <p>
                            Hi ${user.first_name},
                        </p>

                        <p>
                            Use the code below to reset
                            your Altrium password.
                        </p>

                        <div style="
                            margin: 24px 0;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            color: #ff841f;
                        ">
                            ${resetCode}
                        </div>

                        <p style="
                            color: #aaaaaa;
                        ">
                            This code expires in 10 minutes.
                        </p>

                        <p style="
                            color: #777777;
                            font-size: 12px;
                        ">
                            If you did not request a password
                            reset, you can ignore this email.
                        </p>

                    </div>
                `
            });

            return res.json({
                success: true,
                message:
                    "If an account exists for this email, a reset code has been sent."
            });
        }

        catch (error) {
            console.error(
                "Forgot password error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to process the password reset request."
            });
        }
    }
);



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


app.get("/api/auth/me",
    async (req, res) => {

        try {

            /* ---------------------------------------------
               Check login session
            --------------------------------------------- */

            if (!req.session.userId) {

                return res.status(401).json({
                    success: false,
                    message: "You are not logged in."
                });
            }


            /* ---------------------------------------------
               Get user from PostgreSQL
            --------------------------------------------- */

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        first_name,
                        last_name,
                        email,
                        phone_number,
                        role,
                        created_at,
                        profile_photo_path,
                        education,
                        skills,
                        preferred_job_type,
                        work_experience
                    FROM users
                    WHERE id = $1
                    `,
                    [req.session.userId]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }


            const dbUser =
                result.rows[0];


            /* ---------------------------------------------
               Build profile photo URL
            --------------------------------------------- */

            let profilePhotoUrl = null;


            if (dbUser.profile_photo_path) {

                const { data } =
                    supabase.storage
                        .from("profile-photos")
                        .getPublicUrl(
                            dbUser.profile_photo_path
                        );


                profilePhotoUrl =
                    data.publicUrl;
            }


            /* ---------------------------------------------
               Send safe user data
            --------------------------------------------- */

            return res.json({

                success: true,

                user: {

                    id:
                        dbUser.id,

                    firstName:
                        dbUser.first_name,

                    lastName:
                        dbUser.last_name,

                    email:
                        dbUser.email,

                    phoneNumber:
                        dbUser.phone_number,

                    role:
                        dbUser.role,

                    createdAt:
                        dbUser.created_at,

                    education: 
                        dbUser.education,

                    skills: 
                        dbUser.skills,

                    preferredJobType: 
                        dbUser.preferred_job_type,

                    experience: 
                        dbUser.work_experience,

                    profilePicture:
                        profilePhotoUrl
                }

            });

        }

        catch (error) {

            console.error(
                "Get current user error:",
                error
            );


            return res.status(500).json({
                success: false,
                message: "Unable to load user."
            });
        }
    }
);

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

/* =========================================================
   VERIFY PASSWORD RESET CODE
   ========================================================= */

app.post(
    "/api/auth/verify-reset-code",
    async (req, res) => {

        try {

            const {
                email,
                code
            } = req.body;


            /* ---------------------------------------------
               Basic validation
            --------------------------------------------- */

            if (!email || !code) {

                return res.status(400).json({
                    success: false,
                    message: "Email and reset code are required."
                });
            }


            const cleanEmail =
                email.trim().toLowerCase();


            const cleanCode =
                code.trim();


            if (!/^\d{6}$/.test(cleanCode)) {

                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid 6-digit code."
                });
            }


            /* ---------------------------------------------
               Find account
            --------------------------------------------- */

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        password_reset_code_hash,
                        password_reset_expires_at
                    FROM users
                    WHERE email = $1
                    `,
                    [cleanEmail]
                );


            /*
             * Keep the error generic so this endpoint
             * cannot easily be used to discover accounts.
             */

            if (result.rows.length === 0) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired reset code."
                });
            }


            const user =
                result.rows[0];


            /* ---------------------------------------------
               Check reset code exists
            --------------------------------------------- */

            if (!user.password_reset_code_hash) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired reset code."
                });
            }


            /* ---------------------------------------------
               Check expiry
            --------------------------------------------- */

            if (
                !user.password_reset_expires_at ||
                new Date(
                    user.password_reset_expires_at
                ) < new Date()
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired reset code."
                });
            }


            /* ---------------------------------------------
               Compare code with bcrypt hash
            --------------------------------------------- */

            const codeMatches =
                await bcrypt.compare(
                    cleanCode,
                    user.password_reset_code_hash
                );


            if (!codeMatches) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired reset code."
                });
            }


            /* ---------------------------------------------
               Code is correct.

               Store temporary reset permission
               inside the server-side session.
            --------------------------------------------- */

            req.session.passwordResetUserId =
                user.id;


            req.session.passwordResetVerifiedAt =
                Date.now();


            /* ---------------------------------------------
               Remove the used code from PostgreSQL
            --------------------------------------------- */

            await pool.query(
                `
                UPDATE users
                SET
                    password_reset_code_hash = NULL,
                    password_reset_expires_at = NULL
                WHERE id = $1
                `,
                [user.id]
            );


            /* ---------------------------------------------
               Save session
            --------------------------------------------- */

            req.session.save(
                (sessionError) => {

                    if (sessionError) {

                        console.error(
                            "Reset verification session error:",
                            sessionError
                        );


                        return res.status(500).json({
                            success: false,
                            message:
                                "Unable to verify reset code."
                        });
                    }


                    return res.json({
                        success: true,
                        message:
                            "Reset code verified successfully."
                    });

                }
            );

        }

        catch (error) {

            console.error(
                "Verify reset code error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to verify reset code."
            });

        }

    }
);

/* =========================================================
   RESET PASSWORD
   ========================================================= */

app.post(
    "/api/auth/reset-password",
    async (req, res) => {

        try {

            const {
                newPassword,
                confirmPassword
            } = req.body;


            /* ---------------------------------------------
               Make sure reset code was verified first
            --------------------------------------------- */

            if (
                !req.session.passwordResetUserId ||
                !req.session.passwordResetVerifiedAt
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Password reset verification has expired. Please start again."
                });
            }


            /* ---------------------------------------------
               Reset permission lasts only 10 minutes
            --------------------------------------------- */

            const verificationAge =
                Date.now() -
                req.session.passwordResetVerifiedAt;


            const tenMinutes =
                10 * 60 * 1000;


            if (verificationAge > tenMinutes) {

                delete req.session.passwordResetUserId;
                delete req.session.passwordResetVerifiedAt;


                return res.status(401).json({
                    success: false,
                    message:
                        "Password reset verification has expired. Please start again."
                });
            }


            /* ---------------------------------------------
               Validate passwords
            --------------------------------------------- */

            if (
                !newPassword ||
                !confirmPassword
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter and confirm your new password."
                });
            }


            if (newPassword.length < 8) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters long."
                });
            }


            if (
                newPassword !==
                confirmPassword
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Passwords do not match."
                });
            }


            /* ---------------------------------------------
               Hash the new password
            --------------------------------------------- */

            const newPasswordHash =
                await bcrypt.hash(
                    newPassword,
                    12
                );


            const userId =
                req.session.passwordResetUserId;


            /* ---------------------------------------------
               Update PostgreSQL
            --------------------------------------------- */

            await pool.query(
                `
                UPDATE users
                SET
                    password_hash = $1,
                    password_reset_code_hash = NULL,
                    password_reset_expires_at = NULL,
                    password_reset_sent_at = NULL
                WHERE id = $2
                `,
                [
                    newPasswordHash,
                    userId
                ]
            );


            /* ---------------------------------------------
               Remove temporary reset permission
            --------------------------------------------- */

            delete req.session.passwordResetUserId;
            delete req.session.passwordResetVerifiedAt;


            req.session.save(
                (sessionError) => {

                    if (sessionError) {

                        console.error(
                            "Password reset session error:",
                            sessionError
                        );

                    }


                    return res.json({
                        success: true,
                        message:
                            "Your password has been changed successfully."
                    });

                }
            );

        }

        catch (error) {

            console.error(
                "Reset password error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to reset your password."
            });

        }

    }
);