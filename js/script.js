/* ============================================
   ALTRIUM FRONTEND
   ============================================ */


/* ================= SEARCH ================= */

const navbar = document.getElementById("navbar");

const searchTrigger =
    document.getElementById("searchTrigger");

const closeSearch =
    document.getElementById("closeSearch");

const searchInput =
    document.getElementById("searchInput");

const filterDropdown =
    document.getElementById("filterDropdown");


/* Open search */

searchTrigger?.addEventListener(
    "click",
    () => {

        navbar?.classList.add(
            "search-mode"
        );


        setTimeout(
            () => {

                searchInput?.focus();

            },
            150
        );

    }
);


/* Close search */

closeSearch?.addEventListener(
    "click",
    () => {

        navbar?.classList.remove(
            "search-mode"
        );


        filterDropdown?.classList.remove(
            "show"
        );

    }
);


/* Escape closes search */

document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape" &&
        navbar.classList.contains("search-mode")
    ) {

        navbar.classList.remove("search-mode");

    }

});

/* =====================================================
   CURRENT USER / NAVBAR
   ===================================================== */

async function updateNavbarAccount() {

    const profileLink =
        document.getElementById(
            "profileLink"
        );


    try {

        const response =
            await fetch(
                "/api/auth/me",
                {
                    method: "GET",
                    credentials: "same-origin"
                }
            );


        /* ---------------------------------------------
           User is not logged in
        --------------------------------------------- */

        if (!response.ok) {

            document.body.classList.remove(
                "logged-in"
            );

            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.user
        ) {

            document.body.classList.remove(
                "logged-in"
            );

            return;
        }


        /* ---------------------------------------------
           User is logged in
        --------------------------------------------- */

        document.body.classList.add(
            "logged-in"
        );


        if (!profileLink) {
            return;
        }


        const user =
            data.user;

        const hasAdminDashboardAccess = [

            "admin",
            "system_admin"

        ].includes(
            user.role
        );

        const dashboardLink =
            document.getElementById(
                "dashboardLink"
            );


        if (dashboardLink) {

            if (
                hasAdminDashboardAccess
            ) {

                dashboardLink.style.display =
                    "inline-block";

            }

            else {

                dashboardLink.style.display =
                    "none";

            }

        }

        /* ---------------------------------------------
           Correct destination based on role
        --------------------------------------------- */

if (
    hasAdminDashboardAccess
) {

    profileLink.href =
        "admin/admin-dashboard.html";

    profileLink.title =
        user.role ===
        "system_admin"

            ? "System Admin Dashboard"

            : "Admin Dashboard";

}

else {

    profileLink.href =
        "profile.html";

    profileLink.title =
        "My Profile";

}


        /* ---------------------------------------------
           Clear old SVG / photo / initials
        --------------------------------------------- */

        profileLink.innerHTML = "";


        /* ---------------------------------------------
           If user has uploaded a profile photo
        --------------------------------------------- */

        if (user.profilePicture) {

            const image =
                document.createElement(
                    "img"
                );


            image.src =
                user.profilePicture;


            image.alt =
                "Profile";


            image.className =
                "nav-profile-avatar";


            profileLink.appendChild(
                image
            );

        }

        else {

            /* -----------------------------------------
            create DP initials
            ----------------------------------------- */

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
                firstInitial +
                lastInitial;


            const initialsCircle =
                document.createElement(
                    "span"
                );


            initialsCircle.className =
                "nav-profile-initials";


            initialsCircle.textContent =
                initials || "U";


            profileLink.appendChild(
                initialsCircle
            );
        }

    }

    catch (error) {

        console.error(
            "Navbar authentication check failed:",
            error
        );


        document.body.classList.remove(
            "logged-in"
        );
    }
}


updateNavbarAccount();


/* =========================================================
   HOMEPAGE ROLE-AWARE DASHBOARD
   ========================================================= */

function getHomepageGreeting() {

    const hour =
        new Date()
            .getHours();


    if (
        hour <
        12
    ) {

        return "Good Morning";

    }


    if (
        hour <
        18
    ) {

        return "Good Afternoon";

    }


    return "Good Evening";

}



/* =========================================================
   FORMAT APPLICATION STATUS
   ========================================================= */

function formatHomepageStatus(
    status
) {

    const value =
        String(
            status ||
            ""
        );


    if (
        !value
    ) {

        return "";

    }


    return value

        .replaceAll(
            "_",
            " "
        )

        .replace(
            /\b\w/g,
            character =>
                character.toUpperCase()
        );

}


