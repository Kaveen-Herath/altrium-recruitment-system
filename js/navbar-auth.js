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

const hasAdminDashboardAccess = [

    "admin",
    "system_admin"

].includes(
    user.role
);


if (
    hasAdminDashboardAccess
) {

    dashboardLink.style.display =
        "inline";

}

else {

    dashboardLink.style.display =
        "none";

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

                    else if (
                        notificationType ===
                        "system_feedback"
                    ) {

                        action.textContent =
                            "View feedback";

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
   ALTRIUM MOBILE NAVIGATION
   ========================================================= */

function createMobileNavigation() {

    const navbar =
        document.querySelector(
            ".navbar"
        );


    if (
        !navbar ||
        document.getElementById(
            "mobileMenuButton"
        )
    ) {

        return;

    }


    const logo =
        navbar.querySelector(
            ".logo"
        );


    const desktopNavigation =
        navbar.querySelector(
            ".nav-links"
        );


    if (
        !logo ||
        !desktopNavigation
    ) {

        return;

    }



    /* =====================================================
       MENU BUTTON
       ===================================================== */

    const menuButton =
        document.createElement(
            "button"
        );


    menuButton.type =
        "button";


    menuButton.id =
        "mobileMenuButton";


    menuButton.className =
        "mobile-menu-button";


    menuButton.setAttribute(
        "aria-label",
        "Open navigation"
    );


    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );


    menuButton.innerHTML = `

        <span></span>
        <span></span>
        <span></span>

    `;



    /*
        Put it BEFORE the Altrium logo.
    */

    navbar.insertBefore(
        menuButton,
        logo
    );



    /* =====================================================
       BACKDROP
       ===================================================== */

    const backdrop =
        document.createElement(
            "div"
        );


    backdrop.className =
        "mobile-menu-backdrop";


    backdrop.id =
        "mobileMenuBackdrop";



    /* =====================================================
       DRAWER
       ===================================================== */

    const drawer =
        document.createElement(
            "aside"
        );


    drawer.className =
        "mobile-menu-drawer";


    drawer.id =
        "mobileMenuDrawer";


    drawer.setAttribute(
        "aria-hidden",
        "true"
    );



    /* =====================================================
       DRAWER HEADER
       ===================================================== */

    const drawerHeader =
        document.createElement(
            "div"
        );


    drawerHeader.className =
        "mobile-menu-header";


    drawerHeader.innerHTML = `

        <span>
            ALTRIUM
        </span>

        <strong>
            Navigation
        </strong>

    `;


    drawer.appendChild(
        drawerHeader
    );



    /* =====================================================
       NAVIGATION LINKS
       ===================================================== */

    const mobileNavigation =
        document.createElement(
            "nav"
        );


    mobileNavigation.className =
        "mobile-menu-links";



    desktopNavigation
        .querySelectorAll(
            ":scope > a"
        )
        .forEach(
            (
                link,
                index
            ) => {

                const mobileLink =
                    link.cloneNode(
                        true
                    );


                /*
                    Never duplicate HTML IDs.
                */

                mobileLink.removeAttribute(
                    "id"
                );


                mobileLink.classList.add(
                    "mobile-menu-link"
                );


                /*
                    Number used only as a visual menu index.
                */

                const menuNumber =
                    document.createElement(
                        "span"
                    );


                menuNumber.className =
                    "mobile-menu-link-number";


                menuNumber.textContent =
                    String(
                        index + 1
                    )
                    .padStart(
                        2,
                        "0"
                    );


                mobileLink.prepend(
                    menuNumber
                );



                /*
                    Dashboard visibility will mirror
                    the real desktop Dashboard link
                    after authentication completes.
                */

                if (
                    link.id ===
                    "dashboardLink"
                ) {

                    mobileLink.classList.add(
                        "mobile-dashboard-link"
                    );


                    mobileLink.hidden =
                        true;

                }


                mobileNavigation
                    .appendChild(
                        mobileLink
                    );

            }
        );


    drawer.appendChild(
        mobileNavigation
    );



    /* =====================================================
       BOTTOM DETAIL
       ===================================================== */

    const drawerFooter =
        document.createElement(
            "div"
        );


    drawerFooter.className =
        "mobile-menu-footer";


    drawerFooter.innerHTML = `

        <span>
            ALTRIUM CAREER PORTAL
        </span>

        <p>
            Find opportunities. Build your profile.
            Track your journey.
        </p>

    `;


    drawer.appendChild(
        drawerFooter
    );



    document.body.appendChild(
        backdrop
    );


    document.body.appendChild(
        drawer
    );



    /* =====================================================
       OPEN MENU
       ===================================================== */

    function openMobileMenu() {

        document.body
            .classList
            .add(
                "mobile-menu-open"
            );


        menuButton.classList.add(
            "open"
        );


        drawer.classList.add(
            "open"
        );


        backdrop.classList.add(
            "open"
        );


        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );


        menuButton.setAttribute(
            "aria-label",
            "Close navigation"
        );


        drawer.setAttribute(
            "aria-hidden",
            "false"
        );

    }



    /* =====================================================
       CLOSE MENU
       ===================================================== */

    function closeMobileMenu() {

        document.body
            .classList
            .remove(
                "mobile-menu-open"
            );


        menuButton.classList.remove(
            "open"
        );


        drawer.classList.remove(
            "open"
        );


        backdrop.classList.remove(
            "open"
        );


        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );


        menuButton.setAttribute(
            "aria-label",
            "Open navigation"
        );


        drawer.setAttribute(
            "aria-hidden",
            "true"
        );

    }



    /* =====================================================
       BUTTON
       ===================================================== */

    menuButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            if (
                drawer.classList.contains(
                    "open"
                )
            ) {

                closeMobileMenu();

            }

            else {

                openMobileMenu();

            }

        }
    );



    /* =====================================================
       BACKDROP
       ===================================================== */

    backdrop.addEventListener(
        "click",
        closeMobileMenu
    );



    /* =====================================================
       CLOSE AFTER NAVIGATION
       ===================================================== */

    mobileNavigation
        .querySelectorAll(
            "a"
        )
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    closeMobileMenu
                );

            }
        );



    /* =====================================================
       ESCAPE
       ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"

                &&

                drawer.classList.contains(
                    "open"
                )
            ) {

                closeMobileMenu();

            }

        }
    );



    /* =====================================================
       DESKTOP RESIZE
       ===================================================== */

    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                700
            ) {

                closeMobileMenu();

            }

        }
    );

}



/* =========================================================
   SYNC MOBILE DASHBOARD ACCESS
   ========================================================= */

function syncMobileNavigationAccess() {

    const desktopDashboard =
        document.getElementById(
            "dashboardLink"
        );


    const mobileDashboard =
        document.querySelector(
            ".mobile-dashboard-link"
        );


    if (
        !desktopDashboard ||
        !mobileDashboard
    ) {

        return;

    }


    const dashboardVisible =
        window
            .getComputedStyle(
                desktopDashboard
            )
            .display !==
        "none";


    mobileDashboard.hidden =
        !dashboardVisible;

}


/* =========================================================
   MOBILE ADMIN DASHBOARD GUARD
   ========================================================= */

const MOBILE_DASHBOARD_BREAKPOINT =
    700;


function isMobileDashboardViewport() {

    return window.matchMedia(
        `(max-width: ${MOBILE_DASHBOARD_BREAKPOINT}px)`
    ).matches;

}



/* =========================================================
   CHECK IF LINK GOES TO ADMIN DASHBOARD
   ========================================================= */

function isAdminDashboardLink(
    link
) {

    if (
        !link
    ) {

        return false;

    }


    const href =
        String(
            link.getAttribute(
                "href"
            ) ||
            ""
        );


    return /admin-dashboard\.html(?:[?#].*)?$/i
        .test(
            href
        );

}



/* =========================================================
   CHECK IF WE ARE CURRENTLY ON ADMIN DASHBOARD
   ========================================================= */

function isAdminDashboardPage() {

    return /\/admin-dashboard\.html$/i
        .test(
            window.location.pathname
        );

}



/* =========================================================
   CLOSE MOBILE DRAWER
   ========================================================= */

function closeMobileNavigationForDashboardNotice() {

    document.body.classList.remove(
        "mobile-menu-open"
    );


    const menuButton =
        document.getElementById(
            "mobileMenuButton"
        );


    const drawer =
        document.getElementById(
            "mobileMenuDrawer"
        );


    const backdrop =
        document.getElementById(
            "mobileMenuBackdrop"
        );


    if (
        menuButton
    ) {

        menuButton.classList.remove(
            "open"
        );


        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    if (
        drawer
    ) {

        drawer.classList.remove(
            "open"
        );


        drawer.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    if (
        backdrop
    ) {

        backdrop.classList.remove(
            "open"
        );

    }

}



/* =========================================================
   CREATE DASHBOARD NOTICE
   ========================================================= */

function createMobileDashboardNotice() {

    const existing =
        document.getElementById(
            "mobileDashboardNotice"
        );


    if (
        existing
    ) {

        return existing;

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "mobileDashboardNotice";


    overlay.className =
        "mobile-dashboard-notice";


    overlay.setAttribute(
        "aria-hidden",
        "true"
    );


    overlay.innerHTML = `

        <div
            class="mobile-dashboard-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobileDashboardNoticeTitle"
        >

            <button
                type="button"
                class="mobile-dashboard-dialog-close"
                id="mobileDashboardNoticeClose"
                aria-label="Close"
            >
                <span></span>
                <span></span>
            </button>


            <div class="mobile-dashboard-dialog-icon">

                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <rect
                        x="3"
                        y="4"
                        width="18"
                        height="12"
                        rx="2"
                    ></rect>

                    <path
                        d="M8 20h8"
                    ></path>

                    <path
                        d="M12 16v4"
                    ></path>
                </svg>

            </div>


            <span class="mobile-dashboard-dialog-label">
                ALTRIUM RECRUITMENT
            </span>


            <h2 id="mobileDashboardNoticeTitle">
                Desktop experience required.
            </h2>


            <p>

                The recruitment dashboard is designed
                for desktop and laptop screens.

            </p>


            <p>

                Open Altrium on a larger device to manage
                vacancies, applicants, evaluations and
                interview sessions.

            </p>


            <div class="mobile-dashboard-device-note">

                <span class="mobile-dashboard-device-dot"></span>

                Recommended for screens wider than 700px

            </div>


            <button
                type="button"
                class="mobile-dashboard-dialog-action"
                id="mobileDashboardNoticeAction"
            >
                Got it
            </button>

        </div>

    `;


    document.body.appendChild(
        overlay
    );



    const closeButton =
        overlay.querySelector(
            "#mobileDashboardNoticeClose"
        );


    const actionButton =
        overlay.querySelector(
            "#mobileDashboardNoticeAction"
        );



    closeButton.addEventListener(
        "click",
        () => {

            hideMobileDashboardNotice();

        }
    );



    actionButton.addEventListener(
        "click",
        () => {

            const blocking =
                overlay.dataset.blocking ===
                "true";


            if (
                blocking
            ) {

                window.location.href =
                    "/index.html";


                return;

            }


            hideMobileDashboardNotice();

        }
    );



    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target !==
                    overlay

                ||

                overlay.dataset.blocking ===
                    "true"
            ) {

                return;

            }


            hideMobileDashboardNotice();

        }
    );


    return overlay;

}



/* =========================================================
   SHOW NOTICE
   ========================================================= */

function showMobileDashboardNotice(
    blocking = false
) {

    closeMobileNavigationForDashboardNotice();


    const overlay =
        createMobileDashboardNotice();


    const closeButton =
        overlay.querySelector(
            "#mobileDashboardNoticeClose"
        );


    const actionButton =
        overlay.querySelector(
            "#mobileDashboardNoticeAction"
        );


    overlay.dataset.blocking =
        blocking
            ? "true"
            : "false";


    if (
        blocking
    ) {

        closeButton.hidden =
            true;


        actionButton.textContent =
            "Back to home";

    }

    else {

        closeButton.hidden =
            false;


        actionButton.textContent =
            "Got it";

    }


    overlay.classList.add(
        "show"
    );


    overlay.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "mobile-dashboard-notice-open"
    );

}



/* =========================================================
   HIDE NOTICE
   ========================================================= */

function hideMobileDashboardNotice(
    force = false
) {

    const overlay =
        document.getElementById(
            "mobileDashboardNotice"
        );


    if (
        !overlay
    ) {

        return;

    }


    const blocking =
        overlay.dataset.blocking ===
        "true";


    if (
        blocking &&
        !force
    ) {

        return;

    }


    overlay.classList.remove(
        "show"
    );


    overlay.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "mobile-dashboard-notice-open"
    );

}



