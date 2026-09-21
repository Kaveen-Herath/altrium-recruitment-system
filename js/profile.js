function showProfileToast(message, type = "error") {

    const container =
        document.getElementById(
            "profileToastContainer"
        );

    if (!container) {
        console.error(message);
        return;
    }


    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;


    const icon =
        type === "success"
            ? "✓"
            : "!";


    const title =
        type === "success"
            ? "Success"
            : "Something went wrong";


    toast.innerHTML = `
        <div class="toast-icon">
            ${icon}
        </div>

        <div class="toast-content">

            <p class="toast-title">
                ${title}
            </p>

            <p class="toast-message"></p>

        </div>

        <button
            class="toast-close"
            type="button"
            aria-label="Close notification">
            ×
        </button>
    `;


    toast.querySelector(
        ".toast-message"
    ).textContent = message;


    container.appendChild(toast);


    const removeToast = () => {

        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 250);
    };


    toast.querySelector(
        ".toast-close"
    ).addEventListener(
        "click",
        removeToast
    );


    setTimeout(
        removeToast,
        4500
    );
}


/* =========================================================
   ALTRIUM — FRONTEND PROFILE SYSTEM
   Node API ready version
   ========================================================= */


/* =========================================================
   GLOBAL USER
   ========================================================= */

let user = null;


/* =========================================================
   LOAD PROFILE FROM API
   ========================================================= */

