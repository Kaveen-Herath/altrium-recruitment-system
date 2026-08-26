/* =========================================================
   ALTRIUM APPLICATION PROGRESS
   ========================================================= */


/* =========================================================
   PAGE ELEMENTS
   ========================================================= */

const progressLoading =
    document.getElementById(
        "progressLoading"
    );


const progressError =
    document.getElementById(
        "progressError"
    );


const progressErrorMessage =
    document.getElementById(
        "progressErrorMessage"
    );


const progressContent =
    document.getElementById(
        "progressContent"
    );


const progressCurrentStatus =
    document.getElementById(
        "progressCurrentStatus"
    );


const progressStatusPill =
    document.getElementById(
        "progressStatusPill"
    );


const progressStatusDescription =
    document.getElementById(
        "progressStatusDescription"
    );


const progressHistory =
    document.getElementById(
        "progressHistory"
    );


const progressInterviews =
    document.getElementById(
        "progressInterviews"
    );


const progressTerminalState =
    document.getElementById(
        "progressTerminalState"
    );


const withdrawApplicationButton =
    document.getElementById(
        "withdrawApplicationButton"
    );



/* =========================================================
   STATUS ORDER
   ========================================================= */

const normalStatusOrder = [

    "submitted",

    "screening",

    "shortlisted",

    "interview",

    "offer",

    "hired"

];



/* =========================================================
   STATUS TEXT
   ========================================================= */

const statusDescriptions = {

    submitted:
        "Your application has been successfully received.",

    screening:
        "The Altrium recruitment team is reviewing your application.",

    shortlisted:
        "You've been shortlisted and are moving forward in the process.",

    interview:
        "You've reached the interview stage. Check your interview details below.",

    offer:
        "Great news — your application has reached the offer stage.",

    hired:
        "Congratulations! Your application has successfully completed the recruitment process.",

    rejected:
        "This application will not be moving forward in the recruitment process.",

    withdrawn:
        "You have withdrawn this application."

};



/* =========================================================
   FORMAT GENERAL DATE
   Used for application/history timestamps.
   ========================================================= */

function formatProgressDate(
    dateValue
) {

    if (
        !dateValue
    ) {

        return "—";

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

        return "—";

    }


    return date.toLocaleString(
        "en-GB",
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}



/* =========================================================
   FORMAT INTERVIEW DATE
   ========================================================= */

function formatInterviewDate(
    dateValue
) {

    if (
        !dateValue
    ) {

        return "Not provided";

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

        return "Not provided";

    }


    return new Intl.DateTimeFormat(
        "en-GB",
        {

            weekday:
                "short",

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            timeZone:
                "Asia/Colombo"

        }
    ).format(
        date
    );

}



/* =========================================================
   FORMAT INTERVIEW TIME
   ========================================================= */

function formatInterviewTime(
    dateValue
) {

    if (
        !dateValue
    ) {

        return "—";

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

        return "—";

    }


    return new Intl.DateTimeFormat(
        "en-US",
        {

            hour:
                "numeric",

            minute:
                "2-digit",

            hour12:
                true,

            timeZone:
                "Asia/Colombo"

        }
    ).format(
        date
    );

}



/* =========================================================
   CALCULATE INTERVIEW END TIME
   ========================================================= */

function getInterviewEndTime(
    scheduledAt,
    durationMinutes
) {

    const start =
        new Date(
            scheduledAt
        );


    if (
        Number.isNaN(
            start.getTime()
        )
    ) {

        return null;

    }


    const duration =
        Number(
            durationMinutes
        ) || 0;


    return new Date(
        start.getTime() +
        duration * 60 * 1000
    );

}



/* =========================================================
   CLEAN INTERVIEW TITLE

   Prevent:
   Round 1 · Backend Developer Interview - Round 1

   Instead:
   Round 1 · Backend Developer Interview
   ========================================================= */

function cleanInterviewTitle(
    title
) {

    const value =
        String(
            title ||
            "Interview"
        )
        .trim();


    return value.replace(
        /\s*-\s*Round\s+\d+\s*$/i,
        ""
    );

}



/* =========================================================
   FORMAT STATUS
   ========================================================= */

function formatStatus(
    value
) {

    if (
        !value
    ) {

        return "Unknown";

    }


    return String(
        value
    )
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            character =>
                character
                    .toUpperCase()
        );

}