function formatHomepageApplicationDate(
    value
) {

    if (
        !value
    ) {

        return "";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "en-GB",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    )
    .format(
        date
    );

}


/* =========================================================
   SET HOMEPAGE DASHBOARD TEXT
   ========================================================= */

function setHomepageDashboardText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        element
    ) {

        element.textContent =
            value;

    }

}



/* =========================================================
   RENDER CANDIDATE HOMEPAGE
   ========================================================= */

function renderCandidateHomeDashboard(
    data
) {

    const recruitmentActions =
        document.getElementById(
            "homeRecruitmentActions"
        );


    if (
        recruitmentActions
    ) {

        recruitmentActions.hidden =
            true;

    }

    const candidate =
        data.candidate ||
        {};


    const firstName =
        data.user
            ?.firstName ||
        "";


    const applications =
        Number(
            candidate.applications
        ) ||
        0;


    const savedJobs =
        Number(
            candidate.savedJobs
        ) ||
        0;


    const latestApplication =
        candidate.latestApplication ||
        null;



    setHomepageDashboardText(

        "homeDashboardLabel",

        "YOUR CAREER DASHBOARD"

    );


    setHomepageDashboardText(

        "homeDashboardGreeting",

        `${
            getHomepageGreeting()
        }${
            firstName
                ? `, ${firstName}`
                : ""
        }.`

    );



    /* TILE 1 */

    setHomepageDashboardText(

        "homeDashboardTileOneLabel",

        "Applications"

    );


    setHomepageDashboardText(

        "homeDashboardTileOneValue",

        String(
            applications
        )
        .padStart(
            2,
            "0"
        )

    );


    setHomepageDashboardText(

        "homeDashboardTileOneMeta",

        applications ===
            0

            ? "No applications yet"

            : applications ===
                1

                ? "1 submitted application"

                : `${applications} submitted applications`

    );



    /* TILE 2 */

    setHomepageDashboardText(

        "homeDashboardTileTwoLabel",

        "Saved jobs"

    );


    setHomepageDashboardText(

        "homeDashboardTileTwoValue",

        String(
            savedJobs
        )
        .padStart(
            2,
            "0"
        )

    );


    setHomepageDashboardText(

        "homeDashboardTileTwoMeta",

        savedJobs ===
            0

            ? "Start exploring"

            : savedJobs ===
                1

                ? "1 job saved"

                : `${savedJobs} jobs saved`

    );



    const focusTitle =
        document.getElementById(
            "homeDashboardFocusTitle"
        );


    const focusText =
        document.getElementById(
            "homeDashboardFocusText"
        );


    const action =
        document.getElementById(
            "homeDashboardAction"
        );



    /* =====================================================
       BRAND NEW CANDIDATE
       ===================================================== */

    if (
        !latestApplication
    ) {

        const applicationTitle =
            document.getElementById(
                "homeDashboardApplicationTitle"
            );


        const applicationMeta =
            document.getElementById(
                "homeDashboardApplicationMeta"
            );


        const statusBadge =
            document.getElementById(
                "homeDashboardStatusBadge"
            );


        if (
            applicationTitle
        ) {

            applicationTitle.hidden =
                true;

        }


        if (
            applicationMeta
        ) {

            applicationMeta.hidden =
                true;

        }


        if (
            statusBadge
        ) {

            statusBadge.hidden =
                true;

        }


        if (
            focusTitle
        ) {

            focusTitle.textContent =
                "Ready to get started?";

        }


        if (
            focusText
        ) {

            focusText.textContent =
                "Explore available vacancies and submit your first application with Altrium.";

        }


        if (
            action
        ) {

            action.hidden =
                false;


            action.href =
                "jobs.html";


            action.textContent =
                "Explore vacancies";

        }


        return;

    }



/* =====================================================
   CANDIDATE WITH APPLICATION
   ===================================================== */

const applicationTitle =
    document.getElementById(
        "homeDashboardApplicationTitle"
    );


const applicationMeta =
    document.getElementById(
        "homeDashboardApplicationMeta"
    );


const applicationReference =
    document.getElementById(
        "homeDashboardApplicationReference"
    );


const applicationDate =
    document.getElementById(
        "homeDashboardApplicationDate"
    );


const statusBadge =
    document.getElementById(
        "homeDashboardStatusBadge"
    );


const formattedStatus =
    formatHomepageStatus(
        latestApplication.status
    );



if (
    focusTitle
) {

    focusTitle.textContent =
        "Latest application";

}



if (
    applicationTitle
) {

    applicationTitle.hidden =
        false;


    applicationTitle.textContent =
        latestApplication.jobTitle ||
        "Vacancy";

}



if (
    statusBadge
) {

    statusBadge.hidden =
        false;


    statusBadge.textContent =
        formattedStatus;

}



if (
    applicationMeta
) {

    applicationMeta.hidden =
        false;

}



if (
    applicationReference
) {

    applicationReference.textContent =
        latestApplication.reference ||
        "Application";

}



if (
    applicationDate
) {

    const formattedDate =
        formatHomepageApplicationDate(
            latestApplication.appliedAt
        );


    applicationDate.textContent =
        formattedDate
            ? `Applied ${formattedDate}`
            : "";

}



if (
    focusText
) {

    focusText.textContent =
        `Your application is currently in the ${formattedStatus} stage.`;

}



if (
    action
) {

    action.hidden =
        false;


    action.href =
        `/application-progress.html?id=${
            encodeURIComponent(
                latestApplication.id
            )
        }`;


    action.textContent =
        "View application progress";

}

}


