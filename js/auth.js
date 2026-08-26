let pendingVerificationEmail = "";
let pendingResetEmail = "";



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

                        /* ADMIN ALWAYS GOES TO ADMIN DASHBOARD */

                        if (
                            data.user.role ===
                            "admin"
                        ) {

                            window.location.href =
                                "admin/admin-dashboard.html";

                            return;
                        }


                        /* =================================================
                        CANDIDATE RETURN-TO FLOW
                        ================================================= */

                        const params =
                            new URLSearchParams(
                                window.location.search
                            );


                        const returnTo =
                            params.get("returnTo");


                        /*
                            Only allow our jobs application URL.

                            Example:
                            jobs.html?apply=6
                        */

                        if (
                            returnTo &&
                            returnTo.startsWith(
                                "jobs.html?apply="
                            )
                        ) {

                            window.location.href =
                                returnTo;

                            return;
                        }


                        /* NORMAL CANDIDATE LOGIN */

                        window.location.href =
                            "profile.html";

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

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

const forgotPasswordLink =
    document.getElementById(
        "forgotPasswordLink"
    );

const forgotPasswordPopup =
    document.getElementById(
        "forgotPasswordPopup"
    );

const forgotPasswordClose =
    document.getElementById(
        "forgotPasswordClose"
    );

const backToLoginButton =
    document.getElementById(
        "backToLoginButton"
    );

const forgotPasswordEmail =
    document.getElementById(
        "forgotPasswordEmail"
    );

const sendResetCodeButton =
    document.getElementById(
        "sendResetCodeButton"
    );

const forgotNewPasswordStep =
    document.getElementById(
        "forgotNewPasswordStep"
    );

const newResetPassword =
    document.getElementById(
        "newResetPassword"
    );

const confirmResetPassword =
    document.getElementById(
        "confirmResetPassword"
    );

const resetPasswordButton =
    document.getElementById(
        "resetPasswordButton"
    );


/* ---------------------------------------------------------
   Open popup
   --------------------------------------------------------- */

const forgotEmailStep =
    document.getElementById(
        "forgotEmailStep"
    );

const forgotCodeStep =
    document.getElementById(
        "forgotCodeStep"
    );

const resetCodeEmail =
    document.getElementById(
        "resetCodeEmail"
    );

const resetCodeDigits =
    document.querySelectorAll(
        ".reset-code-digit"
    );

const verifyResetCodeButton =
    document.getElementById(
        "verifyResetCodeButton"
    );

const changeResetEmailButton =
    document.getElementById(
        "changeResetEmailButton"
    );

if (
    forgotPasswordLink &&
    forgotPasswordPopup
) {

    forgotPasswordLink.addEventListener(
        "click",
        function(event) {

            event.preventDefault();


            /* If login email already has a value,
               copy it into forgot-password email */

            const loginEmail =
                document.getElementById(
                    "loginEmail"
                );


            if (
                loginEmail &&
                loginEmail.value.trim()
            ) {

                forgotPasswordEmail.value =
                    loginEmail.value.trim();
            }


            forgotPasswordPopup.classList.add(
                "show"
            );


            forgotPasswordPopup.setAttribute(
                "aria-hidden",
                "false"
            );


            setTimeout(() => {

                if (forgotPasswordEmail) {

                    forgotPasswordEmail.focus();
                }

            }, 200);

        }
    );
}


/* ---------------------------------------------------------
   Close popup function
   --------------------------------------------------------- */

function closeForgotPasswordPopup() {

    if (!forgotPasswordPopup) {
        return;
    }


    forgotPasswordPopup.classList.remove(
        "show"
    );


    forgotPasswordPopup.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* ---------------------------------------------------------
   X button
   --------------------------------------------------------- */

if (forgotPasswordClose) {

    forgotPasswordClose.addEventListener(
        "click",
        closeForgotPasswordPopup
    );
}


/* ---------------------------------------------------------
   Back to sign in button
   --------------------------------------------------------- */

if (backToLoginButton) {

    backToLoginButton.addEventListener(
        "click",
        closeForgotPasswordPopup
    );
}


/* ---------------------------------------------------------
   Click outside card to close
   --------------------------------------------------------- */

if (forgotPasswordPopup) {

    forgotPasswordPopup.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                forgotPasswordPopup
            ) {

                closeForgotPasswordPopup();
            }

        }
    );
}


