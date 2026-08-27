/* =========================================================
   ALTRIUM ADMIN DASHBOARD
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let adminApplications = [];

let currentApplicationStatusFilter =
    "all";

let currentApplicationJobFilter =
    "all";


let currentApplicationSort =
    "newest";


let currentApplicationsPage =
    1;


const applicationsPageLimit =
    25;


let currentApplicationsPagination = {

    page:
        1,

    limit:
        applicationsPageLimit,

    total:
        0,

    totalPages:
        1,

    hasPrevious:
        false,

    hasNext:
        false

};


let adminApplicationFilterJobs =
    [];


let adminApplicationStats = {

    totalApplications:
        0,

    waitingReview:
        0,

    interviews:
        0

};


let applicationSearchTimer =
    null;


/* =========================================================
   SYSTEM USERS STATE
   ========================================================= */

let systemUsersGroup =
    "team";


let systemUsersSearch =
    "";


let systemUsersPage =
    1;


const systemUsersLimit =
    20;


let systemUsersSearchTimer =
    null;


let systemUsersPagination = {

    page:
        1,

    total:
        0,

    totalPages:
        1,

    hasPrevious:
        false,

    hasNext:
        false

};

let loadedSystemUsers =
    [];


let currentManagedTeamMember =
    null;



/* =========================================================
   BULK SHORTLIST STATE
   ========================================================= */

const selectedShortlistApplicationIds =
    new Set();


const selectedShortlistApplications =
    new Map();


let currentManagerApplication =
    null;


let editingJobId =
    null;

let selectedJobForStatus =
    null;

let selectedJobNewStatus =
    null;


let interviewSessionJobs =
    [];

let interviewViewDate =
    new Date();



/* =========================================================
   SMALL HELPERS
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



function formatDatabaseDate(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}



function formatPostedDate(
    dateValue
) {

    if (!dateValue) {

        return "Unknown";

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

        return "Unknown";

    }


    return date.toLocaleDateString(
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



function formatApplicationDate(
    dateValue
) {

    if (!dateValue) {

        return "Unknown";

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

        return "Unknown";

    }


    return date.toLocaleDateString(
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



function formatReviewDate(
    dateValue
) {

    if (!dateValue) {

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


    return date.toLocaleDateString(
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



function formatDeadline(
    dateValue
) {

    if (!dateValue) {

        return "Not specified";

    }


    const value =
        String(
            dateValue
        );


    const match =
        value.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (!match) {

        return "Not specified";

    }


    const date =
        new Date(
            Number(
                match[1]
            ),
            Number(
                match[2]
            ) - 1,
            Number(
                match[3]
            )
        );


    return date.toLocaleDateString(
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



function formatTimeValue(
    value
) {

    if (!value) {

        return "—";

    }


    const match =
        String(
            value
        )
        .match(
            /^(\d{2}):(\d{2})/
        );


    if (!match) {

        return String(
            value
        );

    }


    const total =
        Number(
            match[1]
        ) * 60 +
        Number(
            match[2]
        );


    return minutesToDisplayTime(
        total
    );

}



function setReviewText(
    id,
    value,
    fallback = "Not provided"
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
            ? value
            : fallback;

}



function closeAllAdminCustomSelects(
    except = null
) {

    document
        .querySelectorAll(
            ".admin-custom-select.open"
        )
        .forEach(
            dropdown => {

                if (
                    dropdown !==
                    except
                ) {

                    dropdown.classList.remove(
                        "open"
                    );

                }

            }
        );

}



/* =========================================================
   VERIFY ADMIN
   ========================================================= */

async function verifyAdmin() {

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


        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {

            window.location.href =
                "../login.html";

            return;

        }


        const allowedAdminRoles = [
            "admin",
            "system_admin"
        ];


        if (
            !allowedAdminRoles.includes(
                data.user.role
            )
        ) {

            window.location.href =
                "../profile.html";

            return;

        }


        /* =============================================
           SMALL ROLE BADGE BESIDE PROFILE IMAGE
           ============================================= */

        const roleBadge =
            document.querySelector(
                ".admin-role-badge"
            );


        if (
            roleBadge
        ) {

            if (
                data.user.role ===
                "system_admin"
            ) {

                roleBadge.textContent =
                    "SYSTEM ADMIN";

                roleBadge.classList.add(
                    "system-admin-role-badge"
                );

            }

            else {

                roleBadge.textContent =
                    "ADMIN";

                roleBadge.classList.remove(
                    "system-admin-role-badge"
                );

            }

        }

/* =============================================
   SYSTEM PANEL VISIBILITY
   ============================================= */

const systemPanelNavigation =
    document.getElementById(
        "systemPanelNavigation"
    );


const systemAdminSections =
    document.querySelectorAll(
        ".system-admin-section"
    );


const isSystemAdmin =
    data.user.role ===
    "system_admin";


if (
    systemPanelNavigation
) {

    systemPanelNavigation.hidden =
        !isSystemAdmin;

}


systemAdminSections.forEach(
    section => {

        if (
            !isSystemAdmin
        ) {

            section.classList.remove(
                "active"
            );

        }

    }
);

        console.log(
            "Admin verified:",
            data.user.email,
            data.user.role
        );


        await Promise.all([

            loadAdminJobs(),

            loadAdminApplications(),

            loadAdminInterviewSessions()

        ]);

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


adminNavItems.forEach(
    item => {

        item.addEventListener(
            "click",
            () => {

                const target =
                    item.dataset.section;


                if (
                    target?.startsWith(
                        "system-"
                    )
                ) {

                    const systemPanelNavigation =
                        document.getElementById(
                            "systemPanelNavigation"
                        );


                    if (
                        systemPanelNavigation?.hidden
                    ) {

                        return;

                    }

                }

                adminNavItems.forEach(
                    navItem => {

                        navItem.classList.remove(
                            "active"
                        );

                    }
                );


                adminSections.forEach(
                    section => {

                        section.classList.remove(
                            "active"
                        );

                    }
                );


                item.classList.add(
                    "active"
                );


                const targetSection =
                    document.getElementById(
                        target
                    );


                targetSection
                    ?.classList
                    .add(
                        "active"
                    );


                if (
                    target ===
                    "interviews"
                ) {

                    loadAdminInterviewSessions();

                }

            }
        );

    }
);



/* =========================================================
   LOGOUT
   ========================================================= */

const adminLogoutButton =
    document.getElementById(
        "adminLogoutButton"
    );


adminLogoutButton
    ?.addEventListener(
        "click",
        async () => {

            try {

                await fetch(
                    "/api/auth/logout",
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin"
                    }
                );

            }

            catch (error) {

                console.error(
                    "Admin logout error:",
                    error
                );

            }

            finally {

                window.location.href =
                    "../login.html";

            }

        }
    );



/* =========================================================
   APPLICATION REVIEW MODAL
   ========================================================= */

const applicationReviewModal =
    document.getElementById(
        "applicationReviewModal"
    );


const applicationReviewBackdrop =
    document.getElementById(
        "applicationReviewBackdrop"
    );


const closeApplicationReviewModalButton =
    document.getElementById(
        "closeApplicationReviewModal"
    );


const applicationReviewLoading =
    document.getElementById(
        "applicationReviewLoading"
    );


const applicationReviewContent =
    document.getElementById(
        "applicationReviewContent"
    );


/* =========================================================
   APPLICATION EVALUATION PANEL
   ========================================================= */

const applicationEvaluationPanel =
    document.getElementById(
        "applicationEvaluationPanel"
    );


const closeApplicationEvaluationPanelButton =
    document.getElementById(
        "closeApplicationEvaluationPanel"
    );


const cancelApplicationEvaluationButton =
    document.getElementById(
        "cancelApplicationEvaluation"
    );


const evaluationPanelLoading =
    document.getElementById(
        "evaluationPanelLoading"
    );


const evaluationPanelContent =
    document.getElementById(
        "evaluationPanelContent"
    );


const applicationEvaluationForm =
    document.getElementById(
        "applicationEvaluationForm"
    );


const evaluationReadonlyMessage =
    document.getElementById(
        "evaluationReadonlyMessage"
    );


const evaluationFormMessage =
    document.getElementById(
        "evaluationFormMessage"
    );


const saveApplicationEvaluationButton =
    document.getElementById(
        "saveApplicationEvaluation"
    );


let currentEvaluationApplicationId =
    null;


let currentEvaluationData =
    null;


let evaluationScores = {

    technicalSkillsRating:
        null,

    relevantExperienceRating:
        null,

    qualificationsRating:
        null,

    overallSuitabilityRating:
        null

};



/* =========================================================
   EVALUATION HELPERS
   ========================================================= */

function formatEvaluationDateTime(
    value
) {

    if (
        !value
    ) {

        return "Date unavailable";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Date unavailable";

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
                "numeric",

            minute:
                "2-digit",

            hour12:
                true

        }
    );

}



function formatEvaluationScore(
    value
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(
            Number(
                value
            )
        )
    ) {

        return "—";

    }


    return Number(
        value
    )
    .toFixed(
        2
    );

}



/* =========================================================
   SETUP 1 - 10 SCORE BUTTONS
   ========================================================= */

function setupEvaluationScoreControls() {

    document
        .querySelectorAll(
            ".evaluation-score-options"
        )
        .forEach(
            container => {

                const field =
                    container.dataset
                        .evaluationField;


                container.innerHTML =
                    "";


                for (
                    let score = 1;
                    score <= 10;
                    score += 1
                ) {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "evaluation-score-button";


                    button.textContent =
                        String(
                            score
                        );


                    button.dataset.score =
                        String(
                            score
                        );


                    button.addEventListener(
                        "click",
                        () => {

                            evaluationScores[
                                field
                            ] =
                                score;


                            updateEvaluationScoreControls();

                        }
                    );


                    container.appendChild(
                        button
                    );

                }

            }
        );

}



function updateEvaluationScoreControls() {

    document
        .querySelectorAll(
            ".evaluation-score-options"
        )
        .forEach(
            container => {

                const field =
                    container.dataset
                        .evaluationField;


                const selected =
                    evaluationScores[
                        field
                    ];


                container
                    .querySelectorAll(
                        ".evaluation-score-button"
                    )
                    .forEach(
                        button => {

                            button
                                .classList
                                .toggle(
                                    "selected",

                                    Number(
                                        button.dataset
                                            .score
                                    ) ===
                                    Number(
                                        selected
                                    )
                                );

                        }
                    );

            }
        );


    const technicalSelected =
        document.getElementById(
            "evaluationTechnicalSelected"
        );


    const experienceSelected =
        document.getElementById(
            "evaluationExperienceSelected"
        );


    const qualificationsSelected =
        document.getElementById(
            "evaluationQualificationsSelected"
        );


    const suitabilitySelected =
        document.getElementById(
            "evaluationSuitabilitySelected"
        );


    if (
        technicalSelected
    ) {

        technicalSelected.textContent =
            evaluationScores
                .technicalSkillsRating

                ? `${
                    evaluationScores
                        .technicalSkillsRating
                } / 10`

                : "—";

    }


    if (
        experienceSelected
    ) {

        experienceSelected.textContent =
            evaluationScores
                .relevantExperienceRating

                ? `${
                    evaluationScores
                        .relevantExperienceRating
                } / 10`

                : "—";

    }


    if (
        qualificationsSelected
    ) {

        qualificationsSelected.textContent =
            evaluationScores
                .qualificationsRating

                ? `${
                    evaluationScores
                        .qualificationsRating
                } / 10`

                : "—";

    }


    if (
        suitabilitySelected
    ) {

        suitabilitySelected.textContent =
            evaluationScores
                .overallSuitabilityRating

                ? `${
                    evaluationScores
                        .overallSuitabilityRating
                } / 10`

                : "—";

    }


    updateCurrentEvaluationScore();

}



function updateCurrentEvaluationScore() {

    const output =
        document.getElementById(
            "evaluationMyScore"
        );


    if (
        !output
    ) {

        return;

    }


    const values =
        Object.values(
            evaluationScores
        );


    const complete =
        values.every(
            value =>
                Number.isInteger(
                    value
                )
        );


    if (
        !complete
    ) {

        output.textContent =
            "— / 10";


        return;

    }


    const average =
        values.reduce(
            (
                total,
                value
            ) =>
                total +
                value,
            0
        )
        /
        values.length;


    output.textContent =
        `${average.toFixed(2)} / 10`;

}





/* =========================================================
   RESET EVALUATION FORM
   ========================================================= */

function resetEvaluationForm() {

    evaluationScores = {

        technicalSkillsRating:
            null,

        relevantExperienceRating:
            null,

        qualificationsRating:
            null,

        overallSuitabilityRating:
            null

    };


    updateEvaluationScoreControls();


    const fields = [

        "evaluationTechnicalNote",
        "evaluationExperienceNote",
        "evaluationQualificationsNote",
        "evaluationSuitabilityNote",
        "evaluationFeedback"

    ];


    fields.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.value =
                    "";

            }

        }
    );


    if (
        evaluationFormMessage
    ) {

        evaluationFormMessage.hidden =
            true;


        evaluationFormMessage.textContent =
            "";


        evaluationFormMessage
            .classList
            .remove(
                "error"
            );

    }

}



/* =========================================================
   POPULATE MY EXISTING EVALUATION
   ========================================================= */

function populateMyEvaluationForm(
    evaluation
) {

    resetEvaluationForm();


    if (
        !evaluation
    ) {

        return;

    }


    evaluationScores = {

        technicalSkillsRating:
            Number(
                evaluation.ratings
                    ?.technicalSkills
            ),

        relevantExperienceRating:
            Number(
                evaluation.ratings
                    ?.relevantExperience
            ),

        qualificationsRating:
            Number(
                evaluation.ratings
                    ?.qualifications
            ),

        overallSuitabilityRating:
            Number(
                evaluation.ratings
                    ?.overallSuitability
            )

    };


    updateEvaluationScoreControls();


    const setValue =
        (
            id,
            value
        ) => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.value =
                    value ||
                    "";

            }

        };


    setValue(
        "evaluationTechnicalNote",
        evaluation.evidenceNotes
            ?.technicalSkills
    );


    setValue(
        "evaluationExperienceNote",
        evaluation.evidenceNotes
            ?.relevantExperience
    );


    setValue(
        "evaluationQualificationsNote",
        evaluation.evidenceNotes
            ?.qualifications
    );


    setValue(
        "evaluationSuitabilityNote",
        evaluation.evidenceNotes
            ?.overallSuitability
    );


    setValue(
        "evaluationFeedback",
        evaluation.feedback
    );


}



/* =========================================================
   RENDER REVIEWER LIST
   ========================================================= */

function renderEvaluationReviewerList(
    evaluations
) {

    const container =
        document.getElementById(
            "evaluationReviewerList"
        );


    if (
        !container
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(
            evaluations
        ) ||
        evaluations.length ===
        0
    ) {

        container.innerHTML = `

            <div class="evaluation-reviewer-empty">

                No recruiter evaluations have been submitted yet.

            </div>

        `;


        return;

    }


    evaluations.forEach(
        (
            evaluation,
            index
        ) => {

            const reviewer =
                evaluation.reviewer ||
                {};


            const reviewerName =
                `${
                    reviewer.firstName ||
                    ""
                } ${
                    reviewer.lastName ||
                    ""
                }`
                .trim() ||
                "Recruiter";


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "evaluation-reviewer-card";


            card.innerHTML = `

                <div class="evaluation-reviewer-card-top">

                    <div>

                        <strong>

                            Reviewer ${
                                index + 1
                            } · ${
                                escapeHTML(
                                    reviewerName
                                )
                            }

                        </strong>


                        <small>

                            ${
                                escapeHTML(
                                    formatEvaluationDateTime(
                                        evaluation.submittedAt
                                    )
                                )
                            }

                            ${
                                evaluation.isMine
                                    ? " · Your review"
                                    : ""
                            }

                        </small>

                    </div>


                    <strong class="evaluation-reviewer-card-score">

                        ${
                            formatEvaluationScore(
                                evaluation.reviewerScore
                            )
                        } / 10

                    </strong>

                </div>


                <p class="evaluation-reviewer-feedback">

                    ${
                        escapeHTML(
                            evaluation.feedback ||
                            "No written feedback."
                        )
                    }

                </p>

            `;


            container.appendChild(
                card
            );

        }
    );

}



/* =========================================================
   RENDER EVALUATION PANEL
   ========================================================= */

function renderApplicationEvaluation(
    evaluation
) {

    currentEvaluationData =
        evaluation;


    const application =
        evaluation.application ||
        {};


    const progress =
        evaluation.progress ||
        {};


    const combined =
        evaluation.combined ||
        {};


    setReviewText(
        "evaluationCandidateName",
        application.candidateName,
        "Candidate"
    );


    setReviewText(
        "evaluationJobTitle",
        application.job?.title,
        "Vacancy"
    );


    setReviewText(
        "evaluationProgressCount",
        `${
            Number(
                progress.reviewCount
            ) ||
            0
        } / ${
            Number(
                progress.requiredReviewers
            ) ||
            2
        }`
    );


    const progressStatus =
        document.getElementById(
            "evaluationProgressStatus"
        );


    if (
        progressStatus
    ) {

        if (
            progress.isComplete
        ) {

            progressStatus.textContent =
                "Evaluation complete";

        }

        else if (
            Number(
                progress.reviewCount
            ) >
            0
        ) {

            progressStatus.textContent =
                "Under evaluation";

        }

        else {

            progressStatus.textContent =
                "Not started";

        }

    }



    /* =====================================================
       COMBINED SUMMARY
       ===================================================== */

    const combinedSummary =
        document.getElementById(
            "evaluationCombinedSummary"
        );


    if (
        combinedSummary
    ) {

        combinedSummary.hidden =
            combined.averageRating ===
                null ||
            combined.averageRating ===
                undefined;

    }


    setReviewText(
        "evaluationCombinedScore",

        combined.averageRating ===
            null ||
        combined.averageRating ===
            undefined

            ? "—"

            : `${formatEvaluationScore(
                combined.averageRating
            )} / 10`
    );


    setReviewText(
        "evaluationCombinedSkills",
        formatEvaluationScore(
            combined.criteria
                ?.technicalSkills
        )
    );


    setReviewText(
        "evaluationCombinedExperience",
        formatEvaluationScore(
            combined.criteria
                ?.relevantExperience
        )
    );


    setReviewText(
        "evaluationCombinedQualifications",
        formatEvaluationScore(
            combined.criteria
                ?.qualifications
        )
    );


    setReviewText(
        "evaluationCombinedSuitability",
        formatEvaluationScore(
            combined.criteria
                ?.overallSuitability
        )
    );


    const varianceWarning =
        document.getElementById(
            "evaluationVarianceWarning"
        );


    if (
        varianceWarning
    ) {

        varianceWarning.hidden =
            !combined
                .significantDifference;

    }



    /* =====================================================
       EXISTING REVIEWS
       ===================================================== */

    renderEvaluationReviewerList(
        evaluation.evaluations ||
        []
    );



    /* =====================================================
       MY REVIEW
       ===================================================== */

    const myEvaluation =
        (
            evaluation.evaluations ||
            []
        )
        .find(
            review =>
                review.isMine
        ) ||
        null;


    const canEvaluate =
        Boolean(
            evaluation
                .canCurrentReviewerEvaluate
        );


    if (
        applicationEvaluationForm
    ) {

        applicationEvaluationForm.hidden =
            !canEvaluate;

    }


    if (
        evaluationReadonlyMessage
    ) {

        evaluationReadonlyMessage.hidden =
            canEvaluate;


        if (
            !canEvaluate
        ) {

            if (
                progress.isComplete
            ) {

                evaluationReadonlyMessage.textContent =
                    "The required recruiter evaluations are complete. You can review the submitted scores and feedback above.";

            }

            else if (
                application.status !==
                "screening"
            ) {

                evaluationReadonlyMessage.textContent =
                    "This evaluation is read-only because the application has moved beyond the Screening stage.";

            }

            else {

                evaluationReadonlyMessage.textContent =
                    "You cannot submit another evaluation for this application.";

            }

        }

    }


    if (
        canEvaluate
    ) {

        populateMyEvaluationForm(
            myEvaluation
        );


        const formLabel =
            document.getElementById(
                "evaluationFormLabel"
            );


        if (
            formLabel
        ) {

            formLabel.textContent =
                myEvaluation
                    ? "EDIT YOUR EVALUATION"
                    : "YOUR EVALUATION";

        }


        if (
            saveApplicationEvaluationButton
        ) {

            saveApplicationEvaluationButton.textContent =
                myEvaluation
                    ? "Save changes"
                    : "Submit evaluation";

        }

    }

}



/* =========================================================
   LOAD EVALUATIONS FROM API
   ========================================================= */

async function loadApplicationEvaluations(
    applicationId
) {

    const response =
        await fetch(
            `/api/admin/applications/${applicationId}/evaluations`,
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

        throw new Error(
            data.message ||
            "Unable to load application evaluation."
        );

    }


    renderApplicationEvaluation(
        data.evaluation
    );


    return data.evaluation;

}



/* =========================================================
   OPEN EVALUATION PANEL
   ========================================================= */

async function openApplicationEvaluationPanel(
    application
) {

    if (
        !applicationEvaluationPanel ||
        !application ||
        !application.id
    ) {

        return;

    }


    currentEvaluationApplicationId =
        application.id;


    applicationReviewModal
        ?.classList
        .add(
            "evaluation-open"
        );


    applicationEvaluationPanel
        .setAttribute(
            "aria-hidden",
            "false"
        );


    if (
        evaluationPanelLoading
    ) {

        evaluationPanelLoading.hidden =
            false;


        evaluationPanelLoading.textContent =
            "Loading evaluation...";

    }


    if (
        evaluationPanelContent
    ) {

        evaluationPanelContent.hidden =
            true;

    }


    try {

        await loadApplicationEvaluations(
            application.id
        );


        if (
            evaluationPanelLoading
        ) {

            evaluationPanelLoading.hidden =
                true;

        }


        if (
            evaluationPanelContent
        ) {

            evaluationPanelContent.hidden =
                false;

        }

    }

    catch (error) {

        console.error(
            "Open evaluation panel error:",
            error
        );


        if (
            evaluationPanelLoading
        ) {

            evaluationPanelLoading.hidden =
                false;


            evaluationPanelLoading.textContent =
                error.message ||
                "Unable to load evaluation.";

        }

    }

}



/* =========================================================
   CLOSE EVALUATION PANEL
   ========================================================= */

function closeApplicationEvaluationPanel() {

    applicationReviewModal
        ?.classList
        .remove(
            "evaluation-open"
        );


    applicationEvaluationPanel
        ?.setAttribute(
            "aria-hidden",
            "true"
        );


    currentEvaluationApplicationId =
        null;


    currentEvaluationData =
        null;


    resetEvaluationForm();

}



closeApplicationEvaluationPanelButton
    ?.addEventListener(
        "click",
        closeApplicationEvaluationPanel
    );


cancelApplicationEvaluationButton
    ?.addEventListener(
        "click",
        closeApplicationEvaluationPanel
    );



/* =========================================================
   SUBMIT / UPDATE EVALUATION
   ========================================================= */

applicationEvaluationForm
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (
                !currentEvaluationApplicationId
            ) {

                return;

            }


            const allScoresCompleted =
                Object.values(
                    evaluationScores
                )
                .every(
                    score =>
                        Number.isInteger(
                            score
                        ) &&
                        score >= 1 &&
                        score <= 10
                );


            if (
                !allScoresCompleted
            ) {

                if (
                    evaluationFormMessage
                ) {

                    evaluationFormMessage.textContent =
                        "Please rate all four evaluation criteria.";


                    evaluationFormMessage
                        .classList
                        .add(
                            "error"
                        );


                    evaluationFormMessage.hidden =
                        false;

                }


                return;

            }


            const feedback =
                document.getElementById(
                    "evaluationFeedback"
                )
                ?.value
                .trim() ||
                "";


            if (
                !feedback
            ) {

                if (
                    evaluationFormMessage
                ) {

                    evaluationFormMessage.textContent =
                        "Please provide written evaluation feedback.";


                    evaluationFormMessage
                        .classList
                        .add(
                            "error"
                        );


                    evaluationFormMessage.hidden =
                        false;

                }


                return;

            }


            const body = {

                technicalSkillsRating:
                    evaluationScores
                        .technicalSkillsRating,

                relevantExperienceRating:
                    evaluationScores
                        .relevantExperienceRating,

                qualificationsRating:
                    evaluationScores
                        .qualificationsRating,

                overallSuitabilityRating:
                    evaluationScores
                        .overallSuitabilityRating,


                technicalSkillsNote:
                    document.getElementById(
                        "evaluationTechnicalNote"
                    )
                    ?.value
                    .trim() ||
                    "",


                relevantExperienceNote:
                    document.getElementById(
                        "evaluationExperienceNote"
                    )
                    ?.value
                    .trim() ||
                    "",


                qualificationsNote:
                    document.getElementById(
                        "evaluationQualificationsNote"
                    )
                    ?.value
                    .trim() ||
                    "",


                overallSuitabilityNote:
                    document.getElementById(
                        "evaluationSuitabilityNote"
                    )
                    ?.value
                    .trim() ||
                    "",

                feedback

            };


            try {

                if (
                    saveApplicationEvaluationButton
                ) {

                    saveApplicationEvaluationButton.disabled =
                        true;


                    saveApplicationEvaluationButton.textContent =
                        "Saving...";

                }


                if (
                    evaluationFormMessage
                ) {

                    evaluationFormMessage.hidden =
                        true;


                    evaluationFormMessage
                        .classList
                        .remove(
                            "error"
                        );

                }


                const response =
                    await fetch(
                        `/api/admin/applications/${currentEvaluationApplicationId}/evaluation`,
                        {

                            method:
                                "PUT",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    body
                                )

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to save evaluation."
                    );

                }


                await loadApplicationEvaluations(
                    currentEvaluationApplicationId
                );


                await loadAdminApplications();


                if (
                    currentManagerApplication
                ) {

                    renderApplicationStatusControls(
                        currentManagerApplication
                    );

                }


                if (
                    evaluationFormMessage
                ) {

                    evaluationFormMessage.textContent =
                        data.message ||
                        "Evaluation saved successfully.";


                    evaluationFormMessage
                        .classList
                        .remove(
                            "error"
                        );


                    evaluationFormMessage.hidden =
                        false;

                }

            }

            catch (error) {

                console.error(
                    "Save evaluation error:",
                    error
                );


                if (
                    evaluationFormMessage
                ) {

                    evaluationFormMessage.textContent =
                        error.message ||
                        "Unable to save evaluation.";


                    evaluationFormMessage
                        .classList
                        .add(
                            "error"
                        );


                    evaluationFormMessage.hidden =
                        false;

                }

            }

            finally {

                if (
                    saveApplicationEvaluationButton
                ) {

                    saveApplicationEvaluationButton.disabled =
                        false;


                    const myReview =
                        currentEvaluationData
                            ?.evaluations
                            ?.find(
                                review =>
                                    review.isMine
                            );


                    saveApplicationEvaluationButton.textContent =
                        myReview
                            ? "Save changes"
                            : "Submit evaluation";

                }

            }

        }
    );



/* =========================================================
   INITIALIZE EVALUATION CONTROLS
   ========================================================= */

setupEvaluationScoreControls();

resetEvaluationForm();



/* =========================================================
   REJECT APPLICATION MODAL
   ========================================================= */

const rejectApplicationModal =
    document.getElementById(
        "rejectApplicationModal"
    );


const rejectApplicationBackdrop =
    document.getElementById(
        "rejectApplicationBackdrop"
    );


const cancelRejectApplicationButton =
    document.getElementById(
        "cancelRejectApplication"
    );


const confirmRejectApplicationButton =
    document.getElementById(
        "confirmRejectApplication"
    );


const rejectApplicationCandidate =
    document.getElementById(
        "rejectApplicationCandidate"
    );


const rejectApplicationPosition =
    document.getElementById(
        "rejectApplicationPosition"
    );


let pendingRejectApplication =
    null;



/* =========================================================
   OPEN REJECT APPLICATION MODAL
   ========================================================= */

function openRejectApplicationModal(
    application
) {

    if (
        !rejectApplicationModal ||
        !application
    ) {

        return;

    }


    pendingRejectApplication =
        application;


    const candidate =
        application.candidate ||
        {};


    const job =
        application.job ||
        {};


    const candidateName =
        `${
            candidate.firstName ||
            ""
        } ${
            candidate.lastName ||
            ""
        }`
        .trim() ||
        "Candidate";


    if (
        rejectApplicationCandidate
    ) {

        rejectApplicationCandidate.textContent =
            candidateName;

    }


    if (
        rejectApplicationPosition
    ) {

        rejectApplicationPosition.textContent =
            job.title ||
            "Vacancy";

    }


    if (
        confirmRejectApplicationButton
    ) {

        confirmRejectApplicationButton.disabled =
            false;


        confirmRejectApplicationButton.textContent =
            "Reject application";

    }


    rejectApplicationModal
        .classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";

}



/* =========================================================
   CLOSE REJECT APPLICATION MODAL
   ========================================================= */

function closeRejectApplicationModal() {

    rejectApplicationModal
        ?.classList
        .remove(
            "open"
        );


    pendingRejectApplication =
        null;


    if (
        confirmRejectApplicationButton
    ) {

        confirmRejectApplicationButton.disabled =
            false;


        confirmRejectApplicationButton.textContent =
            "Reject application";

    }


    const applicationStillOpen =
        applicationReviewModal
            ?.classList
            .contains(
                "open"
            );


    const interviewStillOpen =
        interviewSessionReviewModal
            ?.classList
            .contains(
                "open"
            );


    document.body.style.overflow =
        (
            applicationStillOpen ||
            interviewStillOpen
        )
            ? "hidden"
            : "";

}



/* =========================================================
   CANCEL REJECTION
   ========================================================= */

cancelRejectApplicationButton
    ?.addEventListener(
        "click",
        closeRejectApplicationModal
    );


rejectApplicationBackdrop
    ?.addEventListener(
        "click",
        closeRejectApplicationModal
    );



/* =========================================================
   CONFIRM REJECTION
   ========================================================= */

confirmRejectApplicationButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                !pendingRejectApplication
            ) {

                return;

            }


            const applicationId =
                pendingRejectApplication.id;


            confirmRejectApplicationButton.disabled =
                true;


            confirmRejectApplicationButton.textContent =
                "Rejecting...";


            const success =
                await updateManagerApplicationStatus(

                    applicationId,

                    "rejected",

                    confirmRejectApplicationButton

                );


            if (
                success
            ) {

                closeRejectApplicationModal();

            }

            else {

                confirmRejectApplicationButton.disabled =
                    false;


                confirmRejectApplicationButton.textContent =
                    "Reject application";

            }

        }
    );



async function openAdminApplication(
    applicationId
) {

    if (
        !applicationReviewModal
    ) {

        return;

    }


    applicationReviewModal
        .classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";


    if (
        applicationReviewLoading
    ) {

        applicationReviewLoading.hidden =
            false;


        applicationReviewLoading.textContent =
            "Loading application...";

    }


    if (
        applicationReviewContent
    ) {

        applicationReviewContent.hidden =
            true;

    }


    try {

        const response =
            await fetch(
                `/api/admin/applications/${applicationId}`,
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

            throw new Error(
                data.message ||
                "Unable to load application."
            );

        }


        renderApplicationReview(
            data.application
        );


        if (
            applicationReviewLoading
        ) {

            applicationReviewLoading.hidden =
                true;

        }


        if (
            applicationReviewContent
        ) {

            applicationReviewContent.hidden =
                false;

        }

    }

    catch (error) {

        console.error(
            "Open application error:",
            error
        );


        if (
            applicationReviewLoading
        ) {

            applicationReviewLoading.hidden =
                false;


            applicationReviewLoading.textContent =
                error.message ||
                "Unable to load application.";

        }

    }

}



/* =========================================================
   RENDER APPLICATION REVIEW
   ========================================================= */

function renderApplicationReview(
    application
) {

    currentManagerApplication =
        application;


    const candidate =
        application.candidate ||
        {};


    const professional =
        application.professional ||
        {};


    const preferences =
        application.preferences ||
        {};


    const job =
        application.job ||
        {};


    const candidateName =
        `${
            candidate.firstName ||
            ""
        } ${
            candidate.lastName ||
            ""
        }`
        .trim() ||
        "Candidate";


    setReviewText(
        "reviewApplicationCandidateName",
        candidateName
    );


    setReviewText(
        "reviewApplicationJobTitle",
        job.title,
        "Vacancy"
    );


    setReviewText(
        "reviewApplicationReference",
        application.reference
    );


    setReviewText(
        "reviewApplicationStatus",
        application.status
    );


    setReviewText(
        "reviewApplicationAppliedDate",
        formatReviewDate(
            application.appliedAt
        )
    );


    setReviewText(
        "reviewCandidateFullName",
        candidateName
    );


    setReviewText(
        "reviewCandidateEmail",
        candidate.email
    );


    setReviewText(
        "reviewCandidatePhone",
        candidate.phoneNumber
    );


    setReviewText(
        "reviewCandidateNic",
        candidate.nic
    );


    setReviewText(
        "reviewCandidateDob",
        formatReviewDate(
            candidate.dateOfBirth
        )
    );


    setReviewText(
        "reviewCandidateCountry",
        candidate.country
    );


    setReviewText(
        "reviewEducation",
        professional.education
    );


    setReviewText(
        "reviewPreferredJobType",
        preferences.preferredJobType
    );


    setReviewText(
        "reviewSkills",
        professional.skills
    );


    setReviewText(
        "reviewWorkExperience",
        professional.workExperience
    );


    setReviewText(
        "reviewProjects",
        professional.projects
    );


    const languages =
        Array.isArray(
            preferences.languages
        )
            ? preferences.languages.join(
                ", "
            )
            : preferences.languages;


    setReviewText(
        "reviewLanguages",
        languages
    );



    /* =====================================================
       LINKEDIN
       ===================================================== */

    const linkedin =
        document.getElementById(
            "reviewLinkedin"
        );


    const linkedinEmpty =
        document.getElementById(
            "reviewLinkedinEmpty"
        );


    if (
        linkedin &&
        linkedinEmpty
    ) {

        if (
            professional.linkedinUrl
        ) {

            linkedin.href =
                professional.linkedinUrl;


            linkedin.hidden =
                false;


            linkedinEmpty.hidden =
                true;

        }

        else {

            linkedin.removeAttribute(
                "href"
            );


            linkedin.hidden =
                true;


            linkedinEmpty.hidden =
                false;

        }

    }



    /* =====================================================
       JOB
       ===================================================== */

    setReviewText(
        "reviewJobTitle",
        job.title
    );


    setReviewText(
        "reviewJobDepartment",
        job.department
    );


    setReviewText(
        "reviewJobLocation",
        job.location
    );


    setReviewText(
        "reviewJobEmploymentType",
        job.employmentType
    );



    /* =====================================================
       CV
       ===================================================== */

    const cvButton =
        document.getElementById(
            "reviewCvButton"
        );


    if (
        cvButton
    ) {

        if (
            application.cv?.url
        ) {

            cvButton.href =
                application.cv.url;


            cvButton.style.display =
                "inline-flex";

        }

        else {

            cvButton.removeAttribute(
                "href"
            );


            cvButton.style.display =
                "none";

        }

    }



    renderApplicationReviewHistory(
        application.history ||
        []
    );


    renderApplicationStatusControls(
        application
    );

}



/* =========================================================
   RENDER APPLICATION HISTORY
   ========================================================= */

function renderApplicationReviewHistory(
    history
) {

    const container =
        document.getElementById(
            "reviewStatusHistory"
        );


    if (
        !container
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (
        history.length ===
        0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "applications-empty";


        empty.textContent =
            "No status history available.";


        container.appendChild(
            empty
        );


        return;

    }


    history.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "application-review-history-item";


            const dot =
                document.createElement(
                    "span"
                );


            dot.className =
                "application-review-history-dot";


            const content =
                document.createElement(
                    "div"
                );


            const title =
                document.createElement(
                    "strong"
                );


            title.textContent =
                item.status ||
                "Update";


            const note =
                document.createElement(
                    "p"
                );


            note.textContent =
                item.note ||
                "Application status updated.";


            const meta =
                document.createElement(
                    "small"
                );


            const changedBy =
                item.changedBy
                    ? ` · By ${item.changedBy}`
                    : "";


            meta.textContent =
                `${formatReviewDate(
                    item.createdAt
                )}${changedBy}`;


            content.appendChild(
                title
            );


            content.appendChild(
                note
            );


            content.appendChild(
                meta
            );


            row.appendChild(
                dot
            );


            row.appendChild(
                content
            );


            container.appendChild(
                row
            );

        }
    );

}



/* =========================================================
   CLOSE APPLICATION REVIEW
   ========================================================= */

function closeApplicationReviewModal() {

    closeApplicationEvaluationPanel();


    applicationReviewModal
        ?.classList
        .remove(
            "open"
        );


    const interviewReviewStillOpen =
        interviewSessionReviewModal
            ?.classList
            .contains(
                "open"
            );


    document.body.style.overflow =
        interviewReviewStillOpen
            ? "hidden"
            : "";

}


closeApplicationReviewModalButton
    ?.addEventListener(
        "click",
        closeApplicationReviewModal
    );


applicationReviewBackdrop
    ?.addEventListener(
        "click",
        closeApplicationReviewModal
    );



/* =========================================================
   MANAGER APPLICATION STATUS CONTROLS
   ========================================================= */