async function loadUserProfile() {

    try {

        const response = await fetch(
            "/api/auth/me",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const data = await response.json();


        /* ---------------------------------------------
           Not logged in
        --------------------------------------------- */

        if (!response.ok || !data.success) {

            window.location.href = "login.html";

            return;

        }


        /* ---------------------------------------------
           Store returned database user
        --------------------------------------------- */

        user = data.user;


        /* ---------------------------------------------
           Display profile
        --------------------------------------------- */

        loadProfile();

    }

    catch (error) {

        console.error(
            "Could not load profile:",
            error
        );

        showProfileToast(
            "Unable to load your profile. Please try again.",
            "error"
        );
    }

}


/* =========================================================
   DISPLAY PROFILE
   ========================================================= */

function loadProfile() {

    if (!user) return;


    const fullName =
        `${user.firstName || ""} ${user.lastName || ""}`.trim();


    /* ---------------------------------------------
       Header
    --------------------------------------------- */

    const profileName =
        document.getElementById(
            "profileName"
        );

    if (profileName) {

        profileName.textContent =
            fullName || "Your Name";
    }


    const profileEmail =
        document.getElementById(
            "profileEmail"
        );

    if (profileEmail) {

        profileEmail.textContent =
            user.email || "your@email.com";
    }


    /* ---------------------------------------------
       Personal information
    --------------------------------------------- */

    const firstNameInput =
        document.getElementById(
            "profileFirstName"
        );

    if (firstNameInput) {

        firstNameInput.value =
            user.firstName || "";
    }


    const lastNameInput =
        document.getElementById(
            "profileLastName"
        );

    if (lastNameInput) {

        lastNameInput.value =
            user.lastName || "";
    }


    const emailInput =
        document.getElementById(
            "profileEmailInput"
        );

    if (emailInput) {

        emailInput.value =
            user.email || "";
    }


    const phoneInput =
        document.getElementById(
            "profilePhone"
        );

    if (phoneInput) {

        /*
         * Support both property names while
         * we keep the frontend/backend consistent.
         */

        phoneInput.value =
            user.phoneNumber ||
            user.phone ||
            "";
    }


    /* ---------------------------------------------
       Career information
    --------------------------------------------- */

    const education =
        document.getElementById(
            "profileEducation"
        );

    if (education) {

        education.value =
            user.education || "";
    }


    const skills =
        document.getElementById(
            "profileSkills"
        );

    if (skills) {

        skills.value =
            user.skills || "";
    }


    const experience =
        document.getElementById(
            "profileExperience"
        );

    if (experience) {

        experience.value =
            user.experience || "";
    }



/* ---------------------------------------------
   Profile initials
--------------------------------------------- */

const profileInitials =
    document.getElementById(
        "profileInitials"
    );

if (profileInitials) {

    const firstInitial =
        user.firstName
            ? user.firstName
                .trim()
                .charAt(0)
                .toUpperCase()
            : "";

    const lastInitial =
        user.lastName
            ? user.lastName
                .trim()
                .charAt(0)
                .toUpperCase()
            : "";

    const initials =
        `${firstInitial}${lastInitial}` ||
        "U";

    profileInitials.textContent =
        initials;

}


    /* ---------------------------------------------
       Profile strength
    --------------------------------------------- */

    updateProfileStrength();
}


/* =========================================================
   PERSONAL DETAILS
   ========================================================= */

async function savePersonalDetails() {

    if (!user) return;


    const firstName =
        document.getElementById(
            "profileFirstName"
        ).value.trim();


    const lastName =
        document.getElementById(
            "profileLastName"
        ).value.trim();


    const phone =
        document.getElementById(
            "profilePhone"
        ).value.trim();


    await updateProfile({

        firstName: firstName,

        lastName: lastName,

        phone: phone

    });

}


/* =========================================================
   CAREER DETAILS
   ========================================================= */

async function saveCareerDetails() {

    if (!user) return;


    const educationInput =
        document.getElementById(
            "profileEducation"
        );

    const skillsInput =
        document.getElementById(
            "profileSkills"
        );


    const education =
        educationInput
            ? educationInput.value.trim()
            : "";


    const skills =
        skillsInput
            ? skillsInput.value.trim()
            : "";


    console.log(
        "CAREER DETAILS:",
        {
            education,
            skills
        }
    );


    await updateProfile({

        education: education,

        skills: skills,
    });

}


/* =========================================================
   WORK EXPERIENCE
   ========================================================= */

async function saveExperience() {

    if (!user) return;


    const experience =
        document.getElementById(
            "profileExperience"
        ).value.trim();


    await updateProfile({

        experience: experience

    });

}


/* =========================================================
   SEND PROFILE UPDATE TO API
   ========================================================= */

async function updateProfile(changes) {

    try {

        const response = await fetch(
            "/api/profile",
            {
                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(changes)

            }
        );


        const data =
            await response.json();


        /* ---------------------------------------------
           API rejected request
        --------------------------------------------- */

        if (!response.ok || !data.success) {

            showProfileToast(
                data.message ||
                "Unable to save your profile.", "error"
            );

            return;

        }


        /* ---------------------------------------------
           Replace local JS object with API result
        --------------------------------------------- */

        user = data.user;


        loadProfile();


        showProfileToast(
            "Profile updated successfully.", "success"
        );

    }

    catch (error) {

        console.error(
            "Profile update error:",
            error
        );

        showProfileToast(
            "Something went wrong while saving your profile.", "error"
        );

    }

}


/* =========================================================
   PROFILE STRENGTH
   ========================================================= */

function updateProfileStrength() {

    if (!user) return;


    let completed = 0;


    const fields = [

        user.firstName,

        user.lastName,

        user.email,

        user.phoneNumber,

        user.education,

        user.skills,

        user.experience,
    ];


    fields.forEach(field => {

        if (
            field &&
            String(field).trim() !== ""
        ) {

            completed++;

        }

    });


    const percentage =
        Math.round(
            (completed / fields.length) * 100
        );


    const percentageElement =
        document.getElementById(
            "profilePercentage"
        );


    if (percentageElement) {

        percentageElement.textContent =
            `${percentage}%`;

    }


    const progress =
        document.getElementById(
            "profileProgress"
        );


    if (progress) {

        progress.style.width =
            `${percentage}%`;

    }

}


/* =========================================================
   PROFILE TABS
   ========================================================= */

const tabs =
    document.querySelectorAll(
        ".profile-tab"
    );


const sections =
    document.querySelectorAll(
        ".profile-section"
    );


tabs.forEach(tab => {

    tab.addEventListener(
        "click",
        () => {

            const target =
                tab.dataset.section;


            tabs.forEach(item => {

                item.classList.remove(
                    "active"
                );

            });


            sections.forEach(section => {

                section.classList.remove(
                    "active"
                );

            });


            tab.classList.add(
                "active"
            );


            const targetSection =
                document.getElementById(
                    target
                );


            if (targetSection) {

                targetSection.classList.add(
                    "active"
                );

            }

        }
    );

});


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

    try {

        const response =
            await fetch(
                "/api/auth/logout",
                {
                    method: "POST",

                    credentials:
                        "same-origin"
                }
            );


        const data =
            await response.json();


        if (data.success) {

            window.location.href =
                "login.html";

            return;

        }


        /* ---------------------------------------------
           Fallback
        --------------------------------------------- */

        window.location.href =
            "login.html";

    }

    catch (error) {

        console.error(
            "Logout error:",
            error
        );

        window.location.href =
            "login.html";

    }

}


/* =========================================================
   LOAD APPLIED JOBS
   ========================================================= */

async function loadAppliedJobs() {

    const applicationsList =
        document.getElementById(
            "applicationsList"
        );

    if (!applicationsList) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/my-applications",
                {
                    method: "GET",
                    credentials: "same-origin"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            applicationsList.innerHTML = `
                <div class="applications-empty">
                    Unable to load your applications.
                </div>
            `;

            return;
        }


        const applications =
            Array.isArray(data.applications)
                ? data.applications
                : [];


        if (applications.length === 0) {

            applicationsList.innerHTML = `
                <div class="applications-empty">
                    You haven't applied for any jobs yet.
                </div>
            `;

            return;
        }


        applicationsList.innerHTML = "";


        applications.forEach(
            application => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "application-card glass";


                const statusClass =
                    getApplicationStatusClass(
                        application.status
                    );


                const statusLabel =
                    getApplicationStatusLabel(
                        application.status
                    );


                const appliedDate =
                    application.appliedAt
                        ? new Date(
                            application.appliedAt
                        ).toLocaleDateString(
                            "en-GB",
                            {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            }
                        )
                        : "Unknown";


card.innerHTML = `
    <div class="application-card-left">

        <span class="application-label">
            APPLIED FOR
        </span>

        <h3>
            ${application.job?.title || "Job Vacancy"}
        </h3>

        <span class="application-reference">
            ${application.reference || "APPLICATION"}
        </span>

        <p class="application-department">
            ${application.job?.department || "Department"}
        </p>

    </div>


    <div class="application-card-middle">

        <span class="application-label">
            JOB DETAILS
        </span>

        <p>
            ${application.job?.location || "Location"}
            •
            ${application.job?.employmentType || "Employment Type"}
        </p>

    </div>


    <div class="application-card-actions">

        <span class="application-status ${statusClass}">
            ${statusLabel}
        </span>

        <span class="application-date">
            Applied ${new Date(application.appliedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            })}
        </span>

        <a
            href="application-progress.html?id=${encodeURIComponent(
                application.id
            )}"
            class="view-progress-btn"
        >
            View progress
        </a>

    </div>
`;

                applicationsList.appendChild(
                    card
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Load applied jobs error:",
            error
        );


        applicationsList.innerHTML = `
            <div class="applications-empty">
                Unable to load your applications.
            </div>
        `;

    }

}


/* =========================================================
   APPLICATION STATUS HELPERS
   ========================================================= */

function getApplicationStatusLabel(
    status
) {

    const labels = {

        submitted:
            "Submitted",

        screening:
            "Screening",

        shortlisted:
            "Shortlisted",

        interview:
            "Interview",

        offer:
            "Offer",

        hired:
            "Hired",

        rejected:
            "Rejected",

        withdrawn:
            "Withdrawn"

    };


    return labels[status] ||
        "Application";

}


function getApplicationStatusClass(
    status
) {

    const classes = {

        submitted:
            "submitted",

        screening:
            "reviewing",

        shortlisted:
            "reviewing",

        interview:
            "interview",

        offer:
            "interview",

        hired:
            "interview",

        rejected:
            "rejected",

        withdrawn:
            "withdrawn"

    };


    return classes[status] ||
        "submitted";

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
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
   START
   ========================================================= */

loadUserProfile();
loadAppliedJobs();