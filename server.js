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

const { google } =
    require("googleapis");


app.use(express.json()); // allows Express to read that information.

const isProduction =
    process.env.NODE_ENV ===
    "production";


if (
    isProduction
) {

    app.set(
        "trust proxy",
        1
    );

}

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

            secure:
                isProduction,

            sameSite:
                "lax",

            maxAge:
                1000 *
                60 *
                60 *
                24
        }
    })
);


/* =========================================================
   PROFILE PHOTO UPLOAD
   ========================================================= */

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


/* =========================================================
   APPLICATION CV UPLOAD
   ========================================================= */

const applicationCvUpload = multer({

    storage:
        multer.memoryStorage(),

    limits: {

        fileSize:
            5 * 1024 * 1024

    },

    fileFilter:
        (req, file, cb) => {

            const allowedTypes = [

                "application/pdf",

                "image/jpeg",

                "image/png"

            ];


            if (
                allowedTypes.includes(
                    file.mimetype
                )
            ) {

                cb(
                    null,
                    true
                );

            }

            else {

                cb(
                    new Error(
                        "Only PDF, JPG, JPEG and PNG files are allowed."
                    )
                );

            }

        }

});


/* =========================================================
   APPLICATION CV UPLOAD ERROR HANDLER
   ========================================================= */

function handleApplicationCvUpload(
    req,
    res,
    next
) {

    applicationCvUpload.single(
        "cv"
    )(
        req,
        res,
        error => {

            if (
                error instanceof
                multer.MulterError
            ) {

                if (
                    error.code ===
                    "LIMIT_FILE_SIZE"
                ) {

                    return res
                        .status(400)
                        .json({

                            success: false,

                            message:
                                "Your CV must be 5 MB or smaller."

                        });

                }


                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Unable to process the uploaded CV."

                    });

            }


            if (error) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            error.message ||
                            "Invalid CV file."

                    });

            }


            next();

        }
    );

}

// ===============================================================================
// ADMIN ========================================================================

function requireAdmin(
    req,
    res,
    next
) {

    if (
        !req.session.userId
    ) {

        return res.status(401).json({

            success:
                false,

            message:
                "You must be logged in."

        });

    }


    const allowedAdminRoles = [

        "admin",

        "system_admin"

    ];


    if (
        !allowedAdminRoles.includes(
            req.session.role
        )
    ) {

        return res.status(403).json({

            success:
                false,

            message:
                "Admin access required."

        });

    }


    next();

}

/* =========================================================
   LOAD EFFECTIVE USER PERMISSIONS
   ========================================================= */

async function loadEffectivePermissionKeys(
    userId,
    accountRole
) {

    /*
        System Admin always has every permission.

        We still return the permission keys here
        because the frontend will later use them
        to hide/show controls.
    */

    if (
        accountRole ===
        "system_admin"
    ) {

        const result =
            await pool.query(
                `
                SELECT
                    permission_key

                FROM permissions

                ORDER BY
                    permission_key ASC
                `
            );


        return result.rows.map(
            row =>
                row.permission_key
        );

    }



    /*
        IMPORTANT ACCESS MODEL

        users.role = "admin"
            means this is an internal team account.

        user_roles may contain:
            admin
            + hr_manager

        Once a NON-SYSTEM functional role exists,
        Altrium ignores the broad built-in admin role
        and calculates permissions from the functional
        role(s) only.

        This prevents Interviewer from inheriting
        full System Manager permissions.
    */

    const result =
        await pool.query(
            `
            WITH assigned_roles AS (

                SELECT

                    r.id,
                    r.role_key,
                    r.is_system

                FROM user_roles ur

                INNER JOIN roles r
                    ON r.id =
                        ur.role_id

                WHERE
                    ur.user_id = $1

            ),


            role_mode AS (

                SELECT

                    EXISTS (

                        SELECT 1

                        FROM assigned_roles

                        WHERE
                            is_system = FALSE

                    )
                    AS has_functional_role

            ),


            effective_roles AS (

                SELECT
                    ar.id

                FROM assigned_roles ar

                CROSS JOIN role_mode rm

                WHERE

                    (
                        rm.has_functional_role = TRUE

                        AND

                        ar.is_system = FALSE
                    )

                    OR

                    (
                        rm.has_functional_role = FALSE

                        AND

                        ar.is_system = TRUE
                    )

            )


            SELECT DISTINCT

                p.permission_key

            FROM effective_roles er

            INNER JOIN role_permissions rp
                ON rp.role_id =
                    er.id

            INNER JOIN permissions p
                ON p.id =
                    rp.permission_id

            ORDER BY
                p.permission_key ASC
            `,
            [
                userId
            ]
        );


    return result.rows.map(
        row =>
            row.permission_key
    );

}


/* =========================================================
   ALTRIUM TEAM ROLES
   ========================================================= */

const functionalTeamRoleKeys = [

    "hr_manager",
    "hr_recruiter",
    "interviewer"

];


const assignableTeamRoleKeys = [

    "admin",

    ...functionalTeamRoleKeys,

    "system_admin"

];


function getAccountRoleForAssignedRole(
    assignedRole
) {

    return assignedRole ===
        "system_admin"

        ? "system_admin"

        : "admin";

}



/* =========================================================
   REQUIRE PERMISSION
   ========================================================= */

function requirePermission(
    permissionKey
) {

    return async (
        req,
        res,
        next
    ) => {

        /* =============================================
           MUST BE LOGGED IN
           ============================================= */

        if (
            !req.session.userId
        ) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "You must be logged in."

            });

        }



        /* =============================================
           MUST BE INTERNAL TEAM ACCOUNT
           ============================================= */

        const allowedAccountRoles = [

            "admin",
            "system_admin"

        ];


        if (
            !allowedAccountRoles.includes(
                req.session.role
            )
        ) {

            return res.status(403).json({

                success:
                    false,

                message:
                    "Team access required."

            });

        }



        /* =============================================
           SYSTEM ADMIN BYPASS
           ============================================= */

        if (
            req.session.role ===
            "system_admin"
        ) {

            return next();

        }



        try {

            const permissionKeys =
                await loadEffectivePermissionKeys(

                    req.session.userId,

                    req.session.role

                );


            const allowed =
                permissionKeys.includes(
                    permissionKey
                );


            if (
                !allowed
            ) {

                return res.status(403).json({

                    success:
                        false,

                    message:
                        "You do not have permission to perform this action.",

                    requiredPermission:
                        permissionKey

                });

            }


            req.userPermissions =
                permissionKeys;


            next();

        }

        catch (error) {

            console.error(
                "Permission check error:",
                permissionKey,
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to verify your Altrium permissions."

            });

        }

    };

}


/* =========================================================
   CURRENT TEAM MEMBER PERMISSIONS
   ========================================================= */

app.get(
    "/api/admin/my-permissions",
    requireAdmin,
    async (req, res) => {

        try {

            const permissions =
                await loadEffectivePermissionKeys(

                    req.session.userId,

                    req.session.role

                );


            return res.json({

                success:
                    true,

                accountRole:
                    req.session.role,

                permissions

            });

        }

        catch (error) {

            console.error(
                "Load current permissions error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load your permissions."

            });

        }

    }
);


// ADMIN CREATE JOB VACANCIES

app.post(
    "/api/admin/jobs",
    requirePermission(
        "vacancies.manage"
    ),
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
                requiredSkills,
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
                    required_skills,
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

                    requiredSkills?.trim() || null,

                    openings,

                    req.session.userId
                ]
            );

            /*  =================================================
                NOTIFY ALL CANDIDATES ABOUT NEW VACANCY
                ================================================= */

                const createdJob =
                    result.rows[0];


                const deadlineText =
                    createdJob.application_deadline
                        ? new Date(
                            createdJob.application_deadline
                        ).toLocaleDateString(
                            "en-GB",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        )
                        : null;


                const notificationMessage =
                    [
                        `${createdJob.job_title} is now open`,

                        createdJob.location
                            ? `in ${createdJob.location}`
                            : null,

                        createdJob.employment_type
                            ? `· ${createdJob.employment_type}`
                            : null,

                        deadlineText
                            ? `· Apply before ${deadlineText}`
                            : null
                    ]
                    .filter(Boolean)
                    .join(" ");


                await pool.query(
                    `
                    INSERT INTO notifications (

                        user_id,
                        notification_type,
                        title,
                        message,
                        job_id,
                        action_url

                    )

                    SELECT

                        id,
                        'new_job',
                        'New job vacancy available',
                        $1,
                        $2,
                        $3

                    FROM users

                    WHERE role = 'candidate'
                    `,
                    [
                        notificationMessage,
                        createdJob.id,
                        `/jobs.html?job=${createdJob.id}`
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


/* =========================================================
   REQUIRE SYSTEM ADMIN
   ========================================================= */

function requireSystemAdmin(
    req,
    res,
    next
) {

    if (
        !req.session.userId
    ) {

        return res.status(401).json({

            success:
                false,

            message:
                "You must be logged in."

        });

    }


    if (
        req.session.role !==
        "system_admin"
    ) {

        return res.status(403).json({

            success:
                false,

            message:
                "System Admin access required."

        });

    }


    next();

}

/* =========================================================
   SYSTEM ADMIN - ACCESS TEST
   ========================================================= */

app.get(
    "/api/system/access",
    requireSystemAdmin,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        id,
                        first_name,
                        last_name,
                        email,
                        role

                    FROM users

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        req.session.userId
                    ]
                );


            if (
                result.rows.length ===
                0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "System Admin account not found."

                });

            }


            const user =
                result.rows[0];


            return res.json({

                success:
                    true,

                systemAdmin:
                    true,

                user: {

                    id:
                        user.id,

                    firstName:
                        user.first_name,

                    lastName:
                        user.last_name,

                    email:
                        user.email,

                    role:
                        user.role

                }

            });

        }

        catch (error) {

            console.error(
                "System Admin access test error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to verify System Admin access."

            });

        }

    }
);


/* =========================================================
   SYSTEM ADMIN - USER DIRECTORY
   READ ONLY
   ========================================================= */

app.get(
    "/api/system/users",
    requireSystemAdmin,
    async (req, res) => {

        try {

            /* =================================================
               FILTERS
               ================================================= */

            const search =
                String(
                    req.query.search ||
                    ""
                )
                .trim()
                .slice(
                    0,
                    120
                );


            const requestedGroup =
                String(
                    req.query.group ||
                    "team"
                )
                .trim()
                .toLowerCase();


            const allowedGroups = [
                "team",
                "candidates",
                "all"
            ];


            const group =
                allowedGroups.includes(
                    requestedGroup
                )
                    ? requestedGroup
                    : "team";


            let page =
                Number(
                    req.query.page
                ) ||
                1;


            let limit =
                Number(
                    req.query.limit
                ) ||
                20;


            page =
                Math.max(
                    1,
                    page
                );


            limit =
                Math.min(
                    50,
                    Math.max(
                        10,
                        limit
                    )
                );


            const offset =
                (
                    page -
                    1
                ) *
                limit;



            /* =================================================
               WHERE CLAUSE

               No user input is pasted into SQL.
               Everything goes through parameters.
               ================================================= */

            const filterSql = `
                WHERE

                    (
                        $1 = ''

                        OR

                        u.first_name
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        u.last_name
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        (
                            COALESCE(
                                u.first_name,
                                ''
                            )
                            ||
                            ' '
                            ||
                            COALESCE(
                                u.last_name,
                                ''
                            )
                        )
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        u.email
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        COALESCE(
                            u.phone_number,
                            ''
                        )
                            ILIKE
                            '%' || $1 || '%'
                    )


                    AND

                    (
                        $2 = 'all'

                        OR

                        (
                            $2 = 'team'

                            AND

                            u.role
                                IN (
                                    'admin',
                                    'system_admin'
                                )
                        )

                        OR

                        (
                            $2 = 'candidates'

                            AND

                            u.role =
                                'candidate'
                        )
                    )
            `;



            /* =================================================
               TOTAL FILTERED USERS
               ================================================= */

            const countResult =
                await pool.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS total

                    FROM users u

                    ${filterSql}
                    `,
                    [
                        search,
                        group
                    ]
                );


            const total =
                Number(
                    countResult
                        .rows[0]
                        .total
                ) ||
                0;



            /* =================================================
               LOAD USERS
               ================================================= */

            const result =
                await pool.query(
                    `
                    SELECT

                        u.id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone_number,

                        u.role,

                        u.email_verified,

                        u.created_at,

                        u.profile_photo_path,


                        r.role_name,

                        team_role.role_key
                            AS team_role_key,

                        team_role.role_name
                            AS team_role_name


                    FROM users u


                    LEFT JOIN roles r

                        ON r.role_key =
                            u.role

                    LEFT JOIN LATERAL (

                        SELECT

                            functional_role.role_key,
                            functional_role.role_name

                        FROM user_roles ur

                        INNER JOIN roles functional_role
                            ON functional_role.id =
                                ur.role_id

                        WHERE
                            ur.user_id =
                                u.id

                        AND
                            functional_role.role_key
                            IN (
                                'hr_manager',
                                'hr_recruiter',
                                'interviewer'
                            )

                        ORDER BY
                            ur.assigned_at DESC

                        LIMIT 1

                    ) team_role

                        ON TRUE


                    ${filterSql}


                    ORDER BY

                        CASE

                            WHEN
                                u.role =
                                'system_admin'

                            THEN
                                1


                            WHEN
                                u.role =
                                'admin'

                            THEN
                                2


                            ELSE
                                3

                        END,

                        u.created_at ASC,

                        u.id ASC


                    LIMIT $3

                    OFFSET $4
                    `,
                    [
                        search,
                        group,
                        limit,
                        offset
                    ]
                );



            /* =================================================
               GLOBAL USER STATS
               ================================================= */

            const statsResult =
                await pool.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS total_users,


                        COUNT(*)
                        FILTER (
                            WHERE
                                role =
                                'candidate'
                        )::INT
                            AS candidates,


                        COUNT(*)
                        FILTER (
                            WHERE
                                role =
                                'admin'
                        )::INT
                            AS system_managers,


                        COUNT(*)
                        FILTER (
                            WHERE
                                role =
                                'system_admin'
                        )::INT
                            AS system_admins


                    FROM users
                    `
                );


            const stats =
                statsResult.rows[0];



            /* =================================================
               MAP SAFE USER DATA
               ================================================= */

            const users =
                result.rows.map(
                    user => {

                        let profilePhotoUrl =
                            null;


                        if (
                            user.profile_photo_path
                        ) {

                            const {
                                data
                            } =
                                supabase.storage
                                    .from(
                                        "profile-photos"
                                    )
                                    .getPublicUrl(
                                        user.profile_photo_path
                                    );


                            profilePhotoUrl =
                                data.publicUrl;

                        }


                        const users =
    result.rows.map(
        user => {

            let profilePhotoUrl =
                null;


            if (
                user.profile_photo_path
            ) {

                const {
                    data
                } =
                    supabase.storage
                        .from(
                            "profile-photos"
                        )
                        .getPublicUrl(
                            user.profile_photo_path
                        );


                profilePhotoUrl =
                    data.publicUrl;

            }



            /* =============================================
               DETERMINE DISPLAY TEAM ROLE
               ============================================= */

            const assignedRole =

                user.role ===
                "system_admin"

                    ? "system_admin"

                    : user.role ===
                        "admin"

                        ? (
                            user.team_role_key ||
                            "admin"
                        )

                        : "candidate";


            const displayRoleName =

                user.role ===
                "system_admin"

                    ? "System Admin"

                    : user.team_role_name

                        ? user.team_role_name

                        : user.role ===
                            "admin"

                            ? "System Manager"

                            : "Candidate";



            return {

                id:
                    user.id,


                firstName:
                    user.first_name,

                lastName:
                    user.last_name,


                email:
                    user.email,

                phoneNumber:
                    user.phone_number,


                role:
                    user.role,


                assignedRole:
                    assignedRole,


                teamRole:
                    user.team_role_key ||
                    null,


                teamRoleName:
                    user.team_role_name ||
                    null,


                roleName:
                    displayRoleName,


                emailVerified:
                    Boolean(
                        user.email_verified
                    ),


                createdAt:
                    user.created_at,


                profilePicture:
                    profilePhotoUrl,


                isCurrentUser:
                    String(
                        user.id
                    ) ===
                    String(
                        req.session.userId
                    )

            };

        }
    );


                        return {

                            id:
                                user.id,


                            firstName:
                                user.first_name,

                            lastName:
                                user.last_name,


                            email:
                                user.email,

                            phoneNumber:
                                user.phone_number,


                            role:
                                user.role,

                            roleName:
                                user.role_name
                                ||
                                fallbackRoleNames[
                                    user.role
                                ]
                                ||
                                user.role,


                            emailVerified:
                                Boolean(
                                    user.email_verified
                                ),


                            createdAt:
                                user.created_at,


                            profilePicture:
                                profilePhotoUrl,


                            isCurrentUser:
                                String(
                                    user.id
                                ) ===
                                String(
                                    req.session.userId
                                )

                        };

                    }
                );



            /* =================================================
               PAGINATION
               ================================================= */

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        total /
                        limit
                    )
                );



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success:
                    true,


                users,


                group,


                stats: {

                    totalUsers:
                        Number(
                            stats.total_users
                        ) ||
                        0,

                    teamMembers:
                        (
                            Number(
                                stats.system_managers
                            ) ||
                            0
                        )
                        +
                        (
                            Number(
                                stats.system_admins
                            ) ||
                            0
                        ),

                    systemManagers:
                        Number(
                            stats.system_managers
                        ) ||
                        0,

                    systemAdmins:
                        Number(
                            stats.system_admins
                        ) ||
                        0,

                    candidates:
                        Number(
                            stats.candidates
                        ) ||
                        0

                },


                pagination: {

                    page,

                    limit,

                    total,

                    totalPages,

                    hasPrevious:
                        page >
                        1,

                    hasNext:
                        page <
                        totalPages

                }

            });

        }

        catch (error) {

            console.error(
                "System user directory error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load Altrium users."

            });

        }

    }
);


/* =========================================================
   SYSTEM ADMIN - FEEDBACK & ISSUES
   READ ONLY DIRECTORY
   ========================================================= */

app.get(
    "/api/system/feedback",
    requireSystemAdmin,
    async (req, res) => {

        try {

            /* =================================================
               SEARCH
               ================================================= */

            const search =
                String(
                    req.query.search ||
                    ""
                )
                .trim()
                .slice(
                    0,
                    200
                );



            /* =================================================
               CATEGORY FILTER
               ================================================= */

            const requestedCategory =
                String(
                    req.query.category ||
                    "all"
                )
                .trim()
                .toLowerCase();


            const allowedCategories = [

                "all",
                "general",
                "feedback",
                "bug"

            ];


            const category =
                allowedCategories.includes(
                    requestedCategory
                )
                    ? requestedCategory
                    : "all";



            /* =================================================
               STATUS FILTER
               ================================================= */

            const requestedStatus =
                String(
                    req.query.status ||
                    "all"
                )
                .trim()
                .toLowerCase();


            const allowedStatuses = [

                "all",
                "new",
                "reviewing",
                "resolved"

            ];


            const status =
                allowedStatuses.includes(
                    requestedStatus
                )
                    ? requestedStatus
                    : "all";



            /* =================================================
               PAGINATION
               ================================================= */

            let page =
                Number(
                    req.query.page
                ) ||
                1;


            let limit =
                Number(
                    req.query.limit
                ) ||
                20;


            page =
                Math.max(
                    1,
                    page
                );


            limit =
                Math.min(
                    50,
                    Math.max(
                        10,
                        limit
                    )
                );


            const offset =
                (
                    page -
                    1
                ) *
                limit;



            /* =================================================
               FILTER SQL

               All browser values go through PostgreSQL
               parameters.

               Nothing from the browser is directly inserted
               into the SQL string.
               ================================================= */

            const filterSql = `
                WHERE

                    (
                        $1 = ''

                        OR

                        fs.sender_name
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        fs.sender_email
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        fs.subject
                            ILIKE
                            '%' || $1 || '%'

                        OR

                        fs.message
                            ILIKE
                            '%' || $1 || '%'
                    )


                    AND

                    (
                        $2 = 'all'

                        OR

                        fs.category =
                            $2
                    )


                    AND

                    (
                        $3 = 'all'

                        OR

                        fs.status =
                            $3
                    )
            `;



            /* =================================================
               FILTERED TOTAL
               ================================================= */

            const countResult =
                await pool.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS total

                    FROM feedback_submissions fs

                    ${filterSql}
                    `,
                    [

                        search,
                        category,
                        status

                    ]
                );


            const total =
                Number(
                    countResult
                        .rows[0]
                        .total
                ) ||
                0;



            /* =================================================
               LOAD FEEDBACK
               ================================================= */

            const feedbackResult =
                await pool.query(
                    `
                    SELECT

                        fs.id,

                        fs.submitted_by,

                        fs.sender_name,
                        fs.sender_email,

                        fs.category,

                        fs.subject,
                        fs.message,

                        fs.status,

                        fs.internal_note,

                        fs.reviewed_by,
                        fs.reviewed_at,

                        fs.resolved_at,

                        fs.created_at,
                        fs.updated_at,


                        submitted_user.first_name
                            AS account_first_name,

                        submitted_user.last_name
                            AS account_last_name,

                        submitted_user.email
                            AS account_email,


                        reviewer.first_name
                            AS reviewer_first_name,

                        reviewer.last_name
                            AS reviewer_last_name,

                        reviewer.email
                            AS reviewer_email


                    FROM feedback_submissions fs


                    LEFT JOIN users submitted_user

                        ON submitted_user.id =
                            fs.submitted_by


                    LEFT JOIN users reviewer

                        ON reviewer.id =
                            fs.reviewed_by


                    ${filterSql}


                    ORDER BY

                        CASE

                            WHEN
                                fs.status =
                                'new'

                            THEN
                                1


                            WHEN
                                fs.status =
                                'reviewing'

                            THEN
                                2


                            WHEN
                                fs.status =
                                'resolved'

                            THEN
                                3


                            ELSE
                                4

                        END,

                        fs.created_at DESC,

                        fs.id DESC


                    LIMIT $4

                    OFFSET $5
                    `,
                    [

                        search,
                        category,
                        status,
                        limit,
                        offset

                    ]
                );



            /* =================================================
               GLOBAL FEEDBACK STATS
               ================================================= */

            const statsResult =
                await pool.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS total,


                        COUNT(*)
                        FILTER (
                            WHERE
                                status =
                                'new'
                        )::INT
                            AS new_count,


                        COUNT(*)
                        FILTER (
                            WHERE
                                status =
                                'reviewing'
                        )::INT
                            AS reviewing_count,


                        COUNT(*)
                        FILTER (
                            WHERE
                                status =
                                'resolved'
                        )::INT
                            AS resolved_count


                    FROM feedback_submissions
                    `
                );


            const stats =
                statsResult.rows[0];



            /* =================================================
               MAP SAFE SYSTEM ADMIN DATA
               ================================================= */

            const feedback =
                feedbackResult
                    .rows
                    .map(
                        item => {

                            const accountName =
                                item.submitted_by

                                    ? `${
                                        item.account_first_name ||
                                        ""
                                    } ${
                                        item.account_last_name ||
                                        ""
                                    }`
                                    .trim()

                                    : null;


                            const reviewerName =
                                item.reviewed_by

                                    ? `${
                                        item.reviewer_first_name ||
                                        ""
                                    } ${
                                        item.reviewer_last_name ||
                                        ""
                                    }`
                                    .trim()

                                    : null;



                            return {

                                id:
                                    item.id,


                                category:
                                    item.category,


                                subject:
                                    item.subject,


                                message:
                                    item.message,


                                status:
                                    item.status,


                                sender: {

                                    name:
                                        item.sender_name,

                                    email:
                                        item.sender_email

                                },


                                account:

                                    item.submitted_by

                                        ? {

                                            id:
                                                item.submitted_by,

                                            name:
                                                accountName ||
                                                item.account_email,

                                            email:
                                                item.account_email

                                        }

                                        : null,


                                internalNote:
                                    item.internal_note,


                                reviewedBy:

                                    item.reviewed_by

                                        ? {

                                            id:
                                                item.reviewed_by,

                                            name:
                                                reviewerName ||
                                                item.reviewer_email,

                                            email:
                                                item.reviewer_email

                                        }

                                        : null,


                                reviewedAt:
                                    item.reviewed_at,


                                resolvedAt:
                                    item.resolved_at,


                                createdAt:
                                    item.created_at,


                                updatedAt:
                                    item.updated_at

                            };

                        }
                    );



            /* =================================================
               PAGINATION
               ================================================= */

            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        total /
                        limit
                    )
                );



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success:
                    true,


                feedback,


                stats: {

                    total:
                        Number(
                            stats.total
                        ) ||
                        0,

                    new:
                        Number(
                            stats.new_count
                        ) ||
                        0,

                    reviewing:
                        Number(
                            stats.reviewing_count
                        ) ||
                        0,

                    resolved:
                        Number(
                            stats.resolved_count
                        ) ||
                        0

                },


                filters: {

                    search,

                    category,

                    status

                },


                pagination: {

                    page,

                    limit,

                    total,

                    totalPages,

                    hasPrevious:
                        page >
                        1,

                    hasNext:
                        page <
                        totalPages

                }

            });

        }

        catch (error) {

            console.error(
                "System feedback directory error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load feedback and system issues."

            });

        }

    }
);


/* =========================================================
   SYSTEM ADMIN - UPDATE FEEDBACK / SYSTEM ISSUE
   ========================================================= */

