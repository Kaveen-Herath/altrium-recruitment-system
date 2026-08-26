/* =========================================================
   ALTRIUM JOBS PAGE
   ========================================================= */


/* =========================================================
   PAGE STATE
   ========================================================= */

let allJobs = [];

let currentSort = "latest";

let savedJobIds = new Set();

let selectedJobDetails = null;

let selectedApplicationJob = null;

let currentCandidateId = null;

let appliedJobs =
    new Map();



/* =========================================================
   MAIN PAGE ELEMENTS
   ========================================================= */

const jobsList =
    document.getElementById("jobsList");

const jobResultsCount =
    document.getElementById("jobResultsCount");

const jobSearchInput =
    document.getElementById("jobSearchInput");

const searchJobsButton =
    document.getElementById("searchJobsButton");

const jobTitleFilter =
    document.getElementById("jobTitleFilter");

const jobLocationFilter =
    document.getElementById("jobLocationFilter");

const jobPositionFilter =
    document.getElementById("jobPositionFilter");

const jobSalaryFilter =
    document.getElementById("jobSalaryFilter");

const clearJobFilters =
    document.getElementById("clearJobFilters");

const jobSort =
    document.getElementById("jobSort");



/* =========================================================
   JOB DETAILS MODAL ELEMENTS
   ========================================================= */

const jobDetailsModal =
    document.getElementById(
        "jobDetailsModal"
    );

const jobDetailsBackdrop =
    document.getElementById(
        "jobDetailsBackdrop"
    );

const closeJobDetailsModalButton =
    document.getElementById(
        "closeJobDetailsModal"
    );

const jobDetailsSaveButton =
    document.getElementById(
        "jobDetailsSaveButton"
    );

const jobDetailsApplyButton =
    document.getElementById(
        "jobDetailsApplyButton"
    );



/* =========================================================
   APPLICATION MODAL ELEMENTS
   ========================================================= */

const applicationModal =
    document.getElementById(
        "applicationModal"
    );

const applicationModalBackdrop =
    document.getElementById(
        "applicationModalBackdrop"
    );

const closeApplicationModalButton =
    document.getElementById(
        "closeApplicationModal"
    );

const cancelApplicationButton =
    document.getElementById(
        "cancelApplicationButton"
    );

const applicationJobTitle =
    document.getElementById(
        "applicationJobTitle"
    );

const applicationJobMeta =
    document.getElementById(
        "applicationJobMeta"
    );

const applicationPreferredJobType =
    document.getElementById(
        "applicationPreferredJobType"
    );

const applicationCv =
    document.getElementById(
        "applicationCv"
    );

const applicationFileSelected =
    document.getElementById(
        "applicationFileSelected"
    );


// APPLICATION DATE PICKERS

const applicationDatePicker =
    document.getElementById(
        "applicationDatePicker"
    );

const applicationDateTrigger =
    document.getElementById(
        "applicationDateTrigger"
    );

const applicationDateText =
    document.getElementById(
        "applicationDateText"
    );

const applicationDateOfBirth =
    document.getElementById(
        "applicationDateOfBirth"
    );

const applicationCalendarMonth =
    document.getElementById(
        "applicationCalendarMonth"
    );

const applicationCalendarDays =
    document.getElementById(
        "applicationCalendarDays"
    );

const applicationCalendarPrev =
    document.getElementById(
        "applicationCalendarPrev"
    );

const applicationCalendarNext =
    document.getElementById(
        "applicationCalendarNext"
    );

const applicationCalendarPrevYear =
    document.getElementById(
        "applicationCalendarPrevYear"
    );

const applicationCalendarNextYear =
    document.getElementById(
        "applicationCalendarNextYear"
    );

const applicationCalendarClear =
    document.getElementById(
        "applicationCalendarClear"
    );


let applicationCalendarDate =
    new Date();


// REVIEW APPLICATIONS ======================

const jobApplicationForm =
    document.getElementById(
        "jobApplicationForm"
    );

const reviewApplicationButton =
    document.getElementById(
        "reviewApplicationButton"
    );

const applicationReview =
    document.getElementById(
        "applicationReview"
    );

const backToApplicationButton =
    document.getElementById(
        "backToApplicationButton"
    );

const submitApplicationButton =
    document.getElementById(
        "submitApplicationButton"
    );

const applicationSuccess =
    document.getElementById(
        "applicationSuccess"
    );

const applicationSuccessJobTitle =
    document.getElementById(
        "applicationSuccessJobTitle"
    );

const applicationSuccessReference =
    document.getElementById(
        "applicationSuccessReference"
    );

const applicationSuccessClose =
    document.getElementById(
        "applicationSuccessClose"
    );

const applicationViewProgress =
    document.getElementById(
        "applicationViewProgress"
    );


/* =========================================================
   APPLICATION DATE PICKER
   ========================================================= */

function renderApplicationCalendar() {

    if (
        !applicationCalendarMonth ||
        !applicationCalendarDays
    ) {
        return;
    }


    const year =
        applicationCalendarDate.getFullYear();

    const month =
        applicationCalendarDate.getMonth();


    applicationCalendarMonth.textContent =
        applicationCalendarDate
            .toLocaleDateString(
                "en-GB",
                {
                    month: "long",
                    year: "numeric"
                }
            );


    applicationCalendarDays.innerHTML =
        "";


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
            "application-calendar-empty";

        applicationCalendarDays
            .appendChild(
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

        button.className =
            "application-calendar-day";

        button.textContent =
            day;


        /* DOB CANNOT BE IN THE FUTURE */

        if (
            date > today
        ) {

            button.disabled =
                true;

            button.classList.add(
                "disabled"
            );

        }


        if (
            date.getTime() ===
            today.getTime()
        ) {

            button.classList.add(
                "today"
            );

        }


        const selectedValue =
            applicationDateOfBirth
                ?.value;


        const dateValue =
            [
                year,
                String(
                    month + 1
                ).padStart(
                    2,
                    "0"
                ),
                String(day).padStart(
                    2,
                    "0"
                )
            ].join("-");


        if (
            selectedValue ===
            dateValue
        ) {

            button.classList.add(
                "selected"
            );

        }


        button.addEventListener(
            "click",
            () => {

                if (
                    button.disabled
                ) {
                    return;
                }


                applicationDateOfBirth.value =
                    dateValue;


                applicationDateText.textContent =
                    date.toLocaleDateString(
                        "en-GB",
                        {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                        }
                    );


                /* Save DOB in application draft */

                saveApplicationDraft();


                applicationDatePicker
                    .classList
                    .remove(
                        "open"
                    );

                renderApplicationCalendar();

            }
        );


        applicationCalendarDays
            .appendChild(
                button
            );

    }

}


/* =========================================================
   ESCAPE DYNAMIC HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}



/* =========================================================
   COMMON ALTRIUM DROPDOWNS
   ========================================================= */

const altriumDropdowns =
    document.querySelectorAll(
        "[data-dropdown]"
    );


altriumDropdowns.forEach(
    dropdown => {

        const trigger =
            dropdown.querySelector(
                "[data-dropdown-trigger]"
            );


        const text =
            dropdown.querySelector(
                "[data-dropdown-text]"
            );


        const valueInput =
            dropdown.querySelector(
                "[data-dropdown-value]"
            );


        const options =
            dropdown.querySelectorAll(
                "[data-dropdown-option]"
            );


        /* OPEN / CLOSE */

        trigger?.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                altriumDropdowns.forEach(
                    otherDropdown => {

                        if (
                            otherDropdown !==
                            dropdown
                        ) {

                            otherDropdown
                                .classList
                                .remove("open");

                        }

                    }
                );


                dropdown.classList.toggle(
                    "open"
                );

            }
        );


        /* SELECT OPTION */

        options.forEach(
            option => {

                option.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const value =
                            option.dataset.value ?? "";


                        if (valueInput) {

                            valueInput.value =
                                value;

                        }


                        if (text) {

                            text.textContent =
                                option.textContent.trim();

                        }


                        options.forEach(
                            item => {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                        option.classList.add(
                            "selected"
                        );


                        dropdown.classList.remove(
                            "open"
                        );


                        /*
                            Notify any listeners
                            that the dropdown changed.
                        */

                        valueInput?.dispatchEvent(
                            new Event(
                                "change",
                                {
                                    bubbles: true
                                }
                            )
                        );

                    }
                );

            }
        );

    }
);


