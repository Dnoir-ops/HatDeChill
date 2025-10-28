// src/utils/mailer.js
const nodemailer = require('nodemailer');

// Cấu hình Nodemailer sử dụng biến môi trường SendGrid
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // smtp.sendgrid.net
    port: process.env.SMTP_PORT, // 587
    secure: false, // Dùng false cho cổng 587 (STARTTLS)
    auth: {
        user: process.env.SMTP_USER, // apikey
        pass: process.env.SMTP_PASS // API Key
    }
});

async function sendOTP(email, otp) {
    // SỬ DỤNG EMAIL ĐÃ XÁC MINH TRÊN SENDGRID
    const senderEmail = 'tandat20091979@gmail.com'; 

    try {
        const info = await transporter.sendMail({
            from: `"HatDeChill" <${senderEmail}>`, 
            to: email,
            subject: 'Xác thực tài khoản - HatDeChill',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
                    <h2 style="color: #667eea;">Mã OTP Xác Thực</h2>
                    <p style="font-size: 16px; color: #555;">Mã của bạn là:</p>
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; background: #f0f4ff; padding: 15px; border-radius: 10px; display: inline-block; margin: 15px 0;">
                        ${otp}
                    </div>
                    <p style="font-size: 14px; color: #888;">
                        Mã có hiệu lực trong <strong>10 phút</strong>.
                    </p>
                </div>
            `
        });
        
        console.log('OTP sent via SendGrid:', info.messageId);
        return { success: true, info };
    } catch (error) {
        console.error('Lỗi gửi OTP:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendOTP };
