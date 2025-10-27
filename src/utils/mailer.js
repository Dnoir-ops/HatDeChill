const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendOTP(email, otp) {
    const info = await transporter.sendMail({
        from: `"Book App" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Mã xác thực OTP',
        text: `Mã OTP của bạn là: ${otp}`,
        html: `<b>Mã OTP của bạn là: <span style='color:blue'>${otp}</span></b>`
    });
    return info;
}

module.exports = { sendOTP };
