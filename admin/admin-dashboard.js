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

        await loadAdminJobs();

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
   CREATE VACANCY MODAL
   ========================================================= */

const createVacancyModal =
    document.getElementById("createVacancyModal");

const openCreateVacancyModalButton =
    document.getElementById("openCreateVacancyModal");

const closeCreateVacancyModalButton =
    document.getElementById("closeCreateVacancyModal");

const cancelCreateVacancyButton =
    document.getElementById("cancelCreateVacancy");

const createVacancyBackdrop =
    document.querySelector(".admin-modal-backdrop");


function openCreateVacancyModal() {

    if (!createVacancyModal) return;

    createVacancyModal.classList.add("open");

    document.body.style.overflow =
        "hidden";
}


function closeCreateVacancyModal() {

    if (!createVacancyModal) return;

    createVacancyModal.classList.remove("open");

    document.body.style.overflow =
        "";
}


if (openCreateVacancyModalButton) {

    openCreateVacancyModalButton.addEventListener(
        "click",
        () => {

            editingJobId = null;

            createJobForm.reset();


            document.getElementById(
                "employmentTypeText"
            ).textContent =
                "Select employment type";


            document.getElementById(
                "employmentType"
            ).value =
                "";


            document.getElementById(
                "deadlineText"
            ).textContent =
                "Select deadline";


            document.getElementById(
                "applicationDeadline"
            ).value =
                "";


            const modalTitle =
                document.querySelector(
                    "#createVacancyModal .admin-modal-header h2"
                );


            if (modalTitle) {
                modalTitle.textContent =
                    "Create job vacancy.";
            }


            const submitButton =
                createJobForm.querySelector(
                    ".admin-create-job-btn"
                );


            if (submitButton) {
                submitButton.textContent =
                    "Create vacancy";
            }


            openCreateVacancyModal();

        }
    );

}


if (closeCreateVacancyModalButton) {

    closeCreateVacancyModalButton.addEventListener(
        "click",
        closeCreateVacancyModal
    );

}


if (cancelCreateVacancyButton) {

    cancelCreateVacancyButton.addEventListener(
        "click",
        closeCreateVacancyModal
    );

}


if (createVacancyBackdrop) {

    createVacancyBackdrop.addEventListener(
        "click",
        closeCreateVacancyModal
    );

}


/* ESC key closes popup */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            createVacancyModal?.classList.contains("open")
        ) {

            closeCreateVacancyModal();

        }

    }
);

/* =========================================================
   EMPLOYMENT TYPE DROPDOWN
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

    employmentDropdownTrigger.addEventListener(
        "click",
        () => {

            employmentDropdown.classList.toggle(
                "open"
            );

        }
    );


    const options =
        employmentDropdown.querySelectorAll(
            ".admin-custom-select-menu button"
        );


    options.forEach(option => {

        option.addEventListener(
            "click",
            () => {

                const value =
                    option.dataset.value;


                employmentType.value =
                    value;


                employmentTypeText.textContent =
                    value;


                options.forEach(item => {
                    item.classList.remove(
                        "selected"
                    );
                });


                option.classList.add(
                    "selected"
                );


                employmentDropdown.classList.remove(
                    "open"
                );

            }
        );

    });

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


function formatDatabaseDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}



function renderDeadlineCalendar() {

    if (!deadlineDays) return;


    deadlineDays.innerHTML = "";


    const year =
        deadlineViewDate.getFullYear();

    const month =
        deadlineViewDate.getMonth();


    deadlineMonthLabel.textContent =
        deadlineViewDate.toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );


    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


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


        if (date < today) {

            button.disabled =
                true;

        }


        if (
            formatDatabaseDate(today) ===
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
            () => {

                deadlineInput.value =
                    databaseDate;


                deadlineText.textContent =
                    date.toLocaleDateString(
                        "en-GB",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    );


                deadlinePicker.classList.remove(
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



if (deadlineTrigger) {

    deadlineTrigger.addEventListener(
        "click",
        () => {

            deadlinePicker.classList.toggle(
                "open"
            );


            renderDeadlineCalendar();

        }
    );

}



if (previousDeadlineMonth) {

    previousDeadlineMonth.addEventListener(
        "click",
        () => {

            deadlineViewDate.setMonth(
                deadlineViewDate.getMonth() - 1
            );


            renderDeadlineCalendar();

        }
    );

}



if (nextDeadlineMonth) {

    nextDeadlineMonth.addEventListener(
        "click",
        () => {

            deadlineViewDate.setMonth(
                deadlineViewDate.getMonth() + 1
            );


            renderDeadlineCalendar();

        }
    );

}



/* CLOSE CUSTOM MENUS WHEN CLICKING OUTSIDE */

