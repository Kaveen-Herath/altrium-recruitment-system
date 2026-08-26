/* =========================================================
   ALTRIUM GLOBAL NAVBAR AUTH
   ========================================================= */

let navbarNotifications = [];

let navbarUnreadCount = 0;



/* =========================================================
   NAVBAR ELEMENTS
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


const notificationList =
    document.getElementById(
        "notificationList"
    );



/* =========================================================
   LOAD NAVBAR USER
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
                    method:
                        "GET",

                    credentials:
                        "same-origin"
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

            document.body
                .classList
                .remove(
                    "logged-in"
                );


            if (dashboardLink) {

                dashboardLink.style.display =
                    "none";

            }


            navbarNotifications =
                [];


            navbarUnreadCount =
                0;


            updateNotificationUnreadCount(
                0
            );


            return;

        }



        /* =============================================
           LOGGED IN
           ============================================= */

        const user =
            data.user;


        document.body
            .classList
            .add(
                "logged-in"
            );



        /* =============================================
           PROFILE AVATAR
           ============================================= */

        if (profileLink) {

            if (
                user.profilePicture
            ) {

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

            if (
                user.role ===
                "admin"
            ) {

                dashboardLink.style.display =
                    "inline";

            }

            else {

                dashboardLink.style.display =
                    "none";

            }

        }



        /* =============================================
           LOAD USER NOTIFICATIONS
           ============================================= */

        await loadNavbarNotifications();

    }

    catch (error) {

        console.error(
            "Navbar user error:",
            error
        );


        document.body
            .classList
            .remove(
                "logged-in"
            );


        if (dashboardLink) {

            dashboardLink.style.display =
                "none";

        }

    }

}



/* =========================================================
   FORMAT NOTIFICATION TIME
   ========================================================= */

function formatNotificationTime(
    dateValue
) {

    if (!dateValue) {

        return "";

    }


    const date =
        new Date(
            dateValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const difference =
        Date.now() -
        date.getTime();


    const minute =
        60 * 1000;


    const hour =
        60 * minute;


    const day =
        24 * hour;



    if (
        difference <
        minute
    ) {

        return "Just now";

    }


    if (
        difference <
        hour
    ) {

        const minutes =
            Math.floor(
                difference /
                minute
            );


        return `${minutes}m ago`;

    }


    if (
        difference <
        day
    ) {

        const hours =
            Math.floor(
                difference /
                hour
            );


        return `${hours}h ago`;

    }


    const days =
        Math.floor(
            difference /
            day
        );


    if (
        days <= 7
    ) {

        return `${days}d ago`;

    }


    return date
        .toLocaleDateString(
            "en-GB",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric"
            }
        );

}



/* =========================================================
   UPDATE UNREAD COUNT
   ========================================================= */

function updateNotificationUnreadCount(
    unreadCount
) {

    const count =
        Number(
            unreadCount
        ) || 0;


    navbarUnreadCount =
        count;


    notificationTrigger
        ?.classList
        .toggle(
            "has-unread",
            count > 0
        );


    if (
        notificationCount
    ) {

        notificationCount.textContent =
            `${count} unread`;

    }

}



/* =========================================================
   RENDER NOTIFICATIONS
   ========================================================= */

function renderNavbarNotifications() {

    if (
        !notificationList
    ) {

        return;

    }


    notificationList.innerHTML =
        "";


    /* =====================================================
       EMPTY STATE
       ===================================================== */

    if (
        navbarNotifications.length ===
        0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "notification-empty";


        const title =
            document.createElement(
                "strong"
            );


        title.textContent =
            "You're all caught up.";


        const message =
            document.createElement(
                "p"
            );


        message.textContent =
            "New job and application updates will appear here.";


        empty.appendChild(
            title
        );


        empty.appendChild(
            message
        );


        notificationList.appendChild(
            empty
        );


        return;

    }



    /* =====================================================
       NOTIFICATION ITEMS
       ===================================================== */

    navbarNotifications
        .forEach(
            notification => {

                const item =
                    document.createElement(
                        "button"
                    );


                item.type =
                    "button";



                /* =========================================
                   NOTIFICATION TYPE
                   ========================================= */

                const notificationType =
                    String(
                        notification.notificationType ||
                        notification.notification_type ||
                        ""
                    );


                const isApplicationNotification =
                    notificationType.startsWith(
                        "application_"
                    );



                /* =========================================
                   ITEM CLASS
                   ========================================= */

                item.className =
                    isApplicationNotification
                        ? "notification-item application-notification"
                        : "notification-item";



                /* =========================================
                   UNREAD STATE
                   ========================================= */

                if (
                    !notification.is_read
                ) {

                    item.classList.add(
                        "unread"
                    );

                }



                /* =========================================
                   INDICATOR
                   ========================================= */

                const indicator =
                    document.createElement(
                        "span"
                    );


                indicator.className =
                    "notification-item-indicator";



                /* =========================================
                   CONTENT
                   ========================================= */

                const content =
                    document.createElement(
                        "div"
                    );


                content.className =
                    "notification-item-content";



                /* =========================================
                   TOP ROW
                   ========================================= */

                const top =
                    document.createElement(
                        "div"
                    );


                top.className =
                    "notification-item-top";



                const title =
                    document.createElement(
                        "strong"
                    );


                title.textContent =
                    notification.title ||
                    "Notification";



                const time =
                    document.createElement(
                        "span"
                    );


                time.textContent =
                    formatNotificationTime(
                        notification.created_at
                    );



                top.appendChild(
                    title
                );


                top.appendChild(
                    time
                );



                /* =========================================
                   MESSAGE
                   ========================================= */

                const message =
                    document.createElement(
                        "p"
                    );


                message.textContent =
                    notification.message ||
                    "";



                content.appendChild(
                    top
                );


                content.appendChild(
                    message
                );



                /* =========================================
                   ACTION
                   ========================================= */

                if (
                    notification.action_url
                ) {

                    const action =
                        document.createElement(
                            "span"
                        );


                    action.className =
                        "notification-item-action";


                    if (
                        notificationType ===
                        "new_job"
                    ) {

                        action.textContent =
                            "View vacancy";

                    }

                    else {

                        action.textContent =
                            "View progress";

                    }


                    content.appendChild(
                        action
                    );

                }



                /* =========================================
                   BUILD ITEM
                   ========================================= */

                item.appendChild(
                    indicator
                );


                item.appendChild(
                    content
                );



                /* =========================================
                   CLICK
                   ========================================= */

                item.addEventListener(
                    "click",
                    async () => {

                        await markNotificationRead(
                            notification.id
                        );


                        if (
                            notification.action_url
                        ) {

                            window.location.href =
                                notification.action_url;

                        }

                    }
                );



                notificationList
                    .appendChild(
                        item
                    );

            }
        );

}



