

/* =====================================================
   NAVBAR AUTH STATUS
   ===================================================== */

document.addEventListener("DOMContentLoaded", async function () {

    const signInLink =
        document.getElementById("signInLink");

    const profileLink =
        document.getElementById("profileLink");


    /*
    |--------------------------------------------------------------------------
    | Check authentication session
    |--------------------------------------------------------------------------
    */

    try {

        const response = await fetch(
            "/api/auth/status",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );


        const data =
            await response.json();


        if (!signInLink || !profileLink) {
            return;
        }


        /*
        |--------------------------------------------------------------------------
        | User is logged in
        |--------------------------------------------------------------------------
        */

        if (data.loggedIn) {

            signInLink.style.display =
                "none";

            profileLink.style.display =
                "inline-flex";

        }


        /*
        |--------------------------------------------------------------------------
        | User is NOT logged in
        |--------------------------------------------------------------------------
        */

        else {

            signInLink.style.display =
                "inline";

            profileLink.style.display =
                "none";

        }

    }

    catch (error) {

        console.error(
            "Could not check login status:",
            error
        );

    }

});


/* =====================================================
   PASSWORD SHOW / HIDE
   ===================================================== */

function togglePassword(inputId, button) {

    const input =
        document.getElementById(inputId);


    if (!input) {
        return;
    }


    if (input.type === "password") {

        input.type = "text";

        button.textContent =
            "Hide";

    }

    else {

        input.type = "password";

        button.textContent =
            "Show";

    }

}


/* =====================================================
   REGISTER
   ===================================================== */

const registerForm =
    document.getElementById(
        "registerForm"
    );


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /*
            |--------------------------------------------------------------------------
            | Get form values
            |--------------------------------------------------------------------------
            */

            const firstName =
                document.getElementById(
                    "firstName"
                ).value.trim();


            const lastName =
                document.getElementById(
                    "lastName"
                ).value.trim();


            const email =
                document.getElementById(
                    "registerEmail"
                ).value.trim();


            const phone =
                document.getElementById(
                    "registerPhone"
                ).value.trim();


            const password =
                document.getElementById(
                    "registerPassword"
                ).value;


            /*
            |--------------------------------------------------------------------------
            | Basic validation
            |--------------------------------------------------------------------------
            */

            if (
                !firstName ||
                !lastName ||
                !email ||
                !password
            ) {

                alert(
                    "Please fill in all required fields."
                );

                return;

            }


            /*
            |--------------------------------------------------------------------------
            | Send registration to Node API
            |--------------------------------------------------------------------------
            */

            try {

                const response =
                    await fetch(
                        "/api/auth/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials:
                                "same-origin",

                            body: JSON.stringify({

                                firstName:
                                    firstName,

                                lastName:
                                    lastName,

                                email:
                                    email,

                                phone:
                                    phone,

                                password:
                                    password

                            })

                        }
                    );


                const data =
                    await response.json();


                /*
                |--------------------------------------------------------------------------
                | Registration failed
                |--------------------------------------------------------------------------
                */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Registration failed."
                    );

                    return;

                }


                /*
                |--------------------------------------------------------------------------
                | Registration successful
                |--------------------------------------------------------------------------
                */

                alert(
                    "Account created successfully!"
                );


                /*
                |--------------------------------------------------------------------------
                | The backend has created the session.
                | No localStorage required.
                |--------------------------------------------------------------------------
                */

                window.location.href =
                    "profile.html";

            }

            catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                alert(
                    "Unable to connect to the server."
                );

            }

        }
    );

}


/* =====================================================
   LOGIN
   ===================================================== */

const loginForm =
    document.getElementById(
        "loginForm"
    );


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /*
            |--------------------------------------------------------------------------
            | Get login information
            |--------------------------------------------------------------------------
            */

            const email =
                document.getElementById(
                    "loginEmail"
                ).value.trim();


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            const rememberElement =
                document.getElementById(
                    "rememberMe"
                );


            const rememberMe =
                rememberElement
                    ? rememberElement.checked
                    : false;


            /*
            |--------------------------------------------------------------------------
            | Validate
            |--------------------------------------------------------------------------
            */

            if (!email || !password) {

                alert(
                    "Please enter your email and password."
                );

                return;

            }


            /*
            |--------------------------------------------------------------------------
            | Send login request to Node API
            |--------------------------------------------------------------------------
            */

            try {

                const response =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials:
                                "same-origin",

                            body: JSON.stringify({

                                email:
                                    email,

                                password:
                                    password,

                                rememberMe:
                                    rememberMe

                            })

                        }
                    );


                const data =
                    await response.json();


                /*
                |--------------------------------------------------------------------------
                | Login failed
                |--------------------------------------------------------------------------
                */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Incorrect email or password."
                    );

                    return;

                }


                /*
                |--------------------------------------------------------------------------
                | LOGIN SUCCESS
                |--------------------------------------------------------------------------
                |
                | PHP creates the session.
                |
                | We DO NOT store:
                |
                | localStorage.setItem(...)
                |
                | The PHP session is now the source
                | of truth.
                |--------------------------------------------------------------------------
                */

                window.location.href =
                    "index.html";

            }

            catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                alert(
                    "Unable to connect to the server."
                );

            }

        }
    );

}


/* =====================================================
   PROFILE EMAIL
   ===================================================== */

async function loadProfileEmail() {

    const profileEmail =
        document.getElementById(
            "profileEmailInput"
        );


    if (!profileEmail) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/profile",
                {
                    method: "GET",

                    credentials:
                        "same-origin"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.loggedIn
        ) {

            window.location.href =
                "login.html";

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | Email comes from the backend API
        |--------------------------------------------------------------------------
        */

        profileEmail.value =
            data.user.email || "";

    }

    catch (error) {

        console.error(
            "Could not load profile email:",
            error
        );

    }

}


document.addEventListener(
    "DOMContentLoaded",
    loadProfileEmail
);


/* =====================================================
   PROFILE LINK
   ===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const profileLink =
            document.getElementById(
                "profileLink"
            );


        if (profileLink) {

            profileLink.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    window.location.href =
                        "profile.html";

                }
            );

        }

    }
);


/* =====================================================
   GOOGLE LOGIN
   ===================================================== */

const googleLogin =
    document.getElementById(
        "googleLogin"
    );


if (googleLogin) {

    googleLogin.addEventListener(
        "click",
        function () {

            alert(
                "Google login has not been connected yet."
            );

        }
    );

}


/* =====================================================
   GOOGLE REGISTER
   ===================================================== */

const googleRegister =
    document.getElementById(
        "googleRegister"
    );


if (googleRegister) {

    googleRegister.addEventListener(
        "click",
        function () {

            alert(
                "Google registration has not been connected yet."
            );

        }
    );

}