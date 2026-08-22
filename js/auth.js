let pendingVerificationEmail = "";

function showToast(message, type = "error") {

    const container =
        document.getElementById("toastContainer");

    if (!container) {
        console.error(message);
        return;
    }


    const toast =
        document.createElement("div");

    toast.className =
        `toast ${type}`;


    const icon =
        type === "success" ? "✓" : "!";


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


    toast.querySelector(".toast-message")
        .textContent = message;


    container.appendChild(toast);


    const removeToast = () => {

        toast.classList.add("hide");

        setTimeout(() => {
            toast.remove();
        }, 250);

    };


    toast
        .querySelector(".toast-close")
        .addEventListener(
            "click",
            removeToast
        );


    setTimeout(
        removeToast,
        4500
    );
}

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
                | ACCOUNT CREATED - EMAIL VERIFICATION REQUIRED
                |--------------------------------------------------------------------------
                */

                pendingVerificationEmail =
                    data.email;


                const verificationPopup =
                    document.getElementById(
                        "verificationPopup"
                    );


                const verificationEmail =
                    document.getElementById(
                        "verificationEmail"
                    );


                if (
                    verificationPopup &&
                    verificationEmail
                ) {

                    verificationEmail.textContent =
                        pendingVerificationEmail;


                    verificationPopup.classList.add(
                        "show"
                    );


                    verificationPopup.setAttribute(
                        "aria-hidden",
                        "false"
                    );


                    const verificationDigits =
                        document.querySelectorAll(
                            ".verification-digit"
                        );


                    verificationDigits.forEach(
                        function (input) {
                            input.value = "";
                        }
                    );


                    if (verificationDigits.length > 0) {

                        setTimeout(
                            function () {
                                verificationDigits[0].focus();
                            },
                            300
                        );
                    }
                }

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
   VERIFICATION CODE INPUTS
   ===================================================== */

const verificationDigits =
    document.querySelectorAll(
        ".verification-digit"
    );


if (verificationDigits.length > 0) {

    verificationDigits.forEach(
        function (input, index) {

            /*
            |----------------------------------------------------------
            | When user types
            |----------------------------------------------------------
            */

            input.addEventListener(
                "input",
                function () {

                    // Allow numbers only
                    input.value =
                        input.value.replace(
                            /\D/g,
                            ""
                        );


                    // Keep only one digit
                    input.value =
                        input.value.slice(0, 1);


                    // Move to next box
                    if (
                        input.value &&
                        index <
                        verificationDigits.length - 1
                    ) {

                        verificationDigits[
                            index + 1
                        ].focus();

                    }

                }
            );


            /*
            |----------------------------------------------------------
            | Backspace navigation
            |----------------------------------------------------------
            */

            input.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Backspace" &&
                        !input.value &&
                        index > 0
                    ) {

                        verificationDigits[
                            index - 1
                        ].focus();

                    }

                }
            );


            /*
            |----------------------------------------------------------
            | Paste full verification code
            |----------------------------------------------------------
            */

            input.addEventListener(
                "paste",
                function (event) {

                    event.preventDefault();


                    const pastedText =
                        event.clipboardData
                            .getData("text")
                            .replace(/\D/g, "")
                            .slice(0, 6);


                    if (!pastedText) {
                        return;
                    }


                    pastedText
                        .split("")
                        .forEach(
                            function (digit, pasteIndex) {

                                if (
                                    verificationDigits[
                                        pasteIndex
                                    ]
                                ) {

                                    verificationDigits[
                                        pasteIndex
                                    ].value =
                                        digit;

                                }

                            }
                        );


                    const lastFilledIndex =
                        Math.min(
                            pastedText.length - 1,
                            verificationDigits.length - 1
                        );


                    verificationDigits[
                        lastFilledIndex
                    ].focus();

                }
            );

        }
    );

}

/* =====================================================
   VERIFY EMAIL
   ===================================================== */

const verifyEmailButton =
    document.getElementById(
        "verifyEmailButton"
    );