app.patch(
    "/api/system/feedback/:id",
    requireSystemAdmin,
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const feedbackId =
                Number(
                    req.params.id
                );


            const requestedStatus =
                String(
                    req.body.status ||
                    ""
                )
                .trim()
                .toLowerCase();


            const internalNote =
                String(
                    req.body.internalNote ||
                    ""
                )
                .trim();



            /* =================================================
               VALIDATE ID
               ================================================= */

            if (
                !Number.isInteger(
                    feedbackId
                ) ||
                feedbackId <= 0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid feedback submission."

                });

            }



            /* =================================================
               VALIDATE STATUS
               ================================================= */

            const allowedStatuses = [

                "new",
                "reviewing",
                "resolved"

            ];


            if (
                !allowedStatuses.includes(
                    requestedStatus
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a valid feedback status."

                });

            }



            /* =================================================
               VALIDATE NOTE
               ================================================= */

            if (
                internalNote.length >
                2000
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Internal note must be 2000 characters or fewer."

                });

            }



            await client.query(
                "BEGIN"
            );



            /* =================================================
               LOAD + LOCK FEEDBACK
               ================================================= */

            const existingResult =
                await client.query(
                    `
                    SELECT

                        id,

                        submitted_by,

                        sender_name,
                        sender_email,

                        category,

                        subject,
                        message,

                        status,
                        internal_note,

                        reviewed_by,
                        reviewed_at,

                        resolved_at,

                        created_at,
                        updated_at

                    FROM feedback_submissions

                    WHERE
                        id = $1

                    FOR UPDATE
                    `,
                    [
                        feedbackId
                    ]
                );


            if (
                existingResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Feedback submission not found."

                });

            }


            const existing =
                existingResult.rows[0];



            /* =================================================
               NOTHING CHANGED
               ================================================= */

            const existingNote =
                String(
                    existing.internal_note ||
                    ""
                )
                .trim();


            if (
                existing.status ===
                    requestedStatus

                &&

                existingNote ===
                    internalNote
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "No feedback changes were made."

                });

            }



            /* =================================================
               UPDATE WORKFLOW

               NEW
                   No active reviewer.

               REVIEWING
                   Current System Admin becomes reviewer.

               RESOLVED
                   Current System Admin becomes reviewer
                   and resolution timestamp is stored.
               ================================================= */

            const updateResult =
                await client.query(
                    `
                    UPDATE feedback_submissions

                    SET

                        status =
                            $1::VARCHAR(30),


                        internal_note =
                            NULLIF(
                                $2::TEXT,
                                ''
                            ),


                        reviewed_by =

                            CASE

                                WHEN
                                    $1::VARCHAR(30) = 'new'

                                THEN
                                    NULL::BIGINT

                                ELSE
                                    $3::BIGINT

                            END,


                        reviewed_at =

                            CASE

                                WHEN
                                    $1::VARCHAR(30) = 'new'

                                THEN
                                    NULL


                                WHEN
                                    status = 'new'

                                    OR

                                    reviewed_at IS NULL

                                THEN
                                    NOW()


                                ELSE
                                    reviewed_at

                            END,


                        resolved_at =

                            CASE

                                WHEN
                                    $1::VARCHAR(30) = 'resolved'

                                THEN
                                    NOW()

                                ELSE
                                    NULL

                            END,


                        updated_at =
                            NOW()


                    WHERE
                        id = $4::BIGINT


                    RETURNING

                        id,
                        submitted_by,

                        sender_name,
                        sender_email,

                        category,

                        subject,
                        message,

                        status,
                        internal_note,

                        reviewed_by,
                        reviewed_at,

                        resolved_at,

                        created_at,
                        updated_at
                    `,
                    [

                        requestedStatus,

                        internalNote,

                        req.session.userId,

                        feedbackId

                    ]
                );


            const updated =
                updateResult.rows[0];



            /* =================================================
               LOAD SYSTEM ADMIN NAME FOR RESPONSE
               ================================================= */

            const reviewerResult =
                await client.query(
                    `
                    SELECT

                        id,
                        first_name,
                        last_name,
                        email

                    FROM users

                    WHERE
                        id = $1

                    LIMIT 1
                    `,
                    [
                        req.session.userId
                    ]
                );


            const reviewer =
                reviewerResult.rows[0] ||
                null;



            /* =================================================
               AUDIT LOG
               ================================================= */

            const statusChanged =
                existing.status !==
                requestedStatus;


            const noteChanged =
                existingNote !==
                internalNote;


            const changeParts =
                [];


            if (
                statusChanged
            ) {

                changeParts.push(
                    `status ${existing.status} → ${requestedStatus}`
                );

            }


            if (
                noteChanged
            ) {

                changeParts.push(
                    "internal note updated"
                );

            }


            await client.query(
                `
                INSERT INTO audit_logs (

                    actor_user_id,

                    target_user_id,

                    action_key,

                    entity_type,
                    entity_id,

                    description,

                    before_data,
                    after_data,

                    metadata,

                    ip_address,
                    user_agent

                )

                VALUES (

                    $1,

                    $2,

                    'feedback.updated',

                    'feedback',
                    $3,

                    $4,

                    $5::jsonb,
                    $6::jsonb,

                    $7::jsonb,

                    $8,
                    $9

                )
                `,
                [

                    req.session.userId,

                    existing.submitted_by,

                    String(
                        feedbackId
                    ),

                    `Updated feedback #${feedbackId}: ${changeParts.join(", ")}.`,

                    JSON.stringify({

                        status:
                            existing.status,

                        internalNote:
                            existing.internal_note

                    }),

                    JSON.stringify({

                        status:
                            updated.status,

                        internalNote:
                            updated.internal_note

                    }),

                    JSON.stringify({

                        category:
                            existing.category,

                        subject:
                            existing.subject

                    }),

                    req.ip ||
                    null,

                    req.get(
                        "user-agent"
                    ) ||
                    null

                ]
            );



            await client.query(
                "COMMIT"
            );



            const reviewerName =
                reviewer

                    ? `${
                        reviewer.first_name ||
                        ""
                    } ${
                        reviewer.last_name ||
                        ""
                    }`
                    .trim()

                    : null;



            return res.json({

                success:
                    true,

                message:

                    requestedStatus ===
                        "resolved"

                        ? "Feedback marked as resolved."

                        : requestedStatus ===
                            "reviewing"

                            ? "Feedback is now being reviewed."

                            : "Feedback returned to New.",


                feedback: {

                    id:
                        updated.id,

                    category:
                        updated.category,

                    subject:
                        updated.subject,

                    message:
                        updated.message,

                    status:
                        updated.status,

                    internalNote:
                        updated.internal_note,


                    sender: {

                        name:
                            updated.sender_name,

                        email:
                            updated.sender_email

                    },


                    reviewedBy:

                        updated.reviewed_by &&
                        reviewer

                            ? {

                                id:
                                    reviewer.id,

                                name:
                                    reviewerName ||
                                    reviewer.email,

                                email:
                                    reviewer.email

                            }

                            : null,


                    reviewedAt:
                        updated.reviewed_at,

                    resolvedAt:
                        updated.resolved_at,

                    createdAt:
                        updated.created_at,

                    updatedAt:
                        updated.updated_at

                }

            });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (
                rollbackError
            ) {

                console.error(
                    "Feedback update rollback error:",
                    rollbackError
                );

            }


            console.error(
                "System feedback update error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to update the feedback submission."

            });

        }

        finally {

            client.release();

        }

    }
);


/* =========================================================
   SYSTEM ADMIN - CREATE TEAM MEMBER
   ========================================================= */

app.post(
    "/api/system/users/team",
    requireSystemAdmin,
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const {
                firstName,
                lastName,
                email,
                phoneNumber,
                role,
                temporaryPassword
            } =
                req.body;



            const cleanFirstName =
                String(
                    firstName ||
                    ""
                )
                .trim();


            const cleanLastName =
                String(
                    lastName ||
                    ""
                )
                .trim();


            const cleanEmail =
                String(
                    email ||
                    ""
                )
                .trim()
                .toLowerCase();


            const cleanPhone =
                String(
                    phoneNumber ||
                    ""
                )
                .trim();


            const assignedRole =
                String(
                    role ||
                    ""
                )
                .trim()
                .toLowerCase();


            const cleanPassword =
                String(
                    temporaryPassword ||
                    ""
                );



            /* =================================================
               VALIDATION
               ========================================================= */

            if (
                !cleanFirstName ||
                !cleanLastName ||
                !cleanEmail ||
                !cleanPhone ||
                !assignedRole ||
                !cleanPassword
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please complete all team member fields."

                });

            }



            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    .test(
                        cleanEmail
                    )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please enter a valid email address."

                });

            }



            if (
                !assignableTeamRoleKeys.includes(
                    assignedRole
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a valid Altrium team role."

                });

            }



            if (
                cleanPassword.length <
                8
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Temporary password must be at least 8 characters long."

                });

            }



            const accountRole =
                getAccountRoleForAssignedRole(
                    assignedRole
                );



            await client.query(
                "BEGIN"
            );



            /* =================================================
               DUPLICATE EMAIL
               ========================================================= */

            const existingUserResult =
                await client.query(
                    `
                    SELECT id

                    FROM users

                    WHERE
                        LOWER(email) =
                        LOWER($1)

                    LIMIT 1
                    `,
                    [
                        cleanEmail
                    ]
                );


            if (
                existingUserResult.rows.length >
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        "An Altrium account already exists with this email address."

                });

            }



            /* =================================================
               LOAD ACCOUNT + ASSIGNED ROLE RECORDS
               ========================================================= */

            const roleResult =
                await client.query(
                    `
                    SELECT

                        id,
                        role_key,
                        role_name

                    FROM roles

                    WHERE
                        role_key = $1

                        OR

                        role_key = $2
                    `,
                    [
                        accountRole,
                        assignedRole
                    ]
                );


            const accountRoleRecord =
                roleResult.rows.find(
                    role =>
                        role.role_key ===
                        accountRole
                );


            const assignedRoleRecord =
                roleResult.rows.find(
                    role =>
                        role.role_key ===
                        assignedRole
                );


            if (
                !accountRoleRecord ||
                !assignedRoleRecord
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "The selected Altrium role does not exist."

                });

            }



            /* =================================================
               PASSWORD HASH
               ========================================================= */

            const passwordHash =
                await bcrypt.hash(
                    cleanPassword,
                    12
                );



            /* =================================================
               CREATE USER
               ========================================================= */

            const userResult =
                await client.query(
                    `
                    INSERT INTO users (

                        first_name,
                        last_name,
                        email,
                        phone_number,
                        password_hash,
                        role,
                        email_verified

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        TRUE

                    )

                    RETURNING

                        id,
                        first_name,
                        last_name,
                        email,
                        phone_number,
                        role,
                        email_verified,
                        created_at
                    `,
                    [

                        cleanFirstName,

                        cleanLastName,

                        cleanEmail,

                        cleanPhone,

                        passwordHash,

                        accountRole

                    ]
                );


            const createdUser =
                userResult.rows[0];



            /* =================================================
               ASSIGN BASE ACCOUNT ROLE

               All ordinary team members retain admin as
               their internal account class.
               ========================================================= */

            await client.query(
                `
                INSERT INTO user_roles (

                    user_id,
                    role_id,
                    assigned_by

                )

                VALUES (
                    $1,
                    $2,
                    $3
                )

                ON CONFLICT (
                    user_id,
                    role_id
                )

                DO UPDATE SET

                    assigned_by =
                        EXCLUDED.assigned_by,

                    assigned_at =
                        NOW()
                `,
                [

                    createdUser.id,

                    accountRoleRecord.id,

                    req.session.userId

                ]
            );



            /* =================================================
               ASSIGN FUNCTIONAL ROLE
               ========================================================= */

            if (
                functionalTeamRoleKeys.includes(
                    assignedRole
                )
            ) {

                await client.query(
                    `
                    INSERT INTO user_roles (

                        user_id,
                        role_id,
                        assigned_by

                    )

                    VALUES (
                        $1,
                        $2,
                        $3
                    )

                    ON CONFLICT (
                        user_id,
                        role_id
                    )

                    DO UPDATE SET

                        assigned_by =
                            EXCLUDED.assigned_by,

                        assigned_at =
                            NOW()
                    `,
                    [

                        createdUser.id,

                        assignedRoleRecord.id,

                        req.session.userId

                    ]
                );

            }



            /* =================================================
               AUDIT
               ========================================================= */

            await client.query(
                `
                INSERT INTO audit_logs (

                    actor_user_id,
                    target_user_id,

                    action_key,

                    entity_type,
                    entity_id,

                    description,

                    after_data,

                    ip_address,
                    user_agent

                )

                VALUES (

                    $1,
                    $2,

                    'user.team_member.created',

                    'user',
                    $3,

                    $4,

                    $5::jsonb,

                    $6,
                    $7

                )
                `,
                [

                    req.session.userId,

                    createdUser.id,

                    String(
                        createdUser.id
                    ),

                    `Created team member ${cleanFirstName} ${cleanLastName} as ${assignedRoleRecord.role_name}.`,

                    JSON.stringify({

                        accountRole,

                        assignedRole:
                            assignedRoleRecord.role_key,

                        assignedRoleName:
                            assignedRoleRecord.role_name,

                        email:
                            createdUser.email

                    }),

                    req.ip ||
                    null,

                    req.get(
                        "user-agent"
                    ) ||
                    null

                ]
            );



            await client.query(
                "COMMIT"
            );



            return res.status(201).json({

                success:
                    true,

                message:
                    "Team member created successfully.",

                user: {

                    id:
                        createdUser.id,

                    firstName:
                        createdUser.first_name,

                    lastName:
                        createdUser.last_name,

                    email:
                        createdUser.email,

                    phoneNumber:
                        createdUser.phone_number,

                    role:
                        createdUser.role,

                    assignedRole,

                    roleName:
                        assignedRoleRecord.role_name,

                    createdAt:
                        createdUser.created_at

                }

            });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (
                rollbackError
            ) {

                console.error(
                    "Create team member rollback error:",
                    rollbackError
                );

            }


            console.error(
                "Create team member error:",
                error
            );


            if (
                error.code ===
                "23505"
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "An account with this email address already exists."

                });

            }


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to create the team member."

            });

        }

        finally {

            client.release();

        }

    }
);


/* =========================================================
   SYSTEM ADMIN - CHANGE TEAM MEMBER ACCESS ROLE
   ========================================================= */

app.patch(
    "/api/system/users/:id/role",
    requireSystemAdmin,
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const targetUserId =
                Number(
                    req.params.id
                );


            const newRole =
                String(
                    req.body.role ||
                    ""
                )
                .trim()
                .toLowerCase();



            /* =================================================
               BASIC VALIDATION
               ========================================================= */

            if (
                !Number.isInteger(
                    targetUserId
                ) ||
                targetUserId <=
                    0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid team member."

                });

            }



            const allowedRoles = [

                "admin",
                "system_admin"

            ];


            if (
                !allowedRoles.includes(
                    newRole
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a valid team access role."

                });

            }



            /* =================================================
               DO NOT CHANGE YOUR OWN ACCESS LEVEL HERE

               This prevents accidental self-demotion.
               ========================================================= */

            if (
                String(
                    targetUserId
                ) ===
                String(
                    req.session.userId
                )
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "You cannot change your own System Admin access level from this page."

                });

            }



            await client.query(
                "BEGIN"
            );



            /* =================================================
               LOAD + LOCK TARGET USER
               ========================================================= */

            const userResult =
                await client.query(
                    `
                    SELECT

                        u.id,
                        u.first_name,
                        u.last_name,
                        u.email,
                        u.role,

                        r.id
                            AS current_role_id,

                        r.role_name
                            AS current_role_name

                    FROM users u


                    LEFT JOIN roles r

                        ON r.role_key =
                            u.role


                    WHERE
                        u.id = $1


                    FOR UPDATE OF u
                    `,
                    [
                        targetUserId
                    ]
                );


            if (
                userResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Team member not found."

                });

            }


            const targetUser =
                userResult.rows[0];



            /* =================================================
               CANDIDATES ARE NOT MANAGED HERE
               ========================================================= */

            if (
                targetUser.role ===
                "candidate"
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        "Candidate accounts cannot be assigned team access from this control."

                });

            }



            /* =================================================
               SAME ROLE
               ========================================================= */

            if (
                targetUser.role ===
                newRole
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "This team member already has that access level."

                });

            }



            /* =================================================
               SERIALIZE SYSTEM ADMIN CHANGES

               Prevent two requests from accidentally
               demoting the final System Admin together.
               ========================================================= */

            if (
                targetUser.role ===
                    "system_admin"

                ||

                newRole ===
                    "system_admin"
            ) {

                await client.query(
                    `
                    SELECT
                        pg_advisory_xact_lock(
                            26082801
                        )
                    `
                );

            }



            /* =================================================
               NEVER DEMOTE THE LAST SYSTEM ADMIN
               ========================================================= */

            if (
                targetUser.role ===
                    "system_admin"

                &&

                newRole !==
                    "system_admin"
            ) {

                const systemAdminCountResult =
                    await client.query(
                        `
                        SELECT

                            COUNT(*)::INT
                                AS count

                        FROM users

                        WHERE
                            role =
                            'system_admin'
                        `
                    );


                const systemAdminCount =
                    Number(
                        systemAdminCountResult
                            .rows[0]
                            .count
                    ) ||
                    0;


                if (
                    systemAdminCount <=
                    1
                ) {

                    await client.query(
                        "ROLLBACK"
                    );


                    return res.status(409).json({

                        success:
                            false,

                        message:
                            "The final System Admin cannot be demoted."

                    });

                }

            }



            /* =================================================
               VERIFY NEW ROLE EXISTS
               ========================================================= */

            const newRoleResult =
                await client.query(
                    `
                    SELECT

                        id,
                        role_key,
                        role_name

                    FROM roles

                    WHERE
                        role_key = $1

                    LIMIT 1
                    `,
                    [
                        newRole
                    ]
                );


            if (
                newRoleResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success:
                        false,

                    message:
                        "The selected Altrium role does not exist."

                });

            }


            const selectedRole =
                newRoleResult.rows[0];



            /* =================================================
               UPDATE PRIMARY ACCESS ROLE
               ========================================================= */

            await client.query(
                `
                UPDATE users

                SET
                    role = $1

                WHERE
                    id = $2
                `,
                [
                    newRole,
                    targetUserId
                ]
            );



            /* =================================================
               ADD NEW USER_ROLES ASSIGNMENT
               ========================================================= */

            await client.query(
                `
                INSERT INTO user_roles (

                    user_id,
                    role_id,
                    assigned_by

                )

                VALUES (

                    $1,
                    $2,
                    $3

                )

                ON CONFLICT (
                    user_id,
                    role_id
                )

                DO UPDATE SET

                    assigned_by =
                        EXCLUDED.assigned_by,

                    assigned_at =
                        NOW()
                `,
                [

                    targetUserId,

                    selectedRole.id,

                    req.session.userId

                ]
            );



            /* =================================================
               REMOVE OLD BUILT-IN ACCESS ROLE LINKS

               IMPORTANT:
               This ONLY removes candidate/admin/system_admin
               assignment links for this one user.

               Custom roles are preserved.
               No user account or role is deleted.
               ========================================================= */

            await client.query(
                `
                DELETE FROM user_roles ur

                USING roles r

                WHERE
                    ur.role_id =
                        r.id

                AND
                    ur.user_id =
                        $1

                AND
                    r.role_key IN (
                        'candidate',
                        'admin',
                        'system_admin'
                    )

                AND
                    r.id <>
                        $2
                `,
                [

                    targetUserId,

                    selectedRole.id

                ]
            );



            /* =================================================
               REVOKE EXISTING LOGIN SESSIONS

               Makes the new access level take effect
               immediately on their next login.
               ========================================================= */

            await client.query(
                `
                DELETE FROM "session"

                WHERE
                    sess ->> 'userId' =
                    $1
                `,
                [
                    String(
                        targetUserId
                    )
                ]
            );



            /* =================================================
               AUDIT LOG
               ========================================================= */

            const fullName =
                `${
                    targetUser.first_name ||
                    ""
                } ${
                    targetUser.last_name ||
                    ""
                }`
                .trim()
                ||
                targetUser.email;


            await client.query(
                `
                INSERT INTO audit_logs (

                    actor_user_id,
                    target_user_id,

                    action_key,

                    entity_type,
                    entity_id,

                    description,

                    before_data,
                    after_data,

                    metadata,

                    ip_address,
                    user_agent

                )

                VALUES (

                    $1,
                    $2,

                    'user.access_role.changed',

                    'user',
                    $3,

                    $4,

                    $5::jsonb,
                    $6::jsonb,

                    $7::jsonb,

                    $8,
                    $9

                )
                `,
                [

                    req.session.userId,

                    targetUserId,

                    String(
                        targetUserId
                    ),

                    `Changed ${fullName}'s access role from ${targetUser.role} to ${newRole}.`,

                    JSON.stringify({

                        role:
                            targetUser.role,

                        roleName:
                            targetUser
                                .current_role_name

                    }),

                    JSON.stringify({

                        role:
                            selectedRole
                                .role_key,

                        roleName:
                            selectedRole
                                .role_name

                    }),

                    JSON.stringify({

                        sessionsRevoked:
                            true

                    }),

                    req.ip ||
                    null,

                    req.get(
                        "user-agent"
                    ) ||
                    null

                ]
            );



            await client.query(
                "COMMIT"
            );



            return res.json({

                success:
                    true,

                message:
                    "Team member access role updated successfully.",

                user: {

                    id:
                        targetUserId,

                    role:
                        selectedRole
                            .role_key,

                    roleName:
                        selectedRole
                            .role_name

                }

            });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (rollbackError) {

                console.error(
                    "Team role rollback error:",
                    rollbackError
                );

            }


            console.error(
                "Change team member role error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to update the team member access role."

            });

        }

        finally {

            client.release();

        }

    }
);



// ADMIN LOAD JOB VACANCIES

app.get(
    "/api/admin/jobs",
    requirePermission(
        "vacancies.view_all"
    ),
    async (req, res) => {

        try {

            const result = await pool.query(
                `
                SELECT
                    jobs.id,
                    jobs.job_title,
                    jobs.department,
                    jobs.location,
                    jobs.employment_type,
                    jobs.salary,
                    jobs.application_deadline,
                    jobs.experience_required,
                    jobs.education_required,
                    jobs.description,
                    jobs.responsibilities,
                    jobs.required_skills,
                    jobs.number_of_openings,
                    jobs.status,
                    jobs.created_by,
                    jobs.created_at,
                    jobs.updated_at,

                    users.first_name AS creator_first_name,
                    users.last_name AS creator_last_name

                FROM jobs

                LEFT JOIN users
                    ON users.id = jobs.created_by

                ORDER BY jobs.created_at DESC
                `
            );


            return res.json({
                success: true,
                jobs: result.rows
            });

        }

        catch (error) {

            console.error(
                "Load admin jobs error:",
                error
            );


            return res.status(500).json({
                success: false,
                message: "Unable to load job vacancies."
            });

        }

    }
);

// ADMIN CHANGE JOB STATUS

app.patch(
    "/api/admin/jobs/:id/status",
    requirePermission(
        "vacancies.manage"
    ),
    async (req, res) => {

        try {

            const jobId =
                req.params.id;

            const {
                status
            } = req.body;


            const allowedStatuses = [
                "active",
                "closed",
                "draft"
            ];


            if (
                !allowedStatuses.includes(status)
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid job status."
                });

            }


            const result =
                await pool.query(
                    `
                    UPDATE jobs

                    SET
                        status = $1,
                        updated_at = NOW()

                    WHERE id = $2

                    RETURNING *
                    `,
                    [
                        status,
                        jobId
                    ]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Job vacancy not found."
                });

            }


            return res.json({
                success: true,
                message:
                    status === "closed"
                        ? "Job vacancy closed successfully."
                        : "Job vacancy status updated.",
                job: result.rows[0]
            });

        }

        catch (error) {

            console.error(
                "Update job status error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to update job status."
            });

        }

    }
);

// ADMIN EDIT JOB VACANCY

app.patch(
    "/api/admin/jobs/:id",
    requirePermission(
        "vacancies.manage"
    ),
    async (req, res) => {

        try {

            const jobId =
                req.params.id;


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
                requiredSkills,
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
                    message:
                        "Please complete all required job fields."
                });

            }


            const openings =
                Number(numberOfOpenings) || 1;


            if (openings < 1) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Number of openings must be at least 1."
                });

            }


            const result =
                await pool.query(
                    `
                    UPDATE jobs

                    SET
                        job_title = $1,
                        department = $2,
                        location = $3,
                        employment_type = $4,
                        salary = $5,
                        application_deadline = $6,
                        experience_required = $7,
                        education_required = $8,
                        description = $9,
                        responsibilities = $10,
                        required_skills = $11,
                        number_of_openings = $12,
                        updated_at = NOW()

                    WHERE id = $13

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

                        requiredSkills?.trim() || null,

                        openings,

                        jobId
                    ]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Job vacancy not found."
                });

            }


            return res.json({
                success: true,
                message:
                    "Job vacancy updated successfully.",
                job: result.rows[0]
            });

        }

        catch (error) {

            console.error(
                "Edit job vacancy error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to update job vacancy."
            });

        }

    }
);


/* =========================================================
   GOOGLE CALENDAR OAUTH
   ========================================================= */

const googleOAuthClient =
    new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );


const GOOGLE_CALENDAR_SCOPES = [

    "https://www.googleapis.com/auth/calendar.events"

];

/* =========================================================
   GOOGLE TOKEN ENCRYPTION
   ========================================================= */

function getGoogleTokenEncryptionKey() {

    const encodedKey =
        process.env
            .GOOGLE_TOKEN_ENCRYPTION_KEY;


    if (
        !encodedKey
    ) {

        throw new Error(
            "GOOGLE_TOKEN_ENCRYPTION_KEY is missing."
        );

    }


    const key =
        Buffer.from(
            encodedKey,
            "base64"
        );


    if (
        key.length !==
        32
    ) {

        throw new Error(
            "GOOGLE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes."
        );

    }


    return key;

}



function encryptGoogleRefreshToken(
    refreshToken
) {

    const key =
        getGoogleTokenEncryptionKey();


    const iv =
        crypto.randomBytes(
            12
        );


    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    const encrypted =
        Buffer.concat([

            cipher.update(
                refreshToken,
                "utf8"
            ),

            cipher.final()

        ]);


    const authTag =
        cipher.getAuthTag();


    return [

        iv.toString(
            "base64"
        ),

        authTag.toString(
            "base64"
        ),

        encrypted.toString(
            "base64"
        )

    ].join(".");

}



function decryptGoogleRefreshToken(
    encryptedValue
) {

    const parts =
        String(
            encryptedValue ||
            ""
        )
        .split(".");


    if (
        parts.length !==
        3
    ) {

        throw new Error(
            "Stored Google refresh token has an invalid format."
        );

    }


    const [
        ivBase64,
        authTagBase64,
        encryptedBase64
    ] =
        parts;


    const key =
        getGoogleTokenEncryptionKey();


    const iv =
        Buffer.from(
            ivBase64,
            "base64"
        );


    const authTag =
        Buffer.from(
            authTagBase64,
            "base64"
        );


    const encrypted =
        Buffer.from(
            encryptedBase64,
            "base64"
        );


    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            key,
            iv
        );


    decipher.setAuthTag(
        authTag
    );


    const decrypted =
        Buffer.concat([

            decipher.update(
                encrypted
            ),

            decipher.final()

        ]);


    return decrypted.toString(
        "utf8"
    );

}

/* =========================================================
   LOAD STORED GOOGLE CALENDAR CONNECTION
   ========================================================= */

async function getStoredGoogleCalendarClient() {

    const result =
        await pool.query(
            `
            SELECT
                encrypted_refresh_token,
                google_calendar_id

            FROM google_calendar_connections

            ORDER BY id ASC

            LIMIT 1
            `
        );


    if (
        result.rows.length ===
        0
    ) {

        throw new Error(
            "Google Calendar is not connected."
        );

    }


    const connection =
        result.rows[0];


    const refreshToken =
        decryptGoogleRefreshToken(
            connection.encrypted_refresh_token
        );


    const auth =
        new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );


    auth.setCredentials({

        refresh_token:
            refreshToken

    });


    const calendar =
        google.calendar({

            version:
                "v3",

            auth

        });


    return {

        calendar,

        calendarId:
            connection.google_calendar_id ||
            "primary"

    };

}

/* =========================================================
   ADMIN - TEST STORED GOOGLE CALENDAR CONNECTION
   ========================================================= */

app.get(
    "/api/admin/google-calendar/test",
    requirePermission(
        "system.settings.manage"
    ),
    async (req, res) => {

        try {

            const {
                calendar,
                calendarId
            } =
                await getStoredGoogleCalendarClient();


            await calendar.events.list({

                calendarId,

                maxResults:
                    1,

                singleEvents:
                    true

            });


            return res.json({

                success:
                    true,

                connected:
                    true,

                message:
                    "Stored Google Calendar connection is working."

            });

        }

        catch (error) {

            console.error(
                "Stored Google Calendar test error:",
                error.response?.data ||
                error
            );


            return res.status(500).json({

                success:
                    false,

                connected:
                    false,

                message:
                    error.response?.data
                        ?.error
                        ?.message ||
                    error.message ||
                    "Stored Google Calendar connection failed."

            });

        }

    }
);

/* =========================================================
   EMAIL HTML ESCAPE
   ========================================================= */

function escapeEmailHtml(value) {

    return String(
        value ??
        ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   SEND SHORTLISTED CANDIDATE EMAIL
   ========================================================= */

async function sendShortlistedCandidateEmail({

    candidateName,
    candidateEmail,

    applicationId,
    applicationReference,

    jobTitle

}) {

    if (
        !candidateEmail
    ) {

        return null;

    }


    const ALTRIUM_LOGO_URL =
        process.env
            .ALTRIUM_EMAIL_LOGO_URL ||
        "";


    const APP_BASE_URL =
        process.env.APP_BASE_URL ||
        "http://localhost:3000";


    const safeCandidateName =
        escapeEmailHtml(
            candidateName ||
            "Candidate"
        );


    const safeJobTitle =
        escapeEmailHtml(
            jobTitle ||
            "Position"
        );


    const safeReference =
        escapeEmailHtml(
            applicationReference ||
            ""
        );


    const progressUrl =
        `${APP_BASE_URL}/application-progress.html?id=${applicationId}`;


    const safeProgressUrl =
        escapeEmailHtml(
            progressUrl
        );


    const emailInfo =
        await transporter.sendMail({

            from:
                `"Altrium" <${process.env.EMAIL_FROM}>`,


            to:
                candidateEmail,


            subject:
                `You've been shortlisted for ${jobTitle} | Altrium`,


            text: `

Hi ${candidateName},

Good news — your application for ${jobTitle} has been shortlisted.

Application reference:
${applicationReference}

Your application is moving forward in the Altrium recruitment process.

If you are selected for an interview session, the interview date, time, type, and meeting or location details will be shared with you by email and through your Altrium application progress page.

View your application progress:
${progressUrl}

Please keep an eye on your email and Altrium notifications for further updates.

Best regards,
Altrium Recruitment

            `.trim(),


            html: `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Application shortlisted
    </title>

</head>


<body
    style="
        margin:0;
        padding:0;
        background:#080808;
        font-family:Arial,Helvetica,sans-serif;
        color:#ffffff;
    "
>

    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"

        style="
            width:100%;
            background:#080808;
            padding:42px 18px;
        "
    >

        <tr>

            <td align="center">


                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"

                    style="
                        width:100%;
                        max-width:650px;
                        background:#101010;
                        border:1px solid rgba(255,255,255,0.08);
                        border-radius:24px;
                        overflow:hidden;
                    "
                >


                    <!-- HEADER -->

                    <tr>

                        <td
                            style="
                                padding:30px 36px;
                                border-bottom:1px solid rgba(255,255,255,0.07);
                            "
                        >

                            ${
                                ALTRIUM_LOGO_URL

                                    ? `

                                        <img
                                            src="${
                                                escapeEmailHtml(
                                                    ALTRIUM_LOGO_URL
                                                )
                                            }"
                                            alt="Altrium"
                                            style="
                                                display:block;
                                                height:34px;
                                                width:auto;
                                            "
                                        >

                                    `

                                    : `

                                        <div
                                            style="
                                                color:#ffffff;
                                                font-size:24px;
                                                font-weight:800;
                                            "
                                        >
                                            Altrium
                                        </div>

                                    `
                            }

                        </td>

                    </tr>



                    <!-- HERO -->

                    <tr>

                        <td
                            style="
                                padding:38px 36px 30px;
                            "
                        >

                            <div
                                style="
                                    color:#999999;
                                    font-size:11px;
                                    font-weight:800;
                                    letter-spacing:1.8px;
                                    text-transform:uppercase;
                                    margin-bottom:13px;
                                "
                            >
                                Application update
                            </div>


                            <h1
                                style="
                                    margin:0 0 18px;
                                    color:#ffffff;
                                    font-size:38px;
                                    line-height:1.12;
                                    font-weight:800;
                                "
                            >

                                You've been

                                <span
                                    style="
                                        color:#ff841f;
                                    "
                                >
                                    shortlisted.
                                </span>

                            </h1>


                            <p
                                style="
                                    margin:0;
                                    color:#cfcfcf;
                                    font-size:16px;
                                    line-height:1.8;
                                "
                            >

                                Hi

                                <strong
                                    style="
                                        color:#ffffff;
                                    "
                                >
                                    ${safeCandidateName}
                                </strong>,

                                <br><br>

                                Good news — your application for

                                <strong
                                    style="
                                        color:#ffffff;
                                    "
                                >
                                    ${safeJobTitle}
                                </strong>

                                has been shortlisted and is moving
                                forward in our recruitment process.

                            </p>

                        </td>

                    </tr>



                    <!-- APPLICATION REFERENCE -->

                    <tr>

                        <td
                            style="
                                padding:0 36px 26px;
                            "
                        >

                            <div
                                style="
                                    padding:22px 24px;
                                    background:rgba(255,132,31,0.06);
                                    border:1px solid rgba(255,132,31,0.22);
                                    border-radius:18px;
                                "
                            >

                                <div
                                    style="
                                        color:#8f8f8f;
                                        font-size:11px;
                                        font-weight:800;
                                        letter-spacing:1.4px;
                                        text-transform:uppercase;
                                        margin-bottom:8px;
                                    "
                                >
                                    Application reference
                                </div>


                                <div
                                    style="
                                        color:#ff9633;
                                        font-size:18px;
                                        font-weight:800;
                                    "
                                >
                                    ${safeReference}
                                </div>

                            </div>

                        </td>

                    </tr>



                    <!-- NEXT STEP -->

                    <tr>

                        <td
                            style="
                                padding:0 36px 26px;
                            "
                        >

                            <div
                                style="
                                    padding:20px 22px;
                                    background:#151515;
                                    border-left:3px solid #ff841f;
                                    border-radius:0 16px 16px 0;
                                "
                            >

                                <div
                                    style="
                                        color:#8f8f8f;
                                        font-size:11px;
                                        font-weight:800;
                                        letter-spacing:1.4px;
                                        text-transform:uppercase;
                                        margin-bottom:9px;
                                    "
                                >
                                    What happens next
                                </div>


                                <div
                                    style="
                                        color:#d4d4d4;
                                        font-size:14px;
                                        line-height:1.75;
                                    "
                                >

                                    If an interview is scheduled,
                                    Altrium will send you the date,
                                    time, interview type and meeting
                                    or location details.

                                </div>

                            </div>

                        </td>

                    </tr>



                    <!-- PROGRESS BUTTON -->

                    <tr>

                        <td
                            style="
                                padding:0 36px 34px;
                            "
                        >

                            <a
                                href="${safeProgressUrl}"

                                style="
                                    display:inline-block;
                                    padding:14px 24px;
                                    border-radius:999px;
                                    background:linear-gradient(
                                        90deg,
                                        #ff841f,
                                        #ffc14d
                                    );
                                    color:#111111;
                                    text-decoration:none;
                                    font-size:14px;
                                    font-weight:800;
                                "
                            >
                                View application progress
                            </a>

                        </td>

                    </tr>



                    <!-- FOOTER -->

                    <tr>

                        <td
                            style="
                                padding:25px 36px 32px;
                                border-top:1px solid rgba(255,255,255,0.07);
                            "
                        >

                            <p
                                style="
                                    margin:0;
                                    color:#818181;
                                    font-size:13px;
                                    line-height:1.7;
                                "
                            >

                                Please keep an eye on your email
                                and Altrium notifications for further updates.

                                <br><br>

                                Altrium Recruitment Team

                            </p>

                        </td>

                    </tr>


                </table>

            </td>

        </tr>

    </table>

</body>

</html>

            `

        });


    console.log(
        "Shortlisted email sent:",
        emailInfo.messageId,
        "to:",
        candidateEmail
    );


    return emailInfo;

}


