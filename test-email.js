require("dotenv").config();

const transporter = require("./email");


async function sendTestEmail() {
    try {

        const info = await transporter.sendMail({
            from: `"Altrium" <${process.env.EMAIL_FROM}>`,

            to: process.env.EMAIL_FROM,

            subject: "Altrium Email Test",

            text: "If you received this, Altrium email sending is working.",

            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Altrium Email Test</h2>

                    <p>
                        If you received this email,
                        your Node.js email setup is working.
                    </p>
                </div>
            `
        });


        console.log(
            "Email sent successfully:",
            info.messageId
        );

    } catch (error) {

        console.error(
            "Email sending failed:",
            error
        );

    }
}


sendTestEmail();