/* =========================================================
   BLOCK DASHBOARD LINK CLICKS ON MOBILE
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            !isMobileDashboardViewport()
        ) {

            return;

        }


        const link =
            event.target.closest(
                "a[href]"
            );


        if (
            !isAdminDashboardLink(
                link
            )
        ) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        showMobileDashboardNotice(
            false
        );

    },
    true
);



/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {

            return;

        }


        const overlay =
            document.getElementById(
                "mobileDashboardNotice"
            );


        if (
            !overlay ||
            !overlay.classList.contains(
                "show"
            )
        ) {

            return;

        }


        if (
            overlay.dataset.blocking ===
            "true"
        ) {

            return;

        }


        hideMobileDashboardNotice();

    }
);



/* =========================================================
   DIRECT DASHBOARD MOBILE ACCESS
   ========================================================= */

function enforceMobileDashboardPageGuard() {

    if (
        !isAdminDashboardPage()
    ) {

        return;

    }


    function checkDashboardViewport() {

        if (
            isMobileDashboardViewport()
        ) {

            showMobileDashboardNotice(
                true
            );

        }

        else {

            hideMobileDashboardNotice(
                true
            );

        }

    }


    checkDashboardViewport();


    window.addEventListener(
        "resize",
        checkDashboardViewport
    );

}


/* =========================================================
   START NAVBAR
   ========================================================= */

createMobileNavigation();


enforceMobileDashboardPageGuard();


loadNavbarUser()
    .finally(
        () => {

            syncMobileNavigationAccess();

        }
    );