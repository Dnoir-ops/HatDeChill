// src/utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // BẮT BUỘC CHO RENDER
  }
});

async function sendOTP(email, otp) {
  const mailOptions = {
    from: `"HatDeChill" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Xác thực tài khoản - HatDeChill',
    text: `Mã OTP của bạn là: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center;">
        <h2 style="color: #667eea;">Mã OTP Xác Thực</h2>
        <p style="font-size: 16px; color: #555;">Mã của bạn là:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; background: #f0f4ff; padding: 15px; border-radius: 10px; display: inline-block; margin: 15px 0;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #888;">
          Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ với bất kỳ ai.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('OTP sent successfully:', info.messageId);
    return { success: true, info }; // ← BẮT BUỘC TRẢ VỀ success: true
  } catch (error) {
    console.error('SMTP ERROR:', error.message);
    return { success: false, error: error.message }; // ← Trả về lỗi rõ ràng
  }
}

module.exports = { sendOTP };