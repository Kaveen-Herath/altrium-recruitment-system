import { test, expect } from '@playwright/test';

//TESTING CANDIDATE LOGIN
test('Candidate can log in successfully', async ({ page }) => {

    await page.goto('http://localhost:3000/login.html');

    await page
        .getByRole('textbox', { name: 'you@example.com' })
        .fill('kherath2006@gmail.com');

    await page
        .getByRole('textbox', { name: 'Your password' })
        .fill('Kaveen.Herath');

    await page
        .getByRole('button', { name: 'Sign in' })
        .click();

    await expect(page)
        .toHaveURL(/profile\.html/);

});

//TESTING CANDIDATE LOGIN FAILURE
test('Invalid login is rejected', async ({ page }) => {

    await page.goto('http://localhost:3000/login.html');

    await page
        .getByRole('textbox', { name: 'you@example.com' })
        .fill('wrong@example.com');

    await page
        .getByRole('textbox', { name: 'Your password' })
        .fill('WrongPassword123');

    const responsePromise = page.waitForResponse(
        response =>
            response.url().includes('/api/auth/login') &&
            response.request().method() === 'POST'
    );

    await page
        .getByRole('button', { name: 'Sign in' })
        .click();

    const response = await responsePromise;

    expect(response.status()).toBe(401);

    await expect(page).toHaveURL(/login\.html/);

});

// TC03 - Test that a candidate can browse job vacancies
// and open a vacancy from the jobs page.
test('Candidate can browse job vacancies', async ({ page }) => {

    await page.goto('http://localhost:3000/jobs.html');

    await expect(
        page.getByRole('button', { name: 'View vacancy' }).first()
    ).toBeVisible();

    await page
        .getByRole('button', { name: 'View vacancy' })
        .first()
        .click();

});

// TC04 - Test that candidates can search and filter job vacancies.
test('Candidate can search job vacancies', async ({ page }) => {

    await page.goto('http://localhost:3000/jobs.html');

    await page
        .getByRole('textbox', { name: 'Search by keyword, title,' })
        .fill('Software');

    await page
        .getByRole('button', { name: 'Search jobs' })
        .click();

    await expect(
        page.getByText(/Software/i).first()
    ).toBeVisible();

});

// TC04 - Test that candidates can search and filter job vacancies.
test('Candidate can search and filter job vacancies', async ({ page }) => {

    await page.goto('http://localhost:3000/jobs.html');

    // Search for software jobs
    await page
        .getByRole('textbox', { name: 'Search by keyword, title,' })
        .fill('Software');

    await page
        .getByRole('button', { name: 'Search jobs' })
        .click();

    // Filter by Information Technology
    await page
        .getByRole('button', { name: 'Any department ↓' })
        .click();

    await page
        .getByRole('button', { name: 'Information Technology' })
        .click();

    // Verify that a filtered IT vacancy is displayed
    const filteredJob = page.locator('.jobs-result-card').first();

    await expect(filteredJob).toBeVisible();

    await expect(
        filteredJob.locator('.jobs-card-department')
    ).toHaveText('Information Technology');

});

// TC05 - Test that a logged-in candidate can save a job vacancy.
test('Logged-in candidate can save a job vacancy', async ({ page }) => {

    // Create an authenticated candidate session
    const loginResponse = await page.request.post(
        'http://localhost:3000/api/auth/login',
        {
            data: {
                email: 'kaveen.rotaract3220@gmail.com',
                password: 'Some@123',
                rememberMe: false
            }
        }
    );

    expect(loginResponse.status()).toBe(200);

    // Open jobs page
    await page.goto('http://localhost:3000/jobs.html');

    // Select a vacancy that is not already saved
    const saveButton = page
        .getByRole('button', { name: 'Save job' })
        .first();

    const jobId = await saveButton.getAttribute('data-job-id');

    // Wait for the save request
    const saveResponsePromise = page.waitForResponse(
        response =>
            response.url().includes(`/api/saved-jobs/${jobId}`) &&
            response.request().method() === 'POST'
    );

    await saveButton.click();

    const saveResponse = await saveResponsePromise;

    // Verify the save request succeeded
    expect(saveResponse.status()).toBe(200);

    // Reload and verify the saved state persisted
    await page.reload();

    const savedButton = page.locator(
        `.jobs-save-button[data-job-id="${jobId}"]`
    );

    await expect(savedButton).toHaveAttribute(
        'aria-label',
        'Remove saved job'
    );

});