/* =========================================================
   FORMAT INTERVIEW EMAIL DATE
   ========================================================= */

function formatInterviewEmailDate(
    value
) {

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Date unavailable";

    }


    return new Intl.DateTimeFormat(
        "en-GB",
        {

            weekday:
                "long",

            day:
                "2-digit",

            month:
                "long",

            year:
                "numeric",

            timeZone:
                "Asia/Colombo"

        }
    ).format(
        date
    );

}



/* =========================================================
   FORMAT INTERVIEW EMAIL TIME
   ========================================================= */

function formatInterviewEmailTime(
    value
) {

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Time unavailable";

    }


    return new Intl.DateTimeFormat(
        "en-US",
        {

            hour:
                "numeric",

            minute:
                "2-digit",

            hour12:
                true,

            timeZone:
                "Asia/Colombo"

        }
    ).format(
        date
    );

}



/* =========================================================
   SEND BRANDED INTERVIEW CONFIRMATION EMAIL
   ========================================================= */

async function sendInterviewConfirmationEmail({

    candidateName,
    candidateEmail,

    applicationId,
    applicationReference,

    jobTitle,

    interviewRound,
    interviewType,

    scheduledStart,
    scheduledEnd,

    location,
    meetingUrl,

    instructions

}) {

    const ALTRIUM_LOGO_URL =
        process.env
            .ALTRIUM_EMAIL_LOGO_URL ||
        "";


    const APP_BASE_URL =
        process.env.APP_BASE_URL ||
        "http://localhost:3000";


    const safeCandidateName =
        escapeEmailHtml(
            candidateName ||
            "Candidate"
        );


    const safeJobTitle =
        escapeEmailHtml(
            jobTitle ||
            "Position"
        );


    const safeReference =
        escapeEmailHtml(
            applicationReference ||
            ""
        );


    const safeLocation =
        escapeEmailHtml(
            location ||
            ""
        );


    const safeInstructions =
        escapeEmailHtml(
            instructions ||
            ""
        );


    const safeMeetingUrl =
        escapeEmailHtml(
            meetingUrl ||
            ""
        );


    const progressUrl =
        `${APP_BASE_URL}/application-progress.html?id=${applicationId}`;


    const safeProgressUrl =
        escapeEmailHtml(
            progressUrl
        );


    const interviewDate =
        formatInterviewEmailDate(
            scheduledStart
        );


    const interviewStartTime =
        formatInterviewEmailTime(
            scheduledStart
        );


    const interviewEndTime =
        formatInterviewEmailTime(
            scheduledEnd
        );


    const typeLabel =
        interviewType ===
        "online"
            ? "Google Meet"

            : interviewType ===
                "onsite"
                ? "Onsite interview"

                : "Phone interview";



    /* =====================================================
       GOOGLE MEET / LOCATION SECTION
       ===================================================== */

    const meetingSection =

        interviewType ===
            "online" &&
        meetingUrl

            ? `

                <tr>

                    <td
                        style="
                            padding:
                                0
                                36px
                                26px;
                        "
                    >

                        <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            style="
                                background:
                                    #151515;

                                border:
                                    1px solid
                                    rgba(
                                        255,
                                        132,
                                        31,
                                        0.28
                                    );

                                border-radius:
                                    18px;
                            "
                        >

                            <tr>

                                <td
                                    style="
                                        padding:
                                            22px
                                            24px;
                                    "
                                >

                                    <div
                                        style="
                                            color:
                                                #ff9a35;

                                            font-size:
                                                11px;

                                            font-weight:
                                                800;

                                            letter-spacing:
                                                1.5px;

                                            text-transform:
                                                uppercase;

                                            margin-bottom:
                                                8px;
                                        "
                                    >
                                        Google Meet
                                    </div>


                                    <div
                                        style="
                                            color:
                                                #d1d1d1;

                                            font-size:
                                                14px;

                                            line-height:
                                                1.7;

                                            margin-bottom:
                                                16px;
                                        "
                                    >
                                        This is your personal interview meeting link.
                                        Join at the scheduled time using the button below.
                                    </div>


                                    <a
                                        href="${safeMeetingUrl}"

                                        style="
                                            display:
                                                inline-block;

                                            padding:
                                                14px
                                                24px;

                                            border-radius:
                                                999px;

                                            background:
                                                linear-gradient(
                                                    90deg,
                                                    #ff841f,
                                                    #ffc14d
                                                );

                                            color:
                                                #111111;

                                            text-decoration:
                                                none;

                                            font-size:
                                                14px;

                                            font-weight:
                                                800;
                                        "
                                    >
                                        Join Google Meet
                                    </a>

                                </td>

                            </tr>

                        </table>

                    </td>

                </tr>

            `

            : interviewType ===
                "onsite"

                ? `

                    <tr>

                        <td
                            style="
                                padding:
                                    0
                                    36px
                                    26px;
                            "
                        >

                            <div
                                style="
                                    padding:
                                        20px
                                        22px;

                                    background:
                                        #151515;

                                    border:
                                        1px solid
                                        rgba(
                                            255,
                                            255,
                                            255,
                                            0.08
                                        );

                                    border-radius:
                                        16px;
                                "
                            >

                                <div
                                    style="
                                        color:
                                            #8f8f8f;

                                        font-size:
                                            11px;

                                        font-weight:
                                            800;

                                        letter-spacing:
                                            1.4px;

                                        text-transform:
                                            uppercase;

                                        margin-bottom:
                                            8px;
                                    "
                                >
                                    Interview location
                                </div>


                                <div
                                    style="
                                        color:
                                            #ffffff;

                                        font-size:
                                            16px;

                                        font-weight:
                                            700;
                                    "
                                >
                                    ${
                                        safeLocation ||
                                        "Location will be shared separately"
                                    }
                                </div>

                            </div>

                        </td>

                    </tr>

                `

                : "";



    /* =====================================================
       INSTRUCTIONS SECTION
       ===================================================== */

    const instructionsSection =

        instructions

            ? `

                <tr>

                    <td
                        style="
                            padding:
                                0
                                36px
                                26px;
                        "
                    >

                        <div
                            style="
                                padding:
                                    20px
                                    22px;

                                background:
                                    #151515;

                                border-left:
                                    3px solid
                                    #ff841f;

                                border-radius:
                                    0
                                    16px
                                    16px
                                    0;
                            "
                        >

                            <div
                                style="
                                    color:
                                        #8f8f8f;

                                    font-size:
                                        11px;

                                    font-weight:
                                        800;

                                    letter-spacing:
                                        1.4px;

                                    text-transform:
                                        uppercase;

                                    margin-bottom:
                                        9px;
                                "
                            >
                                Instructions
                            </div>


                            <div
                                style="
                                    color:
                                        #d4d4d4;

                                    font-size:
                                        14px;

                                    line-height:
                                        1.75;
                                "
                            >
                                ${safeInstructions}
                            </div>

                        </div>

                    </td>

                </tr>

            `

            : "";



    /* =====================================================
       SEND EMAIL
       ===================================================== */

    const emailInfo =
        await transporter.sendMail({

            from:
                `"Altrium" <${process.env.EMAIL_FROM}>`,

            to:
                candidateEmail,

            subject:
                `Your interview for ${jobTitle} is confirmed | Altrium`,


            text: `

Hi ${candidateName},

Your interview for ${jobTitle} has been confirmed.

Application reference:
${applicationReference}

Interview round:
Round ${interviewRound}

Date:
${interviewDate}

Time:
${interviewStartTime} - ${interviewEndTime}

Interview type:
${typeLabel}

${
    interviewType ===
        "online" &&
    meetingUrl

        ? `Google Meet: ${meetingUrl}`

        : ""
}

${
    interviewType ===
        "onsite" &&
    location

        ? `Location: ${location}`

        : ""
}

${
    instructions
        ? `Instructions: ${instructions}`
        : ""
}

View your application progress:

${progressUrl}

Best regards,
Altrium Recruitment

            `.trim(),


            html: `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Interview confirmed
    </title>

</head>


<body
    style="
        margin:
            0;

        padding:
            0;

        background:
            #080808;

        font-family:
            Arial,
            Helvetica,
            sans-serif;

        color:
            #ffffff;
    "
>

    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"

        style="
            width:
                100%;

            background:
                #080808;

            padding:
                42px
                18px;
        "
    >

        <tr>

            <td
                align="center"
            >

                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"

                    style="
                        width:
                            100%;

                        max-width:
                            650px;

                        background:
                            #101010;

                        border:
                            1px solid
                            rgba(
                                255,
                                255,
                                255,
                                0.08
                            );

                        border-radius:
                            24px;

                        overflow:
                            hidden;
                    "
                >


                    <!-- HEADER -->

                    <tr>

                        <td
                            style="
                                padding:
                                    30px
                                    36px;

                                border-bottom:
                                    1px solid
                                    rgba(
                                        255,
                                        255,
                                        255,
                                        0.07
                                    );
                            "
                        >

                            ${
                                ALTRIUM_LOGO_URL

                                    ? `

                                        <img
                                            src="${
                                                escapeEmailHtml(
                                                    ALTRIUM_LOGO_URL
                                                )
                                            }"

                                            alt="Altrium"

                                            style="
                                                display:
                                                    block;

                                                height:
                                                    34px;

                                                width:
                                                    auto;
                                            "
                                        >

                                    `

                                    : `

                                        <div
                                            style="
                                                color:
                                                    #ffffff;

                                                font-size:
                                                    24px;

                                                font-weight:
                                                    800;
                                            "
                                        >
                                            Altrium
                                        </div>

                                    `
                            }

                        </td>

                    </tr>



                    <!-- HERO -->

                    <tr>

                        <td
                            style="
                                padding:
                                    38px
                                    36px
                                    30px;
                            "
                        >

                            <div
                                style="
                                    color:
                                        #999999;

                                    font-size:
                                        11px;

                                    font-weight:
                                        800;

                                    letter-spacing:
                                        1.8px;

                                    text-transform:
                                        uppercase;

                                    margin-bottom:
                                        13px;
                                "
                            >
                                Interview scheduled
                            </div>


                            <h1
                                style="
                                    margin:
                                        0
                                        0
                                        18px;

                                    color:
                                        #ffffff;

                                    font-size:
                                        38px;

                                    line-height:
                                        1.12;

                                    font-weight:
                                        800;
                                "
                            >

                                Your interview is

                                <span
                                    style="
                                        color:
                                            #ff841f;
                                    "
                                >
                                    confirmed.
                                </span>

                            </h1>


                            <p
                                style="
                                    margin:
                                        0;

                                    color:
                                        #cfcfcf;

                                    font-size:
                                        16px;

                                    line-height:
                                        1.8;
                                "
                            >

                                Hi

                                <strong
                                    style="
                                        color:
                                            #ffffff;
                                    "
                                >
                                    ${safeCandidateName}
                                </strong>,

                                <br><br>

                                Your interview for

                                <strong
                                    style="
                                        color:
                                            #ffffff;
                                    "
                                >
                                    ${safeJobTitle}
                                </strong>

                                has officially been scheduled.

                            </p>

                        </td>

                    </tr>



                    <!-- DETAILS -->

                    <tr>

                        <td
                            style="
                                padding:
                                    0
                                    36px
                                    26px;
                            "
                        >

                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"

                                style="
                                    background:
                                        rgba(
                                            255,
                                            132,
                                            31,
                                            0.07
                                        );

                                    border:
                                        1px solid
                                        rgba(
                                            255,
                                            132,
                                            31,
                                            0.22
                                        );

                                    border-radius:
                                        18px;
                                "
                            >

                                <tr>

                                    <td
                                        style="
                                            padding:
                                                24px;
                                        "
                                    >

                                        <div
                                            style="
                                                color:
                                                    #ff9b3a;

                                                font-size:
                                                    11px;

                                                font-weight:
                                                    800;

                                                letter-spacing:
                                                    1.5px;

                                                text-transform:
                                                    uppercase;

                                                margin-bottom:
                                                    20px;
                                            "
                                        >
                                            Interview details
                                        </div>


                                        <table
                                            role="presentation"
                                            width="100%"
                                            cellspacing="0"
                                            cellpadding="0"
                                        >

                                            <tr>

                                                <td
                                                    style="
                                                        width:
                                                            50%;

                                                        vertical-align:
                                                            top;

                                                        padding:
                                                            0
                                                            12px
                                                            18px
                                                            0;
                                                    "
                                                >

                                                    <div
                                                        style="
                                                            color:
                                                                #858585;

                                                            font-size:
                                                                11px;

                                                            text-transform:
                                                                uppercase;

                                                            margin-bottom:
                                                                5px;
                                                        "
                                                    >
                                                        Date
                                                    </div>


                                                    <div
                                                        style="
                                                            color:
                                                                #ffffff;

                                                            font-size:
                                                                16px;

                                                            font-weight:
                                                                700;
                                                        "
                                                    >
                                                        ${interviewDate}
                                                    </div>

                                                </td>


                                                <td
                                                    style="
                                                        width:
                                                            50%;

                                                        vertical-align:
                                                            top;

                                                        padding:
                                                            0
                                                            0
                                                            18px
                                                            12px;
                                                    "
                                                >

                                                    <div
                                                        style="
                                                            color:
                                                                #858585;

                                                            font-size:
                                                                11px;

                                                            text-transform:
                                                                uppercase;

                                                            margin-bottom:
                                                                5px;
                                                        "
                                                    >
                                                        Time
                                                    </div>


                                                    <div
                                                        style="
                                                            color:
                                                                #ffffff;

                                                            font-size:
                                                                17px;

                                                            font-weight:
                                                                800;

                                                            white-space:
                                                                nowrap;
                                                        "
                                                    >
                                                        ${interviewStartTime}
                                                        –
                                                        ${interviewEndTime}
                                                    </div>

                                                </td>

                                            </tr>


                                            <tr>

                                                <td
                                                    style="
                                                        width:
                                                            50%;

                                                        vertical-align:
                                                            top;

                                                        padding-right:
                                                            12px;
                                                    "
                                                >

                                                    <div
                                                        style="
                                                            color:
                                                                #858585;

                                                            font-size:
                                                                11px;

                                                            text-transform:
                                                                uppercase;

                                                            margin-bottom:
                                                                5px;
                                                        "
                                                    >
                                                        Interview type
                                                    </div>


                                                    <div
                                                        style="
                                                            color:
                                                                #ffffff;

                                                            font-size:
                                                                16px;

                                                            font-weight:
                                                                700;
                                                        "
                                                    >
                                                        ${typeLabel}
                                                    </div>

                                                </td>


                                                <td
                                                    style="
                                                        width:
                                                            50%;

                                                        vertical-align:
                                                            top;

                                                        padding-left:
                                                            12px;
                                                    "
                                                >

                                                    <div
                                                        style="
                                                            color:
                                                                #858585;

                                                            font-size:
                                                                11px;

                                                            text-transform:
                                                                uppercase;

                                                            margin-bottom:
                                                                5px;
                                                        "
                                                    >
                                                        Interview round
                                                    </div>


                                                    <div
                                                        style="
                                                            color:
                                                                #ffffff;

                                                            font-size:
                                                                16px;

                                                            font-weight:
                                                                700;
                                                        "
                                                    >
                                                        Round ${interviewRound}
                                                    </div>

                                                </td>

                                            </tr>

                                        </table>

                                    </td>

                                </tr>

                            </table>

                        </td>

                    </tr>


                    ${meetingSection}


                    ${instructionsSection}



                    <!-- PROGRESS -->

                    <tr>

                        <td
                            style="
                                padding:
                                    0
                                    36px
                                    34px;
                            "
                        >

                            <a
                                href="${safeProgressUrl}"

                                style="
                                    display:
                                        inline-block;

                                    padding:
                                        14px
                                        24px;

                                    border-radius:
                                        999px;

                                    background:
                                        #191919;

                                    border:
                                        1px solid
                                        rgba(
                                            255,
                                            255,
                                            255,
                                            0.10
                                        );

                                    color:
                                        #ffffff;

                                    text-decoration:
                                        none;

                                    font-size:
                                        14px;

                                    font-weight:
                                        700;
                                "
                            >
                                View application progress
                            </a>

                        </td>

                    </tr>



                    <!-- FOOTER -->

                    <tr>

                        <td
                            style="
                                padding:
                                    25px
                                    36px
                                    32px;

                                border-top:
                                    1px solid
                                    rgba(
                                        255,
                                        255,
                                        255,
                                        0.07
                                    );
                            "
                        >

                            <div
                                style="
                                    color:
                                        #777777;

                                    font-size:
                                        11px;

                                    letter-spacing:
                                        1px;

                                    text-transform:
                                        uppercase;

                                    margin-bottom:
                                        7px;
                                "
                            >
                                Application reference
                            </div>


                            <div
                                style="
                                    color:
                                        #ff9633;

                                    font-size:
                                        16px;

                                    font-weight:
                                        800;

                                    margin-bottom:
                                        20px;
                                "
                            >
                                ${safeReference}
                            </div>


                            <p
                                style="
                                    margin:
                                        0;

                                    color:
                                        #818181;

                                    font-size:
                                        13px;

                                    line-height:
                                        1.7;
                                "
                            >

                                Please arrive or join on time
                                and follow the interview instructions above.

                                <br><br>

                                Altrium Recruitment Team

                            </p>

                        </td>

                    </tr>


                </table>

            </td>

        </tr>

    </table>

</body>

</html>

            `

        });


    console.log(
        "Interview confirmation email sent:",
        emailInfo.messageId,
        "to:",
        candidateEmail
    );


    return emailInfo;

}



/* =========================================================
   DELETE GOOGLE CALENDAR EVENT QUIETLY
   ========================================================= */

async function deleteGoogleCalendarEventQuietly(
    calendar,
    calendarId,
    eventId
) {

    if (
        !calendar ||
        !calendarId ||
        !eventId
    ) {

        return;

    }


    try {

        await calendar.events.delete({

            calendarId,

            eventId,

            sendUpdates:
                "none"

        });

    }

    catch (error) {

        console.error(
            "Google Calendar cleanup error:",
            eventId,
            error.response?.data ||
            error.message
        );

    }

}



/* =========================================================
   CREATE GOOGLE INTERVIEW EVENT
   ========================================================= */

async function createGoogleInterviewEvent({

    calendar,
    calendarId,
    session,
    slot

}) {

    let createdEventId =
        null;


    try {

        const candidateName =
            `${slot.first_name || ""} ${slot.last_name || ""}`
                .trim() ||
            "Candidate";


        const online =
            session.interview_type ===
            "online";


        const descriptionParts = [

            "Altrium Recruitment Interview",

            `Position: ${session.job_title}`,

            `Candidate: ${candidateName}`,

            `Application: ${slot.application_reference}`,

            `Interview round: ${session.interview_round}`

        ];


        if (
            session.instructions
        ) {

            descriptionParts.push(

                "",

                "Candidate instructions:",

                session.instructions

            );

        }



        const requestBody = {

            summary:
                `${session.job_title} Interview - ${candidateName}`,


            description:
                descriptionParts.join(
                    "\n"
                ),


            start: {

                dateTime:
                    new Date(
                        slot.scheduled_start
                    )
                    .toISOString(),

                timeZone:
                    session.timezone ||
                    "Asia/Colombo"

            },


            end: {

                dateTime:
                    new Date(
                        slot.scheduled_end
                    )
                    .toISOString(),

                timeZone:
                    session.timezone ||
                    "Asia/Colombo"

            },


            reminders: {

                useDefault:
                    true

            },


            extendedProperties: {

                private: {

                    altriumSessionId:
                        String(
                            session.id
                        ),

                    altriumSlotId:
                        String(
                            slot.id
                        ),

                    altriumApplicationId:
                        String(
                            slot.application_id
                        )

                }

            }

        };



        if (
            session.interview_type ===
                "onsite" &&
            session.location
        ) {

            requestBody.location =
                session.location;

        }



        if (
            online
        ) {

            requestBody.conferenceData = {

                createRequest: {

                    requestId:
                        crypto.randomUUID(),

                    conferenceSolutionKey: {

                        type:
                            "hangoutsMeet"

                    }

                }

            };

        }



        const insertOptions = {

            calendarId,

            sendUpdates:
                "none",

            requestBody

        };


        if (
            online
        ) {

            insertOptions.conferenceDataVersion =
                1;

        }



        const createResponse =
            await calendar.events.insert(
                insertOptions
            );


        createdEventId =
            createResponse.data.id;


        let event =
            createResponse.data;


        let meetingUrl =
            event.hangoutLink ||

            event.conferenceData
                ?.entryPoints
                ?.find(
                    entry =>
                        entry.entryPointType ===
                        "video"
                )
                ?.uri ||

            null;



        /* =====================================================
           WAIT FOR GOOGLE MEET LINK
           ===================================================== */

        if (
            online &&
            !meetingUrl
        ) {

            for (
                let attempt = 0;

                attempt < 10 &&
                !meetingUrl;

                attempt += 1
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            700
                        )
                );


                const eventResponse =
                    await calendar.events.get({

                        calendarId,

                        eventId:
                            createdEventId

                    });


                event =
                    eventResponse.data;


                meetingUrl =
                    event.hangoutLink ||

                    event.conferenceData
                        ?.entryPoints
                        ?.find(
                            entry =>
                                entry.entryPointType ===
                                "video"
                        )
                        ?.uri ||

                    null;

            }

        }



        if (
            online &&
            !meetingUrl
        ) {

            throw new Error(
                "Google created the Calendar event but did not return a Meet link."
            );

        }



        return {

            eventId:
                createdEventId,

            calendarId,

            meetingUrl,

            calendarUrl:
                event.htmlLink ||
                null

        };

    }

    catch (error) {

        if (
            createdEventId
        ) {

            await deleteGoogleCalendarEventQuietly(

                calendar,

                calendarId,

                createdEventId

            );

        }


        throw error;

    }

}



/* =========================================================
   SEND GOOGLE CALENDAR INVITATION
   WITH RATE-LIMIT RETRY
   ========================================================= */

async function inviteCandidateToGoogleInterview({

    calendar,
    calendarId,
    eventId,
    candidateEmail

}) {

    if (
        !candidateEmail
    ) {

        return;

    }


    const maxAttempts =
        5;



    for (
        let attempt = 0;

        attempt < maxAttempts;

        attempt += 1
    ) {

        try {

            await calendar.events.patch({

                calendarId,

                eventId,

                sendUpdates:
                    "all",

                requestBody: {

                    attendees: [

                        {

                            email:
                                candidateEmail

                        }

                    ]

                }

            });


            return;

        }

        catch (error) {

            const status =
                error.response?.status ||
                error.code;


            const reason =
                error.response?.data
                    ?.error
                    ?.errors
                    ?.[0]
                    ?.reason;


            const message =
                error.response?.data
                    ?.error
                    ?.message ||
                "";


            const rateLimited =

                status ===
                    429 ||

                reason ===
                    "rateLimitExceeded" ||

                reason ===
                    "userRateLimitExceeded" ||

                (
                    status ===
                        403 &&

                    /rate limit/i.test(
                        message
                    )
                );


            if (
                !rateLimited ||
                attempt ===
                    maxAttempts - 1
            ) {

                throw error;

            }


            const delay =

                Math.pow(
                    2,
                    attempt
                ) *
                1000 +

                Math.floor(
                    Math.random() *
                    750
                );


            console.log(
                `Google Calendar rate limited. Retrying invitation in ${delay}ms...`
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        delay
                    )
            );

        }

    }

}


// ===============================================================================
// ROUTES ========================================================================

/* =========================================================
   ADMIN - CONNECT GOOGLE CALENDAR
   ========================================================= */

app.get(
    "/api/google/calendar/connect",
    requirePermission(
        "system.settings.manage"
    ),
    (req, res) => {

        try {

            const authorizationUrl =
                googleOAuthClient.generateAuthUrl({

                    access_type:
                        "offline",

                    prompt:
                        "consent",

                    scope:
                        GOOGLE_CALENDAR_SCOPES

                });


            return res.redirect(
                authorizationUrl
            );

        }

        catch (error) {

            console.error(
                "Google Calendar connect error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to start Google Calendar connection."

            });

        }

    }
);

/* =========================================================
   GOOGLE CALENDAR OAUTH CALLBACK
   ========================================================= */

