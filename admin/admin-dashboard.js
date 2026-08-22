/* =========================================================
   ALTRIUM ADMIN DASHBOARD
   ========================================================= */


/* =========================================================
   VERIFY ADMIN
   ========================================================= */

async function verifyAdmin() {

    try {

        const response = await fetch(
            "/api/auth/me",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );


        const data = await response.json();


        // Not logged in
        if (!response.ok || !data.success) {

            window.location.href =
                "../login.html";

            return;
        }


        // Logged in, but not an admin
        if (data.user.role !== "admin") {

            window.location.href =
                "../profile.html";

            return;
        }


        console.log(
            "Admin verified:",
            data.user.email
        );

    }

    catch (error) {

        console.error(
            "Admin verification error:",
            error
        );

        window.location.href =
            "../login.html";
    }

}



/* =========================================================
   ADMIN NAVIGATION
   ========================================================= */

const adminNavItems =
    document.querySelectorAll(
        ".admin-nav-item"
    );


const adminSections =
    document.querySelectorAll(
        ".admin-section"
    );


adminNavItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            const target =
                item.dataset.section;


            // Remove active state from navigation
            adminNavItems.forEach(navItem => {

                navItem.classList.remove(
                    "active"
                );

            });


            // Hide all sections
            adminSections.forEach(section => {

                section.classList.remove(
                    "active"
                );

            });


            // Activate clicked navigation item
            item.classList.add(
                "active"
            );


            // Show selected section
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

const adminLogoutButton =
    document.getElementById(
        "adminLogoutButton"
    );


if (adminLogoutButton) {

    adminLogoutButton.addEventListener(
        "click",
        async () => {

            try {

                const response = await fetch(
                    "/api/auth/logout",
                    {
                        method: "POST",
                        credentials: "same-origin"
                    }
                );


                const data =
                    await response.json();


                if (data.success) {

                    window.location.href =
                        "../login.html";

                    return;
                }


                window.location.href =
                    "../login.html";

            }

            catch (error) {

                console.error(
                    "Admin logout error:",
                    error
                );


                window.location.href =
                    "../login.html";
            }

        }
    );

}



/* =========================================================
   START ADMIN DASHBOARD
   ========================================================= */

verifyAdmin();