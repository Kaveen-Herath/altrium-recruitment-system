/* =========================================================
   ALTRIUM JOBS PAGE
   ========================================================= */


/* =========================================================
   PAGE STATE
   ========================================================= */

let allJobs = [];

let currentSort = "latest";

let selectedJobDetails = null;



/* =========================================================
   ELEMENTS
   ========================================================= */

const jobsList =
    document.getElementById(
        "jobsList"
    );


const jobResultsCount =
    document.getElementById(
        "jobResultsCount"
    );


const jobSearchInput =
    document.getElementById(
        "jobSearchInput"
    );


const searchJobsButton =
    document.getElementById(
        "searchJobsButton"
    );


const jobTitleFilter =
    document.getElementById(
        "jobTitleFilter"
    );


const jobLocationFilter =
    document.getElementById(
        "jobLocationFilter"
    );


const jobPositionFilter =
    document.getElementById(
        "jobPositionFilter"
    );


const jobSalaryFilter =
    document.getElementById(
        "jobSalaryFilter"
    );


const clearJobFilters =
    document.getElementById(
        "clearJobFilters"
    );


const jobSort =
    document.getElementById(
        "jobSort"
    );



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


altriumDropdowns.forEach(dropdown => {

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

    options.forEach(option => {

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


                options.forEach(item => {

                    item.classList.remove(
                        "selected"
                    );

                });


                option.classList.add(
                    "selected"
                );


                dropdown.classList.remove(
                    "open"
                );


                /*
                    Tell the filtering system
                    that this dropdown changed.
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

    });

});


/* CLOSE DROPDOWNS WHEN CLICKING OUTSIDE */

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



/* =========================================================
   FORMAT POSTED DATE
   ========================================================= */

function formatPostedDate(dateValue) {

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

function formatDeadline(dateValue) {

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
   Used for filtering + sorting
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


    /*
        If salary is:

        LKR 150,000 - 200,000

        use 150000 as the starting salary.
    */

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


    if (text.length <= 180) {

        return text;

    }


    return (
        text.slice(
            0,
            180
        ).trim() + "..."
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

            ${skills.map(
                skill => `
                    <span>
                        ${escapeHTML(skill)}
                    </span>
                `
            ).join("")}

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
        document.createElement("article");


    card.className =
        `jobs-result-card ${
            job.status === "closed"
                ? "closed"
                : ""
        }`;


    const isClosed =
        job.status === "closed";


    const openings =
        Number(job.number_of_openings) || 1;


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

                    <span class="jobs-card-department">
                        ${escapeHTML(job.department)}
                    </span>

                </div>

                <h3>
                    ${escapeHTML(job.job_title)}
                </h3>

            </div>


            <button
                type="button"
                class="jobs-save-button"
                data-job-id="${job.id}"
                aria-label="Save job"
                title="Save job"
            >
                ${createSaveIcon()}
            </button>

        </div>



        <div class="jobs-card-meta">

            <span>${escapeHTML(job.location)}</span>

            <span class="jobs-card-dot">•</span>

            <span>${escapeHTML(job.employment_type)}</span>

            <span class="jobs-card-dot">•</span>

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
                    job.salary || "Salary not specified"
                )
            }
        </div>



        <div class="jobs-card-deadline">

            <span>
                Deadline
            </span>

            <strong>
                ${formatDeadline(job.application_deadline)}
            </strong>

        </div>



        <div class="jobs-card-footer">

            <span class="jobs-card-posted">
                Posted ${formatPostedDate(job.created_at)}
            </span>

            <button
                type="button"
                class="jobs-view-button ${
                    isClosed ? "disabled" : ""
                }"
                data-job-id="${job.id}"
                ${
                    isClosed
                        ? "disabled"
                        : ""
                }
            >
                ${
                    isClosed
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


    jobs.forEach(job => {

        const card =
            createJobCard(
                job
            );


        jobsList.appendChild(
            card
        );

    });


    attachJobCardEvents();

}



/* =========================================================
   FILTER + SORT JOBS
   ========================================================= */

function applyJobFilters() {

    let filteredJobs =
        [...allJobs];


    /* ================= KEYWORD SEARCH ================= */

    const searchTerm =
        jobSearchInput
            ?.value
            .trim()
            .toLowerCase() || "";


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



    /* ================= TITLE ================= */

    const titleValue =
        jobTitleFilter
            ?.value
            .trim()
            .toLowerCase() || "";


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



    /* ================= LOCATION ================= */

    const locationValue =
        jobLocationFilter
            ?.value
            .trim()
            .toLowerCase() || "";


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



    /* ================= POSITION ================= */

    const positionValue =
        jobPositionFilter
            ?.value
            .trim()
            .toLowerCase() || "";


    if (positionValue) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    String(
                        job.employment_type || ""
                    )
                    .toLowerCase() ===
                    positionValue

            );

    }



    /* ================= SALARY ================= */

    const minimumSalary =
        Number(
            jobSalaryFilter?.value
        ) || 0;


    if (minimumSalary > 0) {

        filteredJobs =
            filteredJobs.filter(
                job =>

                    getSalaryNumber(
                        job.salary
                    ) >=
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
                ) -
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
                ) -
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
                ) -
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
                ) -
                getSalaryNumber(
                    b.salary
                )

        );

    }


    /*
        Saved jobs will become database-powered
        in the next step.
    */

    else if (
        currentSort === "saved"
    ) {

        filteredJobs = [];

    }


    renderJobs(
        filteredJobs
    );

}


