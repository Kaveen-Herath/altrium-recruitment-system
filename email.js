require("dotenv").config();

const nodemailer =
    require("nodemailer");


const transporter =
    nodemailer.createTransport({

        host:
            process.env.BREVO_SMTP_HOST,


        port:
            Number(
                process.env.BREVO_SMTP_PORT ||
                2525
            ),


        secure:
            false,


        auth: {

            user:
                process.env.BREVO_SMTP_USER,

            pass:
                process.env.BREVO_SMTP_KEY

        }

    });

if (
    process.env.NODE_ENV !==
    "test"
) {

    transporter
        .verify()
        .then(
            () => {

                console.log(
                    "Altrium email service connected."
                );

            }
        )
        .catch(
            error => {

                console.error(
                    "Altrium email connection error:",
                    error.message
                );

            }
        );

}

module.exports =
    transporter;