app.get(
    "/api/google/calendar/callback",
    requirePermission(
        "system.settings.manage"
    ),
    async (req, res) => {

        try {

            const code =
                req.query.code;


            if (
                !code
            ) {

                return res.status(400).send(
                    "Google authorization code was not provided."
                );

            }


            const {
                tokens
            } =
                await googleOAuthClient
                    .getToken(
                        code
                    );


            googleOAuthClient
                .setCredentials(
                    tokens
                );


            /* =========================================================
            PERSIST GOOGLE REFRESH TOKEN
            ========================================================= */

            const existingConnectionResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        encrypted_refresh_token

                    FROM google_calendar_connections

                    ORDER BY id ASC

                    LIMIT 1
                    `
                );


            const existingConnection =
                existingConnectionResult
                    .rows[0] ||
                null;


            if (
                tokens.refresh_token
            ) {

                const encryptedRefreshToken =
                    encryptGoogleRefreshToken(
                        tokens.refresh_token
                    );


                if (
                    existingConnection
                ) {

                    await pool.query(
                        `
                        UPDATE google_calendar_connections

                        SET
                            connected_by = $1,
                            encrypted_refresh_token = $2,
                            google_calendar_id = 'primary',
                            updated_at = NOW()

                        WHERE id = $3
                        `,
                        [
                            req.session.userId,
                            encryptedRefreshToken,
                            existingConnection.id
                        ]
                    );

                }

                else {

                    await pool.query(
                        `
                        INSERT INTO google_calendar_connections (

                            connected_by,
                            encrypted_refresh_token,
                            google_calendar_id

                        )

                        VALUES (
                            $1,
                            $2,
                            'primary'
                        )
                        `,
                        [
                            req.session.userId,
                            encryptedRefreshToken
                        ]
                    );

                }

            }

            else {

                /*
                    Google may occasionally omit a new refresh token
                    if the account was already authorized.

                    That is okay only if Altrium already has one saved.
                */

                if (
                    !existingConnection
                ) {

                    throw new Error(
                        "Google did not provide a refresh token. Reconnect the Google Calendar account."
                    );

                }

            }


            console.log(
                "Google Calendar refresh token stored securely."
            );


            const calendar =
                google.calendar({

                    version:
                        "v3",

                    auth:
                        googleOAuthClient

                });


            /*
                Make one harmless Calendar request
                to prove authorization works.
            */

            await calendar.events.list({

                calendarId:
                    "primary",

                maxResults:
                    1,

                singleEvents:
                    true

            });


            console.log(
                "Google Calendar connected successfully."
            );


            return res.send(`
                <!DOCTYPE html>

                <html>

                    <head>

                        <title>
                            Altrium Google Calendar
                        </title>

                    </head>

                    <body
                        style="
                            background:#080808;
                            color:#ffffff;
                            font-family:Arial,sans-serif;
                            padding:50px;
                        "
                    >

                        <h1>
                            Google Calendar connected.
                        </h1>

                        <p>
                            Altrium successfully connected to the recruitment calendar.
                        </p>

                        <a
                            href="/admin/admin-dashboard.html"
                            style="
                                color:#ff841f;
                                font-weight:700;
                            "
                        >
                            Return to Altrium
                        </a>

                    </body>

                </html>
            `);

        }

        catch (error) {

            console.error(
                "Google Calendar callback error:",
                error
            );


            return res.status(500).send(
                "Unable to connect Google Calendar."
            );

        }

    }
);


/* =========================================================
   PUBLIC JOB VACANCIES
   ========================================================= */

app.get("/api/jobs", async (req, res) => {

    try {

        const result = await pool.query(
            `
            SELECT
                id,
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
                required_skills,
                number_of_openings,
                status,
                created_at

            FROM jobs

            WHERE status IN ('active', 'closed')

            ORDER BY created_at DESC
            `
        );


        res.json({
            success: true,
            jobs: result.rows
        });

    }

    catch (error) {

        console.error(
            "Load public jobs error:",
            error
        );


        res.status(500).json({
            success: false,
            message:
                "Unable to load job vacancies."
        });

    }

});


/* =========================================================
   HOMEPAGE - PUBLIC RECRUITMENT STATS
   ========================================================= */

app.get(
    "/api/home/stats",
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS active_roles,

                        COUNT(
                            DISTINCT department
                        )::INT
                            AS departments,

                        COALESCE(
                            SUM(
                                number_of_openings
                            ),
                            0
                        )::INT
                            AS open_positions

                    FROM jobs

                    WHERE
                        status = 'active'
                    `
                );


            const stats =
                result.rows[0];


            return res.json({

                success:
                    true,

                stats: {

                    activeRoles:
                        Number(
                            stats.active_roles
                        ) ||
                        0,

                    departments:
                        Number(
                            stats.departments
                        ) ||
                        0,

                    openPositions:
                        Number(
                            stats.open_positions
                        ) ||
                        0

                }

            });

        }

        catch (error) {

            console.error(
                "Homepage stats error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load recruitment stats."

            });

        }

    }
);


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



const PORT =
    process.env.PORT ||
    3000;

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


/* =========================================================
   SEND BRANDED EMAIL VERIFICATION OTP
   ========================================================= */

const ALTRIUM_LOGO_URL =
    process.env.ALTRIUM_EMAIL_LOGO_URL;


const safeVerificationFirstName =
    escapeEmailHtml(
        firstName.trim()
    );


await transporter.sendMail({

    from:
        `"Altrium" <${process.env.EMAIL_FROM}>`,

    to:
        cleanEmail,

    subject:
        "Your Altrium verification code",

    text: `
Hi ${firstName.trim()},

Welcome to Altrium.

Use the verification code below to complete your account:

${verificationCode}

This code expires in 10 minutes.

For your security, do not share this verification code with anyone.

If you did not create an Altrium account, you can safely ignore this email.

Altrium Recruitment Team
    `.trim(),

    html: `
<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Verify your Altrium account
    </title>

</head>


<body
    style="
        margin:0;
        padding:0;
        background:#080808;
        font-family:Arial,Helvetica,sans-serif;
        color:#ffffff;
    "
>

    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"

        style="
            width:100%;
            background:#080808;
            padding:42px 18px;
        "
    >

        <tr>

            <td align="center">

                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"

                    style="
                        width:100%;
                        max-width:640px;
                        background:#101010;
                        border:1px solid rgba(255,255,255,0.08);
                        border-radius:24px;
                        overflow:hidden;
                    "
                >


                    <!-- =====================================
                         HEADER
                         ===================================== -->

                    <tr>

                        <td
                            style="
                                padding:30px 36px;
                                border-bottom:1px solid rgba(255,255,255,0.07);
                            "
                        >

                            ${
                                ALTRIUM_LOGO_URL
                                    ? `

                                        <img
                                            src="${escapeEmailHtml(
                                                ALTRIUM_LOGO_URL
                                            )}"
                                            alt="Altrium"
                                            style="
                                                display:block;
                                                height:34px;
                                                width:auto;
                                            "
                                        >

                                    `
                                    : `

                                        <div
                                            style="
                                                color:#ffffff;
                                                font-size:24px;
                                                font-weight:800;
                                            "
                                        >
                                            Altrium
                                        </div>

                                    `
                            }

                        </td>

                    </tr>



                    <!-- =====================================
                         HERO
                         ===================================== -->

                    <tr>

                        <td
                            style="
                                padding:38px 36px 28px;
                            "
                        >

                            <div
                                style="
                                    color:#999999;
                                    font-size:11px;
                                    font-weight:800;
                                    letter-spacing:1.8px;
                                    text-transform:uppercase;
                                    margin-bottom:14px;
                                "
                            >
                                Email verification
                            </div>


                            <h1
                                style="
                                    margin:0 0 18px;
                                    color:#ffffff;
                                    font-size:38px;
                                    line-height:1.12;
                                    font-weight:800;
                                "
                            >
                                Verify your

                                <span
                                    style="
                                        color:#ff841f;
                                    "
                                >
                                    email.
                                </span>

                            </h1>


                            <p
                                style="
                                    margin:0;
                                    color:#cfcfcf;
                                    font-size:16px;
                                    line-height:1.8;
                                "
                            >

                                Hi

                                <strong
                                    style="
                                        color:#ffffff;
                                    "
                                >
                                    ${safeVerificationFirstName}
                                </strong>,

                                <br><br>

                                Welcome to Altrium.

                                Use the verification code below
                                to complete your account setup.

                            </p>

                        </td>

                    </tr>



                    <!-- =====================================
                         OTP CARD
                         ===================================== -->

                    <tr>

                        <td
                            style="
                                padding:0 36px 26px;
                            "
                        >

                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"

                                style="
                                    width:100%;
                                    background:linear-gradient(
                                        145deg,
                                        rgba(255,132,31,0.11),
                                        rgba(255,132,31,0.035)
                                    );
                                    border:1px solid rgba(255,132,31,0.25);
                                    border-radius:18px;
                                "
                            >

                                <tr>

                                    <td
                                        align="center"

                                        style="
                                            padding:30px 24px;
                                        "
                                    >

                                        <div
                                            style="
                                                color:#ff9a35;
                                                font-size:11px;
                                                font-weight:800;
                                                letter-spacing:1.6px;
                                                text-transform:uppercase;
                                                margin-bottom:16px;
                                            "
                                        >
                                            Your verification code
                                        </div>


                                        <div
                                            style="
                                                color:#ffffff;
                                                font-size:38px;
                                                line-height:1;
                                                font-weight:800;
                                                letter-spacing:10px;
                                                white-space:nowrap;
                                                margin-left:10px;
                                            "
                                        >
                                            ${verificationCode}
                                        </div>


                                        <div
                                            style="
                                                margin-top:18px;
                                                color:#a7a7a7;
                                                font-size:13px;
                                                line-height:1.6;
                                            "
                                        >
                                            This code expires in

                                            <strong
                                                style="
                                                    color:#ffffff;
                                                "
                                            >
                                                10 minutes
                                            </strong>.
                                        </div>

                                    </td>

                                </tr>

                            </table>

                        </td>

                    </tr>



                    <!-- =====================================
                         SECURITY NOTICE
                         ===================================== -->

                    <tr>

                        <td
                            style="
                                padding:0 36px 26px;
                            "
                        >

                            <div
                                style="
                                    padding:20px 22px;
                                    background:#151515;
                                    border-left:3px solid #ff841f;
                                    border-radius:0 16px 16px 0;
                                "
                            >

                                <div
                                    style="
                                        color:#8f8f8f;
                                        font-size:11px;
                                        font-weight:800;
                                        letter-spacing:1.4px;
                                        text-transform:uppercase;
                                        margin-bottom:9px;
                                    "
                                >
                                    Security reminder
                                </div>


                                <div
                                    style="
                                        color:#d1d1d1;
                                        font-size:14px;
                                        line-height:1.75;
                                    "
                                >
                                    Never share this verification code
                                    with anyone.

                                    Altrium will never ask you to send
                                    your verification code by email,
                                    message, or phone.
                                </div>

                            </div>

                        </td>

                    </tr>



                    <!-- =====================================
                         NEXT STEP
                         ===================================== -->

                    <tr>

                        <td
                            style="
                                padding:0 36px 32px;
                            "
                        >

                            <table
                                role="presentation"
                                width="100%"
                                cellspacing="0"
                                cellpadding="0"

                                style="
                                    background:#151515;
                                    border:1px solid rgba(255,255,255,0.07);
                                    border-radius:16px;
                                "
                            >

                                <tr>

                                    <td
                                        style="
                                            padding:20px 22px;
                                        "
                                    >

                                        <div
                                            style="
                                                color:#8f8f8f;
                                                font-size:11px;
                                                font-weight:800;
                                                letter-spacing:1.4px;
                                                text-transform:uppercase;
                                                margin-bottom:8px;
                                            "
                                        >
                                            Next step
                                        </div>


                                        <div
                                            style="
                                                color:#d7d7d7;
                                                font-size:14px;
                                                line-height:1.7;
                                            "
                                        >
                                            Return to the Altrium verification
                                            window and enter the six-digit code
                                            shown above.
                                        </div>

                                    </td>

                                </tr>

                            </table>

                        </td>

                    </tr>



                    <!-- =====================================
                         FOOTER
                         ===================================== -->

                    <tr>

                        <td
                            style="
                                padding:25px 36px 32px;
                                border-top:1px solid rgba(255,255,255,0.07);
                            "
                        >

                            <p
                                style="
                                    margin:0 0 12px;
                                    color:#999999;
                                    font-size:13px;
                                    line-height:1.7;
                                "
                            >
                                If you did not create an Altrium account,
                                you can safely ignore this email.
                            </p>


                            <p
                                style="
                                    margin:0;
                                    color:#707070;
                                    font-size:13px;
                                    line-height:1.7;
                                "
                            >
                                Altrium Recruitment Team
                            </p>

                        </td>

                    </tr>


                </table>

            </td>

        </tr>

    </table>

</body>

</html>
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


/* =========================================================
   HOMEPAGE - ROLE AWARE DASHBOARD
   ========================================================= */

app.get(
    "/api/home/dashboard",
    async (req, res) => {

        try {

            /* =================================================
               NOT LOGGED IN

               Homepage keeps its normal preview card.
               ================================================= */

            if (
                !req.session.userId
            ) {

                const vacancyResult =
                    await pool.query(
                        `
                        SELECT

                            COUNT(*)::INT
                                AS count

                        FROM jobs

                        WHERE
                            status = 'active'
                        `
                    );


                return res.json({

                    success:
                        true,

                    loggedIn:
                        false,

                    mode:
                        "guest",

                    guest: {

                        activeVacancies:
                            Number(
                                vacancyResult
                                    .rows[0]
                                    .count
                            ) ||
                            0

                    }

                });

            }



            /* =================================================
               LOAD CURRENT USER
               ================================================= */

            const userResult =
                await pool.query(
                    `
                    SELECT

                        id,
                        first_name,
                        last_name,
                        role

                    FROM users

                    WHERE
                        id = $1

                    LIMIT 1
                    `,
                    [
                        req.session.userId
                    ]
                );


            if (
                userResult.rows.length ===
                0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "User account not found."

                });

            }


            const user =
                userResult.rows[0];



            /* =================================================
               CANDIDATE DASHBOARD
               ================================================= */

            if (
                user.role ===
                "candidate"
            ) {

                const [

                    applicationsResult,

                    savedJobsResult,

                    latestApplicationResult

                ] =
                    await Promise.all([


                        /* Total applications */

                        pool.query(
                            `
                            SELECT

                                COUNT(*)::INT
                                    AS count

                            FROM applications

                            WHERE
                                candidate_id = $1
                            `,
                            [
                                user.id
                            ]
                        ),



                        /* Saved jobs */

                        pool.query(
                            `
                            SELECT

                                COUNT(*)::INT
                                    AS count

                            FROM saved_jobs

                            WHERE
                                candidate_id = $1
                            `,
                            [
                                user.id
                            ]
                        ),



                        /* Latest application */

                        pool.query(
                            `
                            SELECT

                                a.id,
                                a.application_reference,
                                a.status,
                                a.applied_at,

                                j.job_title

                            FROM applications a

                            INNER JOIN jobs j
                                ON j.id =
                                    a.job_id

                            WHERE
                                a.candidate_id = $1

                            ORDER BY

                                a.applied_at DESC,
                                a.id DESC

                            LIMIT 1
                            `,
                            [
                                user.id
                            ]
                        )

                    ]);


                const applicationCount =
                    Number(
                        applicationsResult
                            .rows[0]
                            .count
                    ) ||
                    0;


                const savedJobsCount =
                    Number(
                        savedJobsResult
                            .rows[0]
                            .count
                    ) ||
                    0;


                const latestApplication =
                    latestApplicationResult
                        .rows[0] ||
                    null;



                return res.json({

                    success:
                        true,

                    loggedIn:
                        true,

                    mode:
                        "candidate",

                    user: {

                        firstName:
                            user.first_name,

                        lastName:
                            user.last_name

                    },


                    candidate: {

                        applications:
                            applicationCount,

                        savedJobs:
                            savedJobsCount,


                        latestApplication:

                            latestApplication

                                ? {

                                    id:
                                        latestApplication.id,

                                    reference:
                                        latestApplication
                                            .application_reference,

                                    status:
                                        latestApplication.status,

                                    jobTitle:
                                        latestApplication
                                            .job_title,

                                    appliedAt:
                                        latestApplication
                                            .applied_at

                                }

                                : null

                    }

                });

            }



            /* =================================================
               INTERNAL TEAM DASHBOARD

               admin + system_admin both use one simple
               Recruitment Overview.
               ================================================= */

            if (
                user.role ===
                    "admin"

                ||

                user.role ===
                    "system_admin"
            ) {

                const [

                    vacanciesResult,

                    applicationStatsResult,

                    interviewResult

                ] =
                    await Promise.all([


                        /* Active vacancies */

                        pool.query(
                            `
                            SELECT

                                COUNT(*)::INT
                                    AS count

                            FROM jobs

                            WHERE
                                status =
                                'active'
                            `
                        ),



                        /* Applicant summary */

                        pool.query(
                            `
                            SELECT

                                COUNT(*)::INT
                                    AS total,

                                COUNT(*)
                                FILTER (
                                    WHERE
                                        status =
                                        'submitted'
                                )::INT
                                    AS awaiting_review,

                                COUNT(*)
                                FILTER (
                                    WHERE
                                        status =
                                        'screening'
                                )::INT
                                    AS screening

                            FROM applications
                            `
                        ),



                        /* Upcoming confirmed sessions */

                        pool.query(
                            `
                            SELECT

                                COUNT(*)::INT
                                    AS count

                            FROM interview_sessions

                            WHERE

                                status =
                                    'confirmed'

                            AND

                                session_date >=
                                (
                                    NOW()
                                    AT TIME ZONE
                                    'Asia/Colombo'
                                )::date
                            `
                        )

                    ]);


                const applicationStats =
                    applicationStatsResult
                        .rows[0];


                const permissions =
                    await loadEffectivePermissionKeys(
                        user.id,
                        user.role
                    );


                return res.json({

                    success:
                        true,

                    loggedIn:
                        true,

                    mode:
                        "team",

                    permissions,

                    user: {

                        firstName:
                            user.first_name,

                        lastName:
                            user.last_name

                    },


                    recruitment: {

                        activeVacancies:
                            Number(
                                vacanciesResult
                                    .rows[0]
                                    .count
                            ) ||
                            0,

                        applicants:
                            Number(
                                applicationStats
                                    .total
                            ) ||
                            0,

                        awaitingReview:
                            Number(
                                applicationStats
                                    .awaiting_review
                            ) ||
                            0,

                        screening:
                            Number(
                                applicationStats
                                    .screening
                            ) ||
                            0,

                        upcomingInterviews:
                            Number(
                                interviewResult
                                    .rows[0]
                                    .count
                            ) ||
                            0

                    }

                });

            }



            return res.json({

                success:
                    true,

                loggedIn:
                    true,

                mode:
                    "candidate"

            });

        }

        catch (error) {

            console.error(
                "Homepage dashboard error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load homepage dashboard."

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

/* =========================================================
   REQUIRE CANDIDATE
   ========================================================= */

function requireCandidate(req, res, next) {

    if (!req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "Please sign in to save jobs."
        });

    }


    if (req.session.role !== "candidate") {

        return res.status(403).json({
            success: false,
            message: "Only candidate accounts can save jobs."
        });

    }


    next();
}



/* =========================================================
   GET SAVED JOBS
   ========================================================= */

app.get(
    "/api/saved-jobs",
    requireCandidate,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT job_id
                    FROM saved_jobs
                    WHERE candidate_id = $1
                    ORDER BY saved_at DESC
                    `,
                    [
                        req.session.userId
                    ]
                );


            res.json({
                success: true,

                savedJobIds:
                    result.rows.map(
                        row =>
                            String(row.job_id)
                    )
            });

        }

        catch (error) {

            console.error(
                "Load saved jobs error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Unable to load saved jobs."
            });

        }

    }
);



/* =========================================================
   SAVE JOB
   ========================================================= */

app.post(
    "/api/saved-jobs/:jobId",
    requireCandidate,
    async (req, res) => {

        try {

            const jobId =
                req.params.jobId;


            /* Make sure the job exists and is public */

            const jobResult =
                await pool.query(
                    `
                    SELECT id
                    FROM jobs
                    WHERE id = $1
                    AND status IN ('active', 'closed')
                    `,
                    [
                        jobId
                    ]
                );


            if (
                jobResult.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Job vacancy not found."
                });

            }


            await pool.query(
                `
                INSERT INTO saved_jobs (
                    candidate_id,
                    job_id
                )

                VALUES ($1, $2)

                ON CONFLICT (
                    candidate_id,
                    job_id
                )

                DO NOTHING
                `,
                [
                    req.session.userId,
                    jobId
                ]
            );


            res.json({
                success: true,
                message:
                    "Job saved successfully."
            });

        }

        catch (error) {

            console.error(
                "Save job error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Unable to save job."
            });

        }

    }
);



/* =========================================================
   UNSAVE JOB
   ========================================================= */

app.delete(
    "/api/saved-jobs/:jobId",
    requireCandidate,
    async (req, res) => {

        try {

            const jobId =
                req.params.jobId;


            await pool.query(
                `
                DELETE FROM saved_jobs

                WHERE candidate_id = $1
                AND job_id = $2
                `,
                [
                    req.session.userId,
                    jobId
                ]
            );


            res.json({
                success: true,
                message:
                    "Job removed from saved jobs."
            });

        }

        catch (error) {

            console.error(
                "Unsave job error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Unable to remove saved job."
            });

        }

    }
);

/* =========================================================
   GET CANDIDATE APPLICATIONS
   Used by jobs page to show already-applied vacancies
   ========================================================= */

app.get(
    "/api/my-applications",
    requireCandidate,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        job_id,
                        application_reference,
                        status,
                        applied_at

                    FROM applications

                    WHERE candidate_id = $1

                    ORDER BY applied_at DESC
                    `,
                    [
                        req.session.userId
                    ]
                );


            return res.json({

                success: true,

                applications:
                    result.rows.map(
                        application => ({

                            id:
                                application.id,

                            jobId:
                                application.job_id,

                            reference:
                                application.application_reference,

                            status:
                                application.status,

                            appliedAt:
                                application.applied_at

                        })
                    )

            });

        }

        catch (error) {

            console.error(
                "Load candidate applications error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load your applications."

            });

        }

    }
);

/* =========================================================
   GET APPLICATION PREFILL INFORMATION
   ========================================================= */

app.get(
    "/api/application-profile",
    requireCandidate,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        u.first_name,
                        u.last_name,
                        u.email,
                        u.phone_number,

                        u.education,
                        u.skills,
                        u.work_experience,
                        u.preferred_job_type,

                        cp.nic,

                        cp.date_of_birth::text
                            AS date_of_birth,

                        cp.country,
                        cp.linkedin_url,
                        cp.preferred_languages,
                        cp.projects

                    FROM users u

                    LEFT JOIN candidate_profiles cp
                        ON cp.candidate_id = u.id

                    WHERE u.id = $1
                    AND u.role = 'candidate'

                    LIMIT 1
                    `,
                    [
                        req.session.userId
                    ]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Candidate profile not found."
                });

            }


            const candidate =
                result.rows[0];


            res.json({

                success: true,

                candidate: {

                    firstName:
                        candidate.first_name || "",

                    lastName:
                        candidate.last_name || "",

                    email:
                        candidate.email || "",

                    phoneNumber:
                        candidate.phone_number || "",


                    nic:
                        candidate.nic || "",

                    dateOfBirth:
                        candidate.date_of_birth || "",

                    country:
                        candidate.country || "",


                    education:
                        candidate.education || "",

                    linkedinUrl:
                        candidate.linkedin_url || "",

                    skills:
                        candidate.skills || "",

                    workExperience:
                        candidate.work_experience || "",


                    preferredLanguages:
                        candidate.preferred_languages || [],

                    projects:
                        candidate.projects || "",

                    preferredJobType:
                        candidate.preferred_job_type || ""

                }

            });

        }

        catch (error) {

            console.error(
                "Application profile error:",
                error
            );


            res.status(500).json({
                success: false,
                message:
                    "Unable to load candidate information."
            });

        }

    }
);


/* =========================================================
   SUBMIT JOB APPLICATION
   ========================================================= */

