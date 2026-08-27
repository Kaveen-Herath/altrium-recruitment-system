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

        const dashboardLink =
            document.getElementById(
                "dashboardLink"
            );


        if (dashboardLink) {

            if (user.role === "admin") {

                dashboardLink.style.display =
                    "inline-block";

            } else {

                dashboardLink.style.display =
                    "none";

            }

        }

        /* ---------------------------------------------
           Correct destination based on role
        --------------------------------------------- */

        if (user.role === "admin") {

            profileLink.href =
                "admin/admin-dashboard.html";

            profileLink.title =
                "Admin Dashboard";

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
            "Look beyond the title. Find a role where your strengths, ambitions and the culture align."
    },

    {
        title:
            "Make your profile count.",

        text:
            "A complete profile gives recruiters a clearer picture of what you can bring to the team."
    },

    {
        title:
            "Show, don't just tell.",

        text:
            "Use measurable results and real examples to make your experience memorable."
    },

    {
        title:
            "Stay open to growth.",

        text:
            "Your ideal first step may not have the perfect title — but it can open the right door."
    }

];


let currentTip = 0;


function updateTip() {

    const title =
        document.getElementById("tipTitle");

    const text =
        document.getElementById("tipText");

    const bars =
        document.querySelectorAll(
            ".slider-bars i"
        );


    title.textContent =
        tips[currentTip].title;

    text.textContent =
        tips[currentTip].text;


    bars.forEach((bar, index) => {

        bar.classList.toggle(
            "active",
            index === currentTip
        );

    });

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