reviewApplicationButton
    ?.addEventListener(
        "click",
        openApplicationReview
    );


backToApplicationButton
    ?.addEventListener(
        "click",
        backToApplicationForm
    );


/* =========================================================
   CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener(
    "click",
    () => {

        altriumDropdowns.forEach(
            dropdown => {

                dropdown.classList.remove(
                    "open"
                );

            }
        );

    }
);



applicationDateTrigger
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            applicationDatePicker
                ?.classList
                .toggle(
                    "open"
                );


            renderApplicationCalendar();

        }
    );


applicationCalendarPrev
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            applicationCalendarDate
                .setMonth(
                    applicationCalendarDate
                        .getMonth() - 1
                );


            renderApplicationCalendar();

        }
    );


applicationCalendarNext
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            applicationCalendarDate
                .setMonth(
                    applicationCalendarDate
                        .getMonth() + 1
                );


            renderApplicationCalendar();

        }
    );


applicationCalendarPrevYear
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            applicationCalendarDate
                .setFullYear(
                    applicationCalendarDate
                        .getFullYear() - 1
                );


            renderApplicationCalendar();

        }
    );


applicationCalendarNextYear
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            applicationCalendarDate
                .setFullYear(
                    applicationCalendarDate
                        .getFullYear() + 1
                );


            renderApplicationCalendar();

        }
    );


applicationCalendarClear
    ?.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            applicationDateOfBirth.value =
                "";


            applicationDateText.textContent =
                "Select date of birth";


            /* Save cleared DOB */

            saveApplicationDraft();


            applicationDatePicker
                ?.classList
                .remove(
                    "open"
                );

        }
    );


document.addEventListener(
    "click",
    event => {

        if (
            applicationDatePicker &&
            !applicationDatePicker.contains(
                event.target
            )
        ) {

            applicationDatePicker
                .classList
                .remove(
                    "open"
                );

        }

    }
);


/* =========================================================
   SUBMIT APPLICATION
   ========================================================= */

submitApplicationButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                !selectedApplicationJob
            ) {

                return;

            }


            const cvFile =
                applicationCv
                    ?.files[0];


            if (!cvFile) {

                console.error(
                    "CV file is missing."
                );

                return;

            }


            /* =================================================
               COLLECT LANGUAGES
               ================================================= */

            const preferredLanguages =
                Array.from(
                    document.querySelectorAll(
                        'input[name="preferredLanguages"]:checked'
                    )
                )
                .map(
                    checkbox =>
                        checkbox.value
                );



            /* =================================================
               BUILD FORMDATA
               ================================================= */

            const formData =
                new FormData();


            formData.append(
                "firstName",
                document.getElementById(
                    "applicationFirstName"
                ).value.trim()
            );


            formData.append(
                "lastName",
                document.getElementById(
                    "applicationLastName"
                ).value.trim()
            );


            formData.append(
                "phoneNumber",
                document.getElementById(
                    "applicationPhone"
                ).value.trim()
            );


            formData.append(
                "nic",
                document.getElementById(
                    "applicationNic"
                ).value.trim()
            );


            formData.append(
                "dateOfBirth",
                applicationDateOfBirth.value
            );


            formData.append(
                "country",
                document.getElementById(
                    "applicationCountry"
                ).value.trim()
            );


            formData.append(
                "education",
                document.getElementById(
                    "applicationEducation"
                ).value.trim()
            );


            formData.append(
                "linkedinUrl",
                document.getElementById(
                    "applicationLinkedin"
                ).value.trim()
            );


            formData.append(
                "skills",
                document.getElementById(
                    "applicationSkills"
                ).value.trim()
            );


            formData.append(
                "workExperience",
                document.getElementById(
                    "applicationWorkExperience"
                ).value.trim()
            );


            formData.append(
                "projects",
                document.getElementById(
                    "applicationProjects"
                ).value.trim()
            );


            formData.append(
                "preferredJobType",
                applicationPreferredJobType.value
            );


            formData.append(
                "preferredLanguages",
                JSON.stringify(
                    preferredLanguages
                )
            );


            formData.append(
                "consent",
                document.getElementById(
                    "applicationConsent"
                )?.checked
                    ? "true"
                    : "false"
            );


            formData.append(
                "cv",
                cvFile
            );



            /* =================================================
               SUBMIT
               ================================================= */

            const originalText =
                submitApplicationButton
                    .innerHTML;


            submitApplicationButton.disabled =
                true;


            submitApplicationButton.innerHTML =
                "Submitting application...";


            try {

                const response =
                    await fetch(
                        `/api/applications/${selectedApplicationJob.id}`,
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            body:
                                formData
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    console.error(
                        "Application submission failed:",
                        data.message
                    );


                    submitApplicationButton.disabled =
                        false;


                    submitApplicationButton.innerHTML =
                        originalText;


                    return;

                }



                /* =================================================
                   SUCCESS
                   ================================================= */

                console.log(
                    "Application submitted:",
                    data.application
                );


                /* Delete temporary draft only
                after successful submission */

                clearApplicationDraft(
                    selectedApplicationJob.id
                );


                showApplicationSuccess(
                    data.application
                );

                /* Refresh navbar bell immediately */

                window
                    .refreshNavbarNotifications
                    ?.();


                /*
                    Remove ?apply=JOB_ID from URL
                    so refreshing doesn't restart
                    the application flow.
                */

                window.history.replaceState(
                    {},
                    "",
                    "jobs.html"
                );


                /*
                    Keep this application available
                    temporarily for the success screen
                    we build next.
                */

                selectedApplicationJob =
                    {
                        ...selectedApplicationJob,

                        applicationId:
                            data.application.id,

                        applicationReference:
                            data.application.reference,

                        applicationStatus:
                            data.application.status
                    };

            }

            catch (error) {

                console.error(
                    "Submit application error:",
                    error
                );


                submitApplicationButton.disabled =
                    false;


                submitApplicationButton.innerHTML =
                    originalText;

            }

        }
    );


applicationSuccessClose
    ?.addEventListener(
        "click",
        closeApplicationForm
    );


applicationViewProgress
    ?.addEventListener(
        "click",
        () => {

            const applicationId =
                applicationViewProgress
                    .dataset
                    .applicationId;


            if (!applicationId) {
                return;
            }


            window.location.href =
                `application-progress.html?id=${applicationId}`;

        }
    );


/* =========================================================
   FORMAT POSTED DATE
   ========================================================= */

function formatPostedDate(
    dateValue
) {

    if (!dateValue) {

        return "Unknown";

    }


    const date =
        new Date(dateValue);


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
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}



/* =========================================================
   FORMAT DEADLINE
   ========================================================= */

