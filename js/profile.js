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
            "/api/profile",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );

        const data = await response.json();


        /* ---------------------------------------------
           Not logged in
        --------------------------------------------- */

        if (!response.ok || !data.loggedIn) {

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

        alert(
            "Unable to load your profile. Please try again."
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
        document.getElementById("profileName");

    if (profileName) {

        profileName.textContent =
            fullName || "Your Name";

    }


    const profileEmail =
        document.getElementById("profileEmail");

    if (profileEmail) {

        profileEmail.textContent =
            user.email || "your@email.com";

    }


    /* ---------------------------------------------
       Personal information
    --------------------------------------------- */

    const firstName =
        document.getElementById("profileFirstName");

    if (firstName) {

        firstName.value =
            user.firstName || "";

    }


    const lastName =
        document.getElementById("profileLastName");

    if (lastName) {

        lastName.value =
            user.lastName || "";

    }


    const email =
        document.getElementById("profileEmailInput");

    if (email) {

        email.value =
            user.email || "";

    }


    const phone =
        document.getElementById("profilePhone");

    if (phone) {

        phone.value =
            user.phone || "";

    }


    /* ---------------------------------------------
       Career information
    --------------------------------------------- */

    const education =
        document.getElementById("profileEducation");

    if (education) {

        education.value =
            user.education || "";

    }


    const skills =
        document.getElementById("profileSkills");

    if (skills) {

        skills.value =
            user.skills || "";

    }


    const experience =
        document.getElementById("profileExperience");

    if (experience) {

        experience.value =
            user.experience || "";

    }


    const preferredJobType =
        document.getElementById("preferredJobType");

    if (preferredJobType) {

        preferredJobType.value =
            user.preferredJobType || "";

    }


    /* ---------------------------------------------
       Profile image
    --------------------------------------------- */

    if (user.profilePicture) {

        const profileImage =
            document.getElementById("profileImage");

        if (profileImage) {

            profileImage.src =
                user.profilePicture;

        }

    }


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


    const education =
        document.getElementById(
            "profileEducation"
        ).value.trim();


    const skills =
        document.getElementById(
            "profileSkills"
        ).value.trim();


    const preferredJobType =
        document.getElementById(
            "preferredJobType"
        ).value;


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

            alert(
                data.message ||
                "Unable to save your profile."
            );

            return;

        }


        /* ---------------------------------------------
           Replace local JS object with API result
        --------------------------------------------- */

        user = data.user;


        loadProfile();


        alert(
            "Profile updated successfully."
        );

    }

    catch (error) {

        console.error(
            "Profile update error:",
            error
        );

        alert(
            "Something went wrong while saving your profile."
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

        user.phone,

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

            if (!file.type.startsWith("image/")) {

                alert(
                    "Please select an image file."
                );

                return;

            }


            /* ---------------------------------------------
               Check size
            --------------------------------------------- */

            if (file.size > 5 * 1024 * 1024) {

                alert(
                    "Image must be smaller than 5MB."
                );

                return;

            }


            const formData =
                new FormData();


            formData.append(
                "profile_picture",
                file
            );


            try {

                const response =
                    await fetch(
                        "/api/profile/picture",
                        {
                            method: "POST",

                            credentials:
                                "same-origin",

                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Unable to upload image."
                    );

                    return;

                }


                /* -----------------------------------------
                   Display new image
                ----------------------------------------- */

                const profileImage =
                    document.getElementById(
                        "profileImage"
                    );


                if (profileImage) {

                    profileImage.src =
                        data.profilePicture;

                }


                /* -----------------------------------------
                   Update current JS user
                ----------------------------------------- */

                if (user) {

                    user.profilePicture =
                        data.profilePicture;

                }


                alert(
                    "Profile picture updated."
                );

            }

            catch (error) {

                console.error(
                    "Image upload error:",
                    error
                );

                alert(
                    "Unable to upload profile picture."
                );

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