/* =========================================================
   FORMAT INTERVIEW TYPE
   ========================================================= */

function getInterviewTypeLabel(
    interview
) {

    const type =
        String(
            interview.type ||
            ""
        )
        .toLowerCase();


    if (
        type ===
        "online"
    ) {

        return interview.meetingUrl
            ? "Google Meet"
            : "Online interview";

    }


    if (
        type ===
        "onsite"
    ) {

        return "Onsite interview";

    }


    if (
        type ===
        "phone"
    ) {

        return "Phone interview";

    }


    return formatStatus(
        type
    );

}



/* =========================================================
   RENDER TRACKER
   ========================================================= */

function renderProgressTracker(
    currentStatus
) {

    const steps =
        document.querySelectorAll(
            ".progress-step"
        );


    steps.forEach(
        step => {

            step.classList.remove(
                "complete",
                "current"
            );

        }
    );


    if (
        currentStatus ===
            "rejected" ||
        currentStatus ===
            "withdrawn"
    ) {

        if (
            progressTerminalState
        ) {

            progressTerminalState.hidden =
                false;


            progressTerminalState.className =
                `progress-terminal-state ${currentStatus}`;


            progressTerminalState.textContent =
                currentStatus ===
                "rejected"
                    ? "This application has been closed and will not move to the next stage."
                    : "This application was withdrawn.";

        }


        return;

    }


    if (
        progressTerminalState
    ) {

        progressTerminalState.hidden =
            true;

    }


    const currentIndex =
        normalStatusOrder.indexOf(
            currentStatus
        );


    steps.forEach(
        step => {

            const status =
                step.dataset.status;


            const stepIndex =
                normalStatusOrder.indexOf(
                    status
                );


            if (
                stepIndex <
                currentIndex
            ) {

                step.classList.add(
                    "complete"
                );

            }

            else if (
                stepIndex ===
                currentIndex
            ) {

                step.classList.add(
                    "current"
                );

            }

        }
    );

}



/* =========================================================
   RENDER HISTORY
   ========================================================= */

function renderProgressHistory(
    history
) {

    if (
        !progressHistory
    ) {

        return;

    }


    progressHistory.innerHTML =
        "";


    if (
        !Array.isArray(
            history
        ) ||
        history.length ===
        0
    ) {

        progressHistory.innerHTML = `
            <div class="progress-interview-empty">
                No status activity yet.
            </div>
        `;


        return;

    }


    [
        ...history
    ]
        .reverse()
        .forEach(
            item => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "progress-history-item";


                const dot =
                    document.createElement(
                        "span"
                    );


                dot.className =
                    "progress-history-dot";


                const content =
                    document.createElement(
                        "div"
                    );


                const title =
                    document.createElement(
                        "strong"
                    );


                title.textContent =
                    formatStatus(
                        item.status
                    );


                const message =
                    document.createElement(
                        "p"
                    );


                message.textContent =
                    item.note ||
                    `Application moved to ${formatStatus(
                        item.status
                    )}.`;


                const date =
                    document.createElement(
                        "small"
                    );


                date.textContent =
                    formatProgressDate(
                        item.createdAt
                    );


                content.appendChild(
                    title
                );


                content.appendChild(
                    message
                );


                content.appendChild(
                    date
                );


                row.appendChild(
                    dot
                );


                row.appendChild(
                    content
                );


                progressHistory.appendChild(
                    row
                );

            }
        );

}



/* =========================================================
   CREATE INTERVIEW DETAIL BOX
   ========================================================= */

function createInterviewDetailBox(
    labelText,
    valueText
) {

    const box =
        document.createElement(
            "div"
        );


    const label =
        document.createElement(
            "span"
        );


    label.textContent =
        labelText;


    const value =
        document.createElement(
            "strong"
        );


    value.textContent =
        valueText;


    box.appendChild(
        label
    );


    box.appendChild(
        value
    );


    return box;

}



/* =========================================================
   RENDER INTERVIEWS
   ========================================================= */