app.post(
    "/api/applications/:jobId",
    requireCandidate,
    handleApplicationCvUpload,
    async (req, res) => {

        const client =
            await pool.connect();


        let uploadedCvPath =
            null;


        try {

            const candidateId =
                req.session.userId;


            const jobId =
                req.params.jobId;


            /* =================================================
               READ FORM DATA
               ================================================= */

            const {
                firstName,
                lastName,
                phoneNumber,
                nic,
                dateOfBirth,
                country,
                education,
                linkedinUrl,
                skills,
                workExperience,
                projects,
                preferredJobType,
                consent
            } = req.body;



            /* =================================================
               PARSE LANGUAGES
               ================================================= */

            let preferredLanguages =
                [];


            if (
                Array.isArray(
                    req.body.preferredLanguages
                )
            ) {

                preferredLanguages =
                    req.body.preferredLanguages;

            }

            else if (
                req.body.preferredLanguages
            ) {

                try {

                    const parsedLanguages =
                        JSON.parse(
                            req.body.preferredLanguages
                        );


                    preferredLanguages =
                        Array.isArray(
                            parsedLanguages
                        )
                            ? parsedLanguages
                            : [
                                req.body.preferredLanguages
                            ];

                }

                catch {

                    preferredLanguages =
                        [
                            req.body.preferredLanguages
                        ];

                }

            }



            preferredLanguages =
                preferredLanguages
                    .map(
                        language =>
                            String(language)
                                .trim()
                    )
                    .filter(Boolean);



            /* =================================================
               REQUIRED FIELD VALIDATION
               ================================================= */

            if (
                !firstName?.trim() ||
                !lastName?.trim() ||
                !phoneNumber?.trim() ||
                !nic?.trim() ||
                !dateOfBirth ||
                !country?.trim() ||
                !education?.trim() ||
                !skills?.trim() ||
                !workExperience?.trim() ||
                !preferredJobType?.trim()
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please complete all required application fields."

                    });

            }



            /* =================================================
               LANGUAGE VALIDATION
               ================================================= */

            const allowedLanguages = [
                "Sinhala",
                "Tamil",
                "English"
            ];


            if (
                preferredLanguages.length === 0 ||
                preferredLanguages.some(
                    language =>
                        !allowedLanguages.includes(
                            language
                        )
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please select at least one valid language."

                    });

            }



            /* =================================================
               JOB TYPE VALIDATION
               ================================================= */

            const allowedJobTypes = [
                "Full time",
                "Part time",
                "Internship",
                "Contract",
                "Remote"
            ];


            if (
                !allowedJobTypes.includes(
                    preferredJobType.trim()
                )
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please select a valid preferred job type."

                    });

            }



            /* =================================================
               CONSENT VALIDATION
               ================================================= */

            const consentGiven =
                consent === "true" ||
                consent === true ||
                consent === "1" ||
                consent === "on";


            if (!consentGiven) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "You must confirm the recruitment consent before submitting."

                    });

            }



            /* =================================================
               CV VALIDATION
               ================================================= */

            if (!req.file) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please upload your CV or resume."

                    });

            }



            /* =================================================
               DATE OF BIRTH VALIDATION
               ================================================= */

            const dob =
                new Date(
                    `${dateOfBirth}T00:00:00`
                );


            if (
                Number.isNaN(
                    dob.getTime()
                ) ||
                dob > new Date()
            ) {

                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "Please enter a valid date of birth."

                    });

            }



            /* =================================================
               LINKEDIN VALIDATION
               Optional field
               ================================================= */

            const cleanLinkedin =
                linkedinUrl?.trim() ||
                null;


            if (cleanLinkedin) {

                try {

                    const linkedin =
                        new URL(
                            cleanLinkedin
                        );


                    if (
                        linkedin.protocol !==
                            "https:" &&
                        linkedin.protocol !==
                            "http:"
                    ) {

                        throw new Error(
                            "Invalid protocol"
                        );

                    }

                }

                catch {

                    return res
                        .status(400)
                        .json({

                            success: false,

                            message:
                                "Please enter a valid LinkedIn URL."

                        });

                }

            }



            /* =================================================
               BEGIN DATABASE TRANSACTION
               ================================================= */

            await client.query(
                "BEGIN"
            );



            /* =================================================
               LOAD CANDIDATE ACCOUNT
               Email comes from database, NOT browser.
               ================================================= */

            const userResult =
                await client.query(
                    `
                    SELECT
                        id,
                        email

                    FROM users

                    WHERE id = $1
                    AND role = 'candidate'

                    FOR UPDATE
                    `,
                    [
                        candidateId
                    ]
                );


            if (
                userResult.rows.length === 0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Candidate account not found."

                    });

            }


            const candidate =
                userResult.rows[0];



            /* =================================================
               LOAD + VALIDATE VACANCY
               ================================================= */

            const jobResult =
                await client.query(
                    `
                    SELECT
                        id,
                        job_title,
                        department,
                        status,
                        application_deadline

                    FROM jobs

                    WHERE id = $1

                    FOR UPDATE
                    `,
                    [
                        jobId
                    ]
                );


            if (
                jobResult.rows.length === 0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res
                    .status(404)
                    .json({

                        success: false,

                        message:
                            "Job vacancy not found."

                    });

            }


            const job =
                jobResult.rows[0];



            if (
                job.status !== "active"
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res
                    .status(400)
                    .json({

                        success: false,

                        message:
                            "This vacancy is no longer accepting applications."

                    });

            }



            /* =================================================
               DEADLINE CHECK
               ================================================= */

            if (
                job.application_deadline
            ) {

                const deadlineResult =
                    await client.query(
                        `
                        SELECT
                            $1::date < CURRENT_DATE
                                AS expired
                        `,
                        [
                            job.application_deadline
                        ]
                    );


                if (
                    deadlineResult
                        .rows[0]
                        .expired
                ) {

                    await client.query(
                        "ROLLBACK"
                    );


                    return res
                        .status(400)
                        .json({

                            success: false,

                            message:
                                "The application deadline for this vacancy has passed."

                        });

                }

            }



            /* =================================================
               PREVENT DUPLICATE APPLICATION
               ================================================= */

            const duplicateResult =
                await client.query(
                    `
                    SELECT id

                    FROM applications

                    WHERE candidate_id = $1
                    AND job_id = $2

                    LIMIT 1
                    `,
                    [
                        candidateId,
                        jobId
                    ]
                );


            if (
                duplicateResult.rows.length > 0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "You have already submitted an application for this vacancy."

                    });

            }



            /* =================================================
               RESERVE APPLICATION ID
               ================================================= */

            const applicationIdResult =
                await client.query(
                    `
                    SELECT
                        nextval(
                            pg_get_serial_sequence(
                                'applications',
                                'id'
                            )
                        ) AS id
                    `
                );


            const applicationId =
                applicationIdResult
                    .rows[0]
                    .id;



            /* =================================================
               APPLICATION REFERENCE
               Example:
               ALT-2026-00042
               ================================================= */

            const applicationYear =
                new Date()
                    .getFullYear();


            const applicationReference =
                `ALT-${applicationYear}-${
                    String(
                        applicationId
                    )
                    .padStart(
                        5,
                        "0"
                    )
                }`;



            /* =================================================
               BUILD PRIVATE CV PATH
               ================================================= */

            const extensionMap = {

                "application/pdf":
                    "pdf",

                "image/jpeg":
                    "jpg",

                "image/png":
                    "png"

            };


            const cvExtension =
                extensionMap[
                    req.file.mimetype
                ];


            uploadedCvPath =
                `candidate-${candidateId}/job-${jobId}/${applicationReference}/version-1/cv-${crypto.randomUUID()}.${cvExtension}`;



            /* =================================================
               UPLOAD CV TO PRIVATE SUPABASE BUCKET
               ================================================= */

            const {
                error: cvUploadError
            } =
                await supabase
                    .storage
                    .from(
                        "application-cvs"
                    )
                    .upload(
                        uploadedCvPath,
                        req.file.buffer,
                        {

                            contentType:
                                req.file.mimetype,

                            upsert:
                                false

                        }
                    );


            if (cvUploadError) {

                throw new Error(
                    `CV upload failed: ${cvUploadError.message}`
                );

            }



            /* =================================================
               CREATE APPLICATION
               ================================================= */

            await client.query(
                `
                INSERT INTO applications (

                    id,
                    application_reference,
                    candidate_id,
                    job_id,
                    status,
                    cv_path,
                    consent_given,
                    consented_at,
                    current_version_number

                )

                VALUES (

                    $1,
                    $2,
                    $3,
                    $4,
                    'submitted',
                    $5,
                    TRUE,
                    NOW(),
                    1

                )
                `,
                [
                    applicationId,
                    applicationReference,
                    candidateId,
                    jobId,
                    uploadedCvPath
                ]
            );



            /* =================================================
               CREATE VERSION 1 SNAPSHOT
               ================================================= */

            await client.query(
                `
                INSERT INTO application_versions (

                    application_id,
                    version_number,

                    first_name,
                    last_name,
                    email,
                    phone_number,

                    nic,
                    date_of_birth,
                    country,

                    education,
                    linkedin_url,
                    skills,
                    work_experience,
                    projects,

                    preferred_languages,
                    preferred_job_type,

                    cv_path,

                    job_title_snapshot,
                    department_snapshot

                )

                VALUES (

                    $1,
                    1,

                    $2,
                    $3,
                    $4,
                    $5,

                    $6,
                    $7,
                    $8,

                    $9,
                    $10,
                    $11,
                    $12,
                    $13,

                    $14,
                    $15,

                    $16,

                    $17,
                    $18

                )
                `,
                [
                    applicationId,

                    firstName.trim(),

                    lastName.trim(),

                    candidate.email,

                    phoneNumber.trim(),

                    nic.trim(),

                    dateOfBirth,

                    country.trim(),

                    education.trim(),

                    cleanLinkedin,

                    skills.trim(),

                    workExperience.trim(),

                    projects?.trim() ||
                        null,

                    preferredLanguages,

                    preferredJobType.trim(),

                    uploadedCvPath,

                    job.job_title,

                    job.department
                ]
            );



            /* =================================================
               UPDATE REUSABLE USER PROFILE
               ================================================= */

            await client.query(
                `
                UPDATE users

                SET
                    first_name = $1,
                    last_name = $2,
                    phone_number = $3,
                    education = $4,
                    skills = $5,
                    work_experience = $6,
                    preferred_job_type = $7

                WHERE id = $8
                `,
                [
                    firstName.trim(),

                    lastName.trim(),

                    phoneNumber.trim(),

                    education.trim(),

                    skills.trim(),

                    workExperience.trim(),

                    preferredJobType.trim(),

                    candidateId
                ]
            );



            /* =================================================
               CREATE / UPDATE CANDIDATE PROFILE
               ================================================= */

            await client.query(
                `
                INSERT INTO candidate_profiles (

                    candidate_id,
                    nic,
                    date_of_birth,
                    country,
                    linkedin_url,
                    preferred_languages,
                    projects

                )

                VALUES (

                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7

                )

                ON CONFLICT (
                    candidate_id
                )

                DO UPDATE SET

                    nic =
                        EXCLUDED.nic,

                    date_of_birth =
                        EXCLUDED.date_of_birth,

                    country =
                        EXCLUDED.country,

                    linkedin_url =
                        EXCLUDED.linkedin_url,

                    preferred_languages =
                        EXCLUDED.preferred_languages,

                    projects =
                        EXCLUDED.projects,

                    updated_at =
                        NOW()
                `,
                [
                    candidateId,

                    nic.trim(),

                    dateOfBirth,

                    country.trim(),

                    cleanLinkedin,

                    preferredLanguages,

                    projects?.trim() ||
                        null
                ]
            );



            /* =================================================
               CREATE FIRST PROGRESS HISTORY ENTRY
               ================================================= */

            await client.query(
                `
                INSERT INTO application_status_history (

                    application_id,
                    previous_status,
                    new_status,
                    changed_by,
                    status_note

                )

                VALUES (

                    $1,
                    NULL,
                    'submitted',
                    $2,
                    'Application successfully submitted.'

                )
                `,
                [
                    applicationId,
                    candidateId
                ]
            );



            /* =================================================
               CREATE ACTIVITY LOG
               ================================================= */

            await client.query(
                `
                INSERT INTO application_activity (

                    application_id,
                    performed_by,
                    activity_type,
                    title,
                    description

                )

                VALUES (

                    $1,
                    $2,
                    'application_submitted',
                    'Application submitted',
                    'Candidate submitted the application.'

                )
                `,
                [
                    applicationId,
                    candidateId
                ]
            );



            /* =================================================
               CREATE NAVBAR NOTIFICATION
               ================================================= */

            await client.query(
                `
                INSERT INTO notifications (

                    user_id,
                    notification_type,
                    title,
                    message,
                    application_id,
                    job_id,
                    action_url

                )

                VALUES (

                    $1,
                    'application_submitted',
                    'Application submitted',
                    $2,
                    $3,
                    $4,
                    $5

                )
                `,
                [
                    candidateId,

                    `Your application for ${job.job_title} was successfully submitted. View your progress.`,

                    applicationId,

                    jobId,

                    `/application-progress.html?id=${applicationId}`
                ]
            );



            /* =================================================
               COMMIT EVERYTHING
               ================================================= */

            await client.query(
                "COMMIT"
            );



            return res
                .status(201)
                .json({

                    success:
                        true,

                    message:
                        "Application submitted successfully.",

                    application: {

                        id:
                            applicationId,

                        reference:
                            applicationReference,

                        status:
                            "submitted",

                        jobId:
                            jobId,

                        jobTitle:
                            job.job_title

                    }

                });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (rollbackError) {

                console.error(
                    "Application rollback error:",
                    rollbackError
                );

            }



            /* =================================================
               REMOVE CV IF DATABASE FAILED
               ================================================= */

            if (
                uploadedCvPath
            ) {

                try {

                    const {
                        error: removeError
                    } =
                        await supabase
                            .storage
                            .from(
                                "application-cvs"
                            )
                            .remove(
                                [
                                    uploadedCvPath
                                ]
                            );


                    if (removeError) {

                        console.error(
                            "CV cleanup error:",
                            removeError
                        );

                    }

                }

                catch (cleanupError) {

                    console.error(
                        "CV cleanup error:",
                        cleanupError
                    );

                }

            }



            console.error(
                "Application submission error:",
                error
            );



            /* DUPLICATE APPLICATION */

            if (
                error.code ===
                "23505"
            ) {

                return res
                    .status(409)
                    .json({

                        success: false,

                        message:
                            "You have already submitted an application for this vacancy."

                    });

            }



            return res
                .status(500)
                .json({

                    success: false,

                    message:
                        "Unable to submit your application. Please try again."

                });

        }

        finally {

            client.release();

        }

    }
);

/* =========================================================
   REQUIRE LOGGED-IN USER
   ========================================================= */

function requireLoggedIn(
    req,
    res,
    next
) {

    if (!req.session.userId) {

        return res.status(401).json({
            success: false,
            message: "Please sign in."
        });

    }


    next();

}



/* =========================================================
   GET USER NOTIFICATIONS
   ========================================================= */

app.get(
    "/api/notifications",
    requireLoggedIn,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        notification_type,
                        title,
                        message,
                        application_id,
                        job_id,
                        action_url,
                        is_read,
                        read_at,
                        created_at

                    FROM notifications

                    WHERE user_id = $1

                    ORDER BY created_at DESC

                    LIMIT 50
                    `,
                    [
                        req.session.userId
                    ]
                );


            const unreadResult =
                await pool.query(
                    `
                    SELECT COUNT(*)::integer
                        AS unread_count

                    FROM notifications

                    WHERE user_id = $1
                    AND is_read = FALSE
                    `,
                    [
                        req.session.userId
                    ]
                );


            return res.json({

                success: true,

                notifications:
                    result.rows,

                unreadCount:
                    unreadResult
                        .rows[0]
                        .unread_count

            });

        }

        catch (error) {

            console.error(
                "Load notifications error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to load notifications."
            });

        }

    }
);



/* =========================================================
   MARK ONE NOTIFICATION AS READ
   ========================================================= */

app.patch(
    "/api/notifications/:id/read",
    requireLoggedIn,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    UPDATE notifications

                    SET
                        is_read = TRUE,

                        read_at =
                            COALESCE(
                                read_at,
                                NOW()
                            )

                    WHERE id = $1
                    AND user_id = $2

                    RETURNING id
                    `,
                    [
                        req.params.id,
                        req.session.userId
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Notification not found."
                });

            }


            return res.json({
                success: true
            });

        }

        catch (error) {

            console.error(
                "Mark notification read error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to update notification."
            });

        }

    }
);



/* =========================================================
   MARK ALL NOTIFICATIONS AS READ
   ========================================================= */

app.patch(
    "/api/notifications/read-all",
    requireLoggedIn,
    async (req, res) => {

        try {

            await pool.query(
                `
                UPDATE notifications

                SET
                    is_read = TRUE,

                    read_at =
                        COALESCE(
                            read_at,
                            NOW()
                        )

                WHERE user_id = $1
                AND is_read = FALSE
                `,
                [
                    req.session.userId
                ]
            );


            return res.json({
                success: true
            });

        }

        catch (error) {

            console.error(
                "Mark notifications read error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to update notifications."
            });

        }

    }
);


/* =========================================================
   PUBLIC CONTACT / FEEDBACK SUBMISSION
   ========================================================= */

app.post(
    "/api/contact/feedback",
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const {

                name,
                email,
                category,
                subject,
                message

            } =
                req.body;



            /* =================================================
               CLEAN VALUES
               ================================================= */

            const cleanName =
                String(
                    name ||
                    ""
                )
                .trim();


            const cleanEmail =
                String(
                    email ||
                    ""
                )
                .trim()
                .toLowerCase();


            const cleanCategory =
                String(
                    category ||
                    "general"
                )
                .trim()
                .toLowerCase();


            const cleanSubject =
                String(
                    subject ||
                    ""
                )
                .trim();


            const cleanMessage =
                String(
                    message ||
                    ""
                )
                .trim();



            /* =================================================
               VALIDATION
               ================================================= */

            if (
                !cleanName ||
                !cleanEmail ||
                !cleanSubject ||
                !cleanMessage
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please complete all contact fields."

                });

            }


            if (
                cleanName.length >
                120
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Name is too long."

                });

            }


            if (
                cleanEmail.length >
                255
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Email address is too long."

                });

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    cleanEmail
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please enter a valid email address."

                });

            }


            if (
                cleanSubject.length >
                180
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Subject is too long."

                });

            }


            if (
                cleanMessage.length >
                5000
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Message must be 5000 characters or fewer."

                });

            }



            /* =================================================
               CATEGORY WHITELIST
               ================================================= */

            const allowedCategories = [

                "general",
                "feedback",
                "bug"

            ];


            if (
                !allowedCategories.includes(
                    cleanCategory
                )
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Invalid feedback category."

                });

            }



            /*
                Guests are allowed to send feedback.

                If signed in, this connects the report
                to their Altrium account.
            */

            const submittedBy =
                req.session?.userId ||
                null;



            await client.query(
                "BEGIN"
            );



            /* =================================================
               SAVE FEEDBACK
               ================================================= */

            const feedbackResult =
                await client.query(
                    `
                    INSERT INTO feedback_submissions (

                        submitted_by,

                        sender_name,
                        sender_email,

                        category,

                        subject,
                        message

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6

                    )

                    RETURNING

                        id,
                        category,
                        subject,
                        created_at
                    `,
                    [

                        submittedBy,

                        cleanName,
                        cleanEmail,

                        cleanCategory,

                        cleanSubject,
                        cleanMessage

                    ]
                );


            const feedback =
                feedbackResult.rows[0];



            /* =================================================
               SYSTEM ADMIN NOTIFICATION TEXT
               ================================================= */

            let notificationTitle =
                "New contact message";


            let notificationMessage =
                `${cleanName} sent a new contact message.`;


            if (
                cleanCategory ===
                "feedback"
            ) {

                notificationTitle =
                    "New feedback received";


                notificationMessage =
                    `${cleanName} submitted new feedback for Altrium.`;

            }


            if (
                cleanCategory ===
                "bug"
            ) {

                notificationTitle =
                    "New system issue reported";


                notificationMessage =
                    `${cleanName} reported a system issue that needs review.`;

            }



            /* =================================================
               NOTIFY EVERY SYSTEM ADMIN
               ================================================= */

            await client.query(
                `
                INSERT INTO notifications (

                    user_id,

                    notification_type,

                    title,
                    message,

                    action_url

                )

                SELECT

                    id,

                    'system_feedback',

                    $1,
                    $2,
                    $3

                FROM users

                WHERE role =
                    'system_admin'
                `,
                [

                    notificationTitle,

                    notificationMessage,

                    `/admin/admin-dashboard.html?feedback=${feedback.id}#system-feedback`

                ]
            );



            /* =================================================
               COMPLETE TRANSACTION
               ================================================= */

            await client.query(
                "COMMIT"
            );


            return res.status(201).json({

                success:
                    true,

                message:
                    "Thanks — your message has been sent to Altrium.",

                feedback: {

                    id:
                        feedback.id,

                    category:
                        feedback.category,

                    createdAt:
                        feedback.created_at

                }

            });

        }

        catch (error) {

            await client.query(
                "ROLLBACK"
            );


            console.error(
                "Contact feedback submission error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to send your message right now."

            });

        }

        finally {

            client.release();

        }

    }
);



/* =========================================================
   GET CANDIDATE APPLICATION PROGRESS
   ========================================================= */

app.get(
    "/api/applications/:id/progress",
    requireCandidate,
    async (req, res) => {

        try {

            const applicationId =
                req.params.id;


            const candidateId =
                req.session.userId;



            /* =================================================
               LOAD APPLICATION
               Candidate can ONLY access their own application.
               ================================================= */

            const applicationResult =
                await pool.query(
                    `
                    SELECT
                        a.id,
                        a.application_reference,
                        a.status,
                        a.applied_at,
                        a.updated_at,
                        a.is_locked,

                        j.id AS job_id,
                        j.job_title,
                        j.department,
                        j.location,
                        j.employment_type,
                        j.application_deadline

                    FROM applications a

                    INNER JOIN jobs j
                        ON j.id = a.job_id

                    WHERE a.id = $1
                    AND a.candidate_id = $2

                    LIMIT 1
                    `,
                    [
                        applicationId,
                        candidateId
                    ]
                );


            if (
                applicationResult.rows.length === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Application not found."
                });

            }


            const application =
                applicationResult.rows[0];



            /* =================================================
               LOAD STATUS HISTORY
               ================================================= */

            const historyResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        previous_status,
                        new_status,
                        status_note,
                        created_at

                    FROM application_status_history

                    WHERE application_id = $1

                    ORDER BY
                        created_at ASC,
                        id ASC
                    `,
                    [
                        applicationId
                    ]
                );



            /* =================================================
               LOAD INTERVIEWS

               Manager notes are NOT returned here.
               ================================================= */

            const interviewResult =
                await pool.query(
                    `
                    SELECT
                        id,
                        round_number,
                        interview_title,
                        interview_type,
                        scheduled_at,
                        duration_minutes,
                        location,
                        meeting_url,
                        instructions,
                        interview_status,
                        created_at,
                        updated_at

                    FROM application_interviews

                    WHERE application_id = $1

                    ORDER BY
                        round_number ASC,
                        scheduled_at ASC
                    `,
                    [
                        applicationId
                    ]
                );



            /* =================================================
               WITHDRAW AVAILABILITY
               ================================================= */

            const terminalStatuses = [
                "hired",
                "rejected",
                "withdrawn"
            ];


            const canWithdraw =
                !terminalStatuses.includes(
                    application.status
                );



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success: true,

                application: {

                    id:
                        application.id,

                    reference:
                        application
                            .application_reference,

                    status:
                        application.status,

                    appliedAt:
                        application.applied_at,

                    updatedAt:
                        application.updated_at,

                    isLocked:
                        application.is_locked,

                    canWithdraw:
                        canWithdraw,


                    job: {

                        id:
                            application.job_id,

                        title:
                            application.job_title,

                        department:
                            application.department,

                        location:
                            application.location,

                        employmentType:
                            application
                                .employment_type,

                        applicationDeadline:
                            application
                                .application_deadline

                    },


                    history:
                        historyResult.rows.map(
                            item => ({

                                id:
                                    item.id,

                                previousStatus:
                                    item.previous_status,

                                status:
                                    item.new_status,

                                note:
                                    item.status_note,

                                createdAt:
                                    item.created_at

                            })
                        ),


                    interviews:
                        interviewResult.rows.map(
                            interview => ({

                                id:
                                    interview.id,

                                roundNumber:
                                    interview.round_number,

                                title:
                                    interview
                                        .interview_title,

                                type:
                                    interview
                                        .interview_type,

                                scheduledAt:
                                    interview
                                        .scheduled_at,

                                durationMinutes:
                                    interview
                                        .duration_minutes,

                                location:
                                    interview.location,

                                meetingUrl:
                                    interview.meeting_url,

                                instructions:
                                    interview.instructions,

                                status:
                                    interview
                                        .interview_status,

                                createdAt:
                                    interview.created_at,

                                updatedAt:
                                    interview.updated_at

                            })
                        )

                }

            });

        }

        catch (error) {

            console.error(
                "Application progress error:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    "Unable to load application progress."
            });

        }

    }
);


/* =========================================================
   ADMIN - LOAD APPLICATIONS
   SCALABLE FILTERING + EVALUATION SUMMARY
   ========================================================= */

app.get(
    "/api/admin/applications",
    requirePermission(
        "applications.view_all"
    ),
    async (req, res) => {

        try {

            /* =================================================
               QUERY PARAMETERS
               ================================================= */

            const search =
                String(
                    req.query.search ||
                    ""
                )
                .trim();


            const stage =
                String(
                    req.query.stage ||
                    "all"
                )
                .trim()
                .toLowerCase();


            const sort =
                String(
                    req.query.sort ||
                    "newest"
                )
                .trim()
                .toLowerCase();


            const requestedJobId =
                req.query.jobId;


            const jobId =
                requestedJobId &&
                requestedJobId !== "all"
                    ? Number(
                        requestedJobId
                    )
                    : null;


            let page =
                Number(
                    req.query.page
                ) ||
                1;


            let limit =
                Number(
                    req.query.limit
                ) ||
                25;


            page =
                Math.max(
                    1,
                    page
                );


            limit =
                Math.min(
                    50,
                    Math.max(
                        10,
                        limit
                    )
                );


            const offset =
                (
                    page -
                    1
                ) *
                limit;



            /* =================================================
               VALID STAGES
               ================================================= */

            const allowedStages = [

                "all",

                "submitted",

                "screening",

                "under_evaluation",

                "evaluation_complete",

                "shortlisted",

                "interview",

                "offer",

                "hired",

                "rejected",

                "withdrawn"

            ];


            const safeStage =
                allowedStages.includes(
                    stage
                )
                    ? stage
                    : "all";



            /* =================================================
               SORTING

               IMPORTANT:
               SQL is selected from our own map.
               User input is never pasted directly.
               ================================================= */

            const sortMap = {

                newest:
                    `
                    applied_at DESC,
                    id DESC
                    `,

                oldest:
                    `
                    applied_at ASC,
                    id ASC
                    `,

                score_high:
                    `
                    average_rating DESC NULLS LAST,
                    applied_at ASC,
                    id ASC
                    `,

                score_low:
                    `
                    average_rating ASC NULLS LAST,
                    applied_at ASC,
                    id ASC
                    `,

                review_progress:
                    `
                    review_count DESC,
                    average_rating DESC NULLS LAST,
                    applied_at ASC
                    `

            };


            const orderBy =
                sortMap[
                    sort
                ] ||
                sortMap.newest;



            /* =================================================
               LOAD FILTERED PAGE
               ================================================= */

            const result =
                await pool.query(
                    `
                    WITH application_base AS (

                        SELECT

                            a.id,

                            a.application_reference,

                            a.status,

                            a.applied_at,

                            a.updated_at,

                            a.current_version_number,

                            a.is_locked,

                            a.candidate_id,

                            a.job_id,


                            av.first_name,

                            av.last_name,

                            av.email,

                            av.phone_number,

                            av.job_title_snapshot,

                            av.department_snapshot,


                            j.location,

                            j.employment_type,

                            j.number_of_openings,

                            j.required_reviewers,


                            COALESCE(
                                evaluation_summary.review_count,
                                0
                            )::INT
                                AS review_count,


                            evaluation_summary.average_rating


                        FROM applications a


                        INNER JOIN application_versions av

                            ON av.application_id =
                                a.id

                            AND av.version_number =
                                a.current_version_number


                        INNER JOIN jobs j

                            ON j.id =
                                a.job_id


                        LEFT JOIN LATERAL (

                            SELECT

                                COUNT(
                                    DISTINCT e.reviewer_id
                                )::INT
                                    AS review_count,


                                ROUND(
                                    AVG(
                                        e.reviewer_score
                                    ),
                                    2
                                )
                                    AS average_rating


                            FROM application_evaluations e


                            WHERE
                                e.application_id =
                                a.id

                        ) evaluation_summary

                            ON TRUE


                        WHERE

                            (
                                $1 = ''

                                OR

                                a.application_reference
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                av.first_name
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                av.last_name
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                (
                                    COALESCE(
                                        av.first_name,
                                        ''
                                    )
                                    ||
                                    ' '
                                    ||
                                    COALESCE(
                                        av.last_name,
                                        ''
                                    )
                                )
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                av.email
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                av.job_title_snapshot
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                av.department_snapshot
                                    ILIKE
                                    '%' || $1 || '%'

                                OR

                                j.location
                                    ILIKE
                                    '%' || $1 || '%'
                            )


                            AND

                            (
                                $2::BIGINT IS NULL

                                OR

                                a.job_id =
                                    $2
                            )

                    ),


                    application_staged AS (

                        SELECT

                            *,


                            CASE

                                WHEN
                                    status =
                                    'screening'

                                    AND
                                    review_count =
                                    0

                                THEN
                                    'screening'


                                WHEN
                                    status =
                                    'screening'

                                    AND
                                    review_count >
                                    0

                                    AND
                                    review_count <
                                    required_reviewers

                                THEN
                                    'under_evaluation'


                                WHEN
                                    status =
                                    'screening'

                                    AND
                                    review_count >=
                                    required_reviewers

                                THEN
                                    'evaluation_complete'


                                ELSE
                                    status

                            END
                                AS management_stage


                        FROM application_base

                    ),


                    application_ranked AS (

                        SELECT

                            *,


                            DENSE_RANK()
                            OVER (

                                PARTITION BY
                                    job_id

                                ORDER BY

                                    CASE

                                        WHEN
                                            management_stage =
                                            'evaluation_complete'

                                        THEN
                                            average_rating

                                        ELSE
                                            NULL

                                    END
                                    DESC
                                    NULLS LAST

                            )
                                AS score_rank


                        FROM application_staged

                    ),


                    application_filtered AS (

                        SELECT
                            *

                        FROM application_ranked

                        WHERE

                            (
                                $3 =
                                'all'

                                OR

                                management_stage =
                                $3
                            )

                    )


                    SELECT

                        *,

                        COUNT(*)
                        OVER ()
                            AS filtered_total


                    FROM application_filtered


                    ORDER BY
                        ${orderBy}


                    LIMIT $4

                    OFFSET $5
                    `,
                    [

                        search,

                        Number.isInteger(
                            jobId
                        )
                            ? jobId
                            : null,

                        safeStage,

                        limit,

                        offset

                    ]
                );



            /* =================================================
               AVAILABLE VACANCY FILTER OPTIONS

               Only vacancies that actually have applicants.
               ================================================= */

            const jobOptionsResult =
                await pool.query(
                    `
                    SELECT

                        j.id,

                        j.job_title,

                        j.number_of_openings,

                        COUNT(
                            a.id
                        )::INT
                            AS applicant_count


                    FROM jobs j


                    INNER JOIN applications a

                        ON a.job_id =
                            j.id


                    GROUP BY

                        j.id,

                        j.job_title,

                        j.number_of_openings


                    ORDER BY

                        j.job_title ASC
                    `
                );



            /* =================================================
               DASHBOARD APPLICATION STATS
               ================================================= */

            const statsResult =
                await pool.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS total_applications,


                        COUNT(*)
                        FILTER (
                            WHERE
                                status =
                                'submitted'
                        )::INT
                            AS waiting_review,


                        COUNT(*)
                        FILTER (
                            WHERE
                                status =
                                'interview'
                        )::INT
                            AS interviews


                    FROM applications
                    `
                );


            const stats =
                statsResult.rows[0];


            const filteredTotal =
                result.rows.length
                    ? Number(
                        result.rows[0]
                            .filtered_total
                    )
                    : 0;


            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        filteredTotal /
                        limit
                    )
                );



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success:
                    true,


                applications:
                    result.rows.map(
                        application => ({

                            id:
                                application.id,

                            reference:
                                application
                                    .application_reference,

                            status:
                                application.status,

                            managementStage:
                                application
                                    .management_stage,

                            appliedAt:
                                application
                                    .applied_at,

                            updatedAt:
                                application
                                    .updated_at,

                            currentVersion:
                                application
                                    .current_version_number,

                            isLocked:
                                application
                                    .is_locked,


                            candidate: {

                                id:
                                    application
                                        .candidate_id,

                                firstName:
                                    application
                                        .first_name,

                                lastName:
                                    application
                                        .last_name,

                                email:
                                    application
                                        .email,

                                phoneNumber:
                                    application
                                        .phone_number

                            },


                            job: {

                                id:
                                    application
                                        .job_id,

                                title:
                                    application
                                        .job_title_snapshot,

                                department:
                                    application
                                        .department_snapshot,

                                location:
                                    application
                                        .location,

                                employmentType:
                                    application
                                        .employment_type,

                                numberOfOpenings:
                                    Number(
                                        application
                                            .number_of_openings
                                    ) ||
                                    1

                            },


                            evaluation: {

                                reviewCount:
                                    Number(
                                        application
                                            .review_count
                                    ) ||
                                    0,

                                requiredReviewers:
                                    Number(
                                        application
                                            .required_reviewers
                                    ) ||
                                    2,

                                averageRating:
                                    application
                                        .average_rating ===
                                        null

                                        ? null

                                        : Number(
                                            application
                                                .average_rating
                                        ),

                                isComplete:
                                    application
                                        .management_stage ===
                                        "evaluation_complete",

                                stage:
                                    application
                                        .management_stage,

                                isHighestRating:

                                    application
                                        .management_stage ===
                                        "evaluation_complete"

                                    &&

                                    Number(
                                        application
                                            .score_rank
                                    ) ===
                                    1

                            }

                        })
                    ),


                pagination: {

                    page,

                    limit,

                    total:
                        filteredTotal,

                    totalPages,

                    hasPrevious:
                        page >
                        1,

                    hasNext:
                        page <
                        totalPages

                },


                filters: {

                    jobs:
                        jobOptionsResult
                            .rows
                            .map(
                                job => ({

                                    id:
                                        job.id,

                                    title:
                                        job.job_title,

                                    openings:
                                        Number(
                                            job
                                                .number_of_openings
                                        ) ||
                                        1,

                                    applicantCount:
                                        Number(
                                            job
                                                .applicant_count
                                        ) ||
                                        0

                                })
                            )

                },


                stats: {

                    totalApplications:
                        Number(
                            stats
                                .total_applications
                        ) ||
                        0,

                    waitingReview:
                        Number(
                            stats
                                .waiting_review
                        ) ||
                        0,

                    interviews:
                        Number(
                            stats
                                .interviews
                        ) ||
                        0

                }

            });

        }

        catch (error) {

            console.error(
                "Load admin applications error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load applications."

            });

        }

    }
);