/* =========================================================
   RENDER LOGGED-OUT HOMEPAGE
   ========================================================= */

function renderGuestHomeDashboard(
    data
) {

    const guest =
        data.guest ||
        {};


    const activeVacancies =
        Number(
            guest.activeVacancies
        ) ||
        0;



    /* =====================================================
       HEADER
       ===================================================== */

    setHomepageDashboardText(

        "homeDashboardLabel",

        "ALTRIUM CAREER PORTAL"

    );


    setHomepageDashboardText(

        "homeDashboardGreeting",

        "Your career journey, all in one place."

    );



    /* =====================================================
       TILE ONE
       ===================================================== */

    setHomepageDashboardText(

        "homeDashboardTileOneLabel",

        "Open vacancies"

    );


    setHomepageDashboardText(

        "homeDashboardTileOneValue",

        String(
            activeVacancies
        )
        .padStart(
            2,
            "0"
        )

    );


    setHomepageDashboardText(

        "homeDashboardTileOneMeta",

        "Roles available now"

    );



    /* =====================================================
       TILE TWO
       ===================================================== */

    setHomepageDashboardText(

        "homeDashboardTileTwoLabel",

        "Application tracking"

    );


    setHomepageDashboardText(

        "homeDashboardTileTwoValue",

        "LIVE"

    );


    setHomepageDashboardText(

        "homeDashboardTileTwoMeta",

        "Follow every recruitment stage"

    );



    /* =====================================================
       BOTTOM INFORMATION
       ===================================================== */

    setHomepageDashboardText(

        "homeDashboardFocusTitle",

        "What Altrium helps you do"

    );


    setHomepageDashboardText(

        "homeDashboardFocusText",

        "Everything you need to move from discovering a vacancy to following your recruitment progress."

    );



    /* =====================================================
       HIDE CANDIDATE ELEMENTS
       ===================================================== */

    const applicationTitle =
        document.getElementById(
            "homeDashboardApplicationTitle"
        );


    const applicationMeta =
        document.getElementById(
            "homeDashboardApplicationMeta"
        );


    const statusBadge =
        document.getElementById(
            "homeDashboardStatusBadge"
        );


    if (
        applicationTitle
    ) {

        applicationTitle.hidden =
            true;

    }


    if (
        applicationMeta
    ) {

        applicationMeta.hidden =
            true;

    }


    if (
        statusBadge
    ) {

        statusBadge.hidden =
            true;

    }



    /* =====================================================
       HIDE NORMAL ACTION BUTTON
       ===================================================== */

    const dashboardAction =
        document.getElementById(
            "homeDashboardAction"
        );


    if (
        dashboardAction
    ) {

        dashboardAction.hidden =
            true;

    }



    /* =====================================================
       HIDE TEAM QUICK ACTIONS
       ===================================================== */

    const recruitmentActions =
        document.getElementById(
            "homeRecruitmentActions"
        );


    if (
        recruitmentActions
    ) {

        recruitmentActions.hidden =
            true;

    }

}


/* =========================================================
   RENDER TEAM HOMEPAGE
   ========================================================= */