function formatDeadline(
    dateValue
) {

    if (!dateValue) {

        return "No deadline specified";

    }


    const value =
        String(dateValue);


    const match =
        value.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (!match) {

        return "No deadline specified";

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



/* =========================================================
   SALARY NUMBER
   ========================================================= */

function getSalaryNumber(
    salaryValue
) {

    if (!salaryValue) {

        return 0;

    }


    const matches =
        String(salaryValue)
            .replaceAll(",", "")
            .match(/\d+/g);


    if (
        !matches ||
        matches.length === 0
    ) {

        return 0;

    }


    return Number(
        matches[0]
    ) || 0;

}



/* =========================================================
   DESCRIPTION PREVIEW
   ========================================================= */

function createDescriptionPreview(
    description
) {

    const text =
        String(
            description || ""
        ).trim();


    if (!text) {

        return "No description provided.";

    }


    if (
        text.length <= 180
    ) {

        return text;

    }


    return (
        text
            .slice(
                0,
                180
            )
            .trim()
        +
        "..."
    );

}



/* =========================================================
   SKILL CHIPS
   ========================================================= */

function createSkillChips(
    requiredSkills
) {

    if (!requiredSkills) {

        return "";

    }


    const skills =
        String(requiredSkills)
            .split(",")
            .map(
                skill =>
                    skill.trim()
            )
            .filter(Boolean)
            .slice(
                0,
                5
            );


    if (
        skills.length === 0
    ) {

        return "";

    }


    return `

        <div class="jobs-card-skills">

            ${
                skills
                    .map(
                        skill => `

                            <span>
                                ${escapeHTML(skill)}
                            </span>

                        `
                    )
                    .join("")
            }

        </div>

    `;

}



/* =========================================================
   SAVE ICON
   ========================================================= */

function createSaveIcon() {

    return `

        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >

            <path
                d="
                    M6.75 4.75
                    C6.75 3.78 7.53 3 8.5 3
                    H15.5
                    C16.47 3 17.25 3.78 17.25 4.75
                    V21
                    L12 17.55
                    L6.75 21
                    V4.75
                    Z
                "
            ></path>

        </svg>

    `;

}



/* =========================================================
   CREATE JOB CARD
   ========================================================= */

function createJobCard(job) {

    const card =
        document.createElement(
            "article"
        );


    const isClosed =
        job.status === "closed";


    const isSaved =
        savedJobIds.has(
            String(job.id)
        );

    const existingApplication =
        appliedJobs.get(
            String(job.id)
        );


    const isApplied =
        Boolean(
            existingApplication
        );

    const openings =
        Number(
            job.number_of_openings
        ) || 1;


    card.className =
        `jobs-result-card ${
            isClosed
                ? "closed"
                : ""
        } ${
            isApplied
                ? "applied"
                : ""
        }`;

    const disableViewButton =
        isClosed &&
        !isApplied;


    card.innerHTML = `

        <div class="jobs-card-top">

            <div class="jobs-card-main">

                <div class="jobs-card-topline">

                    <span
                        class="
                            jobs-card-status
                            ${
                                isClosed
                                    ? "closed"
                                    : "active"
                            }
                        "
                    >
                        ${
                            isClosed
                                ? "CLOSED"
                                : "ACTIVE"
                        }
                    </span>


                    ${
                        isApplied
                            ? `
                                <span class="jobs-card-applied">
                                    APPLIED
                                </span>
                            `
                            : ""
                    }


                    <span class="jobs-card-department">
                        ${escapeHTML(job.department)}
                    </span>

                </div>


                <h3>

                    ${
                        escapeHTML(
                            job.job_title
                        )
                    }

                </h3>

            </div>



            <!-- SAVE JOB -->

            <button
                type="button"
                class="
                    jobs-save-button
                    ${
                        isSaved
                            ? "saved"
                            : ""
                    }
                "
                data-job-id="${job.id}"

                aria-label="${
                    isSaved
                        ? "Remove saved job"
                        : "Save job"
                }"

                title="${
                    isSaved
                        ? "Remove saved job"
                        : "Save job"
                }"
            >

                ${createSaveIcon()}

            </button>

        </div>



        <div class="jobs-card-meta">

            <span>
                ${
                    escapeHTML(
                        job.location
                    )
                }
            </span>


            <span class="jobs-card-dot">
                •
            </span>


            <span>
                ${
                    escapeHTML(
                        job.employment_type
                    )
                }
            </span>


            <span class="jobs-card-dot">
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

        </div>



        <div class="jobs-card-salary">

            ${
                escapeHTML(
                    job.salary ||
                    "Salary not specified"
                )
            }

        </div>



        <div class="jobs-card-deadline">

            <span>
                Deadline
            </span>


            <strong>

                ${
                    formatDeadline(
                        job.application_deadline
                    )
                }

            </strong>

        </div>



        <div class="jobs-card-footer">

            <span class="jobs-card-posted">

                Posted ${
                    formatPostedDate(
                        job.created_at
                    )
                }

            </span>


            <button
                type="button"

                class="
                    jobs-view-button
                    ${
                        disableViewButton
                            ? "disabled"
                            : ""
                    }
                "

                data-job-id="${job.id}"

                ${
                    disableViewButton
                        ? "disabled"
                        : ""
                }
            >

                ${
                    isApplied
                        ? "View application"
                        : isClosed
                            ? "Closed"
                            : "View vacancy"
                }

            </button>

        </div>

    `;


    return card;

}



/* =========================================================
   RENDER JOBS
   ========================================================= */

function renderJobs(jobs) {

    if (
        !jobsList ||
        !jobResultsCount
    ) {

        return;

    }


    jobsList.innerHTML =
        "";


    jobResultsCount.textContent =
        `${jobs.length} ${
            jobs.length === 1
                ? "opportunity"
                : "opportunities"
        }`;


    /* NO RESULTS */

    if (
        jobs.length === 0
    ) {

        jobsList.innerHTML = `

            <div class="jobs-empty">

                <strong>
                    No vacancies found.
                </strong>

                <p>
                    Try changing your search
                    or filters.
                </p>

            </div>

        `;


        return;

    }


    jobs.forEach(
        job => {

            const card =
                createJobCard(
                    job
                );


            jobsList.appendChild(
                card
            );

        }
    );


    attachJobCardEvents();

}



/* =========================================================
   FILTER + SORT JOBS
   ========================================================= */

function applyJobFilters() {

    let filteredJobs =
        [...allJobs];


    /* =====================================================
       KEYWORD SEARCH
       ===================================================== */

    const searchTerm =
        jobSearchInput
            ?.value
            .trim()
            .toLowerCase()
        ||
        "";


    if (searchTerm) {

        filteredJobs =
            filteredJobs.filter(
                job => {

                    const searchableText =
                        `
                            ${job.job_title || ""}
                            ${job.department || ""}
                            ${job.location || ""}
                            ${job.employment_type || ""}
                            ${job.salary || ""}
                            ${job.description || ""}
                            ${job.responsibilities || ""}
                            ${job.required_skills || ""}
                            ${job.experience_required || ""}
                            ${job.education_required || ""}
                        `
                        .toLowerCase();


                    return searchableText
                        .includes(
                            searchTerm
                        );

                }
            );

    }



    /* =====================================================
       TITLE
       ===================================================== */

    const titleValue =
        jobTitleFilter
            ?.value
            .trim()
            .toLowerCase()
        ||
        "";


    if (titleValue) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    String(
                        job.job_title || ""
                    )
                    .toLowerCase()
                    .includes(
                        titleValue
                    )

            );

    }



    /* =====================================================
       LOCATION
       ===================================================== */

    const locationValue =
        jobLocationFilter
            ?.value
            .trim()
            .toLowerCase()
        ||
        "";


    if (locationValue) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    String(
                        job.location || ""
                    )
                    .toLowerCase()
                    .includes(
                        locationValue
                    )

            );

    }



    /* =====================================================
       POSITION
       ===================================================== */

    const positionValue =
        jobPositionFilter
            ?.value
            .trim()
            .toLowerCase()
        ||
        "";


    if (positionValue) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    String(
                        job.employment_type ||
                        ""
                    )
                    .toLowerCase()
                    ===
                    positionValue

            );

    }



    /* =====================================================
       SALARY
       ===================================================== */

    const minimumSalary =
        Number(
            jobSalaryFilter?.value
        ) || 0;


    if (
        minimumSalary > 0
    ) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    getSalaryNumber(
                        job.salary
                    )
                    >=
                    minimumSalary

            );

    }



    /* =====================================================
       SORTING
       ===================================================== */

    if (
        currentSort === "latest"
    ) {

        filteredJobs.sort(
            (a, b) =>

                new Date(
                    b.created_at
                )
                -
                new Date(
                    a.created_at
                )

        );

    }


    else if (
        currentSort === "oldest"
    ) {

        filteredJobs.sort(
            (a, b) =>

                new Date(
                    a.created_at
                )
                -
                new Date(
                    b.created_at
                )

        );

    }


    else if (
        currentSort ===
        "salary-high"
    ) {

        filteredJobs.sort(
            (a, b) =>

                getSalaryNumber(
                    b.salary
                )
                -
                getSalaryNumber(
                    a.salary
                )

        );

    }


    else if (
        currentSort ===
        "salary-low"
    ) {

        filteredJobs.sort(
            (a, b) =>

                getSalaryNumber(
                    a.salary
                )
                -
                getSalaryNumber(
                    b.salary
                )

        );

    }


    else if (
        currentSort === "saved"
    ) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    savedJobIds.has(
                        String(job.id)
                    )

            );

    }


    renderJobs(
        filteredJobs
    );

}