function renderApplicationStatusControls(
    application
) {

    const currentStatusElement =
        document.getElementById(
            "managerCurrentApplicationStatus"
        );


    const actionsContainer =
        document.getElementById(
            "applicationStatusActions"
        );


    const message =
        document.getElementById(
            "applicationStatusMessage"
        );


    const evaluationSummary =
        document.getElementById(
            "managerEvaluationSummary"
        );


    const evaluationProgress =
        document.getElementById(
            "managerEvaluationProgress"
        );


    const evaluationScore =
        document.getElementById(
            "managerEvaluationScore"
        );


    if (
        !currentStatusElement ||
        !actionsContainer
    ) {

        return;

    }


    const status =
        String(
            application.status ||
            ""
        )
        .toLowerCase();


    const listApplication =
        adminApplications.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    application.id
                )
        );


    const panelEvaluation =

        currentEvaluationData

        &&

        String(
            currentEvaluationData
                .application
                ?.id
        ) ===
        String(
            application.id
        )

            ? currentEvaluationData

            : null;


    const evaluation =

        listApplication
            ?.evaluation

        ||

        (
            panelEvaluation

                ? {

                    reviewCount:
                        panelEvaluation
                            .progress
                            ?.reviewCount,

                    requiredReviewers:
                        panelEvaluation
                            .progress
                            ?.requiredReviewers,

                    isComplete:
                        panelEvaluation
                            .progress
                            ?.isComplete,

                    averageRating:
                        panelEvaluation
                            .combined
                            ?.averageRating

                }

                : null
        );


    const reviewCount =
        Number(
            evaluation
                ?.reviewCount
        ) ||
        0;


    const requiredReviewers =
        Number(
            evaluation
                ?.requiredReviewers
        ) ||
        2;


    const evaluationComplete =
        Boolean(
            evaluation
                ?.isComplete
        );


    const averageRating =
        evaluation
            ?.averageRating;


    let displayedStage =
        status ||
        "Unknown";


    if (
        status ===
        "screening"
    ) {

        if (
            evaluationComplete
        ) {

            displayedStage =
                "Evaluation complete";

        }

        else if (
            reviewCount >
            0
        ) {

            displayedStage =
                "Under evaluation";

        }

        else {

            displayedStage =
                "Screening";

        }

    }


    currentStatusElement.textContent =
        displayedStage;


    actionsContainer.innerHTML =
        "";


    if (
        message
    ) {

        message.hidden =
            true;


        message.textContent =
            "";


        message.classList.remove(
            "error"
        );

    }



    /* =====================================================
       EVALUATION PROGRESS
       ===================================================== */

    if (
        evaluationSummary
    ) {

        const shouldShowEvaluation =
            status ===
                "screening"

            ||

            reviewCount >
                0;


        evaluationSummary.hidden =
            !shouldShowEvaluation;


        if (
            shouldShowEvaluation &&
            evaluationProgress
        ) {

            evaluationProgress.textContent =
                `${reviewCount} / ${requiredReviewers} reviews`;

        }


        if (
            evaluationScore
        ) {

            if (
                averageRating !==
                    null &&
                averageRating !==
                    undefined
            ) {

                evaluationScore.textContent =
                    `Reviewer average ${Number(
                        averageRating
                    ).toFixed(
                        2
                    )} / 10`;


                evaluationScore.hidden =
                    false;

            }

            else {

                evaluationScore.hidden =
                    true;

            }

        }

    }



    /* =====================================================
       NORMAL APPLICATION STAGE ACTIONS
       ===================================================== */

    const nextActions = {

        submitted: {

            status:
                "screening",

            label:
                "Move to screening"

        },


        interview: {

            status:
                "offer",

            label:
                "Move to offer"

        },


        offer: {

            status:
                "hired",

            label:
                "Mark as hired"

        }

    };


    const nextAction =
        nextActions[
            status
        ];


    if (
        nextAction
    ) {

        const nextButton =
            document.createElement(
                "button"
            );


        nextButton.type =
            "button";


        nextButton.className =
            "application-next-status-button";


        nextButton.textContent =
            nextAction.label;


        nextButton.addEventListener(
            "click",
            () => {

                updateManagerApplicationStatus(
                    application.id,
                    nextAction.status,
                    nextButton
                );

            }
        );


        actionsContainer.appendChild(
            nextButton
        );

    }



    /* =====================================================
       EVALUATION ACTION
       ===================================================== */

    const canShowEvaluation =

        status ===
            "screening"

        ||

        reviewCount >
            0;


    if (
        canShowEvaluation
    ) {

        const evaluationButton =
            document.createElement(
                "button"
            );


        evaluationButton.type =
            "button";


        evaluationButton.className =
            "application-evaluation-action-button";


        if (
            status ===
                "screening"
        ) {

            if (
                evaluationComplete
            ) {

                evaluationButton.textContent =
                    "View evaluation";

            }

            else if (
                reviewCount >
                0
            ) {

                evaluationButton.textContent =
                    "Continue evaluation";

            }

            else {

                evaluationButton.textContent =
                    "Evaluate applicant";

            }

        }

        else {

            evaluationButton.textContent =
                "View evaluation";

        }


        evaluationButton.addEventListener(
            "click",
            () => {

                openApplicationEvaluationPanel(
                    application
                );

            }
        );


        actionsContainer.appendChild(
            evaluationButton
        );

    }



    /* =====================================================
       REJECT ACTION
       ===================================================== */

    if (
        ![
            "hired",
            "rejected",
            "withdrawn"
        ]
        .includes(
            status
        )
    ) {

        const rejectButton =
            document.createElement(
                "button"
            );


        rejectButton.type =
            "button";


        rejectButton.className =
            "application-reject-button";


        rejectButton.textContent =
            "Reject application";


        rejectButton.addEventListener(
            "click",
            () => {

                openRejectApplicationModal(
                    application
                );

            }
        );


        actionsContainer.appendChild(
            rejectButton
        );

    }



    /* =====================================================
       TERMINAL APPLICATION MESSAGE
       ===================================================== */

    if (
        [
            "hired",
            "rejected",
            "withdrawn"
        ]
        .includes(
            status
        )
    ) {

        const terminalMessage =
            document.createElement(
                "div"
            );


        terminalMessage.className =
            "application-status-complete";


        if (
            status ===
            "hired"
        ) {

            terminalMessage.textContent =
                "This candidate has completed the recruitment process.";

        }

        else if (
            status ===
            "rejected"
        ) {

            terminalMessage.textContent =
                "This application has been rejected.";

        }

        else {

            terminalMessage.textContent =
                "This application was withdrawn by the candidate.";

        }


        actionsContainer.appendChild(
            terminalMessage
        );

    }

}



/* =========================================================
   UPDATE APPLICATION STATUS
   ========================================================= */

async function updateManagerApplicationStatus(
    applicationId,
    newStatus,
    clickedButton
) {

    const actionsContainer =
        document.getElementById(
            "applicationStatusActions"
        );


    const message =
        document.getElementById(
            "applicationStatusMessage"
        );


    const buttons =
        actionsContainer
            ?.querySelectorAll(
                "button"
            ) ||
        [];


    buttons.forEach(
        button => {

            button.disabled =
                true;

        }
    );


    const originalButtonText =
        clickedButton
            ?.textContent ||
        "";


    if (
        clickedButton
    ) {

        clickedButton.textContent =
            "Updating...";

    }


    if (
        message
    ) {

        message.hidden =
            true;


        message.classList.remove(
            "error"
        );

    }


    try {

        const response =
            await fetch(
                `/api/admin/applications/${applicationId}/status`,
                {
                    method:
                        "PATCH",

                    credentials:
                        "same-origin",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            status:
                                newStatus
                        })
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to update application status."
            );

        }


        await loadAdminApplications();


        const detailResponse =
            await fetch(
                `/api/admin/applications/${applicationId}`,
                {
                    method:
                        "GET",

                    credentials:
                        "same-origin"
                }
            );


        const detailData =
            await detailResponse.json();


        if (
            detailResponse.ok &&
            detailData.success
        ) {

            renderApplicationReview(
                detailData.application
            );

        }


        if (
            message
        ) {

            message.textContent =
                "Application status updated successfully.";


            message.classList.remove(
                "error"
            );


            message.hidden =
                false;

        }

        return true;


    }

    catch (error) {

        console.error(
            "Manager status update error:",
            error
        );


        if (
            message
        ) {

            message.textContent =
                error.message ||
                "Unable to update application status.";


            message.classList.add(
                "error"
            );


            message.hidden =
                false;

        }


        buttons.forEach(
            button => {

                button.disabled =
                    false;

            }
        );


        if (
            clickedButton &&
            originalButtonText
        ) {

            clickedButton.textContent =
                originalButtonText;

        }

        return false;

    }

}



/* =========================================================
   APPLICATION DASHBOARD STATS
   ========================================================= */

function updateApplicationStats(
    stats = {}
) {

    adminApplicationStats = {

        totalApplications:
            Number(
                stats.totalApplications
            ) ||
            0,

        waitingReview:
            Number(
                stats.waitingReview
            ) ||
            0,

        interviews:
            Number(
                stats.interviews
            ) ||
            0

    };


    const totalApplicationsCount =
        document.getElementById(
            "totalApplicationsCount"
        );


    const waitingReviewCount =
        document.getElementById(
            "waitingReviewCount"
        );


    const interviewsCount =
        document.getElementById(
            "interviewsCount"
        );


    if (
        totalApplicationsCount
    ) {

        totalApplicationsCount.textContent =
            adminApplicationStats
                .totalApplications;

    }


    if (
        waitingReviewCount
    ) {

        waitingReviewCount.textContent =
            adminApplicationStats
                .waitingReview;

    }


    if (
        interviewsCount
    ) {

        interviewsCount.textContent =
            adminApplicationStats
                .interviews;

    }

}



/* =========================================================
   APPLICATION MANAGEMENT STAGE LABEL
   ========================================================= */

function getApplicationManagementStageLabel(
    stage
) {

    const labels = {

        submitted:
            "Submitted",

        screening:
            "Screening",

        under_evaluation:
            "Under evaluation",

        evaluation_complete:
            "Evaluation complete",

        shortlisted:
            "Shortlisted",

        interview:
            "Interview",

        offer:
            "Offer",

        hired:
            "Hired",

        rejected:
            "Rejected",

        withdrawn:
            "Withdrawn"

    };


    return labels[
        stage
    ] ||
    "Application";

}



/* =========================================================
   RENDER APPLICATION VACANCY OPTIONS
   ========================================================= */

const applicationJobDropdown =
    document.getElementById(
        "applicationJobDropdown"
    );


const applicationJobTrigger =
    document.getElementById(
        "applicationJobTrigger"
    );


const applicationJobText =
    document.getElementById(
        "applicationJobText"
    );


const applicationJobMenu =
    document.getElementById(
        "applicationJobMenu"
    );


function renderApplicationJobOptions(
    jobs
) {

    if (
        !applicationJobMenu
    ) {

        return;

    }


    adminApplicationFilterJobs =
        Array.isArray(
            jobs
        )
            ? jobs
            : [];


    /*
        If the selected vacancy no longer
        exists in the options, return to All.
    */

    clearBulkShortlistSelection();

    if (
        currentApplicationJobFilter !==
        "all"
    ) {

        const selectedStillExists =
            adminApplicationFilterJobs
                .some(
                    job =>
                        String(
                            job.id
                        ) ===
                        String(
                            currentApplicationJobFilter
                        )
                );


        if (
            !selectedStillExists
        ) {

            currentApplicationJobFilter =
                "all";

        }

    }


    applicationJobMenu.innerHTML =
        "";


    /* =====================================================
       ALL VACANCIES
       ===================================================== */

    const allButton =
        document.createElement(
            "button"
        );


    allButton.type =
        "button";


    allButton.dataset.value =
        "all";


    allButton.textContent =
        "All vacancies";


    allButton.classList.toggle(
        "selected",
        currentApplicationJobFilter ===
        "all"
    );


    allButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            currentApplicationJobFilter =
                "all";


            currentApplicationsPage =
                1;


            if (
                applicationJobText
            ) {

                applicationJobText.textContent =
                    "All vacancies";

            }


            applicationJobDropdown
                ?.classList
                .remove(
                    "open"
                );


            loadAdminApplications();

        }
    );


    applicationJobMenu.appendChild(
        allButton
    );



    /* =====================================================
       VACANCIES
       ===================================================== */

    adminApplicationFilterJobs.forEach(
        job => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.dataset.value =
                String(
                    job.id
                );


            const applicantCount =
                Number(
                    job.applicantCount
                ) ||
                0;


            button.textContent =
                `${job.title} · ${applicantCount}`;


            button.classList.toggle(
                "selected",

                String(
                    currentApplicationJobFilter
                ) ===
                String(
                    job.id
                )
            );


            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    if (
                        String(
                            currentApplicationJobFilter
                        ) !==
                        String(
                            job.id
                        )
                    ) {

                        clearBulkShortlistSelection();

                    }

                    currentApplicationJobFilter =
                        String(
                            job.id
                        );


                    currentApplicationsPage =
                        1;


                    if (
                        applicationJobText
                    ) {

                        applicationJobText.textContent =
                            job.title;

                    }


                    applicationJobDropdown
                        ?.classList
                        .remove(
                            "open"
                        );


                    loadAdminApplications();

                }
            );


            applicationJobMenu.appendChild(
                button
            );

        }
    );



    /* =====================================================
       UPDATE CURRENT LABEL
       ===================================================== */

    if (
        applicationJobText
    ) {

        if (
            currentApplicationJobFilter ===
            "all"
        ) {

            applicationJobText.textContent =
                "All vacancies";

        }

        else {

            const selectedJob =
                adminApplicationFilterJobs
                    .find(
                        job =>
                            String(
                                job.id
                            ) ===
                            String(
                                currentApplicationJobFilter
                            )
                    );


            applicationJobText.textContent =
                selectedJob
                    ?.title ||
                "All vacancies";

        }

    }

}



/* =========================================================
   VACANCY DROPDOWN
   ========================================================= */

applicationJobTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            closeAllAdminCustomSelects(
                applicationJobDropdown
            );


            applicationJobDropdown
                ?.classList
                .toggle(
                    "open"
                );

        }
    );



/* =========================================================
   APPLICATION SORT DROPDOWN
   ========================================================= */

const applicationSortDropdown =
    document.getElementById(
        "applicationSortDropdown"
    );


const applicationSortTrigger =
    document.getElementById(
        "applicationSortTrigger"
    );


const applicationSortText =
    document.getElementById(
        "applicationSortText"
    );


const applicationSortMenu =
    document.getElementById(
        "applicationSortMenu"
    );


const applicationSortLabels = {

    newest:
        "Newest applications",

    oldest:
        "Oldest applications",

    score_high:
        "Reviewer score — Highest first",

    score_low:
        "Reviewer score — Lowest first",

    review_progress:
        "Review progress"

};


applicationSortTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            closeAllAdminCustomSelects(
                applicationSortDropdown
            );


            applicationSortDropdown
                ?.classList
                .toggle(
                    "open"
                );

        }
    );


applicationSortMenu
    ?.querySelectorAll(
        "button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    const value =
                        button.dataset
                            .value ||
                        "newest";


                    currentApplicationSort =
                        value;


                    currentApplicationsPage =
                        1;


                    applicationSortMenu
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    if (
                        applicationSortText
                    ) {

                        applicationSortText.textContent =
                            applicationSortLabels[
                                value
                            ] ||
                            "Newest applications";

                    }


                    applicationSortDropdown
                        ?.classList
                        .remove(
                            "open"
                        );


                    loadAdminApplications();

                }
            );

        }
    );



    /* =========================================================
   BULK SHORTLIST MODAL
   ========================================================= */

const bulkShortlistModal =
    document.getElementById(
        "bulkShortlistModal"
    );


const bulkShortlistBackdrop =
    document.getElementById(
        "bulkShortlistBackdrop"
    );


const closeBulkShortlistModalButton =
    document.getElementById(
        "closeBulkShortlistModal"
    );


const cancelBulkShortlistButton =
    document.getElementById(
        "cancelBulkShortlist"
    );


const confirmBulkShortlistButton =
    document.getElementById(
        "confirmBulkShortlist"
    );


const bulkShortlistMessage =
    document.getElementById(
        "bulkShortlistMessage"
    );



/* =========================================================
   OPEN BULK SHORTLIST MODAL
   ========================================================= */

function openBulkShortlistModal() {

    if (
        currentApplicationJobFilter ===
        "all" ||
        selectedShortlistApplicationIds
            .size ===
        0
    ) {

        return;

    }


    const selectedJob =
        adminApplicationFilterJobs
            .find(
                job =>
                    String(
                        job.id
                    ) ===
                    String(
                        currentApplicationJobFilter
                    )
            );


    const selectedApplications =

        Array.from(
            selectedShortlistApplications
                .values()
        );


    const jobTitle =
        selectedJob
            ?.title ||
        "Selected vacancy";


    const count =
        selectedApplications.length;


    setReviewText(
        "bulkShortlistJobTitle",
        jobTitle
    );


    setReviewText(
        "bulkShortlistCandidateCount",

        `${count} ${
            count === 1
                ? "candidate"
                : "candidates"
        }`
    );


    setReviewText(
        "bulkShortlistListCount",
        `${count} selected`
    );


    const subtitle =
        document.getElementById(
            "bulkShortlistModalSubtitle"
        );


    if (
        subtitle
    ) {

        subtitle.textContent =
            `Review the selected applicants for ${jobTitle} before confirming.`;

    }


    const list =
        document.getElementById(
            "bulkShortlistCandidateList"
        );


    if (
        list
    ) {

        list.innerHTML =
            "";


        selectedApplications
            .sort(
                (
                    first,
                    second
                ) => {

                    const firstScore =
                        Number(
                            first.evaluation
                                ?.averageRating
                        ) ||
                        0;


                    const secondScore =
                        Number(
                            second.evaluation
                                ?.averageRating
                        ) ||
                        0;


                    return (
                        secondScore -
                        firstScore
                    );

                }
            )
            .forEach(
                application => {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "bulk-shortlist-candidate-row";


                    const candidateName =
                        getBulkShortlistCandidateName(
                            application
                        );


                    const score =
                        application.evaluation
                            ?.averageRating;


                    row.innerHTML = `

                        <div>

                            <strong>

                                ${escapeHTML(
                                    candidateName
                                )}

                            </strong>

                            <small>

                                ${escapeHTML(
                                    application.reference ||
                                    ""
                                )}

                                ·

                                ${
                                    Number(
                                        application.evaluation
                                            ?.reviewCount
                                    ) ||
                                    0
                                }
                                /
                                ${
                                    Number(
                                        application.evaluation
                                            ?.requiredReviewers
                                    ) ||
                                    2
                                }
                                reviews

                            </small>

                        </div>


                        <strong class="bulk-shortlist-candidate-score">

                            ${
                                score !==
                                    null &&
                                score !==
                                    undefined

                                    ? `${Number(
                                        score
                                    ).toFixed(
                                        2
                                    )} / 10`

                                    : "—"
                            }

                        </strong>

                    `;


                    list.appendChild(
                        row
                    );

                }
            );

    }


    if (
        bulkShortlistMessage
    ) {

        bulkShortlistMessage.hidden =
            true;


        bulkShortlistMessage.textContent =
            "";

    }


    if (
        confirmBulkShortlistButton
    ) {

        confirmBulkShortlistButton.disabled =
            false;


        confirmBulkShortlistButton.textContent =
            count ===
                1

                ? "Shortlist candidate"

                : `Shortlist ${count} candidates`;

    }


    bulkShortlistModal
        ?.classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";

}



/* =========================================================
   CLOSE BULK SHORTLIST MODAL
   ========================================================= */

function closeBulkShortlistModal() {

    bulkShortlistModal
        ?.classList
        .remove(
            "open"
        );


    if (
        confirmBulkShortlistButton
    ) {

        confirmBulkShortlistButton.disabled =
            false;


        confirmBulkShortlistButton.textContent =
            "Shortlist candidates";

    }


    document.body.style.overflow =
        "";

}



/* =========================================================
   BULK SHORTLIST MODAL EVENTS
   ========================================================= */

document
    .getElementById(
        "openBulkShortlistModalButton"
    )
    ?.addEventListener(
        "click",
        openBulkShortlistModal
    );


closeBulkShortlistModalButton
    ?.addEventListener(
        "click",
        closeBulkShortlistModal
    );


cancelBulkShortlistButton
    ?.addEventListener(
        "click",
        closeBulkShortlistModal
    );


bulkShortlistBackdrop
    ?.addEventListener(
        "click",
        closeBulkShortlistModal
    );



/* =========================================================
   CONFIRM BULK SHORTLIST
   ========================================================= */

confirmBulkShortlistButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                currentApplicationJobFilter ===
                    "all"

                ||

                selectedShortlistApplicationIds
                    .size ===
                    0
            ) {

                return;

            }


            const applicationIds =
                Array.from(
                    selectedShortlistApplicationIds
                )
                .map(
                    value =>
                        Number(
                            value
                        )
                );


            try {

                confirmBulkShortlistButton.disabled =
                    true;


                confirmBulkShortlistButton.textContent =
                    "Shortlisting...";


                if (
                    bulkShortlistMessage
                ) {

                    bulkShortlistMessage.hidden =
                        true;


                    bulkShortlistMessage.textContent =
                        "";

                }


                const response =
                    await fetch(
                        "/api/admin/applications/bulk-shortlist",
                        {

                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    jobId:
                                        Number(
                                            currentApplicationJobFilter
                                        ),

                                    applicationIds

                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to shortlist the selected candidates."
                    );

                }


                closeBulkShortlistModal();


                clearBulkShortlistSelection();


                currentApplicationsPage =
                    1;


                await loadAdminApplications();

            }

            catch (error) {

                console.error(
                    "Bulk shortlist error:",
                    error
                );


                if (
                    bulkShortlistMessage
                ) {

                    bulkShortlistMessage.textContent =
                        error.message ||
                        "Unable to shortlist the selected candidates.";


                    bulkShortlistMessage.hidden =
                        false;

                }


                confirmBulkShortlistButton.disabled =
                    false;


                confirmBulkShortlistButton.textContent =
                    "Try again";

            }

        }
    );


/* =========================================================
   APPLICATION PAGINATION
   ========================================================= */

function renderApplicationsPagination() {

    const container =
        document.getElementById(
            "applicationsPagination"
        );


    const previousButton =
        document.getElementById(
            "applicationsPreviousPage"
        );


    const nextButton =
        document.getElementById(
            "applicationsNextPage"
        );


    const summary =
        document.getElementById(
            "applicationsPageSummary"
        );


    if (
        !container ||
        !previousButton ||
        !nextButton ||
        !summary
    ) {

        return;

    }


    const page =
        Number(
            currentApplicationsPagination
                .page
        ) ||
        1;


    const limit =
        Number(
            currentApplicationsPagination
                .limit
        ) ||
        applicationsPageLimit;


    const total =
        Number(
            currentApplicationsPagination
                .total
        ) ||
        0;


    const totalPages =
        Number(
            currentApplicationsPagination
                .totalPages
        ) ||
        1;


    previousButton.disabled =
        !currentApplicationsPagination
            .hasPrevious;


    nextButton.disabled =
        !currentApplicationsPagination
            .hasNext;


    if (
        total ===
        0
    ) {

        summary.textContent =
            "No results";


        container.hidden =
            true;


        return;

    }


    container.hidden =
        false;


    const firstResult =
        (
            page -
            1
        ) *
        limit +
        1;


    const lastResult =
        Math.min(
            page *
            limit,
            total
        );


    summary.textContent =
        `Showing ${firstResult}–${lastResult} of ${total} · Page ${page} of ${totalPages}`;

}