function renderTeamHomeDashboard(
    data
) {

    const recruitment =
        data.recruitment ||
        {};


    const firstName =
        data.user
            ?.firstName ||
        "";


    const activeVacancies =
        Number(
            recruitment
                .activeVacancies
        ) ||
        0;


    const applicants =
        Number(
            recruitment
                .applicants
        ) ||
        0;


    const awaitingReview =
        Number(
            recruitment
                .awaitingReview
        ) ||
        0;


    const screening =
        Number(
            recruitment
                .screening
        ) ||
        0;


    const upcomingInterviews =
        Number(
            recruitment
                .upcomingInterviews
        ) ||
        0;



    setHomepageDashboardText(

        "homeDashboardLabel",

        "RECRUITMENT OVERVIEW"

    );


    setHomepageDashboardText(

        "homeDashboardGreeting",

        `${
            getHomepageGreeting()
        }${
            firstName
                ? `, ${firstName}`
                : ""
        }.`

    );



    /* TILE 1 */

    setHomepageDashboardText(

        "homeDashboardTileOneLabel",

        "Active vacancies"

    );


    setHomepageDashboardText(

        "homeDashboardTileOneValue",

        String(
            activeVacancies
        )
        .padStart(
            2,
            "0"
        )

    );


    setHomepageDashboardText(

        "homeDashboardTileOneMeta",

        "Currently recruiting"

    );



    /* TILE 2 */

    setHomepageDashboardText(

        "homeDashboardTileTwoLabel",

        "Applicants"

    );


    setHomepageDashboardText(

        "homeDashboardTileTwoValue",

        String(
            applicants
        )
        .padStart(
            2,
            "0"
        )

    );


    setHomepageDashboardText(

        "homeDashboardTileTwoMeta",

        `${awaitingReview} awaiting review`

    );



 /* =========================================================
   RECRUITMENT ACTIVITY
   ========================================================= */

setHomepageDashboardText(

    "homeDashboardFocusTitle",

    "Recruitment activity"

);


setHomepageDashboardText(

    "homeDashboardFocusText",

    `${screening} ${
        screening === 1
            ? "application is"
            : "applications are"
    } currently in Screening · ${
        upcomingInterviews
    } upcoming ${
        upcomingInterviews === 1
            ? "interview session"
            : "interview sessions"
    }.`

);



/* =========================================================
   HIDE CANDIDATE APPLICATION ELEMENTS
   ========================================================= */

const applicationTitle =
    document.getElementById(
        "homeDashboardApplicationTitle"
    );


const applicationMeta =
    document.getElementById(
        "homeDashboardApplicationMeta"
    );


const statusBadge =
    document.getElementById(
        "homeDashboardStatusBadge"
    );


if (
    applicationTitle
) {

    applicationTitle.hidden =
        true;

}


if (
    applicationMeta
) {

    applicationMeta.hidden =
        true;

}


if (
    statusBadge
) {

    statusBadge.hidden =
        true;

}



/* =========================================================
   REMOVE OLD SINGLE ACTION
   ========================================================= */

const oldAction =
    document.getElementById(
        "homeDashboardAction"
    );


if (
    oldAction
) {

    oldAction.hidden =
        true;

}



/* =========================================================
   QUICK ACTIONS
   ========================================================= */

const recruitmentActions =
    document.getElementById(
        "homeRecruitmentActions"
    );


if (
    recruitmentActions
) {

    recruitmentActions.hidden =
        false;

}



const permissions =
    Array.isArray(
        data.permissions
    )
        ? data.permissions
        : [];



function hasHomePermission(
    permission
) {

    return permissions.includes(
        permission
    );

}



/* VIEW VACANCIES */

const viewVacanciesAction =
    document.getElementById(
        "homeViewVacanciesAction"
    );


if (
    viewVacanciesAction
) {

    viewVacanciesAction.hidden =
        !hasHomePermission(
            "vacancies.view_all"
        );

}



/* CREATE VACANCY */

const createVacancyAction =
    document.getElementById(
        "homeCreateVacancyAction"
    );


if (
    createVacancyAction
) {

    createVacancyAction.hidden =
        !hasHomePermission(
            "vacancies.manage"
        );

}



/* VIEW APPLICANTS */

const applicantsAction =
    document.getElementById(
        "homeViewApplicantsAction"
    );


if (
    applicantsAction
) {

    applicantsAction.hidden =
        !hasHomePermission(
            "applications.view_all"
        );

}



/* INTERVIEWS */

const interviewsAction =
    document.getElementById(
        "homeInterviewSessionsAction"
    );


if (
    interviewsAction
) {

    interviewsAction.hidden =
        !hasHomePermission(
            "interviews.view"
        );

}

}



