require("dotenv").config();

const nodemailer = require("nodemailer");


const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,

    port: Number(
        process.env.BREVO_SMTP_PORT
    ),

    secure: false,

    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY
    }
});


module.exports = transporter; // “The email connection Altrium will use whenever it needs to send an email.”