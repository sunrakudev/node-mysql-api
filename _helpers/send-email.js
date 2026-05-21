const { Resend } = require('resend');

module.exports = sendEmail;

async function sendEmail({ to, subject, html }) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
    });
}
