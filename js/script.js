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

searchTrigger.addEventListener("click", () => {

    navbar.classList.add("search-mode");

    setTimeout(() => {
        searchInput.focus();
    }, 150);

});


/* Close search */

closeSearch.addEventListener("click", () => {

    navbar.classList.remove("search-mode");

    filterDropdown.classList.remove("show");

});


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


        /* ---------------------------------------------
           Correct destination based on role
        --------------------------------------------- */

        if (user.role === "admin") {

            profileLink.href =
                "admin-dashboard.html";

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
               No photo → create initials
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


document.addEventListener("click", () => {

    filterDropdown
        .classList
        .remove("show");

});


/* ================= SEARCH ACTION ================= */

document
    .querySelector(".search-btn")
    .addEventListener("click", () => {

        const query =
            searchInput.value.trim();

        if (!query) {

            searchInput.focus();

            return;

        }

        alert(
            `Searching Altrium vacancies for: ${query}`
        );

    });


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


/* ================= CALENDAR ================= */

const calendarDays =
    document.getElementById(
        "calendarDays"
    );

const calendarTitle =
    document.getElementById(
        "calendarTitle"
    );


function createCalendar() {

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


    calendarTitle.textContent =
        new Intl.DateTimeFormat(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        ).format(today);


    calendarDays.innerHTML = "";


    /* Empty spaces before first day */

    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        const empty =
            document.createElement("span");

        calendarDays.appendChild(
            empty
        );

    }


    /* Days */

    for (
        let day = 1;
        day <= numberOfDays;
        day++
    ) {

        const date =
            document.createElement("span");

        date.textContent =
            day;


        if (
            day === currentDate
        ) {

            date.classList.add(
                "today"
            );

        }


        calendarDays.appendChild(
            date
        );

    }

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