/* =========================================================
   LOAD NOTIFICATIONS
   ========================================================= */

async function loadNavbarNotifications() {

    try {

        const response =
            await fetch(
                "/api/notifications",
                {
                    method:
                        "GET",

                    credentials:
                        "same-origin"
                }
            );


        if (
            !response.ok
        ) {

            navbarNotifications =
                [];


            updateNotificationUnreadCount(
                0
            );


            renderNavbarNotifications();


            return;

        }


        const data =
            await response.json();


        if (
            !data.success
        ) {

            return;

        }


        navbarNotifications =
            data.notifications ||
            [];


        updateNotificationUnreadCount(
            data.unreadCount
        );


        renderNavbarNotifications();

    }

    catch (error) {

        console.error(
            "Load notifications error:",
            error
        );

    }

}



/* =========================================================
   MARK ONE AS READ
   ========================================================= */

async function markNotificationRead(
    notificationId
) {

    if (!notificationId) {

        return;

    }


    try {

        await fetch(
            `/api/notifications/${notificationId}/read`,
            {
                method:
                    "PATCH",

                credentials:
                    "same-origin"
            }
        );


        const notification =
            navbarNotifications
                .find(
                    item =>
                        String(item.id) ===
                        String(
                            notificationId
                        )
                );


        if (
            notification &&
            !notification.is_read
        ) {

            notification.is_read =
                true;


            navbarUnreadCount =
                Math.max(
                    0,
                    navbarUnreadCount - 1
                );


            updateNotificationUnreadCount(
                navbarUnreadCount
            );


            renderNavbarNotifications();

        }

    }

    catch (error) {

        console.error(
            "Mark notification read error:",
            error
        );

    }

}



/* =========================================================
   MARK ALL AS READ
   ========================================================= */

async function markAllNotificationsRead() {

    if (
        navbarUnreadCount ===
        0
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/notifications/read-all",
                {
                    method:
                        "PATCH",

                    credentials:
                        "same-origin"
                }
            );


        if (
            !response.ok
        ) {

            return;

        }


        navbarNotifications =
            navbarNotifications
                .map(
                    notification => ({
                        ...notification,

                        is_read:
                            true
                    })
                );


        updateNotificationUnreadCount(
            0
        );


        renderNavbarNotifications();

    }

    catch (error) {

        console.error(
            "Mark all notifications read error:",
            error
        );

    }

}



/* =========================================================
   OPEN / CLOSE NOTIFICATION PANEL
   ========================================================= */

notificationTrigger
    ?.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            const opening =
                !notificationNav
                    ?.classList
                    .contains(
                        "open"
                    );


            notificationNav
                ?.classList
                .toggle(
                    "open"
                );


            if (opening) {

                await loadNavbarNotifications();

            }

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

            notificationNav
                .classList
                .remove(
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
            event.key ===
            "Escape"
        ) {

            notificationNav
                ?.classList
                .remove(
                    "open"
                );

        }

    }
);



/* =========================================================
   ALLOW OTHER PAGE SCRIPTS TO REFRESH BELL
   ========================================================= */

window.refreshNavbarNotifications =
    loadNavbarNotifications;



/* =========================================================
   START NAVBAR
   ========================================================= */

loadNavbarUser();