/* =========================================================
   OPEN JOB DETAILS MODAL
   ========================================================= */

function openJobDetailsModal(job) {

    if (
        !job ||
        !jobDetailsModal
    ) {

        return;

    }


    selectedJobDetails =
        job;


    const isSaved =
        savedJobIds.has(
            String(job.id)
        );


    const isClosed =
        job.status === "closed";


    const openings =
        Number(
            job.number_of_openings
        ) || 1;



    /* =====================================================
       SAVE BUTTON
       ===================================================== */

    if (jobDetailsSaveButton) {

        jobDetailsSaveButton
            .classList
            .toggle(
                "saved",
                isSaved
            );


        jobDetailsSaveButton.textContent =
            isSaved
                ? "Saved"
                : "Save job";

    }



    /* =====================================================
       STATUS
       ===================================================== */

    const status =
        document.getElementById(
            "jobDetailsStatus"
        );


    if (status) {

        status.textContent =
            isClosed
                ? "CLOSED"
                : "ACTIVE";


        status.classList.toggle(
            "closed",
            isClosed
        );

    }



    /* =====================================================
       BASIC INFORMATION
       ===================================================== */

    const department =
        document.getElementById(
            "jobDetailsDepartment"
        );

    if (department) {

        department.textContent =
            job.department ||
            "Not specified";

    }


    const title =
        document.getElementById(
            "jobDetailsTitle"
        );

    if (title) {

        title.textContent =
            job.job_title ||
            "Job vacancy";

    }


    const location =
        document.getElementById(
            "jobDetailsLocation"
        );

    if (location) {

        location.textContent =
            job.location ||
            "Not specified";

    }


    const employmentType =
        document.getElementById(
            "jobDetailsEmploymentType"
        );

    if (employmentType) {

        employmentType.textContent =
            job.employment_type ||
            "Not specified";

    }


    const openingsElement =
        document.getElementById(
            "jobDetailsOpenings"
        );

    if (openingsElement) {

        openingsElement.textContent =
            `${openings} ${
                openings === 1
                    ? "opening"
                    : "openings"
            }`;

    }



    /* =====================================================
       SALARY + DEADLINE
       ===================================================== */

    const salary =
        document.getElementById(
            "jobDetailsSalary"
        );

    if (salary) {

        salary.textContent =
            job.salary ||
            "Not specified";

    }


    const deadline =
        document.getElementById(
            "jobDetailsDeadline"
        );

    if (deadline) {

        deadline.textContent =
            formatDeadline(
                job.application_deadline
            );

    }



    /* =====================================================
       DESCRIPTION
       ===================================================== */

    const description =
        document.getElementById(
            "jobDetailsDescription"
        );

    if (description) {

        description.textContent =
            job.description ||
            "No description provided.";

    }



    /* =====================================================
       RESPONSIBILITIES
       ===================================================== */

    const responsibilities =
        document.getElementById(
            "jobDetailsResponsibilities"
        );

    if (responsibilities) {

        responsibilities.textContent =
            job.responsibilities ||
            "Not specified.";

    }



    /* =====================================================
       REQUIREMENTS
       ===================================================== */

    const experience =
        document.getElementById(
            "jobDetailsExperience"
        );

    if (experience) {

        experience.textContent =
            job.experience_required ||
            "Not specified";

    }


    const education =
        document.getElementById(
            "jobDetailsEducation"
        );

    if (education) {

        education.textContent =
            job.education_required ||
            "Not specified";

    }



    /* =====================================================
       SKILLS
       ===================================================== */

    const skillsContainer =
        document.getElementById(
            "jobDetailsSkills"
        );


    if (skillsContainer) {

        skillsContainer.innerHTML =
            "";


        if (
            job.required_skills
        ) {

            const skills =
                String(
                    job.required_skills
                )
                .split(",")
                .map(
                    skill =>
                        skill.trim()
                )
                .filter(Boolean);


            skills.forEach(
                skill => {

                    const chip =
                        document.createElement(
                            "span"
                        );


                    chip.textContent =
                        skill;


                    skillsContainer.appendChild(
                        chip
                    );

                }
            );

        }

        else {

            const emptySkill =
                document.createElement(
                    "span"
                );


            emptySkill.textContent =
                "Not specified";


            skillsContainer.appendChild(
                emptySkill
            );

        }

    }



/* =====================================================
   APPLY / APPLICATION PROGRESS BUTTON
   ===================================================== */

if (
    jobDetailsApplyButton
) {

    const existingApplication =
        appliedJobs.get(
            String(
                job.id
            )
        );


    if (
        existingApplication
    ) {

        jobDetailsApplyButton.disabled =
            false;


        jobDetailsApplyButton.textContent =
            "View application progress";


        jobDetailsApplyButton.dataset.action =
            "progress";

    }

    else if (
        isClosed
    ) {

        jobDetailsApplyButton.disabled =
            true;


        jobDetailsApplyButton.textContent =
            "Applications closed";


        jobDetailsApplyButton.dataset.action =
            "closed";

    }

    else {

        jobDetailsApplyButton.disabled =
            false;


        jobDetailsApplyButton.textContent =
            "Apply now";


        jobDetailsApplyButton.dataset.action =
            "apply";

    }

}


    /* =====================================================
       OPEN MODAL
       ===================================================== */

    jobDetailsModal.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";

}



/* =========================================================
   CLOSE JOB DETAILS MODAL
   ========================================================= */

function closeJobDetailsModal() {

    selectedJobDetails =
        null;


    jobDetailsModal
        ?.classList
        .remove(
            "open"
        );


    document.body.style.overflow =
        "";

}



/* =========================================================
   JOB DETAILS CLOSE EVENTS
   ========================================================= */

closeJobDetailsModalButton
    ?.addEventListener(
        "click",
        closeJobDetailsModal
    );


jobDetailsBackdrop
    ?.addEventListener(
        "click",
        closeJobDetailsModal
    );



/* =========================================================
   SAVE JOB INSIDE DETAILS MODAL
   ========================================================= */

jobDetailsSaveButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                !selectedJobDetails
            ) {

                return;

            }


            const jobId =
                String(
                    selectedJobDetails.id
                );


            const isSaved =
                savedJobIds.has(
                    jobId
                );


            try {

                const response =
                    await fetch(
                        `/api/saved-jobs/${jobId}`,
                        {
                            method:
                                isSaved
                                    ? "DELETE"
                                    : "POST",

                            credentials:
                                "same-origin"
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok
                ) {

                    console.error(
                        data.message
                    );

                    return;

                }


                if (isSaved) {

                    savedJobIds.delete(
                        jobId
                    );

                }

                else {

                    savedJobIds.add(
                        jobId
                    );

                }


                const nowSaved =
                    savedJobIds.has(
                        jobId
                    );


                jobDetailsSaveButton
                    .classList
                    .toggle(
                        "saved",
                        nowSaved
                    );


                jobDetailsSaveButton.textContent =
                    nowSaved
                        ? "Saved"
                        : "Save job";


                /*
                    Refresh cards so card
                    bookmark stays synchronized.
                */

                applyJobFilters();

            }

            catch (error) {

                console.error(
                    "Modal save job error:",
                    error
                );

            }

        }
    );



/* =========================================================
   APPLY NOW BUTTON
   ========================================================= */

jobDetailsApplyButton
    ?.addEventListener(
        "click",
        () => {

            if (
                !selectedJobDetails
            ) {

                return;

            }


            const existingApplication =
                appliedJobs.get(
                    String(
                        selectedJobDetails.id
                    )
                );


            if (
                existingApplication
            ) {

                window.location.href =
                    `/application-progress.html?id=${existingApplication.id}`;

                return;

            }


            startApplicationFlow(
                selectedJobDetails
            );

        }
    );