function renderInterviews(
    interviews
) {

    if (
        !progressInterviews
    ) {

        return;

    }


    progressInterviews.innerHTML =
        "";


    if (
        !Array.isArray(
            interviews
        ) ||
        interviews.length ===
        0
    ) {

        progressInterviews.innerHTML = `
            <div class="progress-interview-empty">
                No interview has been scheduled yet.
            </div>
        `;


        return;

    }


    interviews.forEach(
        interview => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "progress-interview-card";



            /* =================================================
               TOP LABELS
               ================================================= */

            const top =
                document.createElement(
                    "div"
                );


            top.className =
                "progress-interview-top";


            const platform =
                document.createElement(
                    "span"
                );


            platform.className =
                "progress-interview-platform";


            if (
                interview.type ===
                "online" &&
                interview.meetingUrl
            ) {

                platform.textContent =
                    "GOOGLE MEET";

            }

            else {

                platform.textContent =
                    getInterviewTypeLabel(
                        interview
                    )
                    .toUpperCase();

            }


            const status =
                document.createElement(
                    "span"
                );


            status.className =
                "progress-interview-status";


            status.textContent =
                formatStatus(
                    interview.status ||
                    "scheduled"
                );


            top.appendChild(
                platform
            );


            top.appendChild(
                status
            );


            card.appendChild(
                top
            );



            /* =================================================
               TITLE
               ================================================= */

            const title =
                document.createElement(
                    "strong"
                );


            title.className =
                "progress-interview-title";


            const cleanTitle =
                cleanInterviewTitle(
                    interview.title
                );


            title.textContent =
                `Round ${
                    interview.roundNumber ||
                    1
                } · ${cleanTitle}`;


            card.appendChild(
                title
            );



            /* =================================================
               DATE + TIME + TYPE
               ================================================= */

            const details =
                document.createElement(
                    "div"
                );


            details.className =
                "progress-interview-details";


            const interviewEnd =
                getInterviewEndTime(

                    interview.scheduledAt,

                    interview.durationMinutes

                );


            const dateBox =
                createInterviewDetailBox(

                    "DATE",

                    formatInterviewDate(
                        interview.scheduledAt
                    )

                );


            const timeBox =
                createInterviewDetailBox(

                    "TIME",

                    `${
                        formatInterviewTime(
                            interview.scheduledAt
                        )
                    } – ${
                        interviewEnd
                            ? formatInterviewTime(
                                interviewEnd
                            )
                            : "—"
                    }`

                );


            const typeBox =
                createInterviewDetailBox(

                    "TYPE",

                    getInterviewTypeLabel(
                        interview
                    )

                );


            details.appendChild(
                dateBox
            );


            details.appendChild(
                timeBox
            );


            details.appendChild(
                typeBox
            );


            card.appendChild(
                details
            );



            /* =================================================
               LOCATION
               Only show for onsite interviews.
               ================================================= */

            if (
                interview.type ===
                    "onsite" &&
                interview.location
            ) {

                const locationBox =
                    document.createElement(
                        "div"
                    );


                locationBox.className =
                    "progress-interview-instructions";


                const locationLabel =
                    document.createElement(
                        "span"
                    );


                locationLabel.textContent =
                    "LOCATION";


                const locationText =
                    document.createElement(
                        "p"
                    );


                locationText.textContent =
                    interview.location;


                locationBox.appendChild(
                    locationLabel
                );


                locationBox.appendChild(
                    locationText
                );


                card.appendChild(
                    locationBox
                );

            }



            /* =================================================
               INSTRUCTIONS
               ================================================= */

            if (
                interview.instructions
            ) {

                const instructionsBox =
                    document.createElement(
                        "div"
                    );


                instructionsBox.className =
                    "progress-interview-instructions";


                const instructionsLabel =
                    document.createElement(
                        "span"
                    );


                instructionsLabel.textContent =
                    "INSTRUCTIONS";


                const instructionsText =
                    document.createElement(
                        "p"
                    );


                instructionsText.textContent =
                    interview.instructions;


                instructionsBox.appendChild(
                    instructionsLabel
                );


                instructionsBox.appendChild(
                    instructionsText
                );


                card.appendChild(
                    instructionsBox
                );

            }



            /* =================================================
               GOOGLE MEET BUTTON
               ================================================= */

            if (
                interview.meetingUrl
            ) {

                const link =
                    document.createElement(
                        "a"
                    );


                link.href =
                    interview.meetingUrl;


                link.target =
                    "_blank";


                link.rel =
                    "noopener noreferrer";


                link.textContent =
                    interview.type ===
                    "online"
                        ? "Join Google Meet"
                        : "Join interview";


                card.appendChild(
                    link
                );

            }



            progressInterviews.appendChild(
                card
            );

        }
    );

}



