const nodemailer = require('nodemailer');

module.exports = sendEmail;

async function sendEmail({ to, subject, html }) {
    const port = parseInt(process.env.SMTP_PORT);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
    });
}