/* =========================================================
   JOB CARD EVENTS
   ========================================================= */

function attachJobCardEvents() {

    const saveButtons =
        document.querySelectorAll(
            ".jobs-save-button"
        );


    const viewButtons =
        document.querySelectorAll(
            ".jobs-view-button"
        );



    /* =====================================================
       CARD SAVE BUTTON
       ===================================================== */

    saveButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();


                    const jobId =
                        String(
                            button.dataset.jobId
                        );


                    const isSaved =
                        savedJobIds.has(
                            jobId
                        );


                    try {

                        const response =
                            await fetch(
                                `/api/saved-jobs/${jobId}`,
                                {
                                    method:
                                        isSaved
                                            ? "DELETE"
                                            : "POST",

                                    credentials:
                                        "same-origin"
                                }
                            );


                        const data =
                            await response.json();


                        if (
                            !response.ok
                        ) {

                            console.error(
                                data.message
                            );

                            return;

                        }


                        if (isSaved) {

                            savedJobIds.delete(
                                jobId
                            );

                        }

                        else {

                            savedJobIds.add(
                                jobId
                            );

                        }


                        applyJobFilters();

                    }

                    catch (error) {

                        console.error(
                            "Save job error:",
                            error
                        );

                    }

                }
            );

        }
    );



    /* =====================================================
       VIEW VACANCY
       ===================================================== */

    viewButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const jobId =
                        button.dataset.jobId;


                    const job =
                        allJobs.find(
                            item =>

                                String(
                                    item.id
                                )
                                ===
                                String(
                                    jobId
                                )

                        );


                    if (!job) {

                        return;

                    }


                    openJobDetailsModal(
                        job
                    );

                }
            );

        }
    );

}



/* =========================================================
   SEARCH EVENTS
   ========================================================= */

searchJobsButton
    ?.addEventListener(
        "click",
        applyJobFilters
    );


jobSearchInput
    ?.addEventListener(
        "input",
        applyJobFilters
    );


jobSearchInput
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                applyJobFilters();

            }

        }
    );



/* =========================================================
   LIVE FILTER EVENTS
   ========================================================= */

jobTitleFilter
    ?.addEventListener(
        "input",
        applyJobFilters
    );


jobLocationFilter
    ?.addEventListener(
        "input",
        applyJobFilters
    );


jobSalaryFilter
    ?.addEventListener(
        "input",
        applyJobFilters
    );


jobPositionFilter
    ?.addEventListener(
        "change",
        applyJobFilters
    );



/* =========================================================
   SORT EVENT
   ========================================================= */

jobSort
    ?.addEventListener(
        "change",
        () => {

            currentSort =
                jobSort.value ||
                "latest";


            applyJobFilters();

        }
    );



/* =========================================================
   CLEAR FILTERS
   ========================================================= */

clearJobFilters
    ?.addEventListener(
        "click",
        () => {

            if (
                jobSearchInput
            ) {

                jobSearchInput.value =
                    "";

            }


            if (
                jobTitleFilter
            ) {

                jobTitleFilter.value =
                    "";

            }


            if (
                jobLocationFilter
            ) {

                jobLocationFilter.value =
                    "";

            }


            if (
                jobSalaryFilter
            ) {

                jobSalaryFilter.value =
                    "";

            }


            if (
                jobPositionFilter
            ) {

                jobPositionFilter.value =
                    "";

            }



            /* RESET POSITION DROPDOWN UI */

            const positionDropdown =
                jobPositionFilter
                    ?.closest(
                        "[data-dropdown]"
                    );


            if (
                positionDropdown
            ) {

                const text =
                    positionDropdown.querySelector(
                        "[data-dropdown-text]"
                    );


                const options =
                    positionDropdown.querySelectorAll(
                        "[data-dropdown-option]"
                    );


                if (text) {

                    text.textContent =
                        "Any position";

                }


                options.forEach(
                    option => {

                        option.classList.toggle(
                            "selected",
                            option.dataset.value === ""
                        );

                    }
                );

            }


            applyJobFilters();

        }
    );



/* =========================================================
   LOAD SAVED JOBS
   ========================================================= */

async function loadSavedJobs() {

    try {

        const response =
            await fetch(
                "/api/saved-jobs",
                {
                    credentials:
                        "same-origin"
                }
            );


        /*
            Logged-out users receive 401.
            That's fine — they simply
            have no saved-job state.
        */

        if (
            !response.ok
        ) {

            savedJobIds =
                new Set();

            return;

        }


        const data =
            await response.json();


        savedJobIds =
            new Set(
                (
                    data.savedJobIds ||
                    []
                ).map(
                    String
                )
            );

    }

    catch (error) {

        console.error(
            "Load saved jobs error:",
            error
        );


        savedJobIds =
            new Set();

    }

}


/* =========================================================
   LOAD CANDIDATE APPLICATIONS
   ========================================================= */