/* ---------------------------------------------------------
   Send reset code
   --------------------------------------------------------- */

if (sendResetCodeButton) {

    sendResetCodeButton.addEventListener(
        "click",
        async function() {

            const email =
                forgotPasswordEmail
                    ? forgotPasswordEmail
                        .value
                        .trim()
                        .toLowerCase()
                    : "";


            /* ---------------------------------------------
               Validate email
            --------------------------------------------- */

            if (!email) {

                showToast(
                    "Please enter your email address.",
                    "error"
                );

                return;
            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (!emailPattern.test(email)) {

                showToast(
                    "Please enter a valid email address.",
                    "error"
                );

                return;
            }


            try {

                sendResetCodeButton.disabled =
                    true;


                sendResetCodeButton.innerHTML =
                    "SENDING CODE...";


                /* -----------------------------------------
                   Call Node backend
                ----------------------------------------- */

                const response =
                    await fetch(
                        "/api/auth/forgot-password",
                        {
                            method: "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email: email
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    showToast(
                        data.message ||
                        "Unable to send reset code.",
                        "error"
                    );

                    return;
                }


                /* -----------------------------------------
                   Remember email for next reset stage
                ----------------------------------------- */

                pendingResetEmail =
                    email;

                if (resetCodeEmail) {
                    resetCodeEmail.textContent =
                        pendingResetEmail;
                }


                if (forgotEmailStep) {
                    forgotEmailStep.style.display =
                        "none";
                }


                if (forgotCodeStep) {
                    forgotCodeStep.style.display =
                        "block";
                }


                resetCodeDigits.forEach(
                    (input) => {
                        input.value = "";
                    }
                );


                if (resetCodeDigits.length > 0) {
                    resetCodeDigits[0].focus();
                }


                /* -----------------------------------------
                   Success
                ----------------------------------------- */

                showToast(
                    data.message ||
                    "Reset code sent. Check your email.",
                    "success"
                );


                /*
                 * Do NOT close the popup yet.
                 *
                 * In the next step we will change this
                 * popup into the 6-digit code screen.
                 */

            }

            catch (error) {

                console.error(
                    "Forgot password error:",
                    error
                );


                showToast(
                    "Unable to send reset code. Please try again.",
                    "error"
                );

            }

            finally {

                sendResetCodeButton.disabled =
                    false;


                sendResetCodeButton.innerHTML =
                    `
                        SEND RESET CODE
                    `;

            }

        }
    );
}

/* =========================================================
   PASSWORD RESET CODE INPUTS
   ========================================================= */

resetCodeDigits.forEach(
    (input, index) => {

        input.addEventListener(
            "input",
            function() {

                this.value =
                    this.value.replace(
                        /\D/g,
                        ""
                    );

                if (
                    this.value &&
                    index <
                    resetCodeDigits.length - 1
                ) {

                    resetCodeDigits[
                        index + 1
                    ].focus();
                }

            }
        );


        input.addEventListener(
            "keydown",
            function(event) {

                if (
                    event.key === "Backspace" &&
                    !this.value &&
                    index > 0
                ) {

                    resetCodeDigits[
                        index - 1
                    ].focus();
                }

            }
        );


        input.addEventListener(
            "paste",
            function(event) {

                event.preventDefault();


                const pasted =
                    event.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);


                pasted
                    .split("")
                    .forEach(
                        (digit, digitIndex) => {

                            if (
                                resetCodeDigits[
                                    digitIndex
                                ]
                            ) {

                                resetCodeDigits[
                                    digitIndex
                                ].value =
                                    digit;
                            }

                        }
                    );


                if (pasted.length === 6) {

                    resetCodeDigits[5]
                        .focus();
                }

            }
        );

    }
);


/* =========================================================
   VERIFY PASSWORD RESET CODE
   ========================================================= */

if (verifyResetCodeButton) {

    verifyResetCodeButton.addEventListener(
        "click",
        async function() {

            const code =
                Array.from(
                    resetCodeDigits
                )
                    .map(
                        (input) =>
                            input.value
                    )
                    .join("");


            if (code.length !== 6) {

                showToast(
                    "Please enter the complete 6-digit code.",
                    "error"
                );

                return;
            }


            if (!pendingResetEmail) {

                showToast(
                    "Your reset session has expired. Please start again.",
                    "error"
                );

                return;
            }


            try {

                verifyResetCodeButton.disabled =
                    true;


                verifyResetCodeButton.innerHTML =
                    "VERIFYING...";


                const response =
                    await fetch(
                        "/api/auth/verify-reset-code",
                        {
                            method: "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email:
                                        pendingResetEmail,

                                    code:
                                        code
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    showToast(
                        data.message ||
                        "Invalid reset code.",
                        "error"
                    );

                    return;
                }


                showToast(
                    "Code verified successfully.",
                    "success"
                );

                if (forgotCodeStep) {
                    forgotCodeStep.style.display =
                        "none";
                }


                if (forgotNewPasswordStep) {
                    forgotNewPasswordStep.style.display =
                        "block";
                }


                if (newResetPassword) {
                    newResetPassword.focus();
                }


                /*
                 * NEXT:
                 * We will replace the code screen
                 * with the New Password screen.
                 */

            }

            catch (error) {

                console.error(
                    "Reset code verification error:",
                    error
                );


                showToast(
                    "Unable to verify the reset code.",
                    "error"
                );

            }

            finally {

                verifyResetCodeButton.disabled =
                    false;


                verifyResetCodeButton.innerHTML =
                    `
                        VERIFY CODE
                    `;

            }

        }
    );
}


/* =========================================================
   CHANGE RESET EMAIL
   ========================================================= */

if (changeResetEmailButton) {

    changeResetEmailButton.addEventListener(
        "click",
        function() {

            if (forgotCodeStep) {
                forgotCodeStep.style.display =
                    "none";
            }


            if (forgotEmailStep) {
                forgotEmailStep.style.display =
                    "block";
            }


            resetCodeDigits.forEach(
                (input) => {
                    input.value = "";
                }
            );


            if (forgotPasswordEmail) {
                forgotPasswordEmail.focus();
            }

        }
    );

}

/* =========================================================
   RESET PASSWORD
   ========================================================= */

if (resetPasswordButton) {

    resetPasswordButton.addEventListener(
        "click",
        async function() {

            const newPassword =
                newResetPassword
                    ? newResetPassword.value
                    : "";


            const confirmPassword =
                confirmResetPassword
                    ? confirmResetPassword.value
                    : "";


            if (
                !newPassword ||
                !confirmPassword
            ) {

                showToast(
                    "Please enter and confirm your new password.",
                    "error"
                );

                return;
            }


            if (newPassword.length < 8) {

                showToast(
                    "Password must be at least 8 characters long.",
                    "error"
                );

                return;
            }


            if (
                newPassword !==
                confirmPassword
            ) {

                showToast(
                    "Passwords do not match.",
                    "error"
                );

                return;
            }


            try {

                resetPasswordButton.disabled =
                    true;


                resetPasswordButton.innerHTML =
                    "RESETTING...";


                const response =
                    await fetch(
                        "/api/auth/reset-password",
                        {
                            method: "POST",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    newPassword:
                                        newPassword,

                                    confirmPassword:
                                        confirmPassword
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    showToast(
                        data.message ||
                        "Unable to reset password.",
                        "error"
                    );

                    return;
                }


                showToast(
                    "Password changed successfully. You can now sign in.",
                    "success"
                );


                /* Clear reset state */

                pendingResetEmail = "";


                if (newResetPassword) {
                    newResetPassword.value = "";
                }


                if (confirmResetPassword) {
                    confirmResetPassword.value = "";
                }


                /* Close popup */

                closeForgotPasswordPopup();


                /* Optional:
                   Put user back on login email field */

                const loginEmail =
                    document.getElementById(
                        "loginEmail"
                    );


                if (loginEmail) {
                    loginEmail.focus();
                }

            }

            catch (error) {

                console.error(
                    "Reset password error:",
                    error
                );


                showToast(
                    "Unable to reset your password.",
                    "error"
                );

            }

            finally {

                resetPasswordButton.disabled =
                    false;


                resetPasswordButton.innerHTML =
                    `
                        RESET PASSWORD
                    `;

            }

        }
    );
}