/* =========================================================
   ADMIN - VIEW SINGLE APPLICATION
   ========================================================= */

app.get(
    "/api/admin/applications/:id",
    requirePermission(
        "applications.view_all"
    ),
    async (req, res) => {

        try {

            const applicationId =
                req.params.id;


            /* =================================================
               LOAD APPLICATION + CURRENT VERSION
               ================================================= */

            const applicationResult =
                await pool.query(
                    `
                    SELECT

                        a.id,
                        a.application_reference,
                        a.candidate_id,
                        a.job_id,
                        a.status,
                        a.applied_at,
                        a.updated_at,
                        a.current_version_number,
                        a.is_locked,

                        av.*,

                        j.job_title,
                        j.department,
                        j.location,
                        j.employment_type,
                        j.application_deadline

                    FROM applications a

                    INNER JOIN application_versions av
                        ON av.application_id = a.id
                        AND av.version_number =
                            a.current_version_number

                    INNER JOIN jobs j
                        ON j.id = a.job_id

                    WHERE a.id = $1

                    LIMIT 1
                    `,
                    [
                        applicationId
                    ]
                );


            if (
                applicationResult.rows.length ===
                0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Application not found."
                });

            }


            const application =
                applicationResult.rows[0];



            /* =================================================
               CREATE TEMPORARY PRIVATE CV LINK
               ================================================= */

            let cvUrl =
                null;


            if (
                application.cv_path
            ) {

                const {
                    data: signedData,
                    error: signedError
                } =
                    await supabase.storage
                        .from(
                            "application-cvs"
                        )
                        .createSignedUrl(
                            application.cv_path,
                            60 * 10
                        );


                if (signedError) {

                    console.error(
                        "Create CV signed URL error:",
                        signedError
                    );

                }

                else {

                    cvUrl =
                        signedData.signedUrl;

                }

            }



            /* =================================================
               STATUS HISTORY
               ================================================= */

            const historyResult =
                await pool.query(
                    `
                    SELECT

                        h.id,
                        h.previous_status,
                        h.new_status,
                        h.status_note,
                        h.created_at,

                        u.first_name
                            AS changed_by_first_name,

                        u.last_name
                            AS changed_by_last_name

                    FROM application_status_history h

                    LEFT JOIN users u
                        ON u.id = h.changed_by

                    WHERE h.application_id = $1

                    ORDER BY
                        h.created_at ASC
                    `,
                    [
                        applicationId
                    ]
                );



            /* =================================================
               SEND MANAGER-SAFE APPLICATION DETAILS
               ================================================= */

            return res.json({

                success: true,

                application: {

                    id:
                        application.id,

                    reference:
                        application
                            .application_reference,

                    status:
                        application.status,

                    appliedAt:
                        application.applied_at,

                    updatedAt:
                        application.updated_at,

                    currentVersion:
                        application
                            .current_version_number,

                    isLocked:
                        application.is_locked,


                    candidate: {

                        id:
                            application
                                .candidate_id,

                        firstName:
                            application
                                .first_name,

                        lastName:
                            application
                                .last_name,

                        email:
                            application.email,

                        phoneNumber:
                            application
                                .phone_number,

                        nic:
                            application.nic,

                        dateOfBirth:
                            application
                                .date_of_birth,

                        country:
                            application.country

                    },


                    professional: {

                        education:
                            application.education,

                        linkedinUrl:
                            application
                                .linkedin_url,

                        skills:
                            application.skills,

                        workExperience:
                            application
                                .work_experience,

                        projects:
                            application.projects

                    },


                    preferences: {

                        languages:
                            application
                                .preferred_languages ||
                            [],

                        preferredJobType:
                            application
                                .preferred_job_type

                    },


                    job: {

                        id:
                            application.job_id,

                        title:
                            application
                                .job_title,

                        department:
                            application
                                .department,

                        location:
                            application.location,

                        employmentType:
                            application
                                .employment_type,

                        applicationDeadline:
                            application
                                .application_deadline

                    },


                    cv: {

                        path:
                            application.cv_path,

                        url:
                            cvUrl

                    },


                    history:
                        historyResult.rows.map(
                            item => ({

                                id:
                                    item.id,

                                previousStatus:
                                    item
                                        .previous_status,

                                status:
                                    item
                                        .new_status,

                                note:
                                    item.status_note,

                                createdAt:
                                    item.created_at,

                                changedBy:
                                    item
                                        .changed_by_first_name
                                        ? `${item.changed_by_first_name} ${item.changed_by_last_name || ""}`.trim()
                                        : null

                            })
                        )

                }

            });

        }

        catch (error) {

            console.error(
                "Load admin application detail error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load application details."

            });

        }

    }
);


/* =========================================================
   ADMIN - LOAD APPLICATION EVALUATIONS
   ========================================================= */

app.get(
    "/api/admin/applications/:id/evaluations",
    requirePermission(
        "evaluations.view"
    ),
    async (req, res) => {

        try {

            const applicationId =
                req.params.id;


            /* =================================================
               LOAD APPLICATION
               ================================================= */

            const applicationResult =
                await pool.query(
                    `
                    SELECT

                        a.id,
                        a.application_reference,
                        a.status,
                        a.is_locked,
                        a.job_id,

                        j.job_title,
                        j.required_reviewers,

                        av.first_name,
                        av.last_name

                    FROM applications a


                    INNER JOIN jobs j

                        ON j.id =
                            a.job_id


                    INNER JOIN application_versions av

                        ON av.application_id =
                            a.id

                        AND av.version_number =
                            a.current_version_number


                    WHERE
                        a.id = $1
                    `,
                    [
                        applicationId
                    ]
                );


            if (
                applicationResult.rows.length ===
                0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Application not found."

                });

            }


            const application =
                applicationResult.rows[0];



            /* =================================================
               LOAD EVALUATIONS
               ================================================= */

            const evaluationResult =
                await pool.query(
                    `
                    SELECT

                        e.id,
                        e.application_id,
                        e.reviewer_id,

                        e.technical_skills_rating,
                        e.relevant_experience_rating,
                        e.qualifications_rating,
                        e.overall_suitability_rating,

                        e.technical_skills_note,
                        e.relevant_experience_note,
                        e.qualifications_note,
                        e.overall_suitability_note,

                        e.feedback,
                        e.reviewer_score,

                        e.submitted_at,
                        e.updated_at,
                        e.locked_at,

                        u.first_name
                            AS reviewer_first_name,

                        u.last_name
                            AS reviewer_last_name,

                        u.email
                            AS reviewer_email

                    FROM application_evaluations e


                    INNER JOIN users u

                        ON u.id =
                            e.reviewer_id


                    WHERE
                        e.application_id = $1


                    ORDER BY

                        e.submitted_at ASC,

                        e.id ASC
                    `,
                    [
                        applicationId
                    ]
                );


            const evaluations =
                evaluationResult.rows;


            const requiredReviewers =
                Number(
                    application
                        .required_reviewers
                ) ||
                2;


            const reviewCount =
                evaluations.length;


            const isComplete =
                reviewCount >=
                requiredReviewers;



            /* =================================================
               CURRENT RECRUITER'S EVALUATION
               ================================================= */

            const myEvaluation =
                evaluations.find(
                    evaluation =>
                        String(
                            evaluation
                                .reviewer_id
                        ) ===
                        String(
                            req.session.userId
                        )
                ) ||
                null;



            /* =================================================
               CALCULATE COMBINED SCORE
               ================================================= */

            const scores =
                evaluations.map(
                    evaluation =>
                        Number(
                            evaluation
                                .reviewer_score
                        )
                );


            const averageRating =
                scores.length

                    ? Number(
                        (
                            scores.reduce(
                                (
                                    total,
                                    score
                                ) =>
                                    total +
                                    score,
                                0
                            )
                            /
                            scores.length
                        )
                        .toFixed(
                            2
                        )
                    )

                    : null;



            /* =================================================
               CRITERION AVERAGES
               ================================================= */

            function calculateAverage(
                field
            ) {

                if (
                    evaluations.length ===
                    0
                ) {

                    return null;

                }


                const values =
                    evaluations.map(
                        evaluation =>
                            Number(
                                evaluation[
                                    field
                                ]
                            )
                    );


                return Number(
                    (
                        values.reduce(
                            (
                                total,
                                value
                            ) =>
                                total +
                                value,
                            0
                        )
                        /
                        values.length
                    )
                    .toFixed(
                        2
                    )
                );

            }



            /* =================================================
               REVIEWER DISAGREEMENT
               ================================================= */

            let scoreDifference =
                null;


            let significantDifference =
                false;


            if (
                scores.length >=
                2
            ) {

                scoreDifference =
                    Number(
                        (
                            Math.max(
                                ...scores
                            )
                            -
                            Math.min(
                                ...scores
                            )
                        )
                        .toFixed(
                            2
                        )
                    );


                /*
                    Three or more points between
                    reviewers is treated as a
                    significant difference.

                    This NEVER automatically
                    rejects or shortlists anyone.
                */

                significantDifference =
                    scoreDifference >=
                    3;

            }



            /* =================================================
               CAN CURRENT RECRUITER REVIEW?
               ================================================= */

            const canCurrentReviewerEvaluate =

                application.status ===
                    "screening"

                &&

                !application.is_locked

                &&

                (
                    myEvaluation !==
                        null

                    ||

                    reviewCount <
                        requiredReviewers
                );



            /* =================================================
               MAP REVIEWS
               ================================================= */

            const mappedEvaluations =
                evaluations.map(
                    evaluation => ({

                        id:
                            evaluation.id,


                        reviewer: {

                            id:
                                evaluation
                                    .reviewer_id,

                            firstName:
                                evaluation
                                    .reviewer_first_name,

                            lastName:
                                evaluation
                                    .reviewer_last_name,

                            email:
                                evaluation
                                    .reviewer_email

                        },


                        isMine:
                            String(
                                evaluation
                                    .reviewer_id
                            ) ===
                            String(
                                req.session.userId
                            ),


                        ratings: {

                            technicalSkills:
                                Number(
                                    evaluation
                                        .technical_skills_rating
                                ),

                            relevantExperience:
                                Number(
                                    evaluation
                                        .relevant_experience_rating
                                ),

                            qualifications:
                                Number(
                                    evaluation
                                        .qualifications_rating
                                ),

                            overallSuitability:
                                Number(
                                    evaluation
                                        .overall_suitability_rating
                                )

                        },


                        evidenceNotes: {

                            technicalSkills:
                                evaluation
                                    .technical_skills_note,

                            relevantExperience:
                                evaluation
                                    .relevant_experience_note,

                            qualifications:
                                evaluation
                                    .qualifications_note,

                            overallSuitability:
                                evaluation
                                    .overall_suitability_note

                        },


                        feedback:
                            evaluation
                                .feedback,


                        reviewerScore:
                            Number(
                                evaluation
                                    .reviewer_score
                            ),


                        submittedAt:
                            evaluation
                                .submitted_at,


                        updatedAt:
                            evaluation
                                .updated_at,


                        locked:
                            Boolean(
                                evaluation
                                    .locked_at
                            )

                    })
                );



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success:
                    true,


                evaluation: {

                    application: {

                        id:
                            application.id,

                        reference:
                            application
                                .application_reference,

                        status:
                            application.status,


                        candidateName:
                            `${
                                application
                                    .first_name ||
                                ""
                            } ${
                                application
                                    .last_name ||
                                ""
                            }`
                            .trim() ||
                            "Candidate",


                        job: {

                            id:
                                application
                                    .job_id,

                            title:
                                application
                                    .job_title

                        }

                    },


                    progress: {

                        reviewCount,

                        requiredReviewers,

                        isComplete,

                        stage:
                            reviewCount ===
                                0

                                ? "not_started"

                                : isComplete

                                    ? "complete"

                                    : "under_evaluation"

                    },


                    combined: {

                        averageRating,


                        criteria: {

                            technicalSkills:
                                calculateAverage(
                                    "technical_skills_rating"
                                ),

                            relevantExperience:
                                calculateAverage(
                                    "relevant_experience_rating"
                                ),

                            qualifications:
                                calculateAverage(
                                    "qualifications_rating"
                                ),

                            overallSuitability:
                                calculateAverage(
                                    "overall_suitability_rating"
                                )

                        },


                        scoreDifference,

                        significantDifference

                    },


                    canCurrentReviewerEvaluate,


                    currentReviewerHasEvaluation:
                        myEvaluation !==
                        null,


                    evaluations:
                        mappedEvaluations

                }

            });

        }

        catch (error) {

            console.error(
                "Load application evaluations error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to load application evaluations."

            });

        }

    }
);



/* =========================================================
   ADMIN - CREATE / UPDATE MY APPLICATION EVALUATION
   ========================================================= */

app.put(
    "/api/admin/applications/:id/evaluation",
    requirePermission(
        "evaluations.manage"
    ),
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const applicationId =
                req.params.id;


            const {

                technicalSkillsRating,
                relevantExperienceRating,
                qualificationsRating,
                overallSuitabilityRating,

                technicalSkillsNote,
                relevantExperienceNote,
                qualificationsNote,
                overallSuitabilityNote,

                feedback

            } =
                req.body;



            /* =================================================
               NORMALIZE RATINGS
               ================================================= */

            const ratings = {

                technicalSkills:
                    Number(
                        technicalSkillsRating
                    ),

                relevantExperience:
                    Number(
                        relevantExperienceRating
                    ),

                qualifications:
                    Number(
                        qualificationsRating
                    ),

                overallSuitability:
                    Number(
                        overallSuitabilityRating
                    )

            };



            /* =================================================
               VALIDATE RATINGS
               ================================================= */

            const invalidRating =
                Object
                    .values(
                        ratings
                    )
                    .some(
                        rating =>

                            !Number.isInteger(
                                rating
                            )

                            ||

                            rating <
                                1

                            ||

                            rating >
                                10
                    );


            if (
                invalidRating
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Every evaluation rating must be a whole number from 1 to 10."

                });

            }



            /* =================================================
               VALIDATE FEEDBACK
               ================================================= */

            const cleanFeedback =
                String(
                    feedback ||
                    ""
                )
                .trim();


            if (
                !cleanFeedback
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please provide evaluation feedback."

                });

            }



            await client.query(
                "BEGIN"
            );



            /* =================================================
               LOCK APPLICATION
               ================================================= */

            const applicationResult =
                await client.query(
                    `
                    SELECT

                        a.id,
                        a.status,
                        a.is_locked,

                        j.required_reviewers

                    FROM applications a


                    INNER JOIN jobs j

                        ON j.id =
                            a.job_id


                    WHERE
                        a.id = $1


                    FOR UPDATE
                    `,
                    [
                        applicationId
                    ]
                );


            if (
                applicationResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Application not found."

                });

            }


            const application =
                applicationResult.rows[0];



            /* =================================================
               ONLY SCREENING APPLICATIONS CAN BE EVALUATED
               ================================================= */

            if (
                application.status !==
                "screening"
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        "Only applications in Screening can be evaluated."

                });

            }



            if (
                application.is_locked
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        "This application is locked."

                });

            }



            /* =================================================
               CHECK MY EXISTING REVIEW
               ================================================= */

            const existingResult =
                await client.query(
                    `
                    SELECT *

                    FROM application_evaluations

                    WHERE
                        application_id = $1

                    AND
                        reviewer_id = $2

                    FOR UPDATE
                    `,
                    [
                        applicationId,
                        req.session.userId
                    ]
                );


            const existingEvaluation =
                existingResult.rows[0] ||
                null;



            /* =================================================
               CHECK REVIEW CAPACITY

               Same reviewer can edit their own
               review.

               A new reviewer cannot create an
               extra review after the required
               number is already complete.
               ================================================= */

            if (
                !existingEvaluation
            ) {

                const reviewCountResult =
                    await client.query(
                        `
                        SELECT
                            COUNT(*)::INT
                                AS review_count

                        FROM application_evaluations

                        WHERE
                            application_id = $1
                        `,
                        [
                            applicationId
                        ]
                    );


                const reviewCount =
                    Number(
                        reviewCountResult
                            .rows[0]
                            .review_count
                    ) ||
                    0;


                const requiredReviewers =
                    Number(
                        application
                            .required_reviewers
                    ) ||
                    2;


                if (
                    reviewCount >=
                    requiredReviewers
                ) {

                    await client.query(
                        "ROLLBACK"
                    );


                    return res.status(409).json({

                        success:
                            false,

                        message:
                            "The required number of evaluations has already been completed."

                    });

                }

            }



            let savedEvaluation;

            let activityType;

            let activityTitle;



            /* =================================================
               UPDATE EXISTING EVALUATION
               ================================================= */

            if (
                existingEvaluation
            ) {

                if (
                    existingEvaluation
                        .locked_at
                ) {

                    await client.query(
                        "ROLLBACK"
                    );


                    return res.status(409).json({

                        success:
                            false,

                        message:
                            "This evaluation is locked and can no longer be edited."

                    });

                }


/* =============================================
   SAVE OLD VERSION TO AUDIT HISTORY
   ============================================= */

await client.query(
    `
    INSERT INTO application_evaluation_history (

        evaluation_id,
        application_id,
        reviewer_id,

        technical_skills_rating,
        relevant_experience_rating,
        qualifications_rating,
        overall_suitability_rating,

        technical_skills_note,
        relevant_experience_note,
        qualifications_note,
        overall_suitability_note,

        feedback,
        reviewer_score,

        change_type,
        changed_at

    )

    SELECT

        id,
        application_id,
        reviewer_id,

        technical_skills_rating,
        relevant_experience_rating,
        qualifications_rating,
        overall_suitability_rating,

        technical_skills_note,
        relevant_experience_note,
        qualifications_note,
        overall_suitability_note,

        feedback,
        reviewer_score,

        'updated',
        NOW()

    FROM application_evaluations

    WHERE
        id = $1
    `,
    [
        existingEvaluation.id
    ]
);



const updateResult =
    await client.query(
        `
        UPDATE application_evaluations

        SET

            technical_skills_rating =
                $1,

            relevant_experience_rating =
                $2,

            qualifications_rating =
                $3,

            overall_suitability_rating =
                $4,

            technical_skills_note =
                $5,

            relevant_experience_note =
                $6,

            qualifications_note =
                $7,

            overall_suitability_note =
                $8,

            feedback =
                $9,

            updated_at =
                NOW()

        WHERE
            id = $10

        RETURNING *
        `,
        [

            ratings
                .technicalSkills,

            ratings
                .relevantExperience,

            ratings
                .qualifications,

            ratings
                .overallSuitability,


            String(
                technicalSkillsNote ||
                ""
            )
            .trim() ||
            null,


            String(
                relevantExperienceNote ||
                ""
            )
            .trim() ||
            null,


            String(
                qualificationsNote ||
                ""
            )
            .trim() ||
            null,


            String(
                overallSuitabilityNote ||
                ""
            )
            .trim() ||
            null,


            cleanFeedback,

            existingEvaluation.id

        ]
    );


                savedEvaluation =
                    updateResult.rows[0];


                activityType =
                    "evaluation_updated";


                activityTitle =
                    "Evaluation updated";

            }



            /* =================================================
               CREATE NEW EVALUATION
               ================================================= */

            else {

                const insertResult =
                    await client.query(
                        `
                        INSERT INTO application_evaluations (

                            application_id,
                            reviewer_id,

                            technical_skills_rating,
                            relevant_experience_rating,
                            qualifications_rating,
                            overall_suitability_rating,

                            technical_skills_note,
                            relevant_experience_note,
                            qualifications_note,
                            overall_suitability_note,

                            feedback

                        )

                        VALUES (

                            $1,
                            $2,

                            $3,
                            $4,
                            $5,
                            $6,

                            $7,
                            $8,
                            $9,
                            $10,

                            $11

                        )

                        RETURNING *
                        `,
                        [

                            applicationId,
                            req.session.userId,

                            ratings
                                .technicalSkills,

                            ratings
                                .relevantExperience,

                            ratings
                                .qualifications,

                            ratings
                                .overallSuitability,


                            String(
                                technicalSkillsNote ||
                                ""
                            )
                            .trim() ||
                            null,


                            String(
                                relevantExperienceNote ||
                                ""
                            )
                            .trim() ||
                            null,


                            String(
                                qualificationsNote ||
                                ""
                            )
                            .trim() ||
                            null,


                            String(
                                overallSuitabilityNote ||
                                ""
                            )
                            .trim() ||
                            null,


                            cleanFeedback

                        ]
                    );


                savedEvaluation =
                    insertResult.rows[0];


                /* =============================================
                   RECORD CREATED VERSION
                   ============================================= */

                await client.query(
                    `
                    INSERT INTO application_evaluation_history (

                        evaluation_id,
                        application_id,
                        reviewer_id,

                        technical_skills_rating,
                        relevant_experience_rating,
                        qualifications_rating,
                        overall_suitability_rating,

                        technical_skills_note,
                        relevant_experience_note,
                        qualifications_note,
                        overall_suitability_note,

                        feedback,
                        reviewer_score,

                        change_type

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,

                        $4,
                        $5,
                        $6,
                        $7,

                        $8,
                        $9,
                        $10,
                        $11,

                        $12,
                        $13,

                        'created'

                    )
                    `,
                    [

                        savedEvaluation.id,

                        applicationId,

                        req.session.userId,


                        savedEvaluation
                            .technical_skills_rating,

                        savedEvaluation
                            .relevant_experience_rating,

                        savedEvaluation
                            .qualifications_rating,

                        savedEvaluation
                            .overall_suitability_rating,


                        savedEvaluation
                            .technical_skills_note,

                        savedEvaluation
                            .relevant_experience_note,

                        savedEvaluation
                            .qualifications_note,

                        savedEvaluation
                            .overall_suitability_note,


                        savedEvaluation
                            .feedback,

                        savedEvaluation
                            .reviewer_score

                    ]
                );


                activityType =
                    "evaluation_submitted";


                activityTitle =
                    "Evaluation submitted";

            }



            /* =================================================
               INTERNAL APPLICATION ACTIVITY

               Candidate is NOT notified.
               ================================================= */

            await client.query(
                `
                INSERT INTO application_activity (

                    application_id,
                    performed_by,
                    activity_type,
                    title,
                    description

                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
                `,
                [

                    applicationId,

                    req.session.userId,

                    activityType,

                    activityTitle,

                    `Reviewer score: ${savedEvaluation.reviewer_score}/10`

                ]
            );



            /* =================================================
               UPDATED SUMMARY
               ================================================= */

            const summaryResult =
                await client.query(
                    `
                    SELECT

                        COUNT(*)::INT
                            AS review_count,

                        ROUND(
                            AVG(
                                reviewer_score
                            ),
                            2
                        )
                            AS average_rating

                    FROM application_evaluations

                    WHERE
                        application_id = $1
                    `,
                    [
                        applicationId
                    ]
                );


            const reviewCount =
                Number(
                    summaryResult
                        .rows[0]
                        .review_count
                ) ||
                0;


            const requiredReviewers =
                Number(
                    application
                        .required_reviewers
                ) ||
                2;


            const averageRating =
                summaryResult
                    .rows[0]
                    .average_rating ===
                    null

                    ? null

                    : Number(
                        summaryResult
                            .rows[0]
                            .average_rating
                    );



            await client.query(
                "COMMIT"
            );



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success:
                    true,


                message:
                    existingEvaluation

                        ? "Evaluation updated successfully."

                        : "Evaluation submitted successfully.",


                evaluation: {

                    id:
                        savedEvaluation.id,

                    applicationId:
                        savedEvaluation
                            .application_id,

                    reviewerId:
                        savedEvaluation
                            .reviewer_id,


                    ratings: {

                        technicalSkills:
                            Number(
                                savedEvaluation
                                    .technical_skills_rating
                            ),

                        relevantExperience:
                            Number(
                                savedEvaluation
                                    .relevant_experience_rating
                            ),

                        qualifications:
                            Number(
                                savedEvaluation
                                    .qualifications_rating
                            ),

                        overallSuitability:
                            Number(
                                savedEvaluation
                                    .overall_suitability_rating
                            )

                    },


                    reviewerScore:
                        Number(
                            savedEvaluation
                                .reviewer_score
                        ),


                    feedback:
                        savedEvaluation
                            .feedback,


                    reviewCount,

                    requiredReviewers,

                    isComplete:
                        reviewCount >=
                        requiredReviewers,

                    averageRating

                }

            });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (rollbackError) {

                console.error(
                    "Evaluation rollback error:",
                    rollbackError
                );

            }


            /*
                This can happen if two requests race
                to create the same recruiter's review.
            */

            if (
                error.code ===
                "23505"
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "You already have an evaluation for this application."

                });

            }


            console.error(
                "Save application evaluation error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to save the evaluation."

            });

        }

        finally {

            client.release();

        }

    }
);


/* =========================================================
   ADMIN - BULK SHORTLIST APPLICATIONS
   ========================================================= */