document
    .getElementById(
        "applicationsPreviousPage"
    )
    ?.addEventListener(
        "click",
        () => {

            if (
                !currentApplicationsPagination
                    .hasPrevious
            ) {

                return;

            }


            currentApplicationsPage =
                Math.max(
                    1,
                    currentApplicationsPage -
                    1
                );


            loadAdminApplications();

        }
    );


document
    .getElementById(
        "applicationsNextPage"
    )
    ?.addEventListener(
        "click",
        () => {

            if (
                !currentApplicationsPagination
                    .hasNext
            ) {

                return;

            }


            currentApplicationsPage +=
                1;


            loadAdminApplications();

        }
    );


/* =========================================================
   CHECK BULK SHORTLIST ELIGIBILITY
   ========================================================= */

function isApplicationBulkShortlistEligible(
    application
) {

    if (
        !application
    ) {

        return false;

    }


    if (
        currentApplicationJobFilter ===
        "all"
    ) {

        return false;

    }


    const sameVacancy =
        String(
            application.job
                ?.id
        ) ===
        String(
            currentApplicationJobFilter
        );


    const evaluationComplete =
        Boolean(
            application.evaluation
                ?.isComplete
        );


    return (

        sameVacancy

        &&

        application.status ===
            "screening"

        &&

        evaluationComplete

        &&

        !application.isLocked

    );

}



/* =========================================================
   GET APPLICATION CANDIDATE NAME
   ========================================================= */

function getBulkShortlistCandidateName(
    application
) {

    return `${
        application.candidate
            ?.firstName ||
        ""
    } ${
        application.candidate
            ?.lastName ||
        ""
    }`
    .trim() ||
    "Candidate";

}



/* =========================================================
   UPDATE BULK SHORTLIST UI
   ========================================================= */

function updateBulkShortlistUI() {

    const tools =
        document.getElementById(
            "applicationsSelectionTools"
        );


    const eligibilityText =
        document.getElementById(
            "applicationsEligibilityText"
        );


    const selectEligibleButton =
        document.getElementById(
            "selectEligiblePageButton"
        );


    const bulkBar =
        document.getElementById(
            "applicationsBulkBar"
        );


    const selectedCount =
        document.getElementById(
            "applicationsBulkSelectedCount"
        );


    const bulkJobTitle =
        document.getElementById(
            "applicationsBulkJobTitle"
        );


    const specificVacancySelected =
        currentApplicationJobFilter !==
        "all";


    const eligibleOnPage =
        adminApplications.filter(
            isApplicationBulkShortlistEligible
        );


    if (
        tools
    ) {

        tools.hidden =
            false;

    }


    if (
        eligibilityText
    ) {

        if (
            !specificVacancySelected
        ) {

            eligibilityText.textContent =
                "Select a vacancy to enable bulk shortlisting.";

        }

        else if (
            eligibleOnPage.length ===
            0
        ) {

            eligibilityText.textContent =
                "No fully evaluated shortlist-eligible candidates on this page.";

        }

        else {

            eligibilityText.textContent =
                `${eligibleOnPage.length} ${
                    eligibleOnPage.length === 1
                        ? "candidate is"
                        : "candidates are"
                } eligible on this page.`;

        }

    }


    if (
        selectEligibleButton
    ) {

        selectEligibleButton.hidden =
            !specificVacancySelected ||
            eligibleOnPage.length ===
                0;

    }


    const count =
        selectedShortlistApplicationIds
            .size;


    if (
        bulkBar
    ) {

        bulkBar.hidden =
            count ===
            0;

    }


    if (
        selectedCount
    ) {

        selectedCount.textContent =
            `${count} ${
                count === 1
                    ? "candidate selected"
                    : "candidates selected"
            }`;

    }


    if (
        bulkJobTitle
    ) {

        const selectedJob =
            adminApplicationFilterJobs
                .find(
                    job =>
                        String(
                            job.id
                        ) ===
                        String(
                            currentApplicationJobFilter
                        )
                );


        bulkJobTitle.textContent =
            selectedJob
                ?.title ||
            "Selected vacancy";

    }

}



/* =========================================================
   TOGGLE CANDIDATE SELECTION
   ========================================================= */

function toggleBulkShortlistApplication(
    application,
    selected
) {

    if (
        !isApplicationBulkShortlistEligible(
            application
        )
    ) {

        return;

    }


    const id =
        String(
            application.id
        );


    if (
        selected
    ) {

        selectedShortlistApplicationIds
            .add(
                id
            );


        selectedShortlistApplications
            .set(
                id,
                application
            );

    }

    else {

        selectedShortlistApplicationIds
            .delete(
                id
            );


        selectedShortlistApplications
            .delete(
                id
            );

    }


    updateBulkShortlistUI();

}



/* =========================================================
   CLEAR BULK SHORTLIST SELECTION
   ========================================================= */

function clearBulkShortlistSelection() {

    selectedShortlistApplicationIds
        .clear();


    selectedShortlistApplications
        .clear();


    document
        .querySelectorAll(
            ".bulk-shortlist-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    false;

            }
        );


    updateBulkShortlistUI();

}



/* =========================================================
   SELECT ALL ELIGIBLE ON CURRENT PAGE
   ========================================================= */

function selectEligibleApplicationsOnPage() {

    adminApplications
        .filter(
            isApplicationBulkShortlistEligible
        )
        .forEach(
            application => {

                const id =
                    String(
                        application.id
                    );


                selectedShortlistApplicationIds
                    .add(
                        id
                    );


                selectedShortlistApplications
                    .set(
                        id,
                        application
                    );

            }
        );


    document
        .querySelectorAll(
            ".bulk-shortlist-checkbox"
        )
        .forEach(
            checkbox => {

                checkbox.checked =
                    true;

            }
        );


    updateBulkShortlistUI();

}


/* =========================================================
   RENDER ADMIN APPLICATIONS
   ========================================================= */

function renderAdminApplications() {

    const list =
        document.getElementById(
            "adminApplicationsList"
        );


    const totalCount =
        document.getElementById(
            "applicationsTotalCount"
        );


    const visibleCount =
        document.getElementById(
            "applicationsVisibleCount"
        );


    if (
        !list
    ) {

        return;

    }



    /* =====================================================
       COUNTS
       ===================================================== */

    if (
        totalCount
    ) {

        const total =
            adminApplicationStats
                .totalApplications;


        totalCount.textContent =
            `${total} ${
                total ===
                1
                    ? "application"
                    : "applications"
            }`;

    }


    if (
        visibleCount
    ) {

        const total =
            Number(
                currentApplicationsPagination
                    .total
            ) ||
            0;


        visibleCount.textContent =
            `${total} ${
                total ===
                1
                    ? "result"
                    : "results"
            }`;

    }



    list.innerHTML =
        "";


    if (
        adminApplications.length ===
        0
    ) {

        list.innerHTML = `

            <div class="applications-empty">

                No applications match your current filters.

            </div>

        `;


        renderApplicationsPagination();


        return;

    }



    /* =====================================================
       CARDS
       ===================================================== */

    adminApplications.forEach(
        application => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "admin-application-card";


            const candidateName =
                `${
                    application.candidate
                        ?.firstName ||
                    ""
                } ${
                    application.candidate
                        ?.lastName ||
                    ""
                }`
                .trim() ||
                "Candidate";


            const managementStage =
                application
                    .managementStage ||
                application.status ||
                "submitted";


            const managementStageLabel =
                getApplicationManagementStageLabel(
                    managementStage
                );


            const evaluation =
                application.evaluation ||
                {};


            const reviewCount =
                Number(
                    evaluation.reviewCount
                ) ||
                0;


            const requiredReviewers =
                Number(
                    evaluation.requiredReviewers
                ) ||
                2;


            const averageRating =
                evaluation.averageRating;


            const showEvaluation =
                application.status ===
                    "screening"

                ||

                reviewCount >
                    0;


            /*
                Only show "Highest reviewer score"
                while management is looking at
                one specific vacancy.

                Otherwise several vacancies could
                each have their own top-rated person.
            */

            const showHighestScore =
                currentApplicationJobFilter !==
                    "all"

                &&

                Boolean(
                    evaluation
                        .isHighestRating
                );


                const bulkShortlistEligible =
    isApplicationBulkShortlistEligible(
        application
    );


const bulkShortlistSelected =
    selectedShortlistApplicationIds
        .has(
            String(
                application.id
            )
        );


const bulkSelectionHTML =
    bulkShortlistEligible

        ? `

            <label class="admin-application-select">

                <input
                    type="checkbox"
                    class="bulk-shortlist-checkbox"
                    data-application-id="${application.id}"
                    ${
                        bulkShortlistSelected
                            ? "checked"
                            : ""
                    }
                >

                <span class="admin-application-checkbox"></span>

                <span class="admin-application-select-text">
                    Select for shortlist
                </span>

            </label>

        `

        : "";

            const evaluationHTML =
                showEvaluation

                    ? `

                        <div class="admin-application-evaluation">

                            <span class="admin-application-review-count">

                                ${reviewCount} / ${requiredReviewers} reviews

                            </span>


                            ${
                                averageRating !==
                                    null &&
                                averageRating !==
                                    undefined

                                    ? `

                                        <strong class="admin-application-rating">

                                            ${Number(
                                                averageRating
                                            ).toFixed(
                                                2
                                            )} / 10

                                        </strong>

                                    `

                                    : ""
                            }


                            ${
                                showHighestScore

                                    ? `

                                        <span class="admin-application-top-score">

                                            Highest reviewer score

                                        </span>

                                    `

                                    : ""
                            }

                        </div>

                    `

                    : "";



            card.innerHTML = `

                <div class="admin-application-candidate">

                            ${bulkSelectionHTML}

                    <span class="admin-application-reference">

                        ${escapeHTML(
                            application.reference
                        )}

                    </span>


                    <h3>

                        ${escapeHTML(
                            candidateName
                        )}

                    </h3>


                    <p>

                        ${escapeHTML(
                            application.candidate
                                ?.email ||
                            "No email"
                        )}

                    </p>


                    ${evaluationHTML}

                </div>



                <div class="admin-application-job">

                    <span>
                        APPLIED FOR
                    </span>


                    <strong>

                        ${escapeHTML(
                            application.job
                                ?.title ||
                            "Vacancy"
                        )}

                    </strong>


                    <p>

                        ${escapeHTML(
                            application.job
                                ?.department ||
                            ""
                        )}

                        •

                        ${escapeHTML(
                            application.job
                                ?.location ||
                            ""
                        )}

                        •

                        ${escapeHTML(
                            application.job
                                ?.employmentType ||
                            ""
                        )}

                    </p>

                </div>



                <div class="admin-application-actions">

                    <span
                        class="
                            admin-application-status
                            ${escapeHTML(
                                managementStage
                            )}
                        "
                    >

                        ${escapeHTML(
                            managementStageLabel
                        )}

                    </span>


                    <span class="admin-application-date">

                        Applied
                        ${formatApplicationDate(
                            application.appliedAt
                        )}

                    </span>


                    <button
                        type="button"
                        class="admin-view-application-button"
                        data-application-id="${
                            application.id
                        }"
                    >

                        View application

                    </button>

                </div>

            `;


            list.appendChild(
                card
            );

        }
    );



    /* =====================================================
       VIEW APPLICATION BUTTONS
       ===================================================== */

    list
        .querySelectorAll(
            ".admin-view-application-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openAdminApplication(
                            button.dataset
                                .applicationId
                        );

                    }
                );

            }
        );

        /* =====================================================
   BULK SHORTLIST CHECKBOXES
   ===================================================== */

list
    .querySelectorAll(
        ".bulk-shortlist-checkbox"
    )
    .forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    const application =
                        adminApplications
                            .find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        checkbox.dataset
                                            .applicationId
                                    )
                            );


                    if (
                        !application
                    ) {

                        return;

                    }


                    toggleBulkShortlistApplication(
                        application,
                        checkbox.checked
                    );

                }
            );

        }
    );


    updateBulkShortlistUI();

    renderApplicationsPagination();

    document
    .getElementById(
        "selectEligiblePageButton"
    )
    ?.addEventListener(
        "click",
        selectEligibleApplicationsOnPage
    );


document
    .getElementById(
        "clearShortlistSelectionButton"
    )
    ?.addEventListener(
        "click",
        clearBulkShortlistSelection
    );

}



/* =========================================================
   LOAD ADMIN APPLICATIONS
   SERVER-SIDE FILTERING
   ========================================================= */

async function loadAdminApplications() {

    const list =
        document.getElementById(
            "adminApplicationsList"
        );


    const searchInput =
        document.getElementById(
            "adminApplicationSearch"
        );


    try {

        if (
            list
        ) {

            list.innerHTML = `

                <div class="applications-loading">

                    Loading applications...

                </div>

            `;

        }


        const params =
            new URLSearchParams();


        params.set(
            "page",
            String(
                currentApplicationsPage
            )
        );


        params.set(
            "limit",
            String(
                applicationsPageLimit
            )
        );


        params.set(
            "stage",
            currentApplicationStatusFilter
        );


        params.set(
            "sort",
            currentApplicationSort
        );


        const searchTerm =
            searchInput
                ?.value
                .trim() ||
            "";


        if (
            searchTerm
        ) {

            params.set(
                "search",
                searchTerm
            );

        }


        if (
            currentApplicationJobFilter !==
            "all"
        ) {

            params.set(
                "jobId",
                currentApplicationJobFilter
            );

        }



        const response =
            await fetch(
                `/api/admin/applications?${params.toString()}`,
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

            throw new Error(
                data.message ||
                "Unable to load applications."
            );

        }



        adminApplications =
            data.applications ||
            [];


        currentApplicationsPagination =
            data.pagination ||
            {

                page:
                    1,

                limit:
                    applicationsPageLimit,

                total:
                    0,

                totalPages:
                    1,

                hasPrevious:
                    false,

                hasNext:
                    false

            };


        currentApplicationsPage =
            Number(
                currentApplicationsPagination
                    .page
            ) ||
            1;


        updateApplicationStats(
            data.stats ||
            {}
        );


        renderApplicationJobOptions(
            data.filters
                ?.jobs ||
            []
        );


        renderAdminApplications();

    }

    catch (error) {

        console.error(
            "Load admin applications error:",
            error
        );


        if (
            list
        ) {

            list.innerHTML = `

                <div class="applications-empty">

                    Unable to load applications.

                </div>

            `;

        }

    }

}



/* =========================================================
   APPLICATION SEARCH
   DEBOUNCED FOR LARGE APPLICANT VOLUMES
   ========================================================= */

document
    .getElementById(
        "adminApplicationSearch"
    )
    ?.addEventListener(
        "input",
        () => {

            clearTimeout(
                applicationSearchTimer
            );


            applicationSearchTimer =
                setTimeout(
                    () => {

                        currentApplicationsPage =
                            1;


                        loadAdminApplications();

                    },
                    300
                );

        }
    );



/* =========================================================
   APPLICATION STAGE FILTERS
   ========================================================= */

document
    .querySelectorAll(
        ".application-filter-button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    currentApplicationStatusFilter =
                        button.dataset
                            .status ||
                        "all";


                    currentApplicationsPage =
                        1;


                    document
                        .querySelectorAll(
                            ".application-filter-button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    loadAdminApplications();

                }
            );

        }
    );



/* =========================================================
   CREATE / EDIT VACANCY MODAL
   ========================================================= */

const createVacancyModal =
    document.getElementById(
        "createVacancyModal"
    );


const openCreateVacancyModalButton =
    document.getElementById(
        "openCreateVacancyModal"
    );


const closeCreateVacancyModalButton =
    document.getElementById(
        "closeCreateVacancyModal"
    );


const cancelCreateVacancyButton =
    document.getElementById(
        "cancelCreateVacancy"
    );


const createVacancyBackdrop =
    document.querySelector(
        "#createVacancyModal .admin-modal-backdrop"
    );


const createJobForm =
    document.getElementById(
        "createJobForm"
    );



function openCreateVacancyModal() {

    if (
        !createVacancyModal
    ) {

        return;

    }


    createVacancyModal
        .classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";

}



function closeCreateVacancyModal() {

    if (
        !createVacancyModal
    ) {

        return;

    }


    createVacancyModal
        .classList
        .remove(
            "open"
        );


    document.body.style.overflow =
        "";

}



openCreateVacancyModalButton
    ?.addEventListener(
        "click",
        () => {

            editingJobId =
                null;


            createJobForm
                ?.reset();


            const employmentTypeText =
                document.getElementById(
                    "employmentTypeText"
                );


            const employmentTypeInput =
                document.getElementById(
                    "employmentType"
                );


            const deadlineText =
                document.getElementById(
                    "deadlineText"
                );


            const deadlineInput =
                document.getElementById(
                    "applicationDeadline"
                );


            if (
                employmentTypeText
            ) {

                employmentTypeText.textContent =
                    "Select employment type";

            }


            if (
                employmentTypeInput
            ) {

                employmentTypeInput.value =
                    "";

            }


            if (
                deadlineText
            ) {

                deadlineText.textContent =
                    "Select deadline";

            }


            if (
                deadlineInput
            ) {

                deadlineInput.value =
                    "";

            }


            document
                .querySelectorAll(
                    "#employmentDropdown .admin-custom-select-menu button"
                )
                .forEach(
                    button => {

                        button.classList.remove(
                            "selected"
                        );

                    }
                );


            const modalTitle =
                document.querySelector(
                    "#createVacancyModal .admin-modal-header h2"
                );


            if (
                modalTitle
            ) {

                modalTitle.textContent =
                    "Create job vacancy.";

            }


            const submitButton =
                createJobForm
                    ?.querySelector(
                        ".admin-create-job-btn"
                    );


            if (
                submitButton
            ) {

                submitButton.textContent =
                    "Create vacancy";

            }


            openCreateVacancyModal();

        }
    );


closeCreateVacancyModalButton
    ?.addEventListener(
        "click",
        closeCreateVacancyModal
    );


cancelCreateVacancyButton
    ?.addEventListener(
        "click",
        closeCreateVacancyModal
    );


createVacancyBackdrop
    ?.addEventListener(
        "click",
        closeCreateVacancyModal
    );



/* =========================================================
   EMPLOYMENT TYPE CUSTOM DROPDOWN
   ========================================================= */

const employmentDropdown =
    document.getElementById(
        "employmentDropdown"
    );


const employmentDropdownTrigger =
    document.getElementById(
        "employmentDropdownTrigger"
    );


const employmentTypeText =
    document.getElementById(
        "employmentTypeText"
    );


const employmentType =
    document.getElementById(
        "employmentType"
    );


if (
    employmentDropdown &&
    employmentDropdownTrigger
) {

    employmentDropdownTrigger
        .addEventListener(
            "click",
            event => {

                event.stopPropagation();


                closeAllAdminCustomSelects(
                    employmentDropdown
                );


                employmentDropdown
                    .classList
                    .toggle(
                        "open"
                    );

            }
        );


    employmentDropdown
        .querySelectorAll(
            ".admin-custom-select-menu button"
        )
        .forEach(
            option => {

                option.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const value =
                            option.dataset.value ||
                            "";


                        if (
                            employmentType
                        ) {

                            employmentType.value =
                                value;

                        }


                        if (
                            employmentTypeText
                        ) {

                            employmentTypeText.textContent =
                                value;

                        }


                        employmentDropdown
                            .querySelectorAll(
                                ".admin-custom-select-menu button"
                            )
                            .forEach(
                                item => {

                                    item.classList.remove(
                                        "selected"
                                    );

                                }
                            );


                        option.classList.add(
                            "selected"
                        );


                        employmentDropdown
                            .classList
                            .remove(
                                "open"
                            );

                    }
                );

            }
        );

}



