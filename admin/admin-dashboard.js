/* =========================================================
   ALTRIUM ADMIN DASHBOARD
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let adminApplications = [];

let currentApplicationStatusFilter =
    "all";

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


        if (
            data.user.role !==
            "admin"
        ) {

            window.location.href =
                "../profile.html";

            return;

        }


        console.log(
            "Admin verified:",
            data.user.email
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


    currentStatusElement.textContent =
        status ||
        "Unknown";


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


    const nextActions = {

        submitted: {
            status:
                "screening",

            label:
                "Move to screening"
        },


        screening: {
            status:
                "shortlisted",

            label:
                "Shortlist candidate"
        },


        shortlisted: {
            status:
                "interview",

            label:
                "Move to interview"
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

                const confirmed =
                    window.confirm(
                        "Reject this application? This action cannot be reversed."
                    );


                if (
                    !confirmed
                ) {

                    return;

                }


                updateManagerApplicationStatus(
                    application.id,
                    "rejected",
                    rejectButton
                );

            }
        );


        actionsContainer.appendChild(
            rejectButton
        );

    }



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

    }

}



/* =========================================================
   APPLICATION DASHBOARD STATS
   ========================================================= */

function updateApplicationStats() {

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
            adminApplications.length;

    }


    if (
        waitingReviewCount
    ) {

        waitingReviewCount.textContent =
            adminApplications.filter(
                application =>
                    application.status ===
                    "submitted"
            ).length;

    }


    if (
        interviewsCount
    ) {

        interviewsCount.textContent =
            adminApplications.filter(
                application =>
                    application.status ===
                    "interview"
            ).length;

    }

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


    const searchInput =
        document.getElementById(
            "adminApplicationSearch"
        );


    if (
        !list
    ) {

        return;

    }


    const searchTerm =
        searchInput
            ?.value
            .trim()
            .toLowerCase() ||
        "";


    let filtered =
        [
            ...adminApplications
        ];


    if (
        currentApplicationStatusFilter !==
        "all"
    ) {

        filtered =
            filtered.filter(
                application =>
                    application.status ===
                    currentApplicationStatusFilter
            );

    }


    if (
        searchTerm
    ) {

        filtered =
            filtered.filter(
                application => {

                    const candidateName =
                        `${
                            application.candidate.firstName ||
                            ""
                        } ${
                            application.candidate.lastName ||
                            ""
                        }`;


                    const searchable =
                        `
                            ${application.reference || ""}
                            ${candidateName}
                            ${application.candidate.email || ""}
                            ${application.job.title || ""}
                            ${application.job.department || ""}
                            ${application.job.location || ""}
                            ${application.status || ""}
                        `
                        .toLowerCase();


                    return searchable.includes(
                        searchTerm
                    );

                }
            );

    }


    if (
        totalCount
    ) {

        totalCount.textContent =
            `${adminApplications.length} ${
                adminApplications.length ===
                1
                    ? "application"
                    : "applications"
            }`;

    }


    if (
        visibleCount
    ) {

        visibleCount.textContent =
            `${filtered.length} ${
                filtered.length ===
                1
                    ? "result"
                    : "results"
            }`;

    }


    list.innerHTML =
        "";


    if (
        filtered.length ===
        0
    ) {

        list.innerHTML = `

            <div class="applications-empty">

                No applications match your current filters.

            </div>

        `;


        return;

    }


    filtered.forEach(
        application => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "admin-application-card";


            const candidateName =
                `${
                    application.candidate.firstName ||
                    ""
                } ${
                    application.candidate.lastName ||
                    ""
                }`
                .trim() ||
                "Candidate";


            card.innerHTML = `

                <div class="admin-application-candidate">

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
                            application.candidate.email ||
                            "No email"
                        )}

                    </p>

                </div>


                <div class="admin-application-job">

                    <span>
                        APPLIED FOR
                    </span>


                    <strong>

                        ${escapeHTML(
                            application.job.title ||
                            "Vacancy"
                        )}

                    </strong>


                    <p>

                        ${escapeHTML(
                            application.job.department ||
                            ""
                        )}

                        •

                        ${escapeHTML(
                            application.job.location ||
                            ""
                        )}

                        •

                        ${escapeHTML(
                            application.job.employmentType ||
                            ""
                        )}

                    </p>

                </div>


                <div class="admin-application-actions">

                    <span
                        class="
                            admin-application-status
                            ${escapeHTML(
                                application.status
                            )}
                        "
                    >

                        ${escapeHTML(
                            application.status
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
                        data-application-id="${application.id}"
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

}



/* =========================================================
   LOAD ADMIN APPLICATIONS
   ========================================================= */

async function loadAdminApplications() {

    const list =
        document.getElementById(
            "adminApplicationsList"
        );


    try {

        const response =
            await fetch(
                "/api/admin/applications",
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


        updateApplicationStats();


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



document
    .getElementById(
        "adminApplicationSearch"
    )
    ?.addEventListener(
        "input",
        renderAdminApplications
    );



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
                        button.dataset.status ||
                        "all";


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


                    renderAdminApplications();

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
   START ADMIN DASHBOARD
   ========================================================= */

verifyAdmin();