document.addEventListener(
    "click",
    event => {

        if (
            employmentDropdown &&
            !employmentDropdown.contains(
                event.target
            )
        ) {

            employmentDropdown.classList.remove(
                "open"
            );

        }


        if (
            deadlinePicker &&
            !deadlinePicker.contains(
                event.target
            )
        ) {

            deadlinePicker.classList.remove(
                "open"
            );

        }

    }
);


renderDeadlineCalendar();

/* =========================================================
   CREATE JOB VACANCY
   ========================================================= */

const createJobForm =
    document.getElementById("createJobForm");


if (createJobForm) {

    createJobForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            console.log("CREATE VACANCY BUTTON WORKING");


            /* ---------------------------------------------
               Get form values
            --------------------------------------------- */

            const jobTitle =
                document.getElementById("jobTitle")
                    .value.trim();

            const department =
                document.getElementById("jobDepartment")
                    .value.trim();

            const location =
                document.getElementById("jobLocation")
                    .value.trim();

            const employmentType =
                document.getElementById("employmentType")
                    .value;

            const salary =
                document.getElementById("jobSalary")
                    .value.trim();

            const applicationDeadline =
                document.getElementById("applicationDeadline")
                    .value;

            const experienceRequired =
                document.getElementById("experienceRequired")
                    .value.trim();

            const educationRequired =
                document.getElementById("educationRequired")
                    .value.trim();

            const description =
                document.getElementById("jobDescription")
                    .value.trim();

            const responsibilities =
                document.getElementById("jobResponsibilities")
                    .value.trim();

            const requiredSkills =
                document.getElementById("jobSkills")
                    .value.trim();

            const numberOfOpenings =
                document.getElementById("numberOfOpenings")
                    .value;


            /* ---------------------------------------------
               Basic validation
            --------------------------------------------- */

            if (
                !jobTitle ||
                !department ||
                !location ||
                !employmentType ||
                !description
            ) {

                console.error(
                    "Please complete all required fields."
                );

                return;
            }


            const submitButton =
                createJobForm.querySelector(
                    ".admin-create-job-btn"
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.textContent =
                    editingJobId !== null
                        ? "Saving changes..."
                        : "Creating vacancy...";

            }


            try {

                /* -----------------------------------------
                   Send to Node backend
                ----------------------------------------- */

                const isEditing =
                    editingJobId !== null;


                const endpoint =
                    isEditing
                        ? `/api/admin/jobs/${editingJobId}`
                        : "/api/admin/jobs";


                const method =
                    isEditing
                        ? "PATCH"
                        : "POST";


                const response = await fetch(
                    endpoint,
                    {
                        method: method,

                        credentials: "same-origin",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            jobTitle,
                            department,
                            location,
                            employmentType,
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


                /* -----------------------------------------
                   Backend rejected request
                ----------------------------------------- */

                if (
                    !response.ok ||
                    !data.success
                ) {

                    console.error(
                        data.message ||
                        "Unable to create vacancy."
                    );

                    return;
                }


                console.log(
                    isEditing
                        ? "Vacancy updated:"
                        : "Vacancy created:",
                    data.job
                );

                await loadAdminJobs();

                editingJobId = null;


                /* -----------------------------------------
                   Reset form
                ----------------------------------------- */

                createJobForm.reset();


                document.getElementById(
                    "employmentTypeText"
                ).textContent =
                    "Select employment type";


                document.getElementById(
                    "employmentType"
                ).value =
                    "";


                document.getElementById(
                    "deadlineText"
                ).textContent =
                    "Select deadline";


                document.getElementById(
                    "applicationDeadline"
                ).value =
                    "";


                /* -----------------------------------------
                   Close popup
                ----------------------------------------- */

                closeCreateVacancyModal();


            }

            catch (error) {

                console.error(
                    "Create vacancy error:",
                    error
                );

            }

            finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Create vacancy";

                }

            }

            const modalTitle =
                document.querySelector(
                    "#createVacancyModal .admin-modal-header h2"
                );

            if (modalTitle) {
                modalTitle.textContent =
                    "Create job vacancy.";
            }


            if (submitButton) {
                submitButton.textContent =
                    "Create vacancy";
            }

        }
    );

}