/* =========================================================
   JOB DETAILS MODAL
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


function openJobDetailsModal(job) {

    if (
        !job ||
        !jobDetailsModal
    ) {
        return;
    }


    selectedJobDetails = job;


    const isClosed =
        job.status === "closed";


    const openings =
        Number(
            job.number_of_openings
        ) || 1;


    /* STATUS */

    const status =
        document.getElementById(
            "jobDetailsStatus"
        );

    status.textContent =
        isClosed
            ? "CLOSED"
            : "ACTIVE";

    status.classList.toggle(
        "closed",
        isClosed
    );


    /* BASIC INFORMATION */

    document.getElementById(
        "jobDetailsDepartment"
    ).textContent =
        job.department ||
        "Not specified";


    document.getElementById(
        "jobDetailsTitle"
    ).textContent =
        job.job_title ||
        "Job vacancy";


    document.getElementById(
        "jobDetailsLocation"
    ).textContent =
        job.location ||
        "Not specified";


    document.getElementById(
        "jobDetailsEmploymentType"
    ).textContent =
        job.employment_type ||
        "Not specified";


    document.getElementById(
        "jobDetailsOpenings"
    ).textContent =
        `${openings} ${
            openings === 1
                ? "opening"
                : "openings"
        }`;


    /* SALARY + DEADLINE */

    document.getElementById(
        "jobDetailsSalary"
    ).textContent =
        job.salary ||
        "Not specified";


    document.getElementById(
        "jobDetailsDeadline"
    ).textContent =
        formatDeadline(
            job.application_deadline
        );


    /* DESCRIPTION */

    document.getElementById(
        "jobDetailsDescription"
    ).textContent =
        job.description ||
        "No description provided.";


    /* RESPONSIBILITIES */

    document.getElementById(
        "jobDetailsResponsibilities"
    ).textContent =
        job.responsibilities ||
        "Not specified.";


    /* REQUIREMENTS */

    document.getElementById(
        "jobDetailsExperience"
    ).textContent =
        job.experience_required ||
        "Not specified";


    document.getElementById(
        "jobDetailsEducation"
    ).textContent =
        job.education_required ||
        "Not specified";


    /* SKILLS */

    const skillsContainer =
        document.getElementById(
            "jobDetailsSkills"
        );


    skillsContainer.innerHTML = "";


    if (job.required_skills) {

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


        skills.forEach(skill => {

            const chip =
                document.createElement(
                    "span"
                );


            chip.textContent =
                skill;


            skillsContainer.appendChild(
                chip
            );

        });

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


    /* APPLY BUTTON */

    if (jobDetailsApplyButton) {

        jobDetailsApplyButton.disabled =
            isClosed;


        jobDetailsApplyButton.textContent =
            isClosed
                ? "Applications closed"
                : "Apply now";

    }


    /* OPEN */

    jobDetailsModal.classList.add(
        "open"
    );


    document.body.style.overflow =
        "hidden";

}