async function loadMyApplications() {

    try {

        const response =
            await fetch(
                "/api/my-applications",
                {
                    method:
                        "GET",

                    credentials:
                        "same-origin"
                }
            );


        /*
            Logged-out users and admins do not need
            candidate application information.
        */

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            appliedJobs.clear();

            return;

        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            console.error(
                data.message ||
                "Unable to load applications."
            );

            return;

        }


        appliedJobs.clear();


        (
            data.applications ||
            []
        )
        .forEach(
            application => {

                appliedJobs.set(
                    String(
                        application.jobId
                    ),
                    application
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Load my applications error:",
            error
        );

    }

}


/* =========================================================
   SET APPLICATION JOB TYPE DROPDOWN
   ========================================================= */

function setApplicationJobType(
    value
) {

    if (
        !applicationPreferredJobType
    ) {

        return;

    }


    const dropdown =
        applicationPreferredJobType
            .closest(
                "[data-dropdown]"
            );


    const dropdownText =
        dropdown
            ?.querySelector(
                "[data-dropdown-text]"
            );


    const options =
        dropdown
            ?.querySelectorAll(
                "[data-dropdown-option]"
            );


    applicationPreferredJobType.value =
        value ||
        "";


    if (
        dropdownText
    ) {

        dropdownText.textContent =
            value ||
            "Select job type";

    }


    options?.forEach(
        option => {

            option.classList.toggle(
                "selected",
                option.dataset.value === value
            );

        }
    );

}


/* =========================================================
   APPLICATION DRAFT

   Temporary draft for the current browser session.

   Drafts are separated by:
   candidate + job

   CV files cannot be restored automatically by browsers.
   ========================================================= */

function getApplicationDraftKey(
    jobId
) {

    if (
        !currentCandidateId ||
        !jobId
    ) {

        return null;

    }


    return `altrium-application-draft-${currentCandidateId}-${jobId}`;

}



/* =========================================================
   SAVE APPLICATION DRAFT
   ========================================================= */

function saveApplicationDraft() {

    if (
        !selectedApplicationJob ||
        !currentCandidateId
    ) {

        return;

    }


    const draftKey =
        getApplicationDraftKey(
            selectedApplicationJob.id
        );


    if (!draftKey) {

        return;

    }


    const languages =
        Array.from(
            document.querySelectorAll(
                'input[name="preferredLanguages"]:checked'
            )
        )
        .map(
            checkbox =>
                checkbox.value
        );


    const draft = {

        firstName:
            document.getElementById(
                "applicationFirstName"
            )?.value || "",


        lastName:
            document.getElementById(
                "applicationLastName"
            )?.value || "",


        phoneNumber:
            document.getElementById(
                "applicationPhone"
            )?.value || "",


        nic:
            document.getElementById(
                "applicationNic"
            )?.value || "",


        dateOfBirth:
            applicationDateOfBirth
                ?.value || "",


        country:
            document.getElementById(
                "applicationCountry"
            )?.value || "",


        education:
            document.getElementById(
                "applicationEducation"
            )?.value || "",


        linkedinUrl:
            document.getElementById(
                "applicationLinkedin"
            )?.value || "",


        skills:
            document.getElementById(
                "applicationSkills"
            )?.value || "",


        workExperience:
            document.getElementById(
                "applicationWorkExperience"
            )?.value || "",


        projects:
            document.getElementById(
                "applicationProjects"
            )?.value || "",


        preferredLanguages:
            languages,


        preferredJobType:
            applicationPreferredJobType
                ?.value || "",


        consent:
            document.getElementById(
                "applicationConsent"
            )?.checked || false

    };


    sessionStorage.setItem(
        draftKey,
        JSON.stringify(
            draft
        )
    );

}



/* =========================================================
   RESTORE APPLICATION DRAFT
   ========================================================= */

function restoreApplicationDraft(
    jobId
) {

    const draftKey =
        getApplicationDraftKey(
            jobId
        );


    if (!draftKey) {

        return;

    }


    const savedDraft =
        sessionStorage.getItem(
            draftKey
        );


    if (!savedDraft) {

        return;

    }


    try {

        const draft =
            JSON.parse(
                savedDraft
            );


        const hasDraftValue =
            key =>
                Object.prototype
                    .hasOwnProperty
                    .call(
                        draft,
                        key
                    );


        const setDraftValue =
            (
                id,
                key
            ) => {

                if (
                    !hasDraftValue(
                        key
                    )
                ) {

                    return;

                }


                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.value =
                        draft[key] ?? "";

                }

            };



        /* =================================================
           PERSONAL INFORMATION
           ================================================= */

        setDraftValue(
            "applicationFirstName",
            "firstName"
        );


        setDraftValue(
            "applicationLastName",
            "lastName"
        );


        setDraftValue(
            "applicationPhone",
            "phoneNumber"
        );


        setDraftValue(
            "applicationNic",
            "nic"
        );


        setDraftValue(
            "applicationCountry",
            "country"
        );



        /* =================================================
           PROFESSIONAL INFORMATION
           ================================================= */

        setDraftValue(
            "applicationEducation",
            "education"
        );


        setDraftValue(
            "applicationLinkedin",
            "linkedinUrl"
        );


        setDraftValue(
            "applicationSkills",
            "skills"
        );


        setDraftValue(
            "applicationWorkExperience",
            "workExperience"
        );


        setDraftValue(
            "applicationProjects",
            "projects"
        );



        /* =================================================
           DATE OF BIRTH
           ================================================= */

        if (
            hasDraftValue(
                "dateOfBirth"
            )
        ) {

            const savedDob =
                draft.dateOfBirth || "";


            if (
                applicationDateOfBirth
            ) {

                applicationDateOfBirth.value =
                    savedDob;

            }


            if (savedDob) {

                const restoredDate =
                    new Date(
                        `${savedDob}T00:00:00`
                    );


                if (
                    !Number.isNaN(
                        restoredDate.getTime()
                    )
                ) {

                    applicationCalendarDate =
                        new Date(
                            restoredDate
                        );


                    if (
                        applicationDateText
                    ) {

                        applicationDateText.textContent =
                            restoredDate
                                .toLocaleDateString(
                                    "en-GB",
                                    {
                                        day:
                                            "2-digit",

                                        month:
                                            "long",

                                        year:
                                            "numeric"
                                    }
                                );

                    }

                }

            }

            else {

                applicationCalendarDate =
                    new Date();


                if (
                    applicationDateText
                ) {

                    applicationDateText.textContent =
                        "Select date of birth";

                }

            }

        }



        /* =================================================
           LANGUAGES
           ================================================= */

        if (
            hasDraftValue(
                "preferredLanguages"
            )
        ) {

            const draftLanguages =
                Array.isArray(
                    draft.preferredLanguages
                )
                    ? draft.preferredLanguages
                    : [];


            document
                .querySelectorAll(
                    'input[name="preferredLanguages"]'
                )
                .forEach(
                    checkbox => {

                        checkbox.checked =
                            draftLanguages.includes(
                                checkbox.value
                            );

                    }
                );

        }



        /* =================================================
           PREFERRED JOB TYPE
           ================================================= */

        if (
            hasDraftValue(
                "preferredJobType"
            )
        ) {

            setApplicationJobType(
                draft.preferredJobType ||
                ""
            );

        }



        /* =================================================
           CONSENT
           ================================================= */

        if (
            hasDraftValue(
                "consent"
            )
        ) {

            const consent =
                document.getElementById(
                    "applicationConsent"
                );


            if (consent) {

                consent.checked =
                    Boolean(
                        draft.consent
                    );

            }

        }

    }

    catch (error) {

        console.error(
            "Unable to restore application draft:",
            error
        );

    }

}



/* =========================================================
   CLEAR APPLICATION DRAFT
   ========================================================= */

function clearApplicationDraft(
    jobId
) {

    const draftKey =
        getApplicationDraftKey(
            jobId
        );


    if (!draftKey) {

        return;

    }


    sessionStorage.removeItem(
        draftKey
    );

}



/* =========================================================
   AUTO-SAVE APPLICATION DRAFT
   ========================================================= */

jobApplicationForm
    ?.addEventListener(
        "input",
        saveApplicationDraft
    );


jobApplicationForm
    ?.addEventListener(
        "change",
        saveApplicationDraft
    );



/* =========================================================
   OPEN APPLICATION FORM
   ========================================================= */