app.post(
    "/api/admin/applications/bulk-shortlist",
    requirePermission(
        "applications.manage"
    ),
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const jobId =
                Number(
                    req.body.jobId
                );


            const requestedIds =
                Array.isArray(
                    req.body.applicationIds
                )
                    ? req.body.applicationIds
                    : [];


            /* =================================================
               CLEAN APPLICATION IDS
               ================================================= */

            const applicationIds = [

                ...new Set(

                    requestedIds

                        .map(
                            value =>
                                Number(
                                    value
                                )
                        )

                        .filter(
                            value =>
                                Number.isInteger(
                                    value
                                )
                                &&
                                value >
                                0
                        )

                )

            ];



            /* =================================================
               BASIC VALIDATION
               ================================================= */

            if (
                !Number.isInteger(
                    jobId
                )
                ||
                jobId <=
                    0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select a valid vacancy before shortlisting candidates."

                });

            }


            if (
                applicationIds.length ===
                0
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please select at least one candidate to shortlist."

                });

            }


            /*
                Safety limit for one request.

                This does NOT limit how many
                applicants Altrium can store.

                It only prevents one accidental
                giant bulk request.
            */

            if (
                applicationIds.length >
                250
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "You can shortlist up to 250 candidates in one batch."

                });

            }



            await client.query(
                "BEGIN"
            );



            /* =================================================
               VERIFY VACANCY
               ================================================= */

            const jobResult =
                await client.query(
                    `
                    SELECT

                        id,
                        job_title,
                        required_reviewers

                    FROM jobs

                    WHERE id = $1
                    `,
                    [
                        jobId
                    ]
                );


            if (
                jobResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(404).json({

                    success:
                        false,

                    message:
                        "The selected vacancy could not be found."

                });

            }


            const job =
                jobResult.rows[0];



            /* =================================================
               LOCK ALL SELECTED APPLICATIONS

               IMPORTANT:
               The filter intentionally does NOT
               restrict job_id here.

               We load every supplied ID first so
               we can detect mixed-vacancy requests.
               ================================================= */

            const applicationResult =
                await client.query(
                    `
                    SELECT

                        a.id,

                        a.application_reference,

                        a.candidate_id,

                        a.job_id,

                        a.status,

                        a.is_locked,


                        u.first_name
                            AS candidate_first_name,

                        u.last_name
                            AS candidate_last_name,

                        u.email
                            AS candidate_email


                    FROM applications a


                    INNER JOIN users u

                        ON u.id =
                            a.candidate_id


                    WHERE

                        a.id =
                        ANY(
                            $1::BIGINT[]
                        )


                    ORDER BY
                        a.id ASC


                    FOR UPDATE OF a
                    `,
                    [
                        applicationIds
                    ]
                );


            const applications =
                applicationResult.rows;



            /* =================================================
               EVERY APPLICATION MUST EXIST
               ================================================= */

            if (
                applications.length !==
                applicationIds.length
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        "One or more selected applications no longer exist. Refresh the Applicants page and try again."

                });

            }



            /* =================================================
               EVERY APPLICATION MUST BELONG
               TO THE SAME SELECTED VACANCY
               ================================================= */

            const wrongVacancyApplication =
                applications.find(
                    application =>
                        Number(
                            application.job_id
                        ) !==
                        jobId
                );


            if (
                wrongVacancyApplication
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        "Bulk shortlisting can only contain candidates from one vacancy."

                });

            }



            /* =================================================
               APPLICATIONS MUST STILL BE SCREENING
               ================================================= */

            const invalidStatusApplication =
                applications.find(
                    application =>
                        application.status !==
                        "screening"
                );


            if (
                invalidStatusApplication
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        `Application ${invalidStatusApplication.application_reference} is no longer eligible for shortlisting. Refresh the applicant list and review the selection.`

                });

            }



            /* =================================================
               LOCKED APPLICATIONS CANNOT CHANGE
               ================================================= */

            const lockedApplication =
                applications.find(
                    application =>
                        Boolean(
                            application.is_locked
                        )
                );


            if (
                lockedApplication
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        `Application ${lockedApplication.application_reference} is locked and cannot be shortlisted.`

                });

            }



            /* =================================================
               LOAD EVALUATION COUNTS

               Distinct reviewer IDs are counted.
               One recruiter can never count twice.
               ================================================= */

            const evaluationResult =
                await client.query(
                    `
                    SELECT

                        a.id
                            AS application_id,


                        j.required_reviewers,


                        COUNT(
                            DISTINCT e.reviewer_id
                        )::INT
                            AS review_count,


                        ROUND(
                            AVG(
                                e.reviewer_score
                            ),
                            2
                        )
                            AS average_rating


                    FROM applications a


                    INNER JOIN jobs j

                        ON j.id =
                            a.job_id


                    LEFT JOIN application_evaluations e

                        ON e.application_id =
                            a.id


                    WHERE

                        a.id =
                        ANY(
                            $1::BIGINT[]
                        )


                    GROUP BY

                        a.id,

                        j.required_reviewers
                    `,
                    [
                        applicationIds
                    ]
                );



            const evaluationMap =
                new Map(
                    evaluationResult
                        .rows
                        .map(
                            evaluation => [

                                String(
                                    evaluation
                                        .application_id
                                ),

                                evaluation

                            ]
                        )
                );



            /* =================================================
               VERIFY REQUIRED REVIEWS
               ================================================= */

            const incompleteApplication =
                applications.find(
                    application => {

                        const evaluation =
                            evaluationMap.get(
                                String(
                                    application.id
                                )
                            );


                        const reviewCount =
                            Number(
                                evaluation
                                    ?.review_count
                            ) ||
                            0;


                        const requiredReviewers =
                            Number(
                                evaluation
                                    ?.required_reviewers
                            ) ||
                            Number(
                                job.required_reviewers
                            ) ||
                            2;


                        return (
                            reviewCount <
                            requiredReviewers
                        );

                    }
                );


            if (
                incompleteApplication
            ) {

                const evaluation =
                    evaluationMap.get(
                        String(
                            incompleteApplication.id
                        )
                    );


                const reviewCount =
                    Number(
                        evaluation
                            ?.review_count
                    ) ||
                    0;


                const requiredReviewers =
                    Number(
                        evaluation
                            ?.required_reviewers
                    ) ||
                    Number(
                        job.required_reviewers
                    ) ||
                    2;


                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success:
                        false,

                    message:
                        `Application ${incompleteApplication.application_reference} has only ${reviewCount} of ${requiredReviewers} required evaluations.`

                });

            }



            /* =================================================
               MOVE ALL APPLICATIONS TO SHORTLISTED
               ================================================= */

            await client.query(
                `
                UPDATE applications

                SET

                    status =
                        'shortlisted',

                    updated_at =
                        NOW()

                WHERE

                    id =
                    ANY(
                        $1::BIGINT[]
                    )
                `,
                [
                    applicationIds
                ]
            );



            /* =================================================
               LOCK ALL COMPLETED EVALUATIONS

               Evaluation evidence is preserved
               once the shortlist decision is made.
               ================================================= */

            await client.query(
                `
                UPDATE application_evaluations

                SET

                    locked_at =
                        COALESCE(
                            locked_at,
                            NOW()
                        )

                WHERE

                    application_id =
                    ANY(
                        $1::BIGINT[]
                    )
                `,
                [
                    applicationIds
                ]
            );



            /* =================================================
               STATUS HISTORY
               ================================================= */

            await client.query(
                `
                INSERT INTO application_status_history (

                    application_id,

                    previous_status,

                    new_status,

                    changed_by,

                    status_note

                )


                SELECT

                    id,

                    'screening',

                    'shortlisted',

                    $2,

                    'Candidate shortlisted through bulk shortlist review.'


                FROM applications


                WHERE

                    id =
                    ANY(
                        $1::BIGINT[]
                    )
                `,
                [
                    applicationIds,
                    req.session.userId
                ]
            );



            /* =================================================
               APPLICATION ACTIVITY
               ================================================= */

            await client.query(
                `
                INSERT INTO application_activity (

                    application_id,

                    performed_by,

                    activity_type,

                    title,

                    description

                )


                SELECT

                    id,

                    $2,

                    'status_change',

                    'Candidate shortlisted',

                    'Screening → shortlisted through bulk shortlist review.'


                FROM applications


                WHERE

                    id =
                    ANY(
                        $1::BIGINT[]
                    )
                `,
                [
                    applicationIds,
                    req.session.userId
                ]
            );



            /* =================================================
               CANDIDATE NOTIFICATIONS
               ================================================= */

            await client.query(
                `
                INSERT INTO notifications (

                    user_id,

                    notification_type,

                    title,

                    message,

                    application_id,

                    job_id,

                    action_url

                )


                SELECT

                    a.candidate_id,

                    'application_shortlisted',

                    'You''ve been shortlisted',

                    'Your application for '
                        ||
                    j.job_title
                        ||
                    ' has been shortlisted and is moving forward.',

                    a.id,

                    a.job_id,

                    '/application-progress.html?id='
                        ||
                    a.id::TEXT


                FROM applications a


                INNER JOIN jobs j

                    ON j.id =
                        a.job_id


                WHERE

                    a.id =
                    ANY(
                        $1::BIGINT[]
                    )
                `,
                [
                    applicationIds
                ]
            );



            /* =================================================
               COMMIT DATABASE CHANGES

               Everything above is all-or-nothing.
               ================================================= */

            await client.query(
                "COMMIT"
            );



            /* =================================================
               SEND EMAILS AFTER COMMIT

               Email failure must NOT undo a valid
               recruitment decision.

               Process in small batches so a large
               shortlist does not hammer the mail
               provider all at once.
               ================================================= */

            let emailsSent =
                0;


            let emailsFailed =
                0;


            const emailBatchSize =
                5;


            for (
                let start = 0;

                start <
                applications.length;

                start +=
                emailBatchSize
            ) {

                const batch =
                    applications.slice(
                        start,
                        start +
                        emailBatchSize
                    );


                const results =
                    await Promise.allSettled(

                        batch.map(
                            application => {

                                const candidateName =
                                    `${
                                        application
                                            .candidate_first_name ||
                                        ""
                                    } ${
                                        application
                                            .candidate_last_name ||
                                        ""
                                    }`
                                    .trim() ||
                                    "Candidate";


                                return sendShortlistedCandidateEmail({

                                    candidateName,

                                    candidateEmail:
                                        application
                                            .candidate_email,

                                    applicationId:
                                        application.id,

                                    applicationReference:
                                        application
                                            .application_reference,

                                    jobTitle:
                                        job.job_title

                                });

                            }
                        )

                    );


                results.forEach(
                    result => {

                        if (
                            result.status ===
                            "fulfilled"
                        ) {

                            emailsSent +=
                                1;

                        }

                        else {

                            emailsFailed +=
                                1;


                            console.error(
                                "Bulk shortlist email error:",
                                result.reason
                            );

                        }

                    }
                );

            }



            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success:
                    true,


                message:
                    `${applications.length} ${
                        applications.length ===
                        1
                            ? "candidate has"
                            : "candidates have"
                    } been shortlisted successfully.`,


                shortlist: {

                    job: {

                        id:
                            job.id,

                        title:
                            job.job_title

                    },


                    count:
                        applications.length,


                    applicationIds:
                        applications.map(
                            application =>
                                application.id
                        ),


                    emails: {

                        sent:
                            emailsSent,

                        failed:
                            emailsFailed

                    }

                }

            });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (rollbackError) {

                /*
                    ROLLBACK can fail here if the
                    transaction already committed.

                    That is harmless.
                */

            }


            console.error(
                "Bulk shortlist error:",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to shortlist the selected candidates."

            });

        }

        finally {

            client.release();

        }

    }
);


/* =========================================================
   ADMIN - CHANGE APPLICATION STATUS
   ========================================================= */

app.patch(
    "/api/admin/applications/:id/status",
    requirePermission(
        "applications.manage"
    ),
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const applicationId =
                req.params.id;


            const newStatus =
                String(
                    req.body.status || ""
                )
                .trim()
                .toLowerCase();


            /* =================================================
               VALID STATUSES
               ================================================= */

            const validStatuses = [
                "submitted",
                "screening",
                "shortlisted",
                "interview",
                "offer",
                "hired",
                "rejected",
                "withdrawn"
            ];


            if (
                !validStatuses.includes(
                    newStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid application status."

                });

            }


            await client.query(
                "BEGIN"
            );


            /* =================================================
               LOCK APPLICATION
               ================================================= */

            const applicationResult =
                await client.query(
                    `
                    SELECT

                        a.id,
                        a.application_reference,
                        a.candidate_id,
                        a.job_id,
                        a.status,
                        a.is_locked,

                        j.job_title,
                        j.required_reviewers,

                        u.email AS candidate_email,
                        u.first_name AS candidate_first_name

                    FROM applications a

                    INNER JOIN jobs j
                        ON j.id = a.job_id

                    INNER JOIN users u
                        ON u.id = a.candidate_id

                    WHERE a.id = $1

                    FOR UPDATE
                    `,
                    [
                        applicationId
                    ]
                );


            if (
                applicationResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(404).json({

                    success: false,

                    message:
                        "Application not found."

                });

            }


            const application =
                applicationResult.rows[0];


            const previousStatus =
                application.status;



            /* =================================================
               DO NOT CHANGE LOCKED APPLICATION
               ================================================= */

            if (
                application.is_locked
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(409).json({

                    success: false,

                    message:
                        "This application is locked."

                });

            }



            /* =================================================
               SAME STATUS
               ================================================= */

            if (
                previousStatus ===
                newStatus
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "Application is already at this status."

                });

            }



            /* =================================================
               ALLOWED STATUS TRANSITIONS
               ================================================= */

            const allowedTransitions = {

                submitted: [
                    "screening",
                    "rejected"
                ],

                screening: [
                    "shortlisted",
                    "rejected"
                ],

                shortlisted: [
                    "rejected"
                ],

                interview: [
                    "offer",
                    "rejected"
                ],

                offer: [
                    "hired",
                    "rejected"
                ],

                hired: [],

                rejected: [],

                withdrawn: []

            };


            const allowedNextStatuses =
                allowedTransitions[
                    previousStatus
                ] || [];


            if (
                !allowedNextStatuses.includes(
                    newStatus
                )
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success: false,

                    message:
                        `Cannot move application from ${previousStatus} to ${newStatus}.`

                });

            }



            /*
                Managers must not manually mark an
                application as withdrawn.

                Withdrawal will later have its own
                candidate-controlled endpoint.
            */

            if (
                newStatus ===
                "withdrawn"
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(403).json({

                    success: false,

                    message:
                        "Only the candidate can withdraw an application."

                });

            }


/* =================================================
   SHORTLISTING REQUIRES COMPLETED EVALUATIONS
   ================================================= */

if (
    newStatus ===
    "shortlisted"
) {

    const evaluationCountResult =
        await client.query(
            `
            SELECT
                COUNT(
                    DISTINCT reviewer_id
                )::INT
                    AS review_count

            FROM application_evaluations

            WHERE
                application_id = $1
            `,
            [
                applicationId
            ]
        );


    const reviewCount =
        Number(
            evaluationCountResult
                .rows[0]
                .review_count
        ) ||
        0;


    const requiredReviewers =
        Number(
            application
                .required_reviewers
        ) ||
        2;


    if (
        reviewCount <
        requiredReviewers
    ) {

        await client.query(
            "ROLLBACK"
        );


        return res.status(409).json({

            success:
                false,

            message:
                `This application requires ${requiredReviewers} completed evaluations before it can be shortlisted. Currently ${reviewCount} of ${requiredReviewers} are complete.`

        });

    }

}


            /* =================================================
               STATUS INFORMATION
               ================================================= */

            const statusMessages = {

                screening: {
                    title:
                        "Application update",

                    message:
                        `Your application for ${application.job_title} has moved to Screening.`,

                    history:
                        "Application moved to screening."
                },


                shortlisted: {
                    title:
                        "You've been shortlisted",

                    message:
                        `Your application for ${application.job_title} has been shortlisted and is moving forward.`,

                    history:
                        "Candidate shortlisted."
                },


                interview: {
                    title:
                        "Application update",

                    message:
                        `Your application for ${application.job_title} has moved to the Interview stage.`,

                    history:
                        "Application moved to interview stage."
                },


                offer: {
                    title:
                        "Offer stage",

                    message:
                        `Your application for ${application.job_title} has progressed to the Offer stage.`,

                    history:
                        "Application moved to offer stage."
                },


                hired: {
                    title:
                        "Congratulations!",

                    message:
                        `Your application for ${application.job_title} has reached the Hired stage.`,

                    history:
                        "Candidate marked as hired."
                },


                rejected: {
                    title:
                        "Application update",

                    message:
                        `Your application for ${application.job_title} will not be moving forward.`,

                    history:
                        "Application rejected."
                }

            };


            const statusInfo =
                statusMessages[
                    newStatus
                ];



            /* =================================================
               UPDATE APPLICATION
               ================================================= */

            await client.query(
                `
                UPDATE applications

                SET
                    status = $1,
                    updated_at = NOW()

                WHERE id = $2
                `,
                [
                    newStatus,
                    applicationId
                ]
            );

                
             /* =================================================
                LOCK EVALUATIONS AFTER SHORTLISTING
                ================================================= */

                if (
                    newStatus ===
                    "shortlisted"
                ) {

                    await client.query(
                        `
                        UPDATE application_evaluations

                        SET
                            locked_at =
                                COALESCE(
                                    locked_at,
                                    NOW()
                                )

                        WHERE
                            application_id = $1
                        `,
                        [
                            applicationId
                        ]
                    );

                }


            /* =================================================
               STATUS HISTORY
               ================================================= */

            await client.query(
                `
                INSERT INTO application_status_history (

                    application_id,
                    previous_status,
                    new_status,
                    changed_by,
                    status_note

                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
                `,
                [
                    applicationId,
                    previousStatus,
                    newStatus,
                    req.session.userId,
                    statusInfo.history
                ]
            );



            /* =================================================
               APPLICATION ACTIVITY
               ================================================= */

            await client.query(
                `
                INSERT INTO application_activity (

                    application_id,
                    performed_by,
                    activity_type,
                    title,
                    description

                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5
                )
                `,
                [
                    applicationId,
                    req.session.userId,
                    "status_change",
                    "Application status changed",
                    `${previousStatus} → ${newStatus}`
                ]
            );



            /* =================================================
               NOTIFY CANDIDATE
               ================================================= */

            await client.query(
                `
                INSERT INTO notifications (

                    user_id,
                    notification_type,
                    title,
                    message,
                    application_id,
                    job_id,
                    action_url

                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7
                )
                `,
                [
                    application.candidate_id,
                    `application_${newStatus}`,
                    statusInfo.title,
                    statusInfo.message,
                    applicationId,
                    application.job_id,
                    `/application-progress.html?id=${applicationId}`
                ]
            );



            await client.query(
                "COMMIT"
            );


            /*  =================================================
                EMAIL CANDIDATE WHEN SHORTLISTED
                ================================================= */

                if (
                    newStatus === "shortlisted"
                ) {

                    try {

                        const candidateName =
                            application.candidate_first_name ||
                            "Candidate";

                        const ALTRIUM_LOGO_URL =
                            process.env.ALTRIUM_EMAIL_LOGO_URL;

                        const emailInfo =
                            await transporter.sendMail({

                                from:
                                    `"Altrium" <${process.env.EMAIL_FROM}>`,

                                to:
                                    application.candidate_email,

                                subject:
                                    `You've been shortlisted for ${application.job_title} | Altrium`,

                                text: `
                Hi ${candidateName},

                Good news — your application for ${application.job_title} has been shortlisted.

                Application reference:
                ${application.application_reference}

                Your profile stood out to our team and your application is now moving forward in the recruitment process.

                Your interview details will be shared with you soon.

                Once the interview is scheduled, the date, time, interview type, and meeting details will be sent to you by email and will also be available in your Altrium account.

                Please keep an eye on your email and your Altrium notifications for the next update.

                Best regards,
                Altrium Recruitment
                                `.trim(),

                                html: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Application shortlisted</title>
                </head>
                <body style="margin:0; padding:0; background-color:#0a0a0a; font-family:Arial, Helvetica, sans-serif; color:#f5f5f5;">

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a; margin:0; padding:40px 0;">
                        <tr>
                            <td align="center">

                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:linear-gradient(180deg, #111111 0%, #0b0b0b 100%); border:1px solid rgba(255,255,255,0.08); border-radius:24px; overflow:hidden;">

                                    <!-- HEADER -->
                                    <tr>
                                        <td style="padding:32px 36px 20px 36px; border-bottom:1px solid rgba(255,255,255,0.06);">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td align="left">
                                                        <img
                                                            src="${ALTRIUM_LOGO_URL}"
                                                            alt="Altrium"
                                                            style="height:34px; width:auto; display:block;"
                                                        >
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- HERO -->
                                    <tr>
                                        <td style="padding:36px;">
                                            <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#9b9b9b; font-weight:700; margin-bottom:14px;">
                                                Application update
                                            </div>

                                            <h1 style="margin:0 0 16px 0; font-size:38px; line-height:1.15; font-weight:800; color:#f8f8f8;">
                                                You've been <span style="color:#ff8a1f;">shortlisted.</span>
                                            </h1>

                                            <p style="margin:0; font-size:16px; line-height:1.8; color:#cfcfcf;">
                                                Hi <strong style="color:#ffffff;">${candidateName}</strong>,
                                                <br><br>
                                                Great news! your application for
                                                <strong style="color:#ffffff;">${application.job_title}</strong>
                                                has been shortlisted and is moving forward in our recruitment process.
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- INFO BOX -->
                                    <tr>
                                        <td style="padding:0 36px 24px 36px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg, rgba(255,138,31,0.10) 0%, rgba(255,138,31,0.04) 100%); border:1px solid rgba(255,138,31,0.22); border-radius:18px;">
                                                <tr>
                                                    <td style="padding:22px 24px;">
                                                        <div style="font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#ffb15c; font-weight:700; margin-bottom:12px;">
                                                            What happens next
                                                        </div>

                                                        <p style="margin:0 0 14px 0; font-size:15px; line-height:1.8; color:#dfdfdf;">
                                                            Your interview details will be shared with you soon.
                                                        </p>

                                                        <p style="margin:0; font-size:15px; line-height:1.8; color:#dfdfdf;">
                                                            Once scheduled, the <strong style="color:#ffffff;">date</strong>,
                                                            <strong style="color:#ffffff;">time</strong>,
                                                            <strong style="color:#ffffff;">interview type</strong>,
                                                            and <strong style="color:#ffffff;">meeting details</strong>
                                                            will be sent to you by email and will also appear in your
                                                            <strong style="color:#ffffff;">Altrium application progress page</strong>.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- REFERENCE + ROLE -->
                                    <tr>
                                        <td style="padding:0 36px 24px 36px;">
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="width:50%; padding-right:8px;">
                                                        <div style="background:#161616; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:18px 20px;">
                                                            <div style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:#8c8c8c; font-weight:700; margin-bottom:8px;">
                                                                Position
                                                            </div>
                                                            <div style="font-size:18px; font-weight:700; color:#ffffff;">
                                                                ${application.job_title}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td style="width:50%; padding-left:8px;">
                                                        <div style="background:#161616; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:18px 20px;">
                                                            <div style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:#8c8c8c; font-weight:700; margin-bottom:8px;">
                                                                Application reference
                                                            </div>
                                                            <div style="font-size:18px; font-weight:800; color:#ff9a35;">
                                                                ${application.application_reference}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <!-- CTA -->
                                    <tr>
                                        <td style="padding:0 36px 32px 36px;">
                                            <a
                                                href="http://localhost:3000/application-progress.html?id=${application.id}"
                                                style="display:inline-block; background:linear-gradient(90deg, #ff8a1f 0%, #f3be5f 100%); color:#111111; text-decoration:none; font-size:15px; font-weight:800; padding:15px 28px; border-radius:999px;"
                                            >
                                                View application progress
                                            </a>
                                        </td>
                                    </tr>

                                    <!-- FOOTER -->
                                    <tr>
                                        <td style="padding:24px 36px 34px 36px; border-top:1px solid rgba(255,255,255,0.06);">
                                            <p style="margin:0 0 10px 0; font-size:14px; line-height:1.7; color:#b9b9b9;">
                                                Please keep an eye on your email and Altrium notifications for further updates.
                                            </p>

                                            <p style="margin:0; font-size:13px; color:#7f7f7f; line-height:1.7;">
                                                Altrium Recruitment Team
                                            </p>
                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>
                    </table>

                </body>
                </html>
                                `

                            });


                        console.log(
                            "Shortlisted email sent:",
                            emailInfo.messageId,
                            "to:",
                            application.candidate_email
                        );

                    }

                    catch (emailError) {

                        console.error(
                            "Shortlisted email error:",
                            emailError
                        );

                    }

                }

                    /*  =========================================================
                    FORMAT INTERVIEW EMAIL DATE
                    ========================================================= */

                function formatInterviewEmailDate(
                    value
                ) {

                    return new Intl.DateTimeFormat(
                        "en-GB",
                        {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            timeZone: "Asia/Colombo"
                        }
                    ).format(
                        new Date(value)
                    );

                }



                /* =========================================================
                FORMAT INTERVIEW EMAIL TIME
                ========================================================= */

                function formatInterviewEmailTime(
                    value
                ) {

                    return new Intl.DateTimeFormat(
                        "en-US",
                        {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Asia/Colombo"
                        }
                    ).format(
                        new Date(value)
                    );

                }


            return res.json({

                success: true,

                message:
                    "Application status updated successfully.",

                application: {

                    id:
                        applicationId,

                    reference:
                        application
                            .application_reference,

                    previousStatus,

                    status:
                        newStatus

                }

            });

        }

        catch (error) {

            await client.query(
                "ROLLBACK"
            );


            console.error(
                "Update application status error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update application status."

            });

        }

        finally {

            client.release();

        }

    }
);


/* =========================================================
   ADMIN - LOAD INTERVIEW SESSIONS
   ========================================================= */

app.get(
    "/api/admin/interview-sessions",
    requirePermission(
        "interviews.view"
    ),
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        s.id,
                        s.job_id,
                        s.title,
                        s.interview_round,
                        s.session_date,
                        s.start_time,
                        s.end_time,
                        s.timezone,
                        s.duration_minutes,
                        s.break_minutes,
                        s.interview_type,
                        s.assignment_method,
                        s.location,
                        s.instructions,
                        s.status,
                        s.confirmed_at,
                        s.created_at,

                        j.job_title,
                        j.department,
                        j.location AS job_location,

                        COUNT(sl.id)
                            AS total_slots,

                        COUNT(sl.id)
                            FILTER (
                                WHERE sl.status = 'booked'
                            )
                            AS booked_slots,

                        COUNT(sl.id)
                            FILTER (
                                WHERE sl.status = 'available'
                            )
                            AS available_slots

                    FROM interview_sessions s

                    INNER JOIN jobs j
                        ON j.id = s.job_id

                    LEFT JOIN interview_session_slots sl
                        ON sl.session_id = s.id

                    GROUP BY
                        s.id,
                        j.id

                    ORDER BY
                        s.session_date ASC,
                        s.start_time ASC
                    `
                );


            return res.json({

                success: true,

                sessions:
                    result.rows.map(
                        session => ({

                            id:
                                session.id,

                            title:
                                session.title,

                            round:
                                session
                                    .interview_round,

                            date:
                                session
                                    .session_date,

                            startTime:
                                session
                                    .start_time,

                            endTime:
                                session
                                    .end_time,

                            timezone:
                                session.timezone,

                            durationMinutes:
                                session
                                    .duration_minutes,

                            breakMinutes:
                                session
                                    .break_minutes,

                            interviewType:
                                session
                                    .interview_type,

                            assignmentMethod:
                                session
                                    .assignment_method,

                            location:
                                session.location,

                            instructions:
                                session.instructions,

                            status:
                                session.status,

                            confirmedAt:
                                session
                                    .confirmed_at,

                            createdAt:
                                session
                                    .created_at,

                            job: {

                                id:
                                    session.job_id,

                                title:
                                    session.job_title,

                                department:
                                    session.department,

                                location:
                                    session
                                        .job_location

                            },

                            slots: {

                                total:
                                    Number(
                                        session
                                            .total_slots
                                    ),

                                booked:
                                    Number(
                                        session
                                            .booked_slots
                                    ),

                                available:
                                    Number(
                                        session
                                            .available_slots
                                    )

                            }

                        })
                    )

            });

        }

        catch (error) {

            console.error(
                "Load interview sessions error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load interview sessions."

            });

        }

    }
);

/* =========================================================
   ADMIN - VIEW SINGLE INTERVIEW SESSION
   ========================================================= */

app.get(
    "/api/admin/interview-sessions/:id",
    requirePermission(
        "interviews.view"
    ),
    async (req, res) => {

        try {

            const sessionId =
                req.params.id;


            /* =================================================
               LOAD SESSION
               ================================================= */

            const sessionResult =
                await pool.query(
                    `
                    SELECT

                        s.id,
                        s.job_id,
                        s.title,
                        s.interview_round,
                        s.session_date,
                        s.start_time,
                        s.end_time,
                        s.timezone,
                        s.duration_minutes,
                        s.break_minutes,
                        s.interview_type,
                        s.assignment_method,
                        s.location,
                        s.instructions,
                        s.status,
                        s.confirmed_at,
                        s.created_at,
                        s.updated_at,

                        j.job_title,
                        j.department,
                        j.location AS job_location,
                        j.employment_type

                    FROM interview_sessions s

                    INNER JOIN jobs j
                        ON j.id = s.job_id

                    WHERE s.id = $1

                    LIMIT 1
                    `,
                    [
                        sessionId
                    ]
                );


            if (
                sessionResult.rows.length ===
                0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Interview session not found."

                });

            }


            const session =
                sessionResult.rows[0];


            /* =================================================
               LOAD SESSION SLOTS + CANDIDATES
               ================================================= */

            const slotResult =
                await pool.query(
                    `
                    SELECT

                        sl.id,
                        sl.slot_number,
                        sl.scheduled_start,
                        sl.scheduled_end,
                        sl.status,
                        sl.assigned_at,
                        sl.application_id,

                        a.application_reference,
                        a.status AS application_status,
                        a.applied_at,

                        av.first_name,
                        av.last_name,
                        av.email,
                        av.phone_number

                    FROM interview_session_slots sl

                    LEFT JOIN applications a
                        ON a.id =
                            sl.application_id

                    LEFT JOIN application_versions av
                        ON av.application_id =
                            a.id

                        AND av.version_number =
                            a.current_version_number

                    WHERE sl.session_id = $1

                    ORDER BY
                        sl.slot_number ASC
                    `,
                    [
                        sessionId
                    ]
                );


            /* =================================================
               RESPONSE
               ================================================= */

            return res.json({

                success: true,

                session: {

                    id:
                        session.id,

                    title:
                        session.title,

                    round:
                        session.interview_round,

                    date:
                        session.session_date,

                    startTime:
                        session.start_time,

                    endTime:
                        session.end_time,

                    timezone:
                        session.timezone,

                    durationMinutes:
                        session.duration_minutes,

                    breakMinutes:
                        session.break_minutes,

                    interviewType:
                        session.interview_type,

                    assignmentMethod:
                        session.assignment_method,

                    location:
                        session.location,

                    instructions:
                        session.instructions,

                    status:
                        session.status,

                    confirmedAt:
                        session.confirmed_at,

                    createdAt:
                        session.created_at,

                    updatedAt:
                        session.updated_at,


                    job: {

                        id:
                            session.job_id,

                        title:
                            session.job_title,

                        department:
                            session.department,

                        location:
                            session.job_location,

                        employmentType:
                            session.employment_type

                    },


                    slots:
                        slotResult.rows.map(
                            slot => ({

                                id:
                                    slot.id,

                                slotNumber:
                                    slot.slot_number,

                                scheduledStart:
                                    slot.scheduled_start,

                                scheduledEnd:
                                    slot.scheduled_end,

                                status:
                                    slot.status,

                                assignedAt:
                                    slot.assigned_at,


                                candidate:
                                    slot.application_id
                                        ? {

                                            applicationId:
                                                slot.application_id,

                                            reference:
                                                slot.application_reference,

                                            applicationStatus:
                                                slot.application_status,

                                            appliedAt:
                                                slot.applied_at,

                                            firstName:
                                                slot.first_name,

                                            lastName:
                                                slot.last_name,

                                            email:
                                                slot.email,

                                            phoneNumber:
                                                slot.phone_number

                                        }
                                        : null

                            })
                        )

                }

            });

        }

        catch (error) {

            console.error(
                "Load interview session detail error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load interview session."

            });

        }

    }
);