/* =========================================================
   RENDER APPLICATION
   ========================================================= */

function renderApplicationProgress(
    application
) {

    const progressJobTitle =
        document.getElementById(
            "progressJobTitle"
        );


    const progressDepartment =
        document.getElementById(
            "progressDepartment"
        );


    const progressLocation =
        document.getElementById(
            "progressLocation"
        );


    const progressEmploymentType =
        document.getElementById(
            "progressEmploymentType"
        );


    const progressReference =
        document.getElementById(
            "progressReference"
        );


    const progressAppliedDate =
        document.getElementById(
            "progressAppliedDate"
        );


    if (
        progressJobTitle
    ) {

        progressJobTitle.textContent =
            application.job.title;

    }


    if (
        progressDepartment
    ) {

        progressDepartment.textContent =
            application.job.department;

    }


    if (
        progressLocation
    ) {

        progressLocation.textContent =
            application.job.location;

    }


    if (
        progressEmploymentType
    ) {

        progressEmploymentType.textContent =
            application.job.employmentType;

    }


    if (
        progressReference
    ) {

        progressReference.textContent =
            application.reference;

    }


    if (
        progressAppliedDate
    ) {

        progressAppliedDate.textContent =
            `Applied ${formatProgressDate(
                application.appliedAt
            )}`;

    }



    /* =====================================================
       CURRENT STATUS
       ===================================================== */

    const formattedStatus =
        formatStatus(
            application.status
        );


    if (
        progressCurrentStatus
    ) {

        progressCurrentStatus.textContent =
            formattedStatus;

    }


    if (
        progressStatusPill
    ) {

        progressStatusPill.textContent =
            formattedStatus;

    }


    if (
        progressStatusDescription
    ) {

        progressStatusDescription.textContent =
            statusDescriptions[
                application.status
            ] ||
            "Your application status has been updated.";

    }



    /* =====================================================
       TRACKER / HISTORY / INTERVIEWS
       ===================================================== */

    renderProgressTracker(
        application.status
    );


    renderProgressHistory(
        application.history
    );


    renderInterviews(
        application.interviews
    );



    /* =====================================================
       WITHDRAW BUTTON
       ===================================================== */

    if (
        withdrawApplicationButton
    ) {

        withdrawApplicationButton.hidden =
            !application.canWithdraw;


        withdrawApplicationButton
            .dataset
            .applicationId =
            application.id;

    }

}



/* =========================================================
   SHOW ERROR
   ========================================================= */

function showProgressError(
    message
) {

    if (
        progressLoading
    ) {

        progressLoading.hidden =
            true;

    }


    if (
        progressContent
    ) {

        progressContent.hidden =
            true;

    }


    if (
        progressError
    ) {

        progressError.hidden =
            false;

    }


    if (
        progressErrorMessage
    ) {

        progressErrorMessage.textContent =
            message ||
            "Unable to load application.";

    }

}



/* =========================================================
   LOAD APPLICATION
   ========================================================= */

async function loadApplicationProgress() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const applicationId =
        params.get(
            "id"
        );


    if (
        !applicationId
    ) {

        showProgressError(
            "No application was selected."
        );


        return;

    }


    try {

        const response =
            await fetch(
                `/api/applications/${applicationId}/progress`,
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

            showProgressError(
                data.message ||
                "Unable to load application."
            );


            return;

        }


        renderApplicationProgress(
            data.application
        );


        if (
            progressLoading
        ) {

            progressLoading.hidden =
                true;

        }


        if (
            progressError
        ) {

            progressError.hidden =
                true;

        }


        if (
            progressContent
        ) {

            progressContent.hidden =
                false;

        }

    }

    catch (error) {

        console.error(
            "Application progress error:",
            error
        );


        showProgressError(
            "Something went wrong while loading your application."
        );

    }

}



/* =========================================================
   START
   ========================================================= */

loadApplicationProgress();