/* =========================================================
   LOAD HOMEPAGE DASHBOARD
   ========================================================= */

async function loadHomeDashboard() {

    try {

        const response =
            await fetch(
                "/api/home/dashboard",
                {

                    method:
                        "GET",

                    credentials:
                        "same-origin"

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            return;

        }

        if (
            !data.loggedIn
        ) {

            renderGuestHomeDashboard(
                data
            );

            return;

        }

        if (
            data.mode ===
            "candidate"
        ) {

            renderCandidateHomeDashboard(
                data
            );


            return;

        }



        if (
            data.mode ===
            "team"
        ) {

            renderTeamHomeDashboard(
                data
            );

        }

    }

    catch (error) {

        /*
            Homepage must still work even if
            dashboard stats fail.

            We simply keep the static preview.
        */

        console.error(
            "Homepage dashboard error:",
            error
        );

    }

}


loadHomeDashboard();


/* =========================================================
   HOMEPAGE RECRUITMENT STATS
   ========================================================= */

async function loadHomepageRecruitmentStats() {

    try {

        const response =
            await fetch(
                "/api/home/stats"
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            return;

        }


        const stats =
            data.stats ||
            {};


        const activeRoles =
            document.getElementById(
                "homeActiveRoles"
            );


        const departments =
            document.getElementById(
                "homeDepartmentCount"
            );


        const openPositions =
            document.getElementById(
                "homeOpenPositions"
            );


        if (
            activeRoles
        ) {

            activeRoles.textContent =
                String(
                    Number(
                        stats.activeRoles
                    ) ||
                    0
                )
                .padStart(
                    2,
                    "0"
                );

        }


        if (
            departments
        ) {

            departments.textContent =
                String(
                    Number(
                        stats.departments
                    ) ||
                    0
                )
                .padStart(
                    2,
                    "0"
                );

        }


        if (
            openPositions
        ) {

            openPositions.textContent =
                String(
                    Number(
                        stats.openPositions
                    ) ||
                    0
                )
                .padStart(
                    2,
                    "0"
                );

        }

    }

    catch (error) {

        console.error(
            "Homepage recruitment stats error:",
            error
        );

    }

}


loadHomepageRecruitmentStats();



/* ================= FILTERS ================= */

const filterValues = {

    type: [
        "Full Time",
        "Part Time",
        "Internship",
        "Contract"
    ],

    position: [
        "On-site",
        "Hybrid",
        "Remote"
    ],

    title: [
        "Design",
        "Engineering",
        "Marketing",
        "Finance",
        "Human Resources"
    ],

    location: [
        "Colombo",
        "Kandy",
        "Galle",
        "Remote"
    ]

};


document.querySelectorAll(".filter-btn")
.forEach(button => {

    button.addEventListener("click", (event) => {

        event.stopPropagation();

        const filter =
            button.dataset.filter;

        filterDropdown.innerHTML = "";

        filterValues[filter].forEach(value => {

            const option =
                document.createElement("div");

            option.className =
                "filter-option";

            option.textContent =
                value;

            option.addEventListener(
                "click",
                () => {

                    button.innerHTML =
                        `${value} <span>⌄</span>`;

                    filterDropdown
                        .classList
                        .remove("show");

                }
            );

            filterDropdown.appendChild(option);

        });

        filterDropdown.classList.toggle("show");

    });

});


document.addEventListener(
    "click",
    () => {

        filterDropdown
            ?.classList
            .remove(
                "show"
            );

    }
);


/* ================= SEARCH ACTION ================= */

document
    .querySelector(
        ".search-btn"
    )
    ?.addEventListener(
        "click",
        () => {

            const query =
                searchInput
                    ?.value
                    .trim() ||
                "";


            if (
                !query
            ) {

                searchInput?.focus();

                return;

            }


            console.log(
                "Homepage vacancy search:",
                query
            );

        }
    );


/* ================= CAREER TIPS ================= */

const tips = [

    {
        title:
            "Find your perfect spot.",

        text:
            "Look beyond the title. Find a role where your strengths, ambitions and the culture align.",

        image:
            "assets/SlideImg1.png"
    },


    {
        title:
            "Make your profile count.",

        text:
            "A complete profile gives recruiters a clearer picture of what you can bring to the team.",

        image:
            "assets/SlideImg2.png"
    },


    {
        title:
            "Show, don't just tell.",

        text:
            "Use measurable results and real examples to make your experience memorable.",

        image:
            "assets/SlideImg3.png"
    },


    {
        title:
            "Stay open to growth.",

        text:
            "Your ideal first step may not have the perfect title — but it can open the right door.",

        image:
            "assets/SlideImg4.png"
    }

];


let currentTip = 0;


function updateTip() {

    const title =
        document.getElementById(
            "tipTitle"
        );


    const text =
        document.getElementById(
            "tipText"
        );


    const image =
        document.getElementById(
            "careerTipImage"
        );


    const slideNumber =
        document.getElementById(
            "careerSlideNumber"
        );


    const bars =
        document.querySelectorAll(
            ".slider-bars i"
        );


    const current =
        tips[currentTip];



    /* TEXT */

    if (
        title
    ) {

        title.textContent =
            current.title;

    }


    if (
        text
    ) {

        text.textContent =
            current.text;

    }



    /* IMAGE */

    if (
        image
    ) {

        image.style.opacity =
            "0";


        setTimeout(
            () => {

                image.src =
                    current.image;


                image.style.opacity =
                    "1";

            },
            180
        );

    }



    /* SLIDE NUMBER */

    if (
        slideNumber
    ) {

        slideNumber.textContent =
            `${
                String(
                    currentTip + 1
                )
                .padStart(
                    2,
                    "0"
                )
            } / ${
                String(
                    tips.length
                )
                .padStart(
                    2,
                    "0"
                )
            }`;

    }



    /* PROGRESS BARS */

    bars.forEach(
        (
            bar,
            index
        ) => {

            bar.classList.toggle(

                "active",

                index ===
                currentTip

            );

        }
    );

}


function nextTip() {

    currentTip++;

    if (
        currentTip >= tips.length
    ) {

        currentTip = 0;

    }

    updateTip();

}


function previousTip() {

    currentTip--;

    if (currentTip < 0) {

        currentTip =
            tips.length - 1;

    }

    updateTip();

}


/* Automatic slideshow */

setInterval(() => {

    nextTip();

}, 6000);


/* =====================================================
   HOMEPAGE CALENDAR
   ===================================================== */

const calendarDays =
    document.getElementById(
        "calendarDays"
    );


const calendarTitle =
    document.getElementById(
        "calendarTitle"
    );


function createCalendar() {

    if (
        !calendarDays ||
        !calendarTitle
    ) {

        console.error(
            "Homepage calendar elements could not be found.",
            {
                calendarDays,
                calendarTitle
            }
        );

        return;

    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        today.getMonth();


    const currentDate =
        today.getDate();


    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const numberOfDays =
        new Date(
            year,
            month + 1,
            0
        ).getDate();



    /* =================================================
       MONTH TITLE
       ================================================= */

    calendarTitle.textContent =
        new Intl.DateTimeFormat(
            "en-US",
            {

                month:
                    "long",

                year:
                    "numeric"

            }
        ).format(
            today
        );



    /* =================================================
       CLEAR OLD CALENDAR
       ================================================= */

    calendarDays.innerHTML =
        "";



    /* =================================================
       EMPTY DAYS BEFORE MONTH START
       ================================================= */

    for (
        let index = 0;
        index < firstDay;
        index += 1
    ) {

        const emptyDay =
            document.createElement(
                "span"
            );


        emptyDay.className =
            "calendar-empty";


        calendarDays.appendChild(
            emptyDay
        );

    }



    /* =================================================
       DAYS OF MONTH
       ================================================= */

    for (
        let day = 1;
        day <= numberOfDays;
        day += 1
    ) {

        const dayElement =
            document.createElement(
                "span"
            );


        dayElement.textContent =
            String(
                day
            );


        dayElement.dataset.date =
            `${year}-${
                String(
                    month + 1
                ).padStart(
                    2,
                    "0"
                )
            }-${
                String(
                    day
                ).padStart(
                    2,
                    "0"
                )
            }`;


        if (
            day ===
            currentDate
        ) {

            dayElement.classList.add(
                "today"
            );

        }


        calendarDays.appendChild(
            dayElement
        );

    }


    console.log(
        `Homepage calendar rendered: ${numberOfDays} days`
    );

}


createCalendar();


/* ================= NAV ACTIVE STATE ================= */

const navLinks =
    document.querySelectorAll(
        ".nav-links a"
    );


navLinks.forEach(link => {

    link.addEventListener(
        "click",
        () => {

            navLinks.forEach(item => {

                item.classList.remove(
                    "active"
                );

            });

            link.classList.add(
                "active"
            );

        }
    );

});