async function openApplicationForm(
    job
) {

    if (
        !job ||
        !applicationModal
    ) {

        return;

    }


    try {

        /*
            Load reusable candidate information
            from PostgreSQL.
        */

        const response =
            await fetch(
                "/api/application-profile",
                {
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

            console.error(
                data.message ||
                "Unable to load candidate profile."
            );

            return;

        }


        const candidate =
            data.candidate;


        selectedApplicationJob =
            job;



        /* =================================================
           JOB INFORMATION
           ================================================= */

        if (
            applicationJobTitle
        ) {

            applicationJobTitle.textContent =
                job.job_title ||
                "Vacancy";

        }


        if (
            applicationJobMeta
        ) {

            applicationJobMeta.textContent =
                `${job.department || ""} • ${job.location || ""} • ${job.employment_type || ""}`;

        }



        /* =================================================
           PERSONAL INFORMATION
           ================================================= */

        const firstName =
            document.getElementById(
                "applicationFirstName"
            );

        if (firstName) {

            firstName.value =
                candidate.firstName ||
                "";

        }


        const lastName =
            document.getElementById(
                "applicationLastName"
            );

        if (lastName) {

            lastName.value =
                candidate.lastName ||
                "";

        }


        const email =
            document.getElementById(
                "applicationEmail"
            );

        if (email) {

            email.value =
                candidate.email ||
                "";

        }


        const phone =
            document.getElementById(
                "applicationPhone"
            );

        if (phone) {

            phone.value =
                candidate.phoneNumber ||
                "";

        }


        const nic =
            document.getElementById(
                "applicationNic"
            );

        if (nic) {

            nic.value =
                candidate.nic ||
                "";

        }


        const dateOfBirth =
            document.getElementById(
                "applicationDateOfBirth"
            );

        if (dateOfBirth) {

            dateOfBirth.value =
                candidate.dateOfBirth ||
                "";

        }

        if (
    candidate.dateOfBirth
) {

    const parsedDate =
        new Date(
            `${candidate.dateOfBirth}T00:00:00`
        );


    applicationCalendarDate =
        new Date(parsedDate);


    applicationDateText.textContent =
        parsedDate.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

} else {

    applicationCalendarDate =
        new Date();


    applicationDateText.textContent =
        "Select date of birth";

}


        const country =
            document.getElementById(
                "applicationCountry"
            );

        if (country) {

            country.value =
                candidate.country ||
                "";

        }



        /* =================================================
           PROFESSIONAL INFORMATION
           ================================================= */

        const education =
            document.getElementById(
                "applicationEducation"
            );

        if (education) {

            education.value =
                candidate.education ||
                "";

        }


        const linkedin =
            document.getElementById(
                "applicationLinkedin"
            );

        if (linkedin) {

            linkedin.value =
                candidate.linkedinUrl ||
                "";

        }


        const skills =
            document.getElementById(
                "applicationSkills"
            );

        if (skills) {

            skills.value =
                candidate.skills ||
                "";

        }


        const workExperience =
            document.getElementById(
                "applicationWorkExperience"
            );

        if (workExperience) {

            workExperience.value =
                candidate.workExperience ||
                "";

        }


        const projects =
            document.getElementById(
                "applicationProjects"
            );

        if (projects) {

            projects.value =
                candidate.projects ||
                "";

        }



        /* =================================================
           LANGUAGES
           ================================================= */

        const savedLanguages =
            Array.isArray(
                candidate.preferredLanguages
            )
                ? candidate.preferredLanguages
                : [];


        document
            .querySelectorAll(
                'input[name="preferredLanguages"]'
            )
            .forEach(
                checkbox => {

                    checkbox.checked =
                        savedLanguages.includes(
                            checkbox.value
                        );

                }
            );



        /* =================================================
           PREFERRED JOB TYPE
           ================================================= */

        setApplicationJobType(
            candidate.preferredJobType
        );



        /* =================================================
           RESET CV
           ================================================= */

        if (
            applicationCv
        ) {

            applicationCv.value =
                "";

        }


        if (
            applicationFileSelected
        ) {

            applicationFileSelected.textContent =
                "No file selected";

        }



        /* =================================================
           RESET CONSENT
           ================================================= */

        const consent =
            document.getElementById(
                "applicationConsent"
            );


        if (
            consent
        ) {

            consent.checked =
                false;

        }



            /* =================================================
            CLOSE JOB DETAILS
            ================================================= */

            closeJobDetailsModal();


            /* =================================================
            RESTORE UNSUBMITTED DRAFT
            ================================================= */

            restoreApplicationDraft(
                job.id
            );


            /* =================================================
            RESET APPLICATION SCREENS
            ================================================= */

            if (applicationReview) {

                applicationReview.hidden =
                    true;

            }


            if (applicationSuccess) {

                applicationSuccess.hidden =
                    true;

            }


            if (jobApplicationForm) {

                jobApplicationForm.hidden =
                    false;

            }


            /* =================================================
            OPEN APPLICATION MODAL
            ================================================= */

            applicationModal.classList.add(
                "open"
            );


            applicationModal.setAttribute(
                "aria-hidden",
                "false"
            );


            document.body.style.overflow =
                "hidden";

    }

    catch (error) {

        console.error(
            "Open application form error:",
            error
        );

    }

}



/* =========================================================
   CLOSE APPLICATION FORM
   ========================================================= */

function closeApplicationForm() {

    applicationModal
        ?.classList
        .remove(
            "open"
        );


    applicationModal
        ?.setAttribute(
            "aria-hidden",
            "true"
        );


    document.body.style.overflow =
        "";


    selectedApplicationJob =
        null;

}



/* =========================================================
   APPLICATION MODAL CLOSE EVENTS
   ========================================================= */

closeApplicationModalButton
    ?.addEventListener(
        "click",
        closeApplicationForm
    );


cancelApplicationButton
    ?.addEventListener(
        "click",
        closeApplicationForm
    );


applicationModalBackdrop
    ?.addEventListener(
        "click",
        closeApplicationForm
    );



/* =========================================================
   APPLICATION CV FILE NAME
   ========================================================= */

applicationCv
    ?.addEventListener(
        "change",
        () => {

            const file =
                applicationCv.files[0];


            if (
                !applicationFileSelected
            ) {

                return;

            }


            applicationFileSelected.textContent =
                file
                    ? file.name
                    : "No file selected";

        }
    );



/* =========================================================
   START APPLICATION FLOW
   ========================================================= */

async function startApplicationFlow(
    job
) {

    if (!job) {

        return;

    }



    /* =====================================================
       JOB MUST BE ACTIVE
       ===================================================== */

    if (
        job.status !== "active"
    ) {

        console.error(
            "This vacancy is not accepting applications."
        );

        return;

    }



    try {

        /* =================================================
           CHECK LOGIN SESSION
           ================================================= */

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



        /* =================================================
           NOT LOGGED IN
           ================================================= */

        if (
            !response.ok ||
            !data.success
        ) {

            const returnTo =
                `jobs.html?apply=${job.id}`;


            window.location.href =
                `login.html?returnTo=${
                    encodeURIComponent(
                        returnTo
                    )
                }`;


            return;

        }



        /* =================================================
           ONLY CANDIDATES CAN APPLY
           ================================================= */

        if (
            !data.user ||
            data.user.role !==
                "candidate"
        ) {

            console.error(
                "Only candidate accounts can apply."
            );

            return;

        }



/* =================================================
   CANDIDATE LOGGED IN
   ================================================= */

currentCandidateId =
    data.user.id;


await openApplicationForm(
    job
);

    }

    catch (error) {

        console.error(
            "Application authentication error:",
            error
        );

    }

}



/* =========================================================
   OPEN APPLICATION AFTER LOGIN RETURN
   ========================================================= */

function openRequestedApplicationJob() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const applyJobId =
        params.get(
            "apply"
        );


    if (
        !applyJobId
    ) {

        return;

    }


    const job =
        allJobs.find(
            item =>

                String(
                    item.id
                )
                ===
                String(
                    applyJobId
                )

        );


    if (!job) {

        console.error(
            "Requested application job not found:",
            applyJobId
        );

        return;

    }


    if (
        job.status !== "active"
    ) {

        console.error(
            "This vacancy is no longer available for applications."
        );

        return;

    }


    /*
        IMPORTANT:

        Do NOT reopen the normal
        vacancy details modal here.

        Candidate has already clicked
        Apply before logging in.

        Go directly into the application
        flow.
    */

    startApplicationFlow(
        job
    );

}


/* =========================================================
   OPEN JOB FROM NOTIFICATION
   ========================================================= */

function openRequestedJob() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const requestedJobId =
        params.get(
            "job"
        );


    if (!requestedJobId) {

        return;

    }


    const job =
        allJobs.find(
            item =>
                String(item.id) ===
                String(requestedJobId)
        );


    if (!job) {

        return;

    }


    if (
        job.status !==
        "active"
    ) {

        return;

    }


    openJobDetailsModal(
        job
    );

}


/* =========================================================
   ESCAPE KEY FOR BOTH MODALS
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !== "Escape"
        ) {

            return;

        }


        /*
            Application modal gets priority.
        */

        if (
            applicationModal
                ?.classList
                .contains("open")
        ) {

            closeApplicationForm();

            return;

        }


        if (
            jobDetailsModal
                ?.classList
                .contains("open")
        ) {

            closeJobDetailsModal();

        }

    }
);



/* =========================================================
   LOAD JOBS FROM BACKEND
   ========================================================= */

async function loadJobs() {

    if (
        !jobsList
    ) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/jobs",
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

            console.error(
                data.message ||
                "Unable to load vacancies."
            );


            jobsList.innerHTML = `

                <div class="jobs-empty">

                    <strong>
                        Unable to load vacancies.
                    </strong>

                    <p>
                        Please try again later.
                    </p>

                </div>

            `;


            return;

        }


        allJobs =
            data.jobs ||
            [];


        /*
            Load candidate bookmarks.
            Logged-out users simply
            receive no saved jobs.
        */

        await Promise.all([
            loadSavedJobs(),
            loadMyApplications()
        ]);


        /*
            Render jobs.
        */

        applyJobFilters();


        /*
            If candidate came back
            from login using:

            jobs.html?apply=6

            continue their application.
        */

        openRequestedJob();

        openRequestedApplicationJob();

    }

    catch (error) {

        console.error(
            "Load jobs error:",
            error
        );


        jobsList.innerHTML = `

            <div class="jobs-empty">

                <strong>
                    Something went wrong.
                </strong>

                <p>
                    Vacancies could not be loaded.
                </p>

            </div>

        `;

    }

}


/* =========================================================
   APPLICATION VALIDATION
   ========================================================= */