/* =========================================================
   APPLICATION DEADLINE CALENDAR
   ========================================================= */

const deadlinePicker =
    document.getElementById(
        "deadlinePicker"
    );


const deadlineTrigger =
    document.getElementById(
        "deadlineTrigger"
    );


const deadlineText =
    document.getElementById(
        "deadlineText"
    );


const deadlineInput =
    document.getElementById(
        "applicationDeadline"
    );


const deadlineMonthLabel =
    document.getElementById(
        "deadlineMonthLabel"
    );


const deadlineDays =
    document.getElementById(
        "deadlineDays"
    );


const previousDeadlineMonth =
    document.getElementById(
        "previousDeadlineMonth"
    );


const nextDeadlineMonth =
    document.getElementById(
        "nextDeadlineMonth"
    );


let deadlineViewDate =
    new Date();



function renderDeadlineCalendar() {

    if (
        !deadlineDays ||
        !deadlineMonthLabel ||
        !deadlineInput
    ) {

        return;

    }


    deadlineDays.innerHTML =
        "";


    const year =
        deadlineViewDate
            .getFullYear();


    const month =
        deadlineViewDate
            .getMonth();


    deadlineMonthLabel.textContent =
        deadlineViewDate
            .toLocaleDateString(
                "en-US",
                {
                    month:
                        "long",

                    year:
                        "numeric"
                }
            );


    const firstDay =
        new Date(
            year,
            month,
            1
        )
        .getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        )
        .getDate();


    for (
        let i = 0;
        i < firstDay;
        i++
    ) {

        const empty =
            document.createElement(
                "span"
            );


        empty.className =
            "admin-calendar-empty";


        deadlineDays.appendChild(
            empty
        );

    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.textContent =
            day;


        const databaseDate =
            formatDatabaseDate(
                date
            );


        if (
            date <
            today
        ) {

            button.disabled =
                true;

        }


        if (
            formatDatabaseDate(
                today
            ) ===
            databaseDate
        ) {

            button.classList.add(
                "today"
            );

        }


        if (
            deadlineInput.value ===
            databaseDate
        ) {

            button.classList.add(
                "selected"
            );

        }


        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                deadlineInput.value =
                    databaseDate;


                if (
                    deadlineText
                ) {

                    deadlineText.textContent =
                        date.toLocaleDateString(
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


                deadlinePicker
                    ?.classList
                    .remove(
                        "open"
                    );


                renderDeadlineCalendar();

            }
        );


        deadlineDays.appendChild(
            button
        );

    }

}



deadlineTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            deadlinePicker
                ?.classList
                .toggle(
                    "open"
                );


            renderDeadlineCalendar();

        }
    );


previousDeadlineMonth
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            deadlineViewDate
                .setMonth(
                    deadlineViewDate
                        .getMonth() -
                    1
                );


            renderDeadlineCalendar();

        }
    );


nextDeadlineMonth
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            deadlineViewDate
                .setMonth(
                    deadlineViewDate
                        .getMonth() +
                    1
                );


            renderDeadlineCalendar();

        }
    );


renderDeadlineCalendar();



/* =========================================================
   CREATE / UPDATE JOB
   ========================================================= */

createJobForm
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const jobTitle =
                document.getElementById(
                    "jobTitle"
                )
                ?.value
                .trim() ||
                "";


            const department =
                document.getElementById(
                    "jobDepartment"
                )
                ?.value
                .trim() ||
                "";


            const location =
                document.getElementById(
                    "jobLocation"
                )
                ?.value
                .trim() ||
                "";


            const selectedEmploymentType =
                document.getElementById(
                    "employmentType"
                )
                ?.value ||
                "";


            const salary =
                document.getElementById(
                    "jobSalary"
                )
                ?.value
                .trim() ||
                "";


            const applicationDeadline =
                document.getElementById(
                    "applicationDeadline"
                )
                ?.value ||
                "";


            const experienceRequired =
                document.getElementById(
                    "experienceRequired"
                )
                ?.value
                .trim() ||
                "";


            const educationRequired =
                document.getElementById(
                    "educationRequired"
                )
                ?.value
                .trim() ||
                "";


            const description =
                document.getElementById(
                    "jobDescription"
                )
                ?.value
                .trim() ||
                "";


            const responsibilities =
                document.getElementById(
                    "jobResponsibilities"
                )
                ?.value
                .trim() ||
                "";


            const requiredSkills =
                document.getElementById(
                    "jobSkills"
                )
                ?.value
                .trim() ||
                "";


            const numberOfOpenings =
                document.getElementById(
                    "numberOfOpenings"
                )
                ?.value ||
                1;


            if (
                !jobTitle ||
                !department ||
                !location ||
                !selectedEmploymentType ||
                !description
            ) {

                console.error(
                    "Please complete all required fields."
                );


                return;

            }


            const submitButton =
                createJobForm
                    .querySelector(
                        ".admin-create-job-btn"
                    );


            const isEditing =
                editingJobId !==
                null;


            if (
                submitButton
            ) {

                submitButton.disabled =
                    true;


                submitButton.textContent =
                    isEditing
                        ? "Saving changes..."
                        : "Creating vacancy...";

            }


            try {

                const endpoint =
                    isEditing
                        ? `/api/admin/jobs/${editingJobId}`
                        : "/api/admin/jobs";


                const method =
                    isEditing
                        ? "PATCH"
                        : "POST";


                const response =
                    await fetch(
                        endpoint,
                        {
                            method,

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    jobTitle,
                                    department,
                                    location,
                                    employmentType:
                                        selectedEmploymentType,
                                    salary,
                                    applicationDeadline,
                                    experienceRequired,
                                    educationRequired,
                                    description,
                                    responsibilities,
                                    requiredSkills,
                                    numberOfOpenings
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to save vacancy."
                    );

                }


                await loadAdminJobs();


                editingJobId =
                    null;


                createJobForm
                    .reset();


                if (
                    employmentTypeText
                ) {

                    employmentTypeText.textContent =
                        "Select employment type";

                }


                if (
                    employmentType
                ) {

                    employmentType.value =
                        "";

                }


                if (
                    deadlineText
                ) {

                    deadlineText.textContent =
                        "Select deadline";

                }


                if (
                    deadlineInput
                ) {

                    deadlineInput.value =
                        "";

                }


                closeCreateVacancyModal();

            }

            catch (error) {

                console.error(
                    "Save vacancy error:",
                    error
                );

            }

            finally {

                if (
                    submitButton
                ) {

                    submitButton.disabled =
                        false;


                    submitButton.textContent =
                        "Create vacancy";

                }


                const modalTitle =
                    document.querySelector(
                        "#createVacancyModal .admin-modal-header h2"
                    );


                if (
                    modalTitle
                ) {

                    modalTitle.textContent =
                        "Create job vacancy.";

                }

            }

        }
    );



/* =========================================================
   LOAD ADMIN JOB VACANCIES
   ========================================================= */

async function loadAdminJobs() {

    const vacancyList =
        document.getElementById(
            "vacancyList"
        );


    const vacancyCount =
        document.getElementById(
            "vacancyCount"
        );


    if (
        !vacancyList ||
        !vacancyCount
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/admin/jobs",
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

            throw new Error(
                data.message ||
                "Unable to load vacancies."
            );

        }


        const jobs =
            data.jobs ||
            [];


        const activeVacancies =
            jobs.filter(
                job =>
                    job.status ===
                    "active"
            ).length;


        const activeVacanciesCount =
            document.getElementById(
                "activeVacanciesCount"
            );


        if (
            activeVacanciesCount
        ) {

            activeVacanciesCount.textContent =
                activeVacancies;

        }


        vacancyCount.textContent =
            `${jobs.length} ${
                jobs.length === 1
                    ? "vacancy"
                    : "vacancies"
            }`;


        vacancyList.innerHTML =
            "";


        if (
            jobs.length ===
            0
        ) {

            vacancyList.innerHTML = `

                <div class="vacancy-empty-state">

                    <p>
                        No job vacancies have been created yet.
                    </p>

                </div>

            `;


            return;

        }


        jobs.forEach(
            job => {

                const openings =
                    Number(
                        job.number_of_openings
                    ) ||
                    1;


                const creatorName =
                    `${
                        job.creator_first_name ||
                        ""
                    } ${
                        job.creator_last_name ||
                        ""
                    }`
                    .trim() ||
                    "Unknown admin";


                const card =
                    document.createElement(
                        "details"
                    );


                card.className =
                    "vacancy-card";


                card.innerHTML = `

                    <summary class="vacancy-summary">

                        <div class="vacancy-summary-main">

                            <div class="vacancy-title-row">

                                <h3>
                                    ${escapeHTML(
                                        job.job_title
                                    )}
                                </h3>


                                <span
                                    class="
                                        vacancy-status
                                        ${escapeHTML(
                                            job.status
                                        )}
                                    "
                                >
                                    ${escapeHTML(
                                        job.status
                                    )}
                                </span>

                            </div>


                            <div class="vacancy-meta">

                                <span>
                                    ${escapeHTML(
                                        job.department
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    ${escapeHTML(
                                        job.location
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    ${escapeHTML(
                                        job.employment_type
                                    )}
                                </span>

                            </div>


                            <div class="vacancy-summary-bottom">

                                <span>
                                    Posted
                                    ${formatPostedDate(
                                        job.created_at
                                    )}
                                </span>

                                <span class="vacancy-meta-dot">
                                    •
                                </span>

                                <span>
                                    ${openings}
                                    ${
                                        openings === 1
                                            ? "opening"
                                            : "openings"
                                    }
                                </span>

                                <span class="vacancy-meta-dot">
                                    •
                                </span>

                                <span>
                                    Created by
                                    ${escapeHTML(
                                        creatorName
                                    )}
                                </span>

                            </div>

                        </div>


                        <div class="vacancy-summary-controls">

                            <button
                                type="button"
                                class="edit-vacancy-button"
                                data-job-id="${job.id}"
                            >
                                Edit vacancy
                            </button>


                            <button
                                type="button"
                                class="${
                                    job.status === "closed"
                                        ? "reopen-vacancy-button"
                                        : "close-vacancy-button"
                                }"
                                data-job-id="${job.id}"
                            >
                                ${
                                    job.status === "closed"
                                        ? "Reopen vacancy"
                                        : "Close vacancy"
                                }
                            </button>


                            <span class="vacancy-expand-icon">
                                ↓
                            </span>

                        </div>

                    </summary>


                    <div class="vacancy-details">

                        <div class="vacancy-detail-grid">

                            <div>

                                <span>
                                    Salary
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        job.salary ||
                                        "Not specified"
                                    )}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Application deadline
                                </span>

                                <strong>
                                    ${formatDeadline(
                                        job.application_deadline
                                    )}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Experience required
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        job.experience_required ||
                                        "Not specified"
                                    )}
                                </strong>

                            </div>


                            <div>

                                <span>
                                    Education required
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        job.education_required ||
                                        "Not specified"
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="vacancy-detail-section">

                            <span>
                                JOB DESCRIPTION
                            </span>

                            <p>
                                ${escapeHTML(
                                    job.description
                                )}
                            </p>

                        </div>


                        <div class="vacancy-detail-section">

                            <span>
                                RESPONSIBILITIES
                            </span>

                            <p>
                                ${escapeHTML(
                                    job.responsibilities ||
                                    "Not specified"
                                )}
                            </p>

                        </div>


                        <div class="vacancy-detail-section">

                            <span>
                                REQUIRED SKILLS
                            </span>

                            <p>
                                ${escapeHTML(
                                    job.required_skills ||
                                    "Not specified"
                                )}
                            </p>

                        </div>

                    </div>

                `;


                vacancyList.appendChild(
                    card
                );


                const statusButton =
                    card.querySelector(
                        ".close-vacancy-button, .reopen-vacancy-button"
                    );


                statusButton
                    ?.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();


                            event.stopPropagation();


                            const newStatus =
                                job.status ===
                                "closed"
                                    ? "active"
                                    : "closed";


                            openJobStatusModal(
                                job.id,
                                job.job_title,
                                newStatus
                            );

                        }
                    );


                card
                    .querySelector(
                        ".edit-vacancy-button"
                    )
                    ?.addEventListener(
                        "click",
                        event => {

                            event.preventDefault();


                            event.stopPropagation();


                            openEditVacancyModal(
                                job
                            );

                        }
                    );

            }
        );

    }

    catch (error) {

        console.error(
            "Load vacancies error:",
            error
        );

    }

}



/* =========================================================
   CLOSE / REOPEN VACANCY
   ========================================================= */

const closeVacancyModal =
    document.getElementById(
        "closeVacancyModal"
    );


const cancelCloseVacancy =
    document.getElementById(
        "cancelCloseVacancy"
    );


const confirmCloseVacancy =
    document.getElementById(
        "confirmCloseVacancy"
    );


const closeVacancyBackdrop =
    document.getElementById(
        "closeVacancyBackdrop"
    );



function openJobStatusModal(
    jobId,
    jobTitle,
    newStatus
) {

    selectedJobForStatus =
        jobId;


    selectedJobNewStatus =
        newStatus;


    const modalTitle =
        document.querySelector(
            "#closeVacancyModal h2"
        );


    const modalLabel =
        document.querySelector(
            "#closeVacancyModal .admin-section-label"
        );


    const message =
        document.getElementById(
            "closeVacancyMessage"
        );


    if (
        newStatus ===
        "active"
    ) {

        if (
            modalLabel
        ) {

            modalLabel.textContent =
                "REOPEN VACANCY";

        }


        if (
            modalTitle
        ) {

            modalTitle.textContent =
                "Reopen this position?";

        }


        if (
            message
        ) {

            message.textContent =
                `"${jobTitle}" will become active again and candidates will be able to apply.`;

        }


        if (
            confirmCloseVacancy
        ) {

            confirmCloseVacancy.textContent =
                "Reopen vacancy";


            confirmCloseVacancy
                .classList
                .add(
                    "reopen-confirm"
                );

        }

    }

    else {

        if (
            modalLabel
        ) {

            modalLabel.textContent =
                "CLOSE VACANCY";

        }


        if (
            modalTitle
        ) {

            modalTitle.textContent =
                "Close this position?";

        }


        if (
            message
        ) {

            message.textContent =
                `"${jobTitle}" will be marked as closed and candidates will no longer be able to apply.`;

        }


        if (
            confirmCloseVacancy
        ) {

            confirmCloseVacancy.textContent =
                "Close vacancy";


            confirmCloseVacancy
                .classList
                .remove(
                    "reopen-confirm"
                );

        }

    }


    closeVacancyModal
        ?.classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";

}



function closeCloseVacancyModal() {

    selectedJobForStatus =
        null;


    selectedJobNewStatus =
        null;


    closeVacancyModal
        ?.classList
        .remove(
            "open"
        );


    document.body.style.overflow =
        "";

}



cancelCloseVacancy
    ?.addEventListener(
        "click",
        closeCloseVacancyModal
    );


closeVacancyBackdrop
    ?.addEventListener(
        "click",
        closeCloseVacancyModal
    );



confirmCloseVacancy
    ?.addEventListener(
        "click",
        async () => {

            if (
                !selectedJobForStatus ||
                !selectedJobNewStatus
            ) {

                return;

            }


            const jobId =
                selectedJobForStatus;


            const newStatus =
                selectedJobNewStatus;


            try {

                confirmCloseVacancy.disabled =
                    true;


                confirmCloseVacancy.textContent =
                    newStatus ===
                    "active"
                        ? "Reopening..."
                        : "Closing...";


                const response =
                    await fetch(
                        `/api/admin/jobs/${jobId}/status`,
                        {
                            method:
                                "PATCH",

                            credentials:
                                "same-origin",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    status:
                                        newStatus
                                })
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to update vacancy status."
                    );

                }


                closeCloseVacancyModal();


                await loadAdminJobs();

            }

            catch (error) {

                console.error(
                    "Update vacancy status error:",
                    error
                );


                confirmCloseVacancy.textContent =
                    newStatus ===
                    "active"
                        ? "Reopen vacancy"
                        : "Close vacancy";

            }

            finally {

                confirmCloseVacancy.disabled =
                    false;

            }

        }
    );



function openEditVacancyModal(
    job
) {

    editingJobId =
        job.id;


    const setValue =
        (
            id,
            value
        ) => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.value =
                    value ??
                    "";

            }

        };


    setValue(
        "jobTitle",
        job.job_title
    );


    setValue(
        "jobDepartment",
        job.department
    );


    setValue(
        "jobLocation",
        job.location
    );


    setValue(
        "jobSalary",
        job.salary
    );


    setValue(
        "numberOfOpenings",
        job.number_of_openings ||
        1
    );


    setValue(
        "experienceRequired",
        job.experience_required
    );


    setValue(
        "educationRequired",
        job.education_required
    );


    setValue(
        "jobSkills",
        job.required_skills
    );


    setValue(
        "jobDescription",
        job.description
    );


    setValue(
        "jobResponsibilities",
        job.responsibilities
    );


    if (
        employmentType
    ) {

        employmentType.value =
            job.employment_type ||
            "";

    }


    if (
        employmentTypeText
    ) {

        employmentTypeText.textContent =
            job.employment_type ||
            "Select employment type";

    }


    document
        .querySelectorAll(
            "#employmentDropdown .admin-custom-select-menu button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    button.dataset.value ===
                    job.employment_type
                );

            }
        );


    if (
        job.application_deadline
    ) {

        const value =
            String(
                job.application_deadline
            )
            .slice(
                0,
                10
            );


        if (
            deadlineInput
        ) {

            deadlineInput.value =
                value;

        }


        const match =
            value.match(
                /^(\d{4})-(\d{2})-(\d{2})$/
            );


        if (
            match &&
            deadlineText
        ) {

            const date =
                new Date(
                    Number(
                        match[1]
                    ),
                    Number(
                        match[2]
                    ) - 1,
                    Number(
                        match[3]
                    )
                );


            deadlineText.textContent =
                date.toLocaleDateString(
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

    }

    else {

        if (
            deadlineInput
        ) {

            deadlineInput.value =
                "";

        }


        if (
            deadlineText
        ) {

            deadlineText.textContent =
                "Select deadline";

        }

    }


    const modalTitle =
        document.querySelector(
            "#createVacancyModal .admin-modal-header h2"
        );


    if (
        modalTitle
    ) {

        modalTitle.textContent =
            "Edit job vacancy.";

    }


    const submitButton =
        createJobForm
            ?.querySelector(
                ".admin-create-job-btn"
            );


    if (
        submitButton
    ) {

        submitButton.textContent =
            "Save changes";

    }


    openCreateVacancyModal();

}



/* =========================================================
   INTERVIEW SESSION LIST
   ========================================================= */

async function loadAdminInterviewSessions() {

    const list =
        document.getElementById(
            "interviewSessionList"
        );


    const count =
        document.getElementById(
            "interviewSessionCount"
        );


    if (
        !list ||
        !count
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/admin/interview-sessions",
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

            throw new Error(
                data.message ||
                "Unable to load interview sessions."
            );

        }


        const sessions =
            data.sessions ||
            [];


        count.textContent =
            `${sessions.length} ${
                sessions.length === 1
                    ? "session"
                    : "sessions"
            }`;


        list.innerHTML =
            "";


        if (
            sessions.length ===
            0
        ) {

            list.innerHTML = `

                <div class="interview-session-empty">

                    No interview sessions have been created yet.

                </div>

            `;


            return;

        }


        sessions.forEach(
            session => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "interview-session-card";


                const status =
                    String(
                        session.status ||
                        "draft"
                    );


                card.innerHTML = `

                    <div class="interview-session-card-main">

                        <span class="admin-section-label">

                            ${escapeHTML(
                                status.toUpperCase()
                            )}

                        </span>


                        <h3>

                            ${escapeHTML(
                                session.job?.title ||
                                session.title ||
                                "Interview session"
                            )}

                        </h3>


                        <p>

                            ${escapeHTML(
                                formatReviewDate(
                                    session.date
                                )
                            )}

                            ·

                            ${escapeHTML(
                                formatTimeValue(
                                    session.startTime
                                )
                            )}

                            –

                            ${escapeHTML(
                                formatTimeValue(
                                    session.endTime
                                )
                            )}

                        </p>


                        <p>

                            ${
                                Number(
                                    session.durationMinutes
                                ) ||
                                0
                            }
                            min interviews

                            ·

                            ${
                                Number(
                                    session.breakMinutes
                                ) ||
                                0
                            }
                            min break

                            ·

                            ${escapeHTML(
                                session.interviewType ||
                                ""
                            )}

                        </p>

                    </div>


                    <div class="interview-session-card-right">

                        <div class="interview-session-card-slots">

                            <strong>
                                ${Number(session.slots?.booked) || 0}
                            </strong>

                            <span>
                                booked
                            </span>


                            <strong>
                                ${Number(session.slots?.available) || 0}
                            </strong>

                            <span>
                                available
                            </span>

                        </div>


                        <button
                            type="button"
                            class="interview-review-session-button"
                            data-session-id="${session.id}"
                        >
                            Review schedule
                        </button>

                    </div>

                `;


                list.appendChild(
                    card
                );

                card
                .querySelector(
                    ".interview-review-session-button"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        openInterviewSessionReview(
                            session.id
                        );

                    }
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Load interview sessions error:",
            error
        );


        list.innerHTML = `

            <div class="interview-session-empty">

                Unable to load interview sessions.

            </div>

        `;

    }

}