/* =========================================================
   CLOSE JOB DETAILS
   ========================================================= */

function closeJobDetailsModal() {

    selectedJobDetails = null;


    jobDetailsModal?.classList.remove(
        "open"
    );


    document.body.style.overflow =
        "";

}


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


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            jobDetailsModal
                ?.classList
                .contains("open")
        ) {

            closeJobDetailsModal();

        }

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


    /* SAVE BUTTON */

    saveButtons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                const jobId =
                    button.dataset.jobId;


                console.log(
                    "Save job:",
                    jobId
                );


                /*
                    Database saving comes next.

                    We are deliberately NOT
                    using localStorage.
                */

            }
        );

    });


    /* VIEW VACANCY */

    viewButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const jobId =
                    button.dataset.jobId;


                const job =
                    allJobs.find(
                        item =>
                            String(item.id) ===
                            String(jobId)
                    );


                if (!job) {
                    return;
                }


                openJobDetailsModal(
                    job
                );

            }
        );

    });

}



/* =========================================================
   SEARCH EVENTS
   ========================================================= */

searchJobsButton?.addEventListener(
    "click",
    applyJobFilters
);

jobSearchInput?.addEventListener(
    "input",
    applyJobFilters
);


jobSearchInput?.addEventListener(
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

jobTitleFilter?.addEventListener(
    "input",
    applyJobFilters
);


jobLocationFilter?.addEventListener(
    "input",
    applyJobFilters
);


jobSalaryFilter?.addEventListener(
    "input",
    applyJobFilters
);


jobPositionFilter?.addEventListener(
    "change",
    applyJobFilters
);



/* =========================================================
   SORT EVENT
   ========================================================= */

jobSort?.addEventListener(
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

clearJobFilters?.addEventListener(
    "click",
    () => {

        if (jobSearchInput) {

            jobSearchInput.value =
                "";

        }


        if (jobTitleFilter) {

            jobTitleFilter.value =
                "";

        }


        if (jobLocationFilter) {

            jobLocationFilter.value =
                "";

        }


        if (jobSalaryFilter) {

            jobSalaryFilter.value =
                "";

        }


        if (jobPositionFilter) {

            jobPositionFilter.value =
                "";

        }


        /*
            Reset Position dropdown UI
        */

        const positionDropdown =
            jobPositionFilter
                ?.closest(
                    "[data-dropdown]"
                );


        if (positionDropdown) {

            const text =
                positionDropdown
                    .querySelector(
                        "[data-dropdown-text]"
                    );


            const options =
                positionDropdown
                    .querySelectorAll(
                        "[data-dropdown-option]"
                    );


            if (text) {

                text.textContent =
                    "Any position";

            }


            options.forEach(option => {

                option.classList.toggle(
                    "selected",
                    option.dataset.value === ""
                );

            });

        }


        applyJobFilters();

    }
);



/* =========================================================
   LOAD JOBS FROM BACKEND
   ========================================================= */

async function loadJobs() {

    if (!jobsList) {

        return;

    }


    try {

        const response =
            await fetch(
                "/api/jobs",
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
            data.jobs || [];


        applyJobFilters();

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
   START JOBS PAGE
   ========================================================= */

loadJobs();