function validateApplicationForm() {

    const firstName =
        document.getElementById(
            "applicationFirstName"
        );

    const lastName =
        document.getElementById(
            "applicationLastName"
        );

    const email =
        document.getElementById(
            "applicationEmail"
        );

    const phone =
        document.getElementById(
            "applicationPhone"
        );

    const nic =
        document.getElementById(
            "applicationNic"
        );

    const country =
        document.getElementById(
            "applicationCountry"
        );

    const education =
        document.getElementById(
            "applicationEducation"
        );

    const skills =
        document.getElementById(
            "applicationSkills"
        );

    const workExperience =
        document.getElementById(
            "applicationWorkExperience"
        );

    const linkedin =
        document.getElementById(
            "applicationLinkedin"
        );

    const consent =
        document.getElementById(
            "applicationConsent"
        );


    /* CLEAR OLD ERRORS */

    document
        .querySelectorAll(
            ".application-field-error"
        )
        .forEach(element => {

            element.classList.remove(
                "application-field-error"
            );

        });


    let firstInvalidElement =
        null;


    function markInvalid(element) {

        if (!element) {
            return;
        }


        element.classList.add(
            "application-field-error"
        );


        if (!firstInvalidElement) {

            firstInvalidElement =
                element;

        }

    }


    /* PERSONAL */

    if (!firstName?.value.trim()) {
        markInvalid(firstName);
    }


    if (!lastName?.value.trim()) {
        markInvalid(lastName);
    }


    if (!email?.value.trim()) {
        markInvalid(email);
    }


    if (!phone?.value.trim()) {
        markInvalid(phone);
    }


    if (!nic?.value.trim()) {
        markInvalid(nic);
    }


    if (!applicationDateOfBirth?.value) {

        markInvalid(
            applicationDateTrigger
        );

    }


    if (!country?.value.trim()) {
        markInvalid(country);
    }


    /* PROFESSIONAL */

    if (!education?.value.trim()) {
        markInvalid(education);
    }


    if (!skills?.value.trim()) {
        markInvalid(skills);
    }


    if (!workExperience?.value.trim()) {
        markInvalid(workExperience);
    }


    /* LINKEDIN - OPTIONAL BUT MUST BE VALID IF ENTERED */

    if (
        linkedin?.value.trim()
    ) {

        try {

            new URL(
                linkedin.value.trim()
            );

        }

        catch {

            markInvalid(
                linkedin
            );

        }

    }


    /* LANGUAGES */

    const selectedLanguages =
        Array.from(
            document.querySelectorAll(
                'input[name="preferredLanguages"]:checked'
            )
        );


    if (
        selectedLanguages.length === 0
    ) {

        markInvalid(
            document.querySelector(
                ".application-language-options"
            )
        );

    }


    /* JOB TYPE */

    if (
        !applicationPreferredJobType
            ?.value
            .trim()
    ) {

        markInvalid(
            applicationPreferredJobType
                ?.closest(
                    ".altrium-dropdown"
                )
        );

    }


    /* CV */

    const file =
        applicationCv
            ?.files[0];


    if (!file) {

        markInvalid(
            document.querySelector(
                ".application-cv-dropzone"
            )
        );

    }

    else {

        const fileName =
            file.name.toLowerCase();


        const allowedExtension =
            fileName.endsWith(".pdf") ||
            fileName.endsWith(".jpg") ||
            fileName.endsWith(".jpeg") ||
            fileName.endsWith(".png");


        const maxSize =
            5 * 1024 * 1024;


        if (
            !allowedExtension ||
            file.size > maxSize
        ) {

            markInvalid(
                document.querySelector(
                    ".application-cv-dropzone"
                )
            );

        }

    }


    /* CONSENT */

    if (!consent?.checked) {

        markInvalid(
            document.querySelector(
                ".application-consent"
            )
        );

    }


    if (firstInvalidElement) {

        firstInvalidElement
            .scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


        return false;

    }


    return true;

}



/* =========================================================
   FILL APPLICATION REVIEW
   ========================================================= */

function fillApplicationReview() {

    const value = id =>
        document
            .getElementById(id)
            ?.value
            ?.trim() || "—";


    const languages =
        Array.from(
            document.querySelectorAll(
                'input[name="preferredLanguages"]:checked'
            )
        )
        .map(
            checkbox =>
                checkbox.value
        );


    document.getElementById(
        "reviewName"
    ).textContent =
        `${value("applicationFirstName")} ${value("applicationLastName")}`;


    document.getElementById(
        "reviewEmail"
    ).textContent =
        value(
            "applicationEmail"
        );


    document.getElementById(
        "reviewPhone"
    ).textContent =
        value(
            "applicationPhone"
        );


    document.getElementById(
        "reviewNic"
    ).textContent =
        value(
            "applicationNic"
        );


    /* DOB */

    const dobValue =
        applicationDateOfBirth
            ?.value;


    if (dobValue) {

        const dob =
            new Date(
                `${dobValue}T00:00:00`
            );


        document.getElementById(
            "reviewDateOfBirth"
        ).textContent =
            dob.toLocaleDateString(
                "en-GB",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            );

    }


    document.getElementById(
        "reviewCountry"
    ).textContent =
        value(
            "applicationCountry"
        );


    document.getElementById(
        "reviewEducation"
    ).textContent =
        value(
            "applicationEducation"
        );


    document.getElementById(
        "reviewLinkedin"
    ).textContent =
        value(
            "applicationLinkedin"
        );


    document.getElementById(
        "reviewSkills"
    ).textContent =
        value(
            "applicationSkills"
        );


    document.getElementById(
        "reviewWorkExperience"
    ).textContent =
        value(
            "applicationWorkExperience"
        );


    document.getElementById(
        "reviewProjects"
    ).textContent =
        value(
            "applicationProjects"
        );


    document.getElementById(
        "reviewLanguages"
    ).textContent =
        languages.join(", ");


    document.getElementById(
        "reviewJobType"
    ).textContent =
        applicationPreferredJobType
            ?.value ||
        "—";


    document.getElementById(
        "reviewCvName"
    ).textContent =
        applicationCv
            ?.files[0]
            ?.name ||
        "—";

}



/* =========================================================
   OPEN REVIEW SCREEN
   ========================================================= */

function openApplicationReview() {

    if (
        !validateApplicationForm()
    ) {

        return;

    }


    fillApplicationReview();


    if (jobApplicationForm) {

        jobApplicationForm.hidden =
            true;

    }


    if (applicationReview) {

        applicationReview.hidden =
            false;

    }


    const modalCard =
        applicationModal
            ?.querySelector(
                ".application-modal-card"
            );


    if (modalCard) {

        modalCard.scrollTop =
            0;

    }

}



/* =========================================================
   BACK TO APPLICATION FORM
   ========================================================= */

function backToApplicationForm() {

    if (applicationReview) {

        applicationReview.hidden =
            true;

    }


    if (jobApplicationForm) {

        jobApplicationForm.hidden =
            false;

    }


    const modalCard =
        applicationModal
            ?.querySelector(
                ".application-modal-card"
            );


    if (modalCard) {

        modalCard.scrollTop =
            0;

    }

}


function showApplicationSuccess(
    application
) {

    if (jobApplicationForm) {

        jobApplicationForm.hidden =
            true;

    }


    if (applicationReview) {

        applicationReview.hidden =
            true;

    }


    if (applicationSuccess) {

        applicationSuccess.hidden =
            false;

    }


    if (
        applicationSuccessJobTitle
    ) {

        applicationSuccessJobTitle.textContent =
            application.jobTitle ||
            selectedApplicationJob?.job_title ||
            "Vacancy";

    }


    if (
        applicationSuccessReference
    ) {

        applicationSuccessReference.textContent =
            application.reference ||
            "—";

    }


    if (
        applicationViewProgress
    ) {

        applicationViewProgress.dataset.applicationId =
            application.id;

    }


    const modalCard =
        applicationModal
            ?.querySelector(
                ".application-modal-card"
            );


    if (modalCard) {

        modalCard.scrollTop =
            0;

    }

}


/* =========================================================
   START JOBS PAGE
   ========================================================= */

loadJobs();