// TC06 - Test that a logged-in candidate can complete a job application
// and reach the application review stage.
test('Candidate can complete job application form', async ({ page }) => {

    // Login through the real backend
    const loginResponse = await page.request.post(
        'http://localhost:3000/api/auth/login',
        {
            data: {
                email: 'kaveen.rotaract3220@gmail.com',
                password: 'Some@123',
                rememberMe: false
            }
        }
    );

    expect(loginResponse.status()).toBe(200);

    // Open jobs page
    await page.goto('http://localhost:3000/jobs.html');

    // Find a vacancy we have not already applied for
    await page
        .getByRole('textbox', { name: 'Search by keyword, title,' })
        .fill('Business Analyst');

    await page
        .getByRole('button', { name: 'Search jobs' })
        .click();

    // Open the vacancy
    await page
        .getByRole('button', { name: 'View vacancy' })
        .first()
        .click();

    // Open application form
    await page
        .getByRole('button', { name: 'Apply now' })
        .click();

    // Fill work experience
    await page
        .getByRole('textbox', { name: 'Work experience' })
        .fill('2 Years experience');

    // Create a small test PDF in memory
    const testPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );

    // Upload test CV
    await page
        .getByLabel('↑ Upload your CV / Resume PDF')
        .setInputFiles({
            name: 'test-cv.pdf',
            mimeType: 'application/pdf',
            buffer: testPdf
        });

    // Confirm consent
      await page
          .locator('label.application-checkbox.application-consent')
          .click();

      await expect(
          page.locator('#applicationConsent')
      ).toBeChecked();

    // Open review
    await page
        .getByRole('button', { name: 'Review application' })
        .click();

    // Verify review stage
    await expect(
        page.getByRole('button', { name: 'Submit application' })
    ).toBeVisible();

});

// TC07 - Test that a candidate can view an applied job
// and open its application progress.
test('Candidate can view application progress', async ({ page }) => {

    // Create authenticated candidate session
    const loginResponse = await page.request.post(
        'http://localhost:3000/api/auth/login',
        {
            data: {
                email: 'kaveen.rotaract3220@gmail.com',
                password: 'Some@123',
                rememberMe: false
            }
        }
    );

    expect(loginResponse.status()).toBe(200);

    // Open profile page
    await page.goto('http://localhost:3000/profile.html');

// Open Applied Jobs section
await page
    .getByRole('button', { name: 'Applied jobs' })
    .click();

// Wait for applied jobs to load
const progressButton = page
    .locator('.view-progress-btn')
    .first();

await expect(progressButton).toBeVisible();

    // Open application progress
    await progressButton.click();

    // Verify we reached the progress page
    await expect(page)
        .toHaveURL(/application-progress\.html\?id=/);

});


// TC08 - Test that an admin can close and reopen a job vacancy.
test('Admin can manage vacancy status', async ({ page }) => {

    const loginResponse = await page.request.post(
        'http://localhost:3000/api/auth/login',
        {
            data: {
                email: 'kherath2006@gmail.com',
                password: 'Kaveen.Herath',
                rememberMe: false
            }
        }
    );

    expect(loginResponse.status()).toBe(200);

    await page.goto(
        'http://localhost:3000/admin/admin-dashboard.html'
    );

    // Open Job Vacancies section
await page
    .getByRole('button', { name: 'Job Vacancies' })
    .click();
    // Find an active vacancy through its Close button
    const closeButton = page
        .locator('.close-vacancy-button')
        .first();

    await expect(closeButton).toBeVisible();

    // Close vacancy
    await closeButton.click();

    // Confirm closing
    await page
        .locator('#confirmCloseVacancy')
        .click();

    // Verify a Reopen button now exists
    const reopenButton = page
        .locator('.reopen-vacancy-button')
        .first();

    await expect(reopenButton).toBeVisible();

    // Reopen vacancy
    await reopenButton.click();

    // Confirm reopening
    await page
        .locator('#confirmCloseVacancy')
        .click();

    // Verify vacancy is active again
    await expect(
        page.locator('.close-vacancy-button').first()
    ).toBeVisible();

});