if (verifyEmailButton) {

    verifyEmailButton.addEventListener(
        "click",
        async function () {

            /*
            |----------------------------------------------------------
            | Collect the 6 digits
            |----------------------------------------------------------
            */

            const verificationDigits =
                document.querySelectorAll(
                    ".verification-digit"
                );


            const verificationCode =
                Array.from(
                    verificationDigits
                )
                .map(
                    function (input) {
                        return input.value;
                    }
                )
                .join("");


            /*
            |----------------------------------------------------------
            | Validate
            |----------------------------------------------------------
            */

            if (
                !/^\d{6}$/.test(
                    verificationCode
                )
            ) {

                showToast(
                    "Please enter the complete 6-digit verification code.",
                    "error"
                );

                return;
            }


            if (!pendingVerificationEmail) {

                showToast(
                    "We couldn't identify the email being verified. Please register again.",
                    "error"
                );

                return;
            }


            /*
            |----------------------------------------------------------
            | Disable button while checking
            |----------------------------------------------------------
            */

            verifyEmailButton.disabled = true;

            const originalButtonText =
                verifyEmailButton.innerHTML;


            verifyEmailButton.innerHTML =
                "Verifying...";


            /*
            |----------------------------------------------------------
            | Send verification request
            |----------------------------------------------------------
            */

            try {

                const response =
                    await fetch(
                        "/api/auth/verify-email",
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
                                    pendingVerificationEmail,

                                code:
                                    verificationCode
                            })
                        }
                    );


                const data =
                    await response.json();


                /*
                |----------------------------------------------------------
                | Verification failed
                |----------------------------------------------------------
                */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    showToast(
                        data.message ||
                        "Unable to verify your email.",
                        "error"
                    );

                    return;
                }


                /*
                |----------------------------------------------------------
                | EMAIL VERIFIED
                |----------------------------------------------------------
                */

                const verificationPopup =
                    document.getElementById(
                        "verificationPopup"
                    );


                if (verificationPopup) {

                    verificationPopup.classList.remove(
                        "show"
                    );

                    verificationPopup.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                }


                /*
                |----------------------------------------------------------
                | Show big success animation
                |----------------------------------------------------------
                */

                const successPopup =
                    document.getElementById(
                        "registrationSuccessPopup"
                    );


                if (successPopup) {

                    successPopup.classList.add(
                        "show"
                    );

                }


                /*
                |----------------------------------------------------------
                | User already has a session from backend
                | Redirect to profile
                |----------------------------------------------------------
                */

                setTimeout(
                    function () {

                        window.location.href =
                            "profile.html";

                    },
                    1800
                );

            }

            catch (error) {

                console.error(
                    "Verification error:",
                    error
                );


                showToast(
                    "Unable to verify your email right now. Please try again.",
                    "error"
                );

            }

            finally {

                verifyEmailButton.disabled =
                    false;

                verifyEmailButton.innerHTML =
                    originalButtonText;

            }

        }
    );

}

/* =====================================================
   LOGIN
   ===================================================== */

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /*
            |----------------------------------------------------------
            | Get login information
            |----------------------------------------------------------
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
            |----------------------------------------------------------
            | Validate
            |----------------------------------------------------------
            */

            if (!email || !password) {

                showToast(
                    "Please enter your email and password.",
                    "error"
                );

                return;
            }


            /*
            |----------------------------------------------------------
            | Send login request to Node API
            |----------------------------------------------------------
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
                                email: email,
                                password: password,
                                rememberMe: rememberMe
                            })
                        }
                    );


                const data =
                    await response.json();


                /*
                |----------------------------------------------------------
                | Login failed
                |----------------------------------------------------------
                */

                if (!response.ok || !data.success) {

                    showToast(
                        data.message ||
                        "Unable to log in.",
                        "error"
                    );

                    return;
                }


                /*
                |----------------------------------------------------------
                | LOGIN SUCCESS
                |----------------------------------------------------------
                |
                | Node creates the session.
                |
                | We do NOT store the user account in localStorage.
                |
                | The server-side session is the source of truth.
                |----------------------------------------------------------
                */

                showToast(
                    "Login successful!",
                    "success"
                );


                setTimeout(
                    function () {

                        if (
                            data.user.role ===
                            "admin"
                        ) {

                            window.location.href =
                                "admin-dashboard.html";

                        } else {

                            window.location.href =
                                "profile.html";
                        }

                    },
                    900
                );

            }

            catch (error) {

                console.error(
                    "Login error:",
                    error
                );


                showToast(
                    "Unable to connect to the server. Please try again.",
                    "error"
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