/* =========================================================
   LOAD ADMIN JOB VACANCIES
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatPostedDate(dateValue) {

    if (!dateValue) return "Unknown";


    const date =
        new Date(dateValue);


    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}



function formatDeadline(dateValue) {

    if (!dateValue) {
        return "Not specified";
    }


    const value =
        String(dateValue);


    const match =
        value.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (!match) {
        return "Not specified";
    }


    const date =
        new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


async function loadAdminJobs() {

    const vacancyList =
        document.getElementById("vacancyList");

    const vacancyCount =
        document.getElementById("vacancyCount");


    if (!vacancyList || !vacancyCount) {
        return;
    }


    try {

        const response = await fetch(
            "/api/admin/jobs",
            {
                method: "GET",
                credentials: "same-origin"
            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            console.error(
                data.message ||
                "Unable to load vacancies."
            );

            return;
        }


        const jobs =
            data.jobs || [];

        const activeVacancies =
            jobs.filter(
                job => job.status === "active"
            ).length;


        const activeVacanciesCount =
            document.getElementById(
                "activeVacanciesCount"
            );


        if (activeVacanciesCount) {

            activeVacanciesCount.textContent =
                activeVacancies;

        }

        /* ---------------------------------------------
           Update vacancy count
        --------------------------------------------- */

        vacancyCount.textContent =
            `${jobs.length} ${
                jobs.length === 1
                    ? "vacancy"
                    : "vacancies"
            }`;


        vacancyList.innerHTML = "";


        /* ---------------------------------------------
           No vacancies
        --------------------------------------------- */

        if (jobs.length === 0) {

            vacancyList.innerHTML = `
                <div class="vacancy-empty-state">
                    <p>
                        No job vacancies have been created yet.
                    </p>
                </div>
            `;

            return;
        }


        /* ---------------------------------------------
           Render vacancies
        --------------------------------------------- */

        jobs.forEach(job => {

            const openings =
                Number(job.number_of_openings) || 1;


            const card =
                document.createElement("details");

            const creatorName =
                `${job.creator_first_name || ""} ${job.creator_last_name || ""}`.trim()
                || "Unknown admin";

            card.className =
                "vacancy-card";


            card.innerHTML = `

                <summary class="vacancy-summary">

                    <div class="vacancy-summary-main">

                        <div class="vacancy-title-row">

                            <h3>
                                ${escapeHTML(job.job_title)}
                            </h3>

                            <span class="vacancy-status ${escapeHTML(job.status)}">
                                ${escapeHTML(job.status)}
                            </span>

                        </div>


                        <div class="vacancy-meta">

                            <span>
                                ${escapeHTML(job.department)}
                            </span>

                            <span>•</span>

                            <span>
                                ${escapeHTML(job.location)}
                            </span>

                            <span>•</span>

                            <span>
                                ${escapeHTML(job.employment_type)}
                            </span>

                        </div>


                        <div class="vacancy-summary-bottom">

                            <span>
                                Posted ${formatPostedDate(job.created_at)}
                            </span>

                            <span class="vacancy-meta-dot">
                                •
                            </span>

                            <span>
                                ${openings}
                                ${openings === 1 ? "opening" : "openings"}
                            </span>

                            <span class="vacancy-meta-dot">
                                •
                            </span>

                            <span>
                                Created by ${escapeHTML(creatorName)}
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
                            <span>Salary</span>

                            <strong>
                                ${escapeHTML(job.salary || "Not specified")}
                            </strong>
                        </div>


                        <div>
                            <span>Application deadline</span>

                            <strong>
                                ${formatDeadline(job.application_deadline)}
                            </strong>
                        </div>


                        <div>
                            <span>Experience required</span>

                            <strong>
                                ${escapeHTML(
                                    job.experience_required ||
                                    "Not specified"
                                )}
                            </strong>
                        </div>


                        <div>
                            <span>Education required</span>

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
                            ${escapeHTML(job.description)}
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


            vacancyList.appendChild(card);

            const statusButton =
                card.querySelector(
                    ".close-vacancy-button, .reopen-vacancy-button"
                );


            if (statusButton) {

                statusButton.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();


                        const newStatus =
                            job.status === "closed"
                                ? "active"
                                : "closed";


                        openJobStatusModal(
                            job.id,
                            job.job_title,
                            newStatus
                        );

                    }
                );

            }

            const editButton =
                card.querySelector(
                    ".edit-vacancy-button"
                );


            if (editButton) {

                editButton.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();
                        event.stopPropagation();

                        openEditVacancyModal(job);

                    }
                );

            }

        });

    }

    catch (error) {

        console.error(
            "Load vacancies error:",
            error
        );

    }

}

/* =========================================================
   CLOSE / REOPEN JOB VACANCY
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


let selectedJobForStatus = null;

let selectedJobNewStatus = null;

let editingJobId = null;


/* =========================================================
   OPEN CLOSE / REOPEN CONFIRMATION
   ========================================================= */

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


    /* ---------------------------------------------
       REOPEN VACANCY
    --------------------------------------------- */

    if (newStatus === "active") {

        if (modalLabel) {
            modalLabel.textContent =
                "REOPEN VACANCY";
        }


        if (modalTitle) {
            modalTitle.textContent =
                "Reopen this position?";
        }


        if (message) {

            message.textContent =
                `"${jobTitle}" will become active again and candidates will be able to apply.`;

        }


        if (confirmCloseVacancy) {

            confirmCloseVacancy.textContent =
                "Reopen vacancy";

            confirmCloseVacancy.classList.add(
                "reopen-confirm"
            );

        }

    }

    /* ---------------------------------------------
       CLOSE VACANCY
    --------------------------------------------- */

    else {

        if (modalLabel) {
            modalLabel.textContent =
                "CLOSE VACANCY";
        }


        if (modalTitle) {
            modalTitle.textContent =
                "Close this position?";
        }


        if (message) {

            message.textContent =
                `"${jobTitle}" will be marked as closed and candidates will no longer be able to apply.`;

        }


        if (confirmCloseVacancy) {

            confirmCloseVacancy.textContent =
                "Close vacancy";

            confirmCloseVacancy.classList.remove(
                "reopen-confirm"
            );

        }

    }


    /* ---------------------------------------------
       SHOW MODAL
    --------------------------------------------- */

    if (closeVacancyModal) {

        closeVacancyModal.classList.add(
            "open"
        );

    }


    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   CLOSE CONFIRMATION MODAL
   ========================================================= */

function closeCloseVacancyModal() {

    selectedJobForStatus = null;

    selectedJobNewStatus = null;


    if (closeVacancyModal) {

        closeVacancyModal.classList.remove(
            "open"
        );

    }


    document.body.style.overflow =
        "";
}


/* =========================================================
   CANCEL BUTTON
   ========================================================= */

if (cancelCloseVacancy) {

    cancelCloseVacancy.addEventListener(
        "click",
        closeCloseVacancyModal
    );

}


/* =========================================================
   CLICK BACKDROP
   ========================================================= */

if (closeVacancyBackdrop) {

    closeVacancyBackdrop.addEventListener(
        "click",
        closeCloseVacancyModal
    );

}


/* =========================================================
   CONFIRM STATUS CHANGE
   ========================================================= */

if (confirmCloseVacancy) {

    confirmCloseVacancy.addEventListener(
        "click",
        async () => {

            if (
                !selectedJobForStatus ||
                !selectedJobNewStatus
            ) {

                return;

            }


            /*
             * Save these before closing/resetting
             * the modal variables.
             */

            const jobId =
                selectedJobForStatus;

            const newStatus =
                selectedJobNewStatus;


            try {

                confirmCloseVacancy.disabled =
                    true;


                confirmCloseVacancy.textContent =
                    newStatus === "active"
                        ? "Reopening..."
                        : "Closing...";


                const response =
                    await fetch(
                        `/api/admin/jobs/${jobId}/status`,
                        {
                            method: "PATCH",

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

                    console.error(
                        data.message ||
                        "Unable to update vacancy status."
                    );


                    /*
                     * Restore correct button text
                     * if request failed.
                     */

                    confirmCloseVacancy.textContent =
                        newStatus === "active"
                            ? "Reopen vacancy"
                            : "Close vacancy";


                    return;

                }


                /* -----------------------------------------
                   Close popup
                ----------------------------------------- */

                closeCloseVacancyModal();


                /* -----------------------------------------
                   Reload jobs from database
                ----------------------------------------- */

                await loadAdminJobs();

            }

            catch (error) {

                console.error(
                    "Update vacancy status error:",
                    error
                );


                confirmCloseVacancy.textContent =
                    newStatus === "active"
                        ? "Reopen vacancy"
                        : "Close vacancy";

            }

            finally {

                confirmCloseVacancy.disabled =
                    false;

            }

        }
    );

}


function openEditVacancyModal(job) {

    editingJobId = job.id;


    // Basic information

    document.getElementById("jobTitle").value =
        job.job_title || "";

    document.getElementById("jobDepartment").value =
        job.department || "";

    document.getElementById("jobLocation").value =
        job.location || "";

    document.getElementById("jobSalary").value =
        job.salary || "";

    document.getElementById("numberOfOpenings").value =
        job.number_of_openings || 1;


    // Employment type

    document.getElementById("employmentType").value =
        job.employment_type || "";

    document.getElementById("employmentTypeText").textContent =
        job.employment_type || "Select employment type";


    // Requirements

    document.getElementById("experienceRequired").value =
        job.experience_required || "";

    document.getElementById("educationRequired").value =
        job.education_required || "";

    document.getElementById("jobSkills").value =
        job.required_skills || "";


    // Job details

    document.getElementById("jobDescription").value =
        job.description || "";

    document.getElementById("jobResponsibilities").value =
        job.responsibilities || "";


    // Deadline

    if (job.application_deadline) {

        const deadline =
            new Date(job.application_deadline);


        const year =
            deadline.getFullYear();

        const month =
            String(deadline.getMonth() + 1)
                .padStart(2, "0");

        const day =
            String(deadline.getDate())
                .padStart(2, "0");


        document.getElementById("applicationDeadline").value =
            `${year}-${month}-${day}`;


        document.getElementById("deadlineText").textContent =
            deadline.toLocaleDateString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );

    } else {

        document.getElementById("applicationDeadline").value =
            "";

        document.getElementById("deadlineText").textContent =
            "Select deadline";
    }


    // Change popup heading

    const modalTitle =
        document.querySelector(
            "#createVacancyModal .admin-modal-header h2"
        );

    if (modalTitle) {
        modalTitle.textContent =
            "Edit job vacancy.";
    }


    // Change submit button

    const submitButton =
        createJobForm.querySelector(
            ".admin-create-job-btn"
        );

    if (submitButton) {
        submitButton.textContent =
            "Save changes";
    }


    openCreateVacancyModal();
}


/* =========================================================
   START ADMIN DASHBOARD
   ========================================================= */

verifyAdmin();