/* =========================================================
   ADMIN - INTERVIEW SESSION VACANCY OPTIONS
   ========================================================= */

app.get(
    "/api/admin/interview-session-options",
    requirePermission(
        "interviews.manage"
    ),
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT

                        j.id,
                        j.job_title,
                        j.department,
                        j.location,
                        j.employment_type,
                        j.status,

                        COUNT(a.id)
                            FILTER (
                                WHERE a.status = 'shortlisted'
                            )
                            AS shortlisted_count

                    FROM jobs j

                    LEFT JOIN applications a
                        ON a.job_id = j.id

                    GROUP BY
                        j.id

                    HAVING
                        COUNT(a.id)
                            FILTER (
                                WHERE a.status = 'shortlisted'
                            ) > 0

                    ORDER BY
                        j.job_title ASC
                    `
                );


            return res.json({

                success: true,

                jobs:
                    result.rows.map(
                        job => ({

                            id:
                                job.id,

                            title:
                                job.job_title,

                            department:
                                job.department,

                            location:
                                job.location,

                            employmentType:
                                job.employment_type,

                            status:
                                job.status,

                            shortlistedCount:
                                Number(
                                    job.shortlisted_count
                                )

                        })
                    )

            });

        }

        catch (error) {

            console.error(
                "Load interview session options error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load interview session options."

            });

        }

    }
);

/* =========================================================
   ADMIN - CREATE DRAFT INTERVIEW SESSION
   ========================================================= */

app.post(
    "/api/admin/interview-sessions",
    requirePermission(
        "interviews.manage"
    ),
    async (req, res) => {

        const client =
            await pool.connect();


        try {

            const {
                jobId,
                sessionDate,
                interviewRound,
                startTime,
                endTime,
                durationMinutes,
                breakMinutes,
                interviewType,
                assignmentMethod,
                location,
                instructions
            } = req.body;


            const round =
                Number(interviewRound);


            const duration =
                Number(durationMinutes);


            const breakLength =
                Number(breakMinutes);


            const allowedInterviewTypes = [
                "online",
                "onsite",
                "phone"
            ];


            const allowedAssignmentMethods = [
                "fifo",
                "random",
                "manual"
            ];


            /* =================================================
               BASIC VALIDATION
               ================================================= */

            if (
                !jobId ||
                !sessionDate ||
                !startTime ||
                !endTime
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please complete the interview schedule."

                });

            }


            if (
                !Number.isInteger(round) ||
                round < 1 ||
                round > 20
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid interview round."

                });

            }


            if (
                !Number.isInteger(duration) ||
                duration < 5 ||
                duration > 240
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a valid interview duration."

                });

            }


            if (
                !Number.isInteger(breakLength) ||
                breakLength < 0 ||
                breakLength > 120
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a valid interview break."

                });

            }


            if (
                !allowedInterviewTypes.includes(
                    interviewType
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a valid interview type."

                });

            }


            if (
                !allowedAssignmentMethods.includes(
                    assignmentMethod
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a valid assignment method."

                });

            }


            if (
                interviewType === "onsite" &&
                !location?.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter the onsite interview location."

                });

            }



            /* =================================================
               TIME HELPERS
               ================================================= */

            const parseTime =
                value => {

                    const match =
                        String(value || "")
                            .match(
                                /^([01]\d|2[0-3]):([0-5]\d)$/
                            );


                    if (!match) {

                        return null;

                    }


                    return (
                        Number(match[1]) * 60 +
                        Number(match[2])
                    );

                };


            const minutesToTime =
                totalMinutes => {

                    const hours =
                        Math.floor(
                            totalMinutes / 60
                        );


                    const minutes =
                        totalMinutes % 60;


                    return (
                        `${String(hours).padStart(2, "0")}:` +
                        `${String(minutes).padStart(2, "0")}`
                    );

                };


            const startMinutes =
                parseTime(startTime);


            const endMinutes =
                parseTime(endTime);


            if (
                startMinutes === null ||
                endMinutes === null ||
                endMinutes <= startMinutes
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a valid interview time window."

                });

            }



            /* =================================================
               GENERATE SLOTS ON SERVER

               Never trust browser-calculated slots.
               ================================================= */

            const generatedSlots =
                [];


            let cursor =
                startMinutes;


            let slotNumber =
                1;


            while (
                cursor + duration <=
                endMinutes
            ) {

                generatedSlots.push({

                    number:
                        slotNumber,

                    startTime:
                        minutesToTime(
                            cursor
                        ),

                    endTime:
                        minutesToTime(
                            cursor +
                            duration
                        )

                });


                cursor +=
                    duration +
                    breakLength;


                slotNumber +=
                    1;

            }


            if (
                generatedSlots.length ===
                0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "The selected time window cannot fit any interviews."

                });

            }



            /* =================================================
               BEGIN TRANSACTION
               ================================================= */

            await client.query(
                "BEGIN"
            );



            /* =================================================
               DATE MUST NOT BE IN THE PAST
               Sri Lanka recruitment timezone.
               ================================================= */

            const dateCheck =
                await client.query(
                    `
                    SELECT
                        $1::date <
                        (
                            NOW()
                            AT TIME ZONE
                            'Asia/Colombo'
                        )::date
                        AS is_past
                    `,
                    [
                        sessionDate
                    ]
                );


            if (
                dateCheck.rows[0].is_past
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "Interview date cannot be in the past."

                });

            }



            /* =================================================
               LOAD VACANCY
               ================================================= */

            const jobResult =
                await client.query(
                    `
                    SELECT
                        id,
                        job_title,
                        department,
                        location

                    FROM jobs

                    WHERE id = $1

                    LIMIT 1
                    `,
                    [
                        jobId
                    ]
                );


            if (
                jobResult.rows.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(404).json({

                    success: false,

                    message:
                        "Job vacancy not found."

                });

            }


            const job =
                jobResult.rows[0];



            /* =================================================
               LOAD ELIGIBLE SHORTLISTED CANDIDATES

               Excludes candidates already assigned to
               another draft / confirmed interview session.
               ================================================= */

            const orderClause =
                assignmentMethod === "random"
                    ? "RANDOM()"
                    : "a.applied_at ASC";


            const candidateResult =
                await client.query(
                    `
                    SELECT

                        a.id,
                        a.application_reference,
                        a.applied_at,

                        av.first_name,
                        av.last_name,
                        av.email

                    FROM applications a

                    INNER JOIN application_versions av
                        ON av.application_id = a.id
                        AND av.version_number =
                            a.current_version_number

                    WHERE a.job_id = $1

                    AND a.status =
                        'shortlisted'

                    AND NOT EXISTS (

                        SELECT 1

                        FROM interview_session_slots existing_slot

                        INNER JOIN interview_sessions existing_session
                            ON existing_session.id =
                                existing_slot.session_id

                        WHERE
                            existing_slot.application_id =
                                a.id

                        AND existing_slot.status =
                            'booked'

                        AND existing_session.status
                            IN (
                                'draft',
                                'confirmed'
                            )

                    )

                    ORDER BY
                        ${orderClause}

                    FOR UPDATE OF a
                    `,
                    [
                        jobId
                    ]
                );


            const candidates =
                candidateResult.rows;


            if (
                candidates.length ===
                0
            ) {

                await client.query(
                    "ROLLBACK"
                );


                return res.status(400).json({

                    success: false,

                    message:
                        "There are no available shortlisted candidates for this vacancy."

                });

            }



            /* =================================================
               CREATE DRAFT SESSION
               ================================================= */

            const title =
                `${job.job_title} Interview - Round ${round}`;


            const sessionResult =
                await client.query(
                    `
                    INSERT INTO interview_sessions (

                        job_id,
                        title,
                        interview_round,

                        session_date,
                        start_time,
                        end_time,
                        timezone,

                        duration_minutes,
                        break_minutes,

                        interview_type,
                        assignment_method,

                        location,
                        instructions,

                        status,
                        created_by

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,

                        $4,
                        $5,
                        $6,
                        'Asia/Colombo',

                        $7,
                        $8,

                        $9,
                        $10,

                        $11,
                        $12,

                        'draft',
                        $13

                    )

                    RETURNING *
                    `,
                    [
                        jobId,

                        title,

                        round,

                        sessionDate,

                        startTime,

                        endTime,

                        duration,

                        breakLength,

                        interviewType,

                        assignmentMethod,

                        interviewType ===
                            "onsite"
                            ? location.trim()
                            : null,

                        instructions?.trim() ||
                            null,

                        req.session.userId
                    ]
                );


            const createdSession =
                sessionResult.rows[0];



            /* =================================================
               AUTO ASSIGNMENT

               FIFO / Random:
               assign shortlisted candidates immediately.

               Manual:
               leave slots empty for manager assignment later.
               ================================================= */

            const candidatesToAssign =
                assignmentMethod ===
                    "manual"
                    ? []
                    : candidates.slice(
                        0,
                        generatedSlots.length
                    );



            const createdSlots =
                [];


            for (
                let index = 0;
                index < generatedSlots.length;
                index += 1
            ) {

                const slot =
                    generatedSlots[index];


                const candidate =
                    candidatesToAssign[index] ||
                    null;


                const slotResult =
                    await client.query(
                        `
                        INSERT INTO interview_session_slots (

                            session_id,
                            slot_number,

                            scheduled_start,
                            scheduled_end,

                            application_id,

                            status,

                            assigned_at

                        )

                        VALUES (

                            $1,
                            $2,

                            (
                                (
                                    $3::date +
                                    $4::time
                                )
                                AT TIME ZONE
                                'Asia/Colombo'
                            ),

                            (
                                (
                                    $3::date +
                                    $5::time
                                )
                                AT TIME ZONE
                                'Asia/Colombo'
                            ),

                            $6,

                            $7,

                            CASE
                                WHEN $6::bigint
                                    IS NULL
                                THEN NULL
                                ELSE NOW()
                            END

                        )

                        RETURNING *
                        `,
                        [
                            createdSession.id,

                            slot.number,

                            sessionDate,

                            slot.startTime,

                            slot.endTime,

                            candidate
                                ? candidate.id
                                : null,

                            candidate
                                ? "booked"
                                : "available"
                        ]
                    );


                createdSlots.push({

                    id:
                        slotResult.rows[0].id,

                    slotNumber:
                        slot.number,

                    startTime:
                        slot.startTime,

                    endTime:
                        slot.endTime,

                    status:
                        candidate
                            ? "booked"
                            : "available",

                    candidate:
                        candidate
                            ? {

                                applicationId:
                                    candidate.id,

                                reference:
                                    candidate
                                        .application_reference,

                                firstName:
                                    candidate.first_name,

                                lastName:
                                    candidate.last_name,

                                email:
                                    candidate.email

                            }
                            : null

                });

            }



            /* =================================================
               COMMIT
               ================================================= */

            await client.query(
                "COMMIT"
            );



            return res.status(201).json({

                success: true,

                message:
                    "Interview session draft created successfully.",

                session: {

                    id:
                        createdSession.id,

                    title:
                        createdSession.title,

                    status:
                        createdSession.status,

                    job: {

                        id:
                            job.id,

                        title:
                            job.job_title,

                        department:
                            job.department

                    },

                    date:
                        createdSession.session_date,

                    startTime:
                        createdSession.start_time,

                    endTime:
                        createdSession.end_time,

                    interviewRound:
                        createdSession.interview_round,

                    interviewType:
                        createdSession.interview_type,

                    assignmentMethod:
                        createdSession.assignment_method,

                    durationMinutes:
                        createdSession.duration_minutes,

                    breakMinutes:
                        createdSession.break_minutes,

                    totalSlots:
                        createdSlots.length,

                    assignedCandidates:
                        createdSlots.filter(
                            slot =>
                                slot.candidate
                        ).length,

                    remainingShortlisted:
                        Math.max(
                            0,
                            candidates.length -
                            createdSlots.filter(
                                slot =>
                                    slot.candidate
                            ).length
                        ),

                    slots:
                        createdSlots

                }

            });

        }

        catch (error) {

            try {

                await client.query(
                    "ROLLBACK"
                );

            }

            catch (rollbackError) {

                console.error(
                    "Interview session rollback error:",
                    rollbackError
                );

            }


            console.error(
                "Create interview session error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to create interview session."

            });

        }

        finally {

            client.release();

        }

    }
);


/* =========================================================
   ADMIN - CONFIRM INTERVIEW SESSION
   ========================================================= */

app.patch(
    "/api/admin/interview-sessions/:id/confirm",
    requirePermission(
        "interviews.manage"
    ),
    async (req, res) => {

        const sessionId =
            req.params.id;


        let client =
            null;


        let calendar =
            null;


        let calendarId =
            null;


        let databaseCommitted =
            false;


        const createdGoogleEvents =
            [];


        const createRouteError =
            (
                statusCode,
                message
            ) => {

                const error =
                    new Error(
                        message
                    );


                error.statusCode =
                    statusCode;


                return error;

            };


        try {

            /* =================================================
               LOAD DRAFT SESSION
               First read - no transaction yet.
               ================================================= */

            const sessionResult =
                await pool.query(
                    `
                    SELECT

                        s.id,
                        s.job_id,
                        s.title,
                        s.interview_round,
                        s.session_date,
                        s.start_time,
                        s.end_time,
                        s.timezone,
                        s.duration_minutes,
                        s.break_minutes,
                        s.interview_type,
                        s.location,
                        s.instructions,
                        s.status,

                        j.job_title

                    FROM interview_sessions s

                    INNER JOIN jobs j
                        ON j.id =
                            s.job_id

                    WHERE s.id = $1

                    LIMIT 1
                    `,
                    [
                        sessionId
                    ]
                );


            if (
                sessionResult.rows.length ===
                0
            ) {

                throw createRouteError(
                    404,
                    "Interview session not found."
                );

            }


            const session =
                sessionResult.rows[0];


            if (
                session.status !==
                "draft"
            ) {

                throw createRouteError(
                    409,
                    "Only draft interview sessions can be confirmed."
                );

            }



            /* =================================================
               LOAD BOOKED SLOTS
               ================================================= */

            const slotResult =
                await pool.query(
                    `
                    SELECT

                        sl.id,
                        sl.slot_number,
                        sl.application_id,
                        sl.scheduled_start,
                        sl.scheduled_end,
                        sl.status,

                        a.application_reference,
                        a.status
                            AS application_status,

                        a.candidate_id,

                        u.first_name,
                        u.last_name,
                        u.email
                            AS candidate_email

                    FROM interview_session_slots sl

                    INNER JOIN applications a
                        ON a.id =
                            sl.application_id

                    INNER JOIN users u
                        ON u.id =
                            a.candidate_id

                    WHERE sl.session_id = $1

                    AND sl.status =
                        'booked'

                    ORDER BY
                        sl.slot_number ASC
                    `,
                    [
                        sessionId
                    ]
                );


            const bookedSlots =
                slotResult.rows;


            if (
                bookedSlots.length ===
                0
            ) {

                throw createRouteError(
                    400,
                    "This interview session has no assigned candidates."
                );

            }



            /* =================================================
               VERIFY ALL CANDIDATES STILL SHORTLISTED
               ================================================= */

            const invalidCandidate =
                bookedSlots.find(
                    slot =>
                        slot.application_status !==
                        "shortlisted"
                );


            if (
                invalidCandidate
            ) {

                throw createRouteError(
                    409,
                    `Application ${invalidCandidate.application_reference} is no longer shortlisted. Review the schedule before confirming.`
                );

            }



            /* =================================================
               CONNECT TO STORED GOOGLE CALENDAR
               ================================================= */

            const googleConnection =
                await getStoredGoogleCalendarClient();


            calendar =
                googleConnection.calendar;


            calendarId =
                googleConnection.calendarId;



            /* =================================================
               CREATE GOOGLE EVENTS

               Still no candidate invitations yet.
               ================================================= */

            for (
                const slot of
                bookedSlots
            ) {

                const googleEvent =
                    await createGoogleInterviewEvent({

                        calendar,

                        calendarId,

                        session,

                        slot

                    });


                createdGoogleEvents.push({

                    slotId:
                        slot.id,

                    applicationId:
                        slot.application_id,

                    candidateEmail:
                        slot.candidate_email,

                    eventId:
                        googleEvent.eventId,

                    calendarId:
                        googleEvent.calendarId,

                    meetingUrl:
                        googleEvent.meetingUrl,

                    calendarUrl:
                        googleEvent.calendarUrl

                });

            }



            /* =================================================
               BEGIN FINAL DATABASE TRANSACTION
               ================================================= */

            client =
                await pool.connect();


            await client.query(
                "BEGIN"
            );



            /* =================================================
               LOCK SESSION AGAIN

               Prevent two admins confirming the
               same draft at the same time.
               ================================================= */

            const lockedSessionResult =
                await client.query(
                    `
                    SELECT
                        id,
                        status

                    FROM interview_sessions

                    WHERE id = $1

                    FOR UPDATE
                    `,
                    [
                        sessionId
                    ]
                );


            if (
                lockedSessionResult.rows.length ===
                0
            ) {

                throw createRouteError(
                    404,
                    "Interview session no longer exists."
                );

            }


            if (
                lockedSessionResult
                    .rows[0]
                    .status !==
                "draft"
            ) {

                throw createRouteError(
                    409,
                    "This interview session has already been confirmed or changed."
                );

            }



            /* =================================================
               LOCK SLOT ASSIGNMENTS + APPLICATIONS AGAIN
               ================================================= */

            const lockedSlotResult =
                await client.query(
                    `
                    SELECT

                        sl.id,
                        sl.slot_number,
                        sl.application_id,
                        sl.scheduled_start,
                        sl.scheduled_end,

                        a.application_reference,
                        a.status
                            AS application_status,

                        a.candidate_id,

                        u.email
                            AS candidate_email

                    FROM interview_session_slots sl

                    INNER JOIN applications a
                        ON a.id =
                            sl.application_id

                    INNER JOIN users u
                        ON u.id =
                            a.candidate_id

                    WHERE sl.session_id = $1

                    AND sl.status =
                        'booked'

                    ORDER BY
                        sl.slot_number ASC

                    FOR UPDATE OF
                        sl,
                        a
                    `,
                    [
                        sessionId
                    ]
                );


            const lockedSlots =
                lockedSlotResult.rows;



            /* =================================================
               MAKE SURE SCHEDULE DID NOT CHANGE
               WHILE GOOGLE EVENTS WERE BEING CREATED
               ================================================= */

            if (
                lockedSlots.length !==
                bookedSlots.length
            ) {

                throw createRouteError(
                    409,
                    "The interview schedule changed during confirmation. Please review it again."
                );

            }


            for (
                const lockedSlot of
                lockedSlots
            ) {

                const originalSlot =
                    bookedSlots.find(
                        slot =>
                            String(
                                slot.id
                            ) ===
                            String(
                                lockedSlot.id
                            )
                    );


                if (
                    !originalSlot ||
                    String(
                        originalSlot.application_id
                    ) !==
                    String(
                        lockedSlot.application_id
                    ) ||
                    new Date(
                        originalSlot.scheduled_start
                    )
                    .getTime() !==
                    new Date(
                        lockedSlot.scheduled_start
                    )
                    .getTime() ||
                    new Date(
                        originalSlot.scheduled_end
                    )
                    .getTime() !==
                    new Date(
                        lockedSlot.scheduled_end
                    )
                    .getTime()
                ) {

                    throw createRouteError(
                        409,
                        "The interview schedule changed during confirmation. Please review it again."
                    );

                }


                if (
                    lockedSlot.application_status !==
                    "shortlisted"
                ) {

                    throw createRouteError(
                        409,
                        `Application ${lockedSlot.application_reference} is no longer shortlisted.`
                    );

                }

            }



            /* =================================================
               CREATE OFFICIAL APPLICATION INTERVIEWS
               ================================================= */

            for (
                const slot of
                lockedSlots
            ) {

                const googleEvent =
                    createdGoogleEvents.find(
                        event =>
                            String(
                                event.slotId
                            ) ===
                            String(
                                slot.id
                            )
                    );


                if (
                    !googleEvent
                ) {

                    throw new Error(
                        `Google Calendar event missing for interview slot ${slot.id}.`
                    );

                }


                await client.query(
                    `
                    INSERT INTO application_interviews (

                        application_id,
                        round_number,
                        interview_title,
                        interview_type,

                        scheduled_at,
                        duration_minutes,

                        location,
                        meeting_url,

                        instructions,
                        interview_status,

                        scheduled_by,

                        session_id,
                        slot_id,

                        google_event_id,
                        google_calendar_id,

                        timezone

                    )

                    VALUES (

                        $1,
                        $2,
                        $3,
                        $4,

                        $5,
                        $6,

                        $7,
                        $8,

                        $9,
                        'scheduled',

                        $10,

                        $11,
                        $12,

                        $13,
                        $14,

                        $15

                    )
                    `,
                    [

                        slot.application_id,

                        session.interview_round,

                        session.title,

                        session.interview_type,

                        slot.scheduled_start,

                        session.duration_minutes,

                        session.location,

                        googleEvent.meetingUrl,

                        session.instructions,

                        req.session.userId,

                        session.id,

                        slot.id,

                        googleEvent.eventId,

                        googleEvent.calendarId,

                        session.timezone ||
                            "Asia/Colombo"

                    ]
                );



                /* =================================================
                   SHORTLISTED -> INTERVIEW
                   ================================================= */

                const applicationUpdate =
                    await client.query(
                        `
                        UPDATE applications

                        SET
                            status =
                                'interview',

                            updated_at =
                                NOW()

                        WHERE id = $1

                        AND status =
                            'shortlisted'

                        RETURNING id
                        `,
                        [
                            slot.application_id
                        ]
                    );


                if (
                    applicationUpdate.rows.length ===
                    0
                ) {

                    throw createRouteError(
                        409,
                        `Application ${slot.application_reference} could not be moved to interview.`
                    );

                }



                /* =================================================
                   STATUS HISTORY
                   ================================================= */

                await client.query(
                    `
                    INSERT INTO application_status_history (

                        application_id,
                        previous_status,
                        new_status,
                        changed_by,
                        status_note

                    )

                    VALUES (

                        $1,
                        'shortlisted',
                        'interview',
                        $2,
                        'Interview scheduled and session confirmed.'

                    )
                    `,
                    [
                        slot.application_id,
                        req.session.userId
                    ]
                );



                /* =================================================
                   ACTIVITY LOG
                   ================================================= */

                await client.query(
                    `
                    INSERT INTO application_activity (

                        application_id,
                        performed_by,
                        activity_type,
                        title,
                        description

                    )

                    VALUES (

                        $1,
                        $2,
                        'interview_scheduled',
                        'Interview scheduled',
                        $3

                    )
                    `,
                    [

                        slot.application_id,

                        req.session.userId,

                        `Interview Round ${session.interview_round} scheduled.`

                    ]
                );



                /* =================================================
                   ALTRIUM NOTIFICATION
                   ================================================= */

                await client.query(
                    `
                    INSERT INTO notifications (

                        user_id,
                        notification_type,
                        title,
                        message,

                        application_id,
                        job_id,

                        action_url

                    )

                    VALUES (

                        $1,
                        'application_interview',
                        'Interview scheduled',
                        $2,

                        $3,
                        $4,

                        $5

                    )
                    `,
                    [

                        slot.candidate_id,

                        `Your interview for ${session.job_title} has been scheduled. View your interview details in Altrium.`,

                        slot.application_id,

                        session.job_id,

                        `/application-progress.html?id=${slot.application_id}`

                    ]
                );

            }



            /* =================================================
               CONFIRM SESSION
               ================================================= */

            const confirmedResult =
                await client.query(
                    `
                    UPDATE interview_sessions

                    SET
                        status =
                            'confirmed',

                        confirmed_by =
                            $1,

                        confirmed_at =
                            NOW(),

                        updated_at =
                            NOW()

                    WHERE id = $2

                    AND status =
                        'draft'

                    RETURNING *
                    `,
                    [
                        req.session.userId,
                        sessionId
                    ]
                );


            if (
                confirmedResult.rows.length ===
                0
            ) {

                throw createRouteError(
                    409,
                    "Interview session could not be confirmed."
                );

            }



            /* =================================================
               COMMIT DATABASE
               ================================================= */

            await client.query(
                "COMMIT"
            );


            databaseCommitted =
                true;



            /* =================================================
               NOW SEND GOOGLE INVITATIONS

               Database is officially confirmed first.
               ================================================= */

            let calendarInvitesSent =
                    0;


                for (
                    const googleEvent of
                    createdGoogleEvents
                ) {

                    try {

                        await inviteCandidateToGoogleInterview({

                            calendar,

                            calendarId:
                                googleEvent.calendarId,

                            eventId:
                                googleEvent.eventId,

                            candidateEmail:
                                googleEvent.candidateEmail

                        });


                        calendarInvitesSent +=
                            1;

                    }

                    catch (inviteError) {

                        console.error(
                            "Google interview invitation error:",
                            googleEvent.applicationId,
                            inviteError.response?.data ||
                            inviteError
                        );

                    }

                }


                /* =================================================
                SEND BRANDED INTERVIEW EMAILS
                ================================================= */

                let interviewEmailsSent =
                    0;


                for (
                    const slot of
                    bookedSlots
                ) {

                    const googleEvent =
                        createdGoogleEvents.find(
                            event =>
                                String(
                                    event.slotId
                                ) ===
                                String(
                                    slot.id
                                )
                        );


                    try {

                        const candidateName =
                            `${slot.first_name || ""} ${slot.last_name || ""}`
                                .trim() ||
                            "Candidate";


                        await sendInterviewConfirmationEmail({

                            candidateName,

                            candidateEmail:
                                slot.candidate_email,

                            applicationId:
                                slot.application_id,

                            applicationReference:
                                slot.application_reference,

                            jobTitle:
                                session.job_title,

                            interviewRound:
                                session.interview_round,

                            interviewType:
                                session.interview_type,

                            scheduledStart:
                                slot.scheduled_start,

                            scheduledEnd:
                                slot.scheduled_end,

                            location:
                                session.location,

                            meetingUrl:
                                googleEvent?.meetingUrl ||
                                null,

                            instructions:
                                session.instructions

                        });


                        interviewEmailsSent +=
                            1;

                    }

                    catch (emailError) {

                        console.error(
                            "Interview confirmation email error:",
                            slot.application_id,
                            emailError
                        );

                    }

                }


                /* =================================================
                SUCCESS
                ================================================= */

                return res.json({

                    success:
                        true,

                    message:
                        "Interview session confirmed successfully.",

                    session: {

                        id:
                            confirmedResult
                                .rows[0]
                                .id,

                        status:
                            confirmedResult
                                .rows[0]
                                .status,

                        confirmedAt:
                            confirmedResult
                                .rows[0]
                                .confirmed_at,

                        candidatesConfirmed:
                            bookedSlots.length,

                        googleEventsCreated:
                            createdGoogleEvents.length,

                        calendarInvitesSent,

                        interviewEmailsSent

                    }

                });

        }

        catch (error) {

            /* =================================================
               ROLLBACK DATABASE IF NEEDED
               ================================================= */

            if (
                client &&
                !databaseCommitted
            ) {

                try {

                    await client.query(
                        "ROLLBACK"
                    );

                }

                catch (rollbackError) {

                    console.error(
                        "Confirm interview rollback error:",
                        rollbackError
                    );

                }

            }



            /* =================================================
               REMOVE GOOGLE EVENTS IF DATABASE FAILED

               Candidate invitations were not sent yet,
               so cleanup is silent.
               ================================================= */

            if (
                !databaseCommitted &&
                calendar
            ) {

                for (
                    const googleEvent of
                    createdGoogleEvents
                ) {

                    await deleteGoogleCalendarEventQuietly(

                        calendar,

                        googleEvent.calendarId,

                        googleEvent.eventId

                    );

                }

            }


            console.error(
                "Confirm interview session error:",
                error.response?.data ||
                error
            );



            /* =================================================
               KNOWN ROUTE ERROR
               ================================================= */

            if (
                error.statusCode
            ) {

                return res
                    .status(
                        error.statusCode
                    )
                    .json({

                        success:
                            false,

                        message:
                            error.message

                    });

            }



            /* =================================================
               DATABASE DUPLICATE
               ================================================= */

            if (
                error.code ===
                "23505"
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        "One or more candidates already have an interview scheduled."

                });

            }



            /* =================================================
               GOOGLE ERROR
               ================================================= */

            if (
                error.response?.data
            ) {

                return res.status(502).json({

                    success:
                        false,

                    message:
                        "Google Calendar could not create the interview schedule. The Altrium session remains a draft."

                });

            }



            return res.status(500).json({

                success:
                    false,

                message:
                    "Unable to confirm interview session."

            });

        }

        finally {

            if (
                client
            ) {

                client.release();

            }

        }

    }
);


/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Altrium server running on port ${PORT}`
        );

    }
);