/* =========================================================
   INTERVIEW SESSION REVIEW
   ========================================================= */

const interviewSessionReviewModal =
    document.getElementById(
        "interviewSessionReviewModal"
    );


const interviewSessionReviewBackdrop =
    document.getElementById(
        "interviewSessionReviewBackdrop"
    );


const closeInterviewSessionReviewButton =
    document.getElementById(
        "closeInterviewSessionReview"
    );


const closeInterviewReviewBottomButton =
    document.getElementById(
        "closeInterviewReviewBottom"
    );


const interviewReviewLoading =
    document.getElementById(
        "interviewReviewLoading"
    );


const interviewReviewContent =
    document.getElementById(
        "interviewReviewContent"
    );

    
const confirmInterviewSessionButton =
    document.getElementById(
        "confirmInterviewSessionButton"
    );


let currentInterviewReviewSession =
    null;


/* =========================================================
   SET REVIEW TEXT
   ========================================================= */

function setInterviewReviewText(
    id,
    value,
    fallback = "Not provided"
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
            ? value
            : fallback;

}



/* =========================================================
   FORMAT INTERVIEW DATE
   ========================================================= */

function formatInterviewSessionDate(
    value
) {

    if (!value) {

        return "Not provided";

    }


    const date =
        new Date(
            value
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
   FORMAT TIMESTAMP TIME
   ========================================================= */

function formatInterviewSlotTime(
    value
) {

    if (!value) {

        return "—";

    }


    const date =
        new Date(
            value
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
   FORMAT DATABASE TIME
   ========================================================= */

function formatInterviewDatabaseTime(
    value
) {

    if (!value) {

        return "—";

    }


    const match =
        String(value)
            .match(
                /^(\d{2}):(\d{2})/
            );


    if (!match) {

        return value;

    }


    let hour =
        Number(
            match[1]
        );


    const minute =
        match[2];


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 ||
        12;


    return `${hour}:${minute} ${period}`;

}



/* =========================================================
   OPEN REVIEW
   ========================================================= */

async function openInterviewSessionReview(
    sessionId
) {

    if (
        !interviewSessionReviewModal
    ) {

        return;

    }


    interviewSessionReviewModal
        .classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";


    interviewReviewLoading.hidden =
        false;


    interviewReviewLoading.textContent =
        "Loading interview schedule...";


    interviewReviewContent.hidden =
        true;


    try {

        const response =
            await fetch(
                `/api/admin/interview-sessions/${sessionId}`,
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

            throw new Error(
                data.message ||
                "Unable to load interview session."
            );

        }


        renderInterviewSessionReview(
            data.session
        );


        interviewReviewLoading.hidden =
            true;


        interviewReviewContent.hidden =
            false;

    }

    catch (error) {

        console.error(
            "Open interview session error:",
            error
        );


        interviewReviewLoading.textContent =
            error.message ||
            "Unable to load interview schedule.";

    }

}

/* =========================================================
   CONFIRM INTERVIEW SESSION
   ========================================================= */

confirmInterviewSessionButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                !currentInterviewReviewSession ||
                currentInterviewReviewSession.status !==
                    "draft"
            ) {

                return;

            }


            const sessionId =
                currentInterviewReviewSession.id;


            confirmInterviewSessionButton.disabled =
                true;


            confirmInterviewSessionButton.textContent =
                "Confirming session...";


            try {

                const response =
                    await fetch(
                        `/api/admin/interview-sessions/${sessionId}/confirm`,
                        {

                            method:
                                "PATCH",

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

                    throw new Error(
                        data.message ||
                        "Unable to confirm interview session."
                    );

                }


                /* Reload session list */
                await loadAdminInterviewSessions();


                /* Reload this review so DRAFT becomes CONFIRMED */
                await openInterviewSessionReview(
                    sessionId
                );


                /*
                    Application statuses also changed,
                    so refresh manager application data.
                */

                if (
                    typeof loadAdminApplications ===
                    "function"
                ) {

                    await loadAdminApplications();

                }

            }

            catch (error) {

                console.error(
                    "Confirm interview session error:",
                    error
                );


                confirmInterviewSessionButton.disabled =
                    false;


                confirmInterviewSessionButton.textContent =
                    "Confirm interview session";


                window.alert(
                    error.message ||
                    "Unable to confirm interview session."
                );

            }

        }
    );



/* =========================================================
   RENDER REVIEW
   ========================================================= */

function renderInterviewSessionReview(
    session
) {

    currentInterviewReviewSession =
        session;

    const job =
        session.job ||
        {};


    const slots =
            Array.isArray(
                session.slots
            )
                ? session.slots
                : [];


        if (
            confirmInterviewSessionButton
        ) {

            const isDraft =
                session.status ===
                "draft";


            confirmInterviewSessionButton.hidden =
                !isDraft;


            confirmInterviewSessionButton.disabled =
                false;


            confirmInterviewSessionButton.textContent =
                "Confirm interview session";

        }   {

                const isDraft =
                    session.status ===
                    "draft";


                confirmInterviewSessionButton.hidden =
                    !isDraft;


                confirmInterviewSessionButton.disabled =
                    false;


                confirmInterviewSessionButton.textContent =
                    "Confirm interview session";

            }

    setInterviewReviewText(
        "interviewReviewJobTitle",
        job.title,
        "Interview schedule"
    );


    setInterviewReviewText(
        "interviewReviewSubtitle",
        `${job.department || "Recruitment"} · ${job.location || "Location not specified"}`
    );


    setInterviewReviewText(
        "interviewReviewStatus",
        session.status
    );


    setInterviewReviewText(
        "interviewReviewDate",
        formatInterviewSessionDate(
            session.date
        )
    );


    setInterviewReviewText(
        "interviewReviewWindow",
        `${
            formatInterviewDatabaseTime(
                session.startTime
            )
        } – ${
            formatInterviewDatabaseTime(
                session.endTime
            )
        }`
    );


    setInterviewReviewText(
        "interviewReviewRound",
        `Round ${session.round}`
    );


    const typeLabels = {

        online:
            "Online",

        onsite:
            "Onsite",

        phone:
            "Phone"

    };


    setInterviewReviewText(
        "interviewReviewType",
        typeLabels[
            session.interviewType
        ] ||
        session.interviewType
    );


    const assignmentLabels = {

        fifo:
            "FIFO",

        random:
            "Random",

        manual:
            "Manual"

    };


    setInterviewReviewText(
        "interviewReviewAssignment",
        assignmentLabels[
            session.assignmentMethod
        ] ||
        session.assignmentMethod
    );


    setInterviewReviewText(
        "interviewReviewDuration",
        `${session.durationMinutes} minutes`
    );


    setInterviewReviewText(
        "interviewReviewBreak",
        `${session.breakMinutes} minutes`
    );


    setInterviewReviewText(
        "interviewReviewLocation",
        session.interviewType ===
            "online"
            ? "Online interview"
            : session.location
    );


    setInterviewReviewText(
        "interviewReviewSlotCount",
        `${slots.length} ${
            slots.length === 1
                ? "slot"
                : "slots"
        }`
    );


    setInterviewReviewText(
        "interviewReviewInstructions",
        session.instructions,
        "No candidate instructions provided."
    );


    renderInterviewReviewSlots(
        slots
    );

}



/* =========================================================
   RENDER SLOT ASSIGNMENTS
   ========================================================= */

function renderInterviewReviewSlots(
    slots
) {

    const container =
        document.getElementById(
            "interviewReviewSlots"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        slots.length ===
        0
    ) {

        container.innerHTML = `
            <div class="interview-session-empty">
                No interview slots are available.
            </div>
        `;

        return;

    }


    slots.forEach(
        slot => {

            const candidate =
                slot.candidate;


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "interview-review-slot";


            const candidateName =
                candidate
                    ? `${candidate.firstName || ""} ${candidate.lastName || ""}`
                        .trim()
                    : "";


            row.innerHTML = `

                <div>

                    <span class="interview-review-slot-number">
                        SLOT ${Number(slot.slotNumber) || ""}
                    </span>


                    <strong class="interview-review-slot-time">

                        ${
                            escapeHTML(
                                formatInterviewSlotTime(
                                    slot.scheduledStart
                                )
                            )
                        }

                        –

                        ${
                            escapeHTML(
                                formatInterviewSlotTime(
                                    slot.scheduledEnd
                                )
                            )
                        }

                    </strong>

                </div>


                <div class="interview-review-candidate">

                    ${
                        candidate
                            ? `

                                <strong>
                                    ${
                                        escapeHTML(
                                            candidateName ||
                                            "Candidate"
                                        )
                                    }
                                </strong>


                                <p>
                                    ${
                                        escapeHTML(
                                            candidate.reference ||
                                            "No reference"
                                        )
                                    }
                                    ·
                                    ${
                                        escapeHTML(
                                            candidate.email ||
                                            "No email"
                                        )
                                    }
                                </p>

                            `
                            : `

                                <strong class="interview-review-empty-candidate">
                                    Available slot
                                </strong>


                                <p>
                                    No candidate assigned.
                                </p>

                            `
                    }

                </div>


                ${
                    candidate
                        ? `

                            <button
                                type="button"
                                class="interview-review-application-button"
                                data-application-id="${
                                    candidate.applicationId
                                }"
                            >
                                View application
                            </button>

                        `
                        : `
                            <span></span>
                        `
                }

            `;


            container.appendChild(
                row
            );


            if (
                candidate
            ) {

                row
                    .querySelector(
                        ".interview-review-application-button"
                    )
                    ?.addEventListener(
                        "click",
                        () => {

                            openAdminApplication(
                                candidate.applicationId
                            );

                        }
                    );

            }

        }
    );

}


/* =========================================================
   CLOSE REVIEW
   ========================================================= */

function closeInterviewSessionReview() {

    interviewSessionReviewModal
        ?.classList
        .remove(
            "open"
        );


    document.body.style.overflow =
        "";

}


closeInterviewSessionReviewButton
    ?.addEventListener(
        "click",
        closeInterviewSessionReview
    );


closeInterviewReviewBottomButton
    ?.addEventListener(
        "click",
        closeInterviewSessionReview
    );


interviewSessionReviewBackdrop
    ?.addEventListener(
        "click",
        closeInterviewSessionReview
    );



/* =========================================================
   CREATE INTERVIEW SESSION MODAL
   ========================================================= */

const createInterviewSessionModal =
    document.getElementById(
        "createInterviewSessionModal"
    );


const openCreateInterviewSessionButton =
    document.getElementById(
        "openCreateInterviewSession"
    );


const closeCreateInterviewSessionButton =
    document.getElementById(
        "closeCreateInterviewSession"
    );


const cancelCreateInterviewSessionButton =
    document.getElementById(
        "cancelCreateInterviewSession"
    );


const createInterviewSessionBackdrop =
    document.getElementById(
        "createInterviewSessionBackdrop"
    );


const createInterviewSessionForm =
    document.getElementById(
        "createInterviewSessionForm"
    );



async function openCreateInterviewSessionModal() {

    if (
        !createInterviewSessionModal
    ) {

        return;

    }


    createInterviewSessionModal
        .classList
        .add(
            "open"
        );


    document.body.style.overflow =
        "hidden";


    await loadInterviewSessionOptions();


    updateInterviewTypeFields(
        document.getElementById(
            "interviewType"
        )
        ?.value ||
        "online"
    );


    updateInterviewSchedulePreview();

}



function closeInterviewSessionModal() {

    createInterviewSessionModal
        ?.classList
        .remove(
            "open"
        );


    document.body.style.overflow =
        "";


    closeAllAdminCustomSelects();


    document
        .getElementById(
            "interviewDatePicker"
        )
        ?.classList
        .remove(
            "open"
        );

}



openCreateInterviewSessionButton
    ?.addEventListener(
        "click",
        openCreateInterviewSessionModal
    );


closeCreateInterviewSessionButton
    ?.addEventListener(
        "click",
        closeInterviewSessionModal
    );


cancelCreateInterviewSessionButton
    ?.addEventListener(
        "click",
        closeInterviewSessionModal
    );


createInterviewSessionBackdrop
    ?.addEventListener(
        "click",
        closeInterviewSessionModal
    );



/* =========================================================
   REUSABLE INTERVIEW CUSTOM DROPDOWN
   ========================================================= */

function setupInterviewDropdown({

    rootId,
    triggerId,
    textId,
    inputId,
    menuId,
    options,
    onChange

}) {

    const root =
        document.getElementById(
            rootId
        );


    const trigger =
        document.getElementById(
            triggerId
        );


    const text =
        document.getElementById(
            textId
        );


    const input =
        document.getElementById(
            inputId
        );


    const menu =
        document.getElementById(
            menuId
        );


    if (
        !root ||
        !trigger ||
        !text ||
        !input ||
        !menu
    ) {

        return;

    }


    menu.innerHTML =
        "";


    options.forEach(
        option => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.dataset.value =
                String(
                    option.value
                );


            button.textContent =
                option.label;


            if (
                String(
                    input.value
                ) ===
                String(
                    option.value
                )
            ) {

                button.classList.add(
                    "selected"
                );

            }


            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    input.value =
                        String(
                            option.value
                        );


                    text.textContent =
                        option.label;


                    menu
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    root.classList.remove(
                        "open"
                    );


                    if (
                        typeof onChange ===
                        "function"
                    ) {

                        onChange(
                            String(
                                option.value
                            )
                        );

                    }

                }
            );


            menu.appendChild(
                button
            );

        }
    );


    /*
        Using onclick prevents duplicate listeners
        when vacancy options are loaded repeatedly.
    */

    trigger.onclick =
        event => {

            event.stopPropagation();


            closeAllAdminCustomSelects(
                root
            );


            root.classList.toggle(
                "open"
            );

        };

}



/* =========================================================
   LOAD INTERVIEW VACANCY OPTIONS
   ========================================================= */

async function loadInterviewSessionOptions() {

    try {

        const response =
            await fetch(
                "/api/admin/interview-session-options",
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

            throw new Error(
                data.message ||
                "Unable to load vacancies."
            );

        }


        interviewSessionJobs =
            data.jobs ||
            [];


        setupInterviewDropdown({

            rootId:
                "interviewJobDropdown",

            triggerId:
                "interviewJobTrigger",

            textId:
                "interviewJobText",

            inputId:
                "interviewSessionJob",

            menuId:
                "interviewJobMenu",

            options:
                interviewSessionJobs.map(
                    job => ({

                        value:
                            String(
                                job.id
                            ),

                        label:
                            `${job.title} - ${job.shortlistedCount} shortlisted`

                    })
                ),

            onChange:
                updateInterviewSchedulePreview

        });

    }

    catch (error) {

        console.error(
            "Interview session options error:",
            error
        );

    }

}



/* =========================================================
   INTERVIEW TIME HELPERS
   ========================================================= */

function timeToMinutes(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    const parts =
        String(
            value
        )
        .split(
            ":"
        );


    if (
        parts.length !==
        2
    ) {

        return null;

    }


    const hours =
        Number(
            parts[0]
        );


    const minutes =
        Number(
            parts[1]
        );


    if (
        Number.isNaN(
            hours
        ) ||
        Number.isNaN(
            minutes
        ) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
    ) {

        return null;

    }


    return (
        hours * 60 +
        minutes
    );

}



function minutesToDisplayTime(
    totalMinutes
) {

    const normalized =
        (
            (
                Number(
                    totalMinutes
                ) %
                1440
            ) +
            1440
        ) %
        1440;


    const hours24 =
        Math.floor(
            normalized /
            60
        );


    const minutes =
        normalized %
        60;


    const suffix =
        hours24 >=
        12
            ? "PM"
            : "AM";


    const hours12 =
        hours24 %
        12 ||
        12;


    return `${hours12}:${String(
        minutes
    ).padStart(
        2,
        "0"
    )} ${suffix}`;

}



function buildInterviewTimeOptions() {

    const options =
        [];


    /*
        Every 10 minutes,
        from 6:00 AM to 10:00 PM.
    */

    for (
        let minutes = 360;
        minutes <= 1320;
        minutes += 10
    ) {

        const hours =
            Math.floor(
                minutes /
                60
            );


        const mins =
            minutes %
            60;


        options.push({

            value:
                `${
                    String(
                        hours
                    )
                    .padStart(
                        2,
                        "0"
                    )
                }:${
                    String(
                        mins
                    )
                    .padStart(
                        2,
                        "0"
                    )
                }`,

            label:
                minutesToDisplayTime(
                    minutes
                )

        });

    }


    return options;

}



const interviewTimeOptions =
    buildInterviewTimeOptions();



/* =========================================================
   INTERVIEW STATIC CUSTOM DROPDOWNS
   ========================================================= */

setupInterviewDropdown({

    rootId:
        "interviewStartDropdown",

    triggerId:
        "interviewStartTrigger",

    textId:
        "interviewStartText",

    inputId:
        "interviewSessionStart",

    menuId:
        "interviewStartMenu",

    options:
        interviewTimeOptions,

    onChange:
        updateInterviewSchedulePreview

});



setupInterviewDropdown({

    rootId:
        "interviewEndDropdown",

    triggerId:
        "interviewEndTrigger",

    textId:
        "interviewEndText",

    inputId:
        "interviewSessionEnd",

    menuId:
        "interviewEndMenu",

    options:
        interviewTimeOptions,

    onChange:
        updateInterviewSchedulePreview

});



setupInterviewDropdown({

    rootId:
        "interviewDurationDropdown",

    triggerId:
        "interviewDurationTrigger",

    textId:
        "interviewDurationText",

    inputId:
        "interviewDuration",

    menuId:
        "interviewDurationMenu",

    options: [

        {
            value:
                "15",

            label:
                "15 minutes"
        },

        {
            value:
                "20",

            label:
                "20 minutes"
        },

        {
            value:
                "30",

            label:
                "30 minutes"
        },

        {
            value:
                "45",

            label:
                "45 minutes"
        },

        {
            value:
                "60",

            label:
                "60 minutes"
        }

    ],

    onChange:
        updateInterviewSchedulePreview

});



setupInterviewDropdown({

    rootId:
        "interviewBreakDropdown",

    triggerId:
        "interviewBreakTrigger",

    textId:
        "interviewBreakText",

    inputId:
        "interviewBreak",

    menuId:
        "interviewBreakMenu",

    options: [

        {
            value:
                "0",

            label:
                "No break"
        },

        {
            value:
                "5",

            label:
                "5 minutes"
        },

        {
            value:
                "10",

            label:
                "10 minutes"
        },

        {
            value:
                "15",

            label:
                "15 minutes"
        },

        {
            value:
                "20",

            label:
                "20 minutes"
        },

        {
            value:
                "30",

            label:
                "30 minutes"
        }

    ],

    onChange:
        updateInterviewSchedulePreview

});



setupInterviewDropdown({

    rootId:
        "interviewTypeDropdown",

    triggerId:
        "interviewTypeTrigger",

    textId:
        "interviewTypeText",

    inputId:
        "interviewType",

    menuId:
        "interviewTypeMenu",

    options: [

        {
            value:
                "online",

            label:
                "Online"
        },

        {
            value:
                "onsite",

            label:
                "Onsite"
        },

        {
            value:
                "phone",

            label:
                "Phone"
        }

    ],

    onChange:
        updateInterviewTypeFields

});



