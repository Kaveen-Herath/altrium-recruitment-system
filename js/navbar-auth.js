/* =========================================================
   ALTRIUM GLOBAL NAVBAR AUTH
   ========================================================= */

async function loadNavbarUser() {

    const signInLink =
        document.getElementById(
            "signInLink"
        );

    const profileLink =
        document.getElementById(
            "profileLink"
        );

    const dashboardLink =
        document.getElementById(
            "dashboardLink"
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


        const data =
            await response.json();


        /* =============================================
           NOT LOGGED IN
           ============================================= */

        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {

            document.body.classList.remove(
                "logged-in"
            );


            if (dashboardLink) {
                dashboardLink.style.display =
                    "none";
            }


            return;
        }


        /* =============================================
           LOGGED IN
           ============================================= */

        const user =
            data.user;


        document.body.classList.add(
            "logged-in"
        );


        /* =============================================
           PROFILE AVATAR
           ============================================= */

        if (profileLink) {

            if (user.profilePicture) {

                profileLink.innerHTML = `
                    <img
                        src="${user.profilePicture}"
                        alt="Profile"
                        class="nav-profile-avatar"
                    >
                `;

            }

            else {

                const firstInitial =
                    user.firstName
                        ? user.firstName
                            .charAt(0)
                            .toUpperCase()
                        : "";


                const lastInitial =
                    user.lastName
                        ? user.lastName
                            .charAt(0)
                            .toUpperCase()
                        : "";


                const initials =
                    `${firstInitial}${lastInitial}`;


                profileLink.innerHTML = `
                    <span class="nav-profile-initials">
                        ${initials}
                    </span>
                `;

            }

        }


        /* =============================================
           ADMIN DASHBOARD
           ============================================= */

        if (dashboardLink) {

            if (user.role === "admin") {

                dashboardLink.style.display =
                    "inline";

            }

            else {

                dashboardLink.style.display =
                    "none";

            }

        }

    }

    catch (error) {

        console.error(
            "Navbar user error:",
            error
        );


        document.body.classList.remove(
            "logged-in"
        );


        if (dashboardLink) {
            dashboardLink.style.display =
                "none";
        }

    }

}

/* =========================================================
   NAVBAR NOTIFICATIONS
   ========================================================= */

const notificationNav =
    document.getElementById(
        "notificationNav"
    );


const notificationTrigger =
    document.getElementById(
        "notificationTrigger"
    );


const notificationCount =
    document.getElementById(
        "notificationCount"
    );


/* =========================================================
   OPEN / CLOSE NOTIFICATION PANEL
   ========================================================= */

notificationTrigger?.addEventListener(
    "click",
    event => {

        event.stopPropagation();


        notificationNav?.classList.toggle(
            "open"
        );

    }
);


/* =========================================================
   CLOSE WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            notificationNav &&
            !notificationNav.contains(
                event.target
            )
        ) {

            notificationNav.classList.remove(
                "open"
            );

        }

    }
);


/* =========================================================
   CLOSE WITH ESCAPE
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            notificationNav?.classList.remove(
                "open"
            );

        }

    }
);


/* =========================================================
   UPDATE UNREAD NOTIFICATION STATE
   ========================================================= */

function updateNotificationUnreadCount(
    unreadCount
) {

    const count =
        Number(unreadCount) || 0;


    notificationTrigger?.classList.toggle(
        "has-unread",
        count > 0
    );


    if (notificationCount) {

        notificationCount.textContent =
            `${count} unread`;

    }

}


/*
    Temporary starting state.

    Later this value will come from
    the notifications table in PostgreSQL.
*/

updateNotificationUnreadCount(0);


/* =========================================================
   START
   ========================================================= */

loadNavbarUser();