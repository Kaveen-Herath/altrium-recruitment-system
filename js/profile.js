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

    /* =========================================================
   PREFERRED JOB TYPE DROPDOWN
   ========================================================= */

const jobTypeDropdown =
    document.getElementById("jobTypeDropdown");

const jobTypeTrigger =
    document.getElementById("jobTypeTrigger");

const jobTypeSelected =
    document.getElementById("jobTypeSelected");

const preferredJobTypeSelect =
    document.getElementById("preferredJobType");


if (jobTypeDropdown && jobTypeTrigger) {

    jobTypeTrigger.addEventListener(
        "click",
        () => {

            jobTypeDropdown.classList.toggle(
                "open"
            );

        }
    );


    const options =
        jobTypeDropdown.querySelectorAll(
            ".job-type-menu button"
        );


    options.forEach(option => {

        option.addEventListener(
            "click",
            () => {

                const value =
                    option.dataset.value;


                preferredJobTypeSelect.value =
                    value;


                jobTypeSelected.textContent =
                    value;


                options.forEach(item => {
                    item.classList.remove("selected");
                });


                option.classList.add(
                    "selected"
                );


                jobTypeDropdown.classList.remove(
                    "open"
                );

            }
        );

    });


    document.addEventListener(
        "click",
        event => {

            if (
                !jobTypeDropdown.contains(
                    event.target
                )
            ) {

                jobTypeDropdown.classList.remove(
                    "open"
                );

            }

        }
    );

}

    const preferredJobType =
        document.getElementById(
            "preferredJobType"
        );

    if (preferredJobType) {

        preferredJobType.value =
            user.preferredJobType || "";
    }

    if (jobTypeSelected) {

    jobTypeSelected.textContent =
        user.preferredJobType ||
        "Select job type";

    }

    /* ---------------------------------------------
       Profile image / initials
    --------------------------------------------- */

    const profileImage =
    document.getElementById("profileImage");

        if (profileImage) {

            if (user.profilePicture) {

                // User has uploaded a real photo
                profileImage.src =
                    user.profilePicture;

            } else {

                // No photo — create avatar using real name
                const fullName =
                    `${user.firstName || ""} ${user.lastName || ""}`.trim();

                profileImage.src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=ff841f&color=111&size=200&bold=true`;

            }

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

    const jobTypeInput =
        document.getElementById(
            "preferredJobType"
        );


    const education =
        educationInput
            ? educationInput.value.trim()
            : "";


    const skills =
        skillsInput
            ? skillsInput.value.trim()
            : "";


    const preferredJobType =
        jobTypeInput
            ? jobTypeInput.value
            : "";


    console.log(
        "CAREER DETAILS:",
        {
            education,
            skills,
            preferredJobType
        }
    );


    await updateProfile({

        education: education,

        skills: skills,

        preferredJobType:
            preferredJobType

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

        user.preferredJobType

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
   PROFILE IMAGE
   ========================================================= */

const avatarUpload =
    document.getElementById(
        "avatarUpload"
    );


if (avatarUpload) {

    avatarUpload.addEventListener(
        "change",
        async function(event) {

            const file =
                event.target.files[0];


            if (!file) return;


            /* ---------------------------------------------
               Check file type
            --------------------------------------------- */

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];


            if (!allowedTypes.includes(file.type)) {

                showProfileToast(
                    "Please select a JPG, PNG or WEBP image.",
                    "error"
                );

                avatarUpload.value = "";

                return;
            }


            /* ---------------------------------------------
               Check size
            --------------------------------------------- */

            if (file.size > 5 * 1024 * 1024) {

                showProfileToast(
                    "Image must be smaller than 5MB.",
                    "error"
                );

                avatarUpload.value = "";

                return;
            }


            /* ---------------------------------------------
               Prepare image for backend
            --------------------------------------------- */

            const formData =
                new FormData();


            formData.append(
                "profilePhoto",
                file
            );


            try {

                /* -----------------------------------------
                   Send image to Node backend
                ----------------------------------------- */

                const response =
                    await fetch(
                        "/api/profile/photo",
                        {
                            method: "POST",

                            credentials:
                                "same-origin",

                            body: formData
                        }
                    );


                const data =
                    await response.json();


                /* -----------------------------------------
                   Handle upload error
                ----------------------------------------- */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    showProfileToast(
                        data.message ||
                        "Unable to upload profile picture.",
                        "error"
                    );

                    avatarUpload.value = "";

                    return;
                }


                /* -----------------------------------------
                   Display new image immediately
                ----------------------------------------- */

                const profileImage =
                    document.getElementById(
                        "profileImage"
                    );


                if (profileImage) {

                    profileImage.src =
                        data.profilePhotoUrl;
                }


                /* -----------------------------------------
                   Update current JS user object
                ----------------------------------------- */

                if (user) {

                    user.profilePicture =
                        data.profilePhotoUrl;
                }


                /* -----------------------------------------
                   Success notification
                ----------------------------------------- */

                showProfileToast(
                    "Profile picture updated successfully.",
                    "success"
                );


                /* -----------------------------------------
                   Reset file input
                ----------------------------------------- */

                avatarUpload.value = "";

            }

            catch (error) {

                console.error(
                    "Image upload error:",
                    error
                );


                showProfileToast(
                    "Unable to upload profile picture.",
                    "error"
                );


                avatarUpload.value = "";
            }

        }
    );

}


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
   START
   ========================================================= */

loadUserProfile();