setupInterviewDropdown({

    rootId:
        "interviewAssignmentDropdown",

    triggerId:
        "interviewAssignmentTrigger",

    textId:
        "interviewAssignmentText",

    inputId:
        "interviewAssignmentMethod",

    menuId:
        "interviewAssignmentMenu",

    options: [

        {
            value:
                "fifo",

            label:
                "FIFO - earliest application first"
        },

        {
            value:
                "random",

            label:
                "Random"
        },

        {
            value:
                "manual",

            label:
                "Manual"
        }

    ]

});



/* =========================================================
   INTERVIEW TYPE
   ========================================================= */

function updateInterviewTypeFields(
    interviewType
) {

    const locationField =
        document.getElementById(
            "interviewLocationField"
        );


    const locationInput =
        document.getElementById(
            "interviewLocation"
        );


    const onsite =
        interviewType ===
        "onsite";


    if (
        locationField
    ) {

        locationField.hidden =
            !onsite;

    }


    if (
        locationInput
    ) {

        locationInput.required =
            onsite;

    }

}



/* =========================================================
   INTERVIEW CUSTOM DATE PICKER
   ========================================================= */

const interviewDatePicker =
    document.getElementById(
        "interviewDatePicker"
    );


const interviewDateTrigger =
    document.getElementById(
        "interviewDateTrigger"
    );


const interviewDateText =
    document.getElementById(
        "interviewDateText"
    );


const interviewDateInput =
    document.getElementById(
        "interviewSessionDate"
    );


const interviewMonthLabel =
    document.getElementById(
        "interviewMonthLabel"
    );


const interviewCalendarDays =
    document.getElementById(
        "interviewCalendarDays"
    );


const previousInterviewMonth =
    document.getElementById(
        "previousInterviewMonth"
    );


const nextInterviewMonth =
    document.getElementById(
        "nextInterviewMonth"
    );



function renderInterviewCalendar() {

    if (
        !interviewCalendarDays ||
        !interviewMonthLabel ||
        !interviewDateInput
    ) {

        return;

    }


    interviewCalendarDays.innerHTML =
        "";


    const year =
        interviewViewDate
            .getFullYear();


    const month =
        interviewViewDate
            .getMonth();


    interviewMonthLabel.textContent =
        interviewViewDate
            .toLocaleDateString(
                "en-US",
                {
                    month:
                        "long",

                    year:
                        "numeric"
                }
            );


    const firstDay =
        new Date(
            year,
            month,
            1
        )
        .getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        )
        .getDate();


    for (
        let index = 0;
        index < firstDay;
        index++
    ) {

        const empty =
            document.createElement(
                "span"
            );


        empty.className =
            "admin-calendar-empty";


        interviewCalendarDays.appendChild(
            empty
        );

    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            new Date(
                year,
                month,
                day
            );


        const databaseDate =
            formatDatabaseDate(
                date
            );


        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.textContent =
            String(
                day
            );


        if (
            date <
            today
        ) {

            button.disabled =
                true;

        }


        if (
            formatDatabaseDate(
                today
            ) ===
            databaseDate
        ) {

            button.classList.add(
                "today"
            );

        }


        if (
            interviewDateInput.value ===
            databaseDate
        ) {

            button.classList.add(
                "selected"
            );

        }


        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                interviewDateInput.value =
                    databaseDate;


                if (
                    interviewDateText
                ) {

                    interviewDateText.textContent =
                        date.toLocaleDateString(
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


                interviewDatePicker
                    ?.classList
                    .remove(
                        "open"
                    );


                renderInterviewCalendar();

            }
        );


        interviewCalendarDays.appendChild(
            button
        );

    }

}



interviewDateTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            closeAllAdminCustomSelects();


            interviewDatePicker
                ?.classList
                .toggle(
                    "open"
                );


            renderInterviewCalendar();

        }
    );


previousInterviewMonth
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            interviewViewDate
                .setMonth(
                    interviewViewDate
                        .getMonth() -
                    1
                );


            renderInterviewCalendar();

        }
    );


nextInterviewMonth
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            interviewViewDate
                .setMonth(
                    interviewViewDate
                        .getMonth() +
                    1
                );


            renderInterviewCalendar();

        }
    );


renderInterviewCalendar();



/* =========================================================
   INTERVIEW SLOT CALCULATION
   ========================================================= */

function calculateInterviewSlots() {

    const start =
        timeToMinutes(
            document.getElementById(
                "interviewSessionStart"
            )
            ?.value
        );


    const end =
        timeToMinutes(
            document.getElementById(
                "interviewSessionEnd"
            )
            ?.value
        );


    const duration =
        Number(
            document.getElementById(
                "interviewDuration"
            )
            ?.value
        );


    const breakMinutes =
        Number(
            document.getElementById(
                "interviewBreak"
            )
            ?.value
        );


    if (
        start === null ||
        end === null ||
        end <= start ||
        !Number.isFinite(
            duration
        ) ||
        duration <= 0 ||
        !Number.isFinite(
            breakMinutes
        ) ||
        breakMinutes < 0
    ) {

        return [];

    }


    const slots =
        [];


    let currentStart =
        start;


    let slotNumber =
        1;


    while (
        currentStart +
        duration <=
        end
    ) {

        const currentEnd =
            currentStart +
            duration;


        slots.push({

            number:
                slotNumber,

            start:
                currentStart,

            end:
                currentEnd

        });


        currentStart =
            currentEnd +
            breakMinutes;


        slotNumber +=
            1;


        if (
            slotNumber >
            100
        ) {

            break;

        }

    }


    return slots;

}



/* =========================================================
   UPDATE INTERVIEW PREVIEW
   ========================================================= */

function updateInterviewSchedulePreview() {

    const selectedJobId =
        document.getElementById(
            "interviewSessionJob"
        )
        ?.value;


    const selectedJob =
        interviewSessionJobs.find(
            job =>
                String(
                    job.id
                ) ===
                String(
                    selectedJobId
                )
        );


    const selectedJobBox =
        document.getElementById(
            "interviewSelectedJob"
        );


    const shortlistedCount =
        selectedJob
            ? Number(
                selectedJob.shortlistedCount
            ) ||
            0
            : 0;



    /* =====================================================
       SELECTED JOB
       ===================================================== */

    if (
        selectedJob &&
        selectedJobBox
    ) {

        selectedJobBox.hidden =
            false;


        const count =
            document.getElementById(
                "interviewShortlistedCount"
            );


        const meta =
            document.getElementById(
                "interviewSelectedJobMeta"
            );


        if (
            count
        ) {

            count.textContent =
                shortlistedCount;

        }


        if (
            meta
        ) {

            meta.textContent =
                `${selectedJob.department} · ${selectedJob.location} · ${selectedJob.employmentType}`;

        }

    }

    else if (
        selectedJobBox
    ) {

        selectedJobBox.hidden =
            true;

    }



    /* =====================================================
       SLOT COUNT
       ===================================================== */

    const slots =
        calculateInterviewSlots();


    const schedulable =
        Math.min(
            shortlistedCount,
            slots.length
        );


    const remaining =
        Math.max(
            0,
            shortlistedCount -
            slots.length
        );


    const previewShortlisted =
        document.getElementById(
            "previewShortlisted"
        );


    const previewSlots =
        document.getElementById(
            "previewSlots"
        );


    const previewSchedulable =
        document.getElementById(
            "previewSchedulable"
        );


    const previewRemaining =
        document.getElementById(
            "previewRemaining"
        );


    if (
        previewShortlisted
    ) {

        previewShortlisted.textContent =
            shortlistedCount;

    }


    if (
        previewSlots
    ) {

        previewSlots.textContent =
            slots.length;

    }


    if (
        previewSchedulable
    ) {

        previewSchedulable.textContent =
            schedulable;

    }


    if (
        previewRemaining
    ) {

        previewRemaining.textContent =
            remaining;

    }



    /* =====================================================
       SLOT CARDS
       ===================================================== */

    const preview =
        document.getElementById(
            "interviewSlotPreview"
        );


    if (
        preview
    ) {

        preview.innerHTML =
            "";


        slots.forEach(
            slot => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "interview-preview-slot";


                const label =
                    document.createElement(
                        "span"
                    );


                label.textContent =
                    `Slot ${slot.number}`;


                const time =
                    document.createElement(
                        "strong"
                    );


                time.textContent =
                    `${
                        minutesToDisplayTime(
                            slot.start
                        )
                    } – ${
                        minutesToDisplayTime(
                            slot.end
                        )
                    }`;


                card.appendChild(
                    label
                );


                card.appendChild(
                    time
                );


                preview.appendChild(
                    card
                );

            }
        );

    }



    /* =====================================================
       CAPACITY WARNING
       ===================================================== */

    const warning =
        document.getElementById(
            "interviewCapacityWarning"
        );


    if (
        !warning
    ) {

        return;

    }


    if (
        shortlistedCount >
        0 &&
        remaining >
        0
    ) {

        warning.hidden =
            false;


        warning.textContent =
            `${remaining} shortlisted ${
                remaining === 1
                    ? "candidate cannot"
                    : "candidates cannot"
            } be scheduled in this session. Create another session or increase the interview window.`;

    }

    else if (
        shortlistedCount >
        0 &&
        slots.length >
        shortlistedCount
    ) {

        const availableAfterAssignment =
            slots.length -
            shortlistedCount;


        warning.hidden =
            false;


        warning.textContent =
            `${availableAfterAssignment} ${
                availableAfterAssignment === 1
                    ? "slot will remain"
                    : "slots will remain"
            } available after the shortlisted candidates are assigned.`;

    }

    else {

        warning.hidden =
            true;


        warning.textContent =
            "";

    }

}



/* =========================================================
   CREATE INTERVIEW SESSION DRAFT
   ========================================================= */

createInterviewSessionForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const jobId =
            document.getElementById(
                "interviewSessionJob"
            )?.value;


        const sessionDate =
            document.getElementById(
                "interviewSessionDate"
            )?.value;


        const interviewRound =
            Number(
                document.getElementById(
                    "interviewSessionRound"
                )?.value || 1
            );


        const startTime =
            document.getElementById(
                "interviewSessionStart"
            )?.value;


        const endTime =
            document.getElementById(
                "interviewSessionEnd"
            )?.value;


        const durationMinutes =
            Number(
                document.getElementById(
                    "interviewDuration"
                )?.value
            );


        const breakMinutes =
            Number(
                document.getElementById(
                    "interviewBreak"
                )?.value
            );


        const interviewType =
            document.getElementById(
                "interviewType"
            )?.value ||
            "online";


        const assignmentMethod =
            document.getElementById(
                "interviewAssignmentMethod"
            )?.value ||
            "fifo";


        const location =
            document.getElementById(
                "interviewLocation"
            )?.value.trim() ||
            "";


        const instructions =
            document.getElementById(
                "interviewInstructions"
            )?.value.trim() ||
            "";


        const slots =
            calculateInterviewSlots();


        if (!jobId) {

            window.alert(
                "Please select a vacancy."
            );

            return;

        }


        if (!sessionDate) {

            window.alert(
                "Please select an interview date."
            );

            return;

        }


        if (
            slots.length ===
            0
        ) {

            window.alert(
                "The selected time window does not contain any valid interview slots."
            );

            return;

        }


        if (
            interviewType ===
                "onsite" &&
            !location
        ) {

            window.alert(
                "Please enter the interview location."
            );

            return;

        }


        const submitButton =
            document.getElementById(
                "generateInterviewScheduleButton"
            ) ||
            createInterviewSessionForm.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Generating schedule...";

        }


        try {

            const response =
                await fetch(
                    "/api/admin/interview-sessions",
                    {

                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                jobId,

                                sessionDate,

                                interviewRound,

                                startTime,

                                endTime,

                                durationMinutes,

                                breakMinutes,

                                interviewType,

                                assignmentMethod,

                                location,

                                instructions

                            })

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to generate interview schedule."
                );

            }


            console.log(
                "Interview session created:",
                data.session
            );


            closeInterviewSessionModal();


            await loadAdminInterviewSessions();


        }

        catch (error) {

            console.error(
                "Create interview session error:",
                error
            );


            window.alert(
                error.message ||
                "Unable to generate interview schedule."
            );

        }

        finally {

            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "Generate schedule";

            }

        }

    }
);


/* =========================================================
   GLOBAL CLICK CLEANUP
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        if (
            employmentDropdown &&
            !employmentDropdown.contains(
                event.target
            )
        ) {

            employmentDropdown
                .classList
                .remove(
                    "open"
                );

        }


        if (
            deadlinePicker &&
            !deadlinePicker.contains(
                event.target
            )
        ) {

            deadlinePicker
                .classList
                .remove(
                    "open"
                );

        }


        if (
            interviewDatePicker &&
            !interviewDatePicker.contains(
                event.target
            )
        ) {

            interviewDatePicker
                .classList
                .remove(
                    "open"
                );

        }


        document
            .querySelectorAll(
                ".admin-custom-select.open"
            )
            .forEach(
                dropdown => {

                    if (
                        !dropdown.contains(
                            event.target
                        )
                    ) {

                        dropdown.classList.remove(
                            "open"
                        );

                    }

                }
            );

    }
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


        if (
            rejectApplicationModal
                ?.classList
                .contains(
                    "open"
                )
        ) {

            closeRejectApplicationModal();

            return;

        }


        if (
            applicationReviewModal
                ?.classList
                .contains(
                    "evaluation-open"
                )
        ) {

            closeApplicationEvaluationPanel();

            return;

        }


        if (
            applicationReviewModal
                ?.classList
                .contains(
                    "open"
                )
        ) {

            closeApplicationReviewModal();


            return;

        }


        if (
            createInterviewSessionModal
                ?.classList
                .contains(
                    "open"
                )
        ) {

            closeInterviewSessionModal();


            return;

        }


        if (
            closeVacancyModal
                ?.classList
                .contains(
                    "open"
                )
        ) {

            closeCloseVacancyModal();


            return;

        }


        if (
            createVacancyModal
                ?.classList
                .contains(
                    "open"
                )
        ) {

            closeCreateVacancyModal();


            return;

        }

        if (
            interviewSessionReviewModal
                ?.classList
                .contains(
                    "open"
                )
        ) {

            closeInterviewSessionReview();

            return;

        }


        closeAllAdminCustomSelects();


        deadlinePicker
            ?.classList
            .remove(
                "open"
            );


        interviewDatePicker
            ?.classList
            .remove(
                "open"
            );

    }
);


/* =========================================================
   SYSTEM PANEL - USER DIRECTORY
   ========================================================= */

function getSystemUserRoleClass(
    role
) {

    if (
        role ===
        "system_admin"
    ) {

        return "system-admin";

    }


    if (
        role ===
        "admin"
    ) {

        return "system-manager";

    }


    return "candidate";

}



/* =========================================================
   USER NAME INITIALS
   ========================================================= */

function getSystemUserInitials(
    user
) {

    const first =
        String(
            user.firstName ||
            ""
        )
        .trim()
        .charAt(
            0
        );


    const last =
        String(
            user.lastName ||
            ""
        )
        .trim()
        .charAt(
            0
        );


    return (
        `${first}${last}`
        .toUpperCase()
        ||
        "U"
    );

}



/* =========================================================
   RENDER USER STATS
   ========================================================= */

function renderSystemUserStats(
    stats = {}
) {

    const values = {

        systemTeamMemberCount:
            stats.teamMembers,

        systemManagerCount:
            stats.systemManagers,

        systemAdminCount:
            stats.systemAdmins,

        systemCandidateCount:
            stats.candidates

    };


    Object.entries(
        values
    )
    .forEach(
        ([
            id,
            value
        ]) => {

            const element =
                document.getElementById(
                    id
                );


            if (
                element
            ) {

                element.textContent =
                    Number(
                        value
                    ) ||
                    0;

            }

        }
    );

}



/* =========================================================
   RENDER SYSTEM USERS
   ========================================================= */

function renderSystemUsers(
    users
) {

    const list =
        document.getElementById(
            "systemUsersList"
        );


    const resultCount =
        document.getElementById(
            "systemUsersResultCount"
        );


    const listLabel =
        document.getElementById(
            "systemUsersListLabel"
        );


    if (
        !list
    ) {

        return;

    }



    const labels = {

        team:
            "TEAM MEMBERS",

        candidates:
            "CANDIDATES",

        all:
            "ALL USERS"

    };


    if (
        listLabel
    ) {

        listLabel.textContent =
            labels[
                systemUsersGroup
            ]
            ||
            "USERS";

    }



    const total =
        Number(
            systemUsersPagination.total
        ) ||
        0;


    if (
        resultCount
    ) {

        resultCount.textContent =
            `${total} ${
                total ===
                    1

                    ? "user"

                    : "users"
            }`;

    }



    list.innerHTML =
        "";


    if (
        !Array.isArray(
            users
        )
        ||
        users.length ===
            0
    ) {

        list.innerHTML = `

            <div class="system-users-empty">

                <strong>
                    No users found.
                </strong>

                <p>
                    Try changing the current user group
                    or search query.
                </p>

            </div>

        `;


        return;

    }



    users.forEach(
        user => {

            const row =
                document.createElement(
                    "article"
                );


            row.className =
                "system-user-row";


            const fullName =
                `${
                    user.firstName ||
                    ""
                } ${
                    user.lastName ||
                    ""
                }`
                .trim()
                ||
                "Unnamed user";


            const roleClass =
                getSystemUserRoleClass(
                    user.role
                );


            const isTeamMember =
                [
                    "admin",
                    "system_admin"
                ]
                .includes(
                    user.role
                );


            const photoHTML =
                user.profilePicture

                    ? `

                        <img
                            src="${escapeHTML(
                                user.profilePicture
                            )}"
                            alt=""
                        >

                    `

                    : `

                        <span>
                            ${escapeHTML(
                                getSystemUserInitials(
                                    user
                                )
                            )}
                        </span>

                    `;



            row.innerHTML = `

                <div class="system-user-identity">

                    <div class="system-user-avatar">

                        ${photoHTML}

                    </div>


                    <div class="system-user-name">

                        <div>

                            <strong>

                                ${escapeHTML(
                                    fullName
                                )}

                            </strong>


                            ${
                                user.isCurrentUser

                                    ? `

                                        <span class="system-user-you">
                                            YOU
                                        </span>

                                    `

                                    : ""
                            }

                        </div>


                        <p>

                            ${escapeHTML(
                                user.email ||
                                "No email"
                            )}

                        </p>

                    </div>

                </div>



                <div class="system-user-contact">

                    <span>
                        PHONE
                    </span>

                    <strong>

                        ${escapeHTML(
                            user.phoneNumber ||
                            "Not provided"
                        )}

                    </strong>

                </div>



                <div class="system-user-role-column">

                    <span
                        class="
                            system-user-role
                            ${roleClass}
                        "
                    >

                        ${escapeHTML(
                            user.roleName ||
                            user.role
                        )}

                    </span>

                </div>



                <div class="system-user-account">

                    <span
                        class="
                            system-user-verification
                            ${
                                user.emailVerified
                                    ? "verified"
                                    : "unverified"
                            }
                        "
                    >

                        ${
                            user.emailVerified
                                ? "Verified"
                                : "Unverified"
                        }

                    </span>


                    <small>

                        Joined
                        ${escapeHTML(
                            formatReviewDate(
                                user.createdAt
                            )
                        )}

                    </small>


                    ${
                        isTeamMember

                            ? `

                                <button
                                    type="button"
                                    class="system-manage-user-button"
                                >
                                    Manage Team Member
                                </button>

                            `

                            : ""
                    }

                </div>

            `;



            const manageButton =
                row.querySelector(
                    ".system-manage-user-button"
                );


            manageButton
                ?.addEventListener(
                    "click",
                    () => {

                        openManageTeamMemberModal(
                            user
                        );

                    }
                );


            list.appendChild(
                row
            );

        }
    );

}



/* =========================================================
   RENDER USER PAGINATION
   ========================================================= */

function renderSystemUsersPagination() {

    const container =
        document.getElementById(
            "systemUsersPagination"
        );


    const previousButton =
        document.getElementById(
            "systemUsersPreviousPage"
        );


    const nextButton =
        document.getElementById(
            "systemUsersNextPage"
        );


    const summary =
        document.getElementById(
            "systemUsersPageSummary"
        );


    if (
        !container ||
        !previousButton ||
        !nextButton ||
        !summary
    ) {

        return;

    }


    const total =
        Number(
            systemUsersPagination.total
        ) ||
        0;


    if (
        total ===
        0
    ) {

        container.hidden =
            true;


        return;

    }


    container.hidden =
        false;


    previousButton.disabled =
        !systemUsersPagination
            .hasPrevious;


    nextButton.disabled =
        !systemUsersPagination
            .hasNext;


    summary.textContent =
        `Page ${
            systemUsersPagination.page
        } of ${
            systemUsersPagination.totalPages
        }`;

}



/* =========================================================
   LOAD SYSTEM USERS
   ========================================================= */

async function loadSystemUsers() {

    const list =
        document.getElementById(
            "systemUsersList"
        );


    if (
        !list
    ) {

        return;

    }


    list.innerHTML = `

        <div class="system-users-loading">

            Loading users...

        </div>

    `;


    try {

        const parameters =
            new URLSearchParams({

                group:
                    systemUsersGroup,

                search:
                    systemUsersSearch,

                page:
                    String(
                        systemUsersPage
                    ),

                limit:
                    String(
                        systemUsersLimit
                    )

            });


        const response =
            await fetch(
                `/api/system/users?${parameters.toString()}`,
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

            throw new Error(
                data.message ||
                "Unable to load users."
            );

        }


        systemUsersPagination = {

            page:
                Number(
                    data.pagination
                        ?.page
                ) ||
                1,

            total:
                Number(
                    data.pagination
                        ?.total
                ) ||
                0,

            totalPages:
                Number(
                    data.pagination
                        ?.totalPages
                ) ||
                1,

            hasPrevious:
                Boolean(
                    data.pagination
                        ?.hasPrevious
                ),

            hasNext:
                Boolean(
                    data.pagination
                        ?.hasNext
                )

        };


        renderSystemUserStats(
            data.stats ||
            {}
        );


        loadedSystemUsers =
            Array.isArray(
                data.users
            )
                ? data.users
                : [];


        renderSystemUsers(
            loadedSystemUsers
        );


        renderSystemUsersPagination();

    }

    catch (error) {

        console.error(
            "Load System Users error:",
            error
        );


        list.innerHTML = `

            <div class="system-users-error">

                <strong>
                    Unable to load users.
                </strong>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Please try again."
                    )}
                </p>

            </div>

        `;

    }

}



/* =========================================================
   USER GROUP TABS
   ========================================================= */

document
    .querySelectorAll(
        ".system-user-group-button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    systemUsersGroup =
                        button.dataset
                            .userGroup ||
                        "team";


                    systemUsersPage =
                        1;


                    document
                        .querySelectorAll(
                            ".system-user-group-button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    loadSystemUsers();

                }
            );

        }
    );



/* =========================================================
   USER SEARCH
   ========================================================= */

document
    .getElementById(
        "systemUserSearch"
    )
    ?.addEventListener(
        "input",
        event => {

            clearTimeout(
                systemUsersSearchTimer
            );


            systemUsersSearchTimer =
                setTimeout(
                    () => {

                        systemUsersSearch =
                            event.target.value
                                .trim();


                        systemUsersPage =
                            1;


                        loadSystemUsers();

                    },
                    300
                );

        }
    );



/* =========================================================
   USER PAGINATION
   ========================================================= */

document
    .getElementById(
        "systemUsersPreviousPage"
    )
    ?.addEventListener(
        "click",
        () => {

            if (
                !systemUsersPagination
                    .hasPrevious
            ) {

                return;

            }


            systemUsersPage =
                Math.max(
                    1,
                    systemUsersPage -
                    1
                );


            loadSystemUsers();

        }
    );


document
    .getElementById(
        "systemUsersNextPage"
    )
    ?.addEventListener(
        "click",
        () => {

            if (
                !systemUsersPagination
                    .hasNext
            ) {

                return;

            }


            systemUsersPage +=
                1;


            loadSystemUsers();

        }
    );



/* =========================================================
   LOAD USERS WHEN SYSTEM USERS PAGE OPENS
   ========================================================= */

document
    .querySelector(
        '[data-section="system-users"]'
    )
    ?.addEventListener(
        "click",
        () => {

            loadSystemUsers();

        }
    );


/* =========================================================
   SYSTEM PANEL - ADD TEAM MEMBER
   ========================================================= */

const addTeamMemberModal =
    document.getElementById(
        "addTeamMemberModal"
    );


const addTeamMemberBackdrop =
    document.getElementById(
        "addTeamMemberBackdrop"
    );


const openAddTeamMemberModalButton =
    document.getElementById(
        "openAddTeamMemberModal"
    );


const closeAddTeamMemberModalButton =
    document.getElementById(
        "closeAddTeamMemberModal"
    );


const cancelAddTeamMemberButton =
    document.getElementById(
        "cancelAddTeamMember"
    );


const addTeamMemberForm =
    document.getElementById(
        "addTeamMemberForm"
    );


const addTeamMemberMessage =
    document.getElementById(
        "addTeamMemberMessage"
    );


const createTeamMemberButton =
    document.getElementById(
        "createTeamMemberButton"
    );


const teamMemberRoleDropdown =
    document.getElementById(
        "teamMemberRoleDropdown"
    );


const teamMemberRoleTrigger =
    document.getElementById(
        "teamMemberRoleTrigger"
    );


const teamMemberRoleMenu =
    document.getElementById(
        "teamMemberRoleMenu"
    );


const teamMemberRoleText =
    document.getElementById(
        "teamMemberRoleText"
    );


const teamMemberRoleInput =
    document.getElementById(
        "teamMemberRole"
    );



/* =========================================================
   OPEN MODAL
   ========================================================= */

function openAddTeamMemberModal() {

    if (
        !addTeamMemberModal
    ) {

        return;

    }


    addTeamMemberForm
        ?.reset();


    if (
        teamMemberRoleInput
    ) {

        teamMemberRoleInput.value =
            "";

    }


    if (
        teamMemberRoleText
    ) {

        teamMemberRoleText.textContent =
            "Select team role";

    }


    teamMemberRoleMenu
        ?.querySelectorAll(
            "button"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "selected"
                );

            }
        );


    if (
        addTeamMemberMessage
    ) {

        addTeamMemberMessage.hidden =
            true;


        addTeamMemberMessage.textContent =
            "";


        addTeamMemberMessage
            .classList
            .remove(
                "error"
            );

    }


    addTeamMemberModal.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";

}



/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeAddTeamMemberModal() {

    addTeamMemberModal
        ?.classList
        .remove(
            "open"
        );


    teamMemberRoleDropdown
        ?.classList
        .remove(
            "open"
        );


    document.body.style.overflow =
        "";

}



/* =========================================================
   MODAL EVENTS
   ========================================================= */

openAddTeamMemberModalButton
    ?.addEventListener(
        "click",
        openAddTeamMemberModal
    );


closeAddTeamMemberModalButton
    ?.addEventListener(
        "click",
        closeAddTeamMemberModal
    );


cancelAddTeamMemberButton
    ?.addEventListener(
        "click",
        closeAddTeamMemberModal
    );


addTeamMemberBackdrop
    ?.addEventListener(
        "click",
        closeAddTeamMemberModal
    );



/* =========================================================
   ROLE DROPDOWN
   ========================================================= */

teamMemberRoleTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            closeAllAdminCustomSelects(
                teamMemberRoleDropdown
            );


            teamMemberRoleDropdown
                ?.classList
                .toggle(
                    "open"
                );

        }
    );


teamMemberRoleMenu
    ?.querySelectorAll(
        "button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    const value =
                        button.dataset
                            .value;


                    const label =
                        button.textContent
                            .trim();


                    if (
                        teamMemberRoleInput
                    ) {

                        teamMemberRoleInput.value =
                            value;

                    }


                    if (
                        teamMemberRoleText
                    ) {

                        teamMemberRoleText.textContent =
                            label;

                    }


                    teamMemberRoleMenu
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    teamMemberRoleDropdown
                        ?.classList
                        .remove(
                            "open"
                        );

                }
            );

        }
    );



/* =========================================================
   CREATE TEAM MEMBER
   ========================================================= */

addTeamMemberForm
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const firstName =
                document
                    .getElementById(
                        "teamMemberFirstName"
                    )
                    ?.value
                    .trim()
                ||
                "";


            const lastName =
                document
                    .getElementById(
                        "teamMemberLastName"
                    )
                    ?.value
                    .trim()
                ||
                "";


            const email =
                document
                    .getElementById(
                        "teamMemberEmail"
                    )
                    ?.value
                    .trim()
                ||
                "";


            const phoneNumber =
                document
                    .getElementById(
                        "teamMemberPhone"
                    )
                    ?.value
                    .trim()
                ||
                "";


            const role =
                teamMemberRoleInput
                    ?.value
                ||
                "";


            const temporaryPassword =
                document
                    .getElementById(
                        "teamMemberTemporaryPassword"
                    )
                    ?.value
                ||
                "";



            if (
                !firstName ||
                !lastName ||
                !email ||
                !phoneNumber ||
                !role ||
                !temporaryPassword
            ) {

                if (
                    addTeamMemberMessage
                ) {

                    addTeamMemberMessage.textContent =
                        "Please complete all team member fields.";


                    addTeamMemberMessage
                        .classList
                        .add(
                            "error"
                        );


                    addTeamMemberMessage.hidden =
                        false;

                }


                return;

            }



            if (
                temporaryPassword.length <
                8
            ) {

                if (
                    addTeamMemberMessage
                ) {

                    addTeamMemberMessage.textContent =
                        "Temporary password must be at least 8 characters long.";


                    addTeamMemberMessage
                        .classList
                        .add(
                            "error"
                        );


                    addTeamMemberMessage.hidden =
                        false;

                }


                return;

            }



            try {

                if (
                    createTeamMemberButton
                ) {

                    createTeamMemberButton.disabled =
                        true;


                    createTeamMemberButton.textContent =
                        "Creating...";

                }


                if (
                    addTeamMemberMessage
                ) {

                    addTeamMemberMessage.hidden =
                        true;


                    addTeamMemberMessage
                        .classList
                        .remove(
                            "error"
                        );

                }


                const response =
                    await fetch(
                        "/api/system/users/team",
                        {

                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    firstName,

                                    lastName,

                                    email,

                                    phoneNumber,

                                    role,

                                    temporaryPassword

                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to create team member."
                    );

                }



                /* =============================================
                   REFRESH USER DIRECTORY
                   ============================================= */

                systemUsersGroup =
                    "team";


                systemUsersPage =
                    1;


                document
                    .querySelectorAll(
                        ".system-user-group-button"
                    )
                    .forEach(
                        button => {

                            button.classList.toggle(

                                "active",

                                button.dataset
                                    .userGroup ===
                                    "team"

                            );

                        }
                    );


                await loadSystemUsers();



                /* =============================================
                   SUCCESS
                   ============================================= */

                closeAddTeamMemberModal();

            }

            catch (error) {

                console.error(
                    "Create team member error:",
                    error
                );


                if (
                    addTeamMemberMessage
                ) {

                    addTeamMemberMessage.textContent =
                        error.message ||
                        "Unable to create team member.";


                    addTeamMemberMessage
                        .classList
                        .add(
                            "error"
                        );


                    addTeamMemberMessage.hidden =
                        false;

                }

            }

            finally {

                if (
                    createTeamMemberButton
                ) {

                    createTeamMemberButton.disabled =
                        false;


                    createTeamMemberButton.textContent =
                        "Create Team Member";

                }

            }

        }
    );


/* =========================================================
   SYSTEM PANEL - MANAGE TEAM MEMBER
   ========================================================= */

const manageTeamMemberModal =
    document.getElementById(
        "manageTeamMemberModal"
    );


const manageTeamMemberBackdrop =
    document.getElementById(
        "manageTeamMemberBackdrop"
    );


const closeManageTeamMemberModalButton =
    document.getElementById(
        "closeManageTeamMemberModal"
    );


const cancelManageTeamMemberButton =
    document.getElementById(
        "cancelManageTeamMember"
    );


const manageTeamMemberForm =
    document.getElementById(
        "manageTeamMemberForm"
    );


const manageTeamMemberRoleDropdown =
    document.getElementById(
        "manageTeamMemberRoleDropdown"
    );


const manageTeamMemberRoleTrigger =
    document.getElementById(
        "manageTeamMemberRoleTrigger"
    );


const manageTeamMemberRoleMenu =
    document.getElementById(
        "manageTeamMemberRoleMenu"
    );


const manageTeamMemberRoleText =
    document.getElementById(
        "manageTeamMemberRoleText"
    );


const manageTeamMemberRoleInput =
    document.getElementById(
        "manageTeamMemberRole"
    );


const manageTeamMemberMessage =
    document.getElementById(
        "manageTeamMemberMessage"
    );


const updateTeamMemberRoleButton =
    document.getElementById(
        "updateTeamMemberRoleButton"
    );


const systemSelfRoleNote =
    document.getElementById(
        "systemSelfRoleNote"
    );



/* =========================================================
   ROLE LABEL
   ========================================================= */

function getSystemAccessRoleLabel(
    role
) {

    const labels = {

        admin:
            "System Manager",

        system_admin:
            "System Admin"

    };


    return labels[
        role
    ]
    ||
    role
    ||
    "Unknown";

}



/* =========================================================
   OPEN MANAGE TEAM MEMBER
   ========================================================= */

function openManageTeamMemberModal(
    user
) {

    if (
        !manageTeamMemberModal ||
        !user
    ) {

        return;

    }


    currentManagedTeamMember =
        user;

    const assignedRole =
        user.assignedRole ||
        user.role;


    const fullName =
        `${
            user.firstName ||
            ""
        } ${
            user.lastName ||
            ""
        }`
        .trim()
        ||
        "Team member";


    setReviewText(
        "manageTeamMemberName",
        fullName
    );


    setReviewText(
        "manageTeamMemberEmail",
        user.email
    );


    setReviewText(
        "manageTeamMemberPhone",
        user.phoneNumber
    );


    setReviewText(
        "manageTeamMemberCurrentRole",
        user.roleName
        ||
        getSystemAccessRoleLabel(
            assignedRole
        )
    );


    setReviewText(
        "manageTeamMemberJoined",
        formatReviewDate(
            user.createdAt
        )
    );


    if (
        manageTeamMemberRoleInput
    ) {

        manageTeamMemberRoleInput.value =
            assignedRole;

    }


    if (
        manageTeamMemberRoleText
    ) {

        manageTeamMemberRoleText.textContent =
            getSystemAccessRoleLabel(
                user.role
            );

    }



    manageTeamMemberRoleMenu
        ?.querySelectorAll(
            "button"
        )
        .forEach(
            button => {

                button.classList.toggle(

                    "selected",

                    button.dataset.value ===
                        assignedRole

                );

            }
        );



    const isCurrentUser =
        Boolean(
            user.isCurrentUser
        );


    if (
        manageTeamMemberRoleTrigger
    ) {

        manageTeamMemberRoleTrigger.disabled =
            isCurrentUser;

    }


    if (
        updateTeamMemberRoleButton
    ) {

        updateTeamMemberRoleButton.disabled =
            isCurrentUser;


        updateTeamMemberRoleButton.textContent =
            "Update Access Role";

    }


    if (
        systemSelfRoleNote
    ) {

        systemSelfRoleNote.hidden =
            !isCurrentUser;

    }


    if (
        manageTeamMemberMessage
    ) {

        manageTeamMemberMessage.hidden =
            true;


        manageTeamMemberMessage.textContent =
            "";


        manageTeamMemberMessage
            .classList
            .remove(
                "error"
            );

    }


    manageTeamMemberModal.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";

}



/* =========================================================
   CLOSE MANAGE TEAM MEMBER
   ========================================================= */

function closeManageTeamMemberModal() {

    manageTeamMemberModal
        ?.classList
        .remove(
            "open"
        );


    manageTeamMemberRoleDropdown
        ?.classList
        .remove(
            "open"
        );


    currentManagedTeamMember =
        null;


    document.body.style.overflow =
        "";

}



/* =========================================================
   CLOSE EVENTS
   ========================================================= */

closeManageTeamMemberModalButton
    ?.addEventListener(
        "click",
        closeManageTeamMemberModal
    );


cancelManageTeamMemberButton
    ?.addEventListener(
        "click",
        closeManageTeamMemberModal
    );


manageTeamMemberBackdrop
    ?.addEventListener(
        "click",
        closeManageTeamMemberModal
    );



/* =========================================================
   MANAGE ROLE DROPDOWN
   ========================================================= */

manageTeamMemberRoleTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            if (
                currentManagedTeamMember
                    ?.isCurrentUser
            ) {

                return;

            }


            closeAllAdminCustomSelects(
                manageTeamMemberRoleDropdown
            );


            manageTeamMemberRoleDropdown
                ?.classList
                .toggle(
                    "open"
                );

        }
    );


manageTeamMemberRoleMenu
    ?.querySelectorAll(
        "button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    if (
                        currentManagedTeamMember
                            ?.isCurrentUser
                    ) {

                        return;

                    }


                    const role =
                        button.dataset
                            .value;


                    if (
                        manageTeamMemberRoleInput
                    ) {

                        manageTeamMemberRoleInput.value =
                            role;

                    }


                    if (
                        manageTeamMemberRoleText
                    ) {

                        manageTeamMemberRoleText.textContent =
                            getSystemAccessRoleLabel(
                                role
                            );

                    }


                    manageTeamMemberRoleMenu
                        .querySelectorAll(
                            "button"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    button.classList.add(
                        "selected"
                    );


                    manageTeamMemberRoleDropdown
                        ?.classList
                        .remove(
                            "open"
                        );

                }
            );

        }
    );



/* =========================================================
   UPDATE TEAM MEMBER ROLE
   ========================================================= */

manageTeamMemberForm
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (
                !currentManagedTeamMember
            ) {

                return;

            }


            if (
                currentManagedTeamMember
                    .isCurrentUser
            ) {

                return;

            }


            const selectedRole =
                manageTeamMemberRoleInput
                    ?.value
                ||
                "";


            if (
                !selectedRole
            ) {

                return;

            }



            if (
    selectedRole ===
    (
        currentManagedTeamMember
            .assignedRole
        ||
        currentManagedTeamMember
            .role
    )
) {

                if (
                    manageTeamMemberMessage
                ) {

                    manageTeamMemberMessage.textContent =
                        "Choose a different access role before updating.";


                    manageTeamMemberMessage
                        .classList
                        .add(
                            "error"
                        );


                    manageTeamMemberMessage.hidden =
                        false;

                }


                return;

            }



            try {

                if (
                    updateTeamMemberRoleButton
                ) {

                    updateTeamMemberRoleButton.disabled =
                        true;


                    updateTeamMemberRoleButton.textContent =
                        "Updating...";

                }


                if (
                    manageTeamMemberMessage
                ) {

                    manageTeamMemberMessage.hidden =
                        true;


                    manageTeamMemberMessage
                        .classList
                        .remove(
                            "error"
                        );

                }



                const response =
                    await fetch(
                        `/api/system/users/${currentManagedTeamMember.id}/role`,
                        {

                            method:
                                "PATCH",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    role:
                                        selectedRole

                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to update team member access."
                    );

                }



                closeManageTeamMemberModal();


                await loadSystemUsers();

            }

            catch (error) {

                console.error(
                    "Update team member role error:",
                    error
                );


                if (
                    manageTeamMemberMessage
                ) {

                    manageTeamMemberMessage.textContent =
                        error.message ||
                        "Unable to update team member access.";


                    manageTeamMemberMessage
                        .classList
                        .add(
                            "error"
                        );


                    manageTeamMemberMessage.hidden =
                        false;

                }

            }

            finally {

                if (
                    updateTeamMemberRoleButton
                ) {

                    updateTeamMemberRoleButton.disabled =
                        Boolean(
                            currentManagedTeamMember
                                ?.isCurrentUser
                        );


                    updateTeamMemberRoleButton.textContent =
                        "Update Access Role";

                }

            }

        }
    );


/* =========================================================
   START ADMIN DASHBOARD
   ========================================================= */

verifyAdmin();