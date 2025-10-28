// src/utils/mailer.js
const { Resend } = require('resend');

// Khởi tạo Resend với API Key từ Render
const resend = new Resend(process.env.RESEND_API_KEY);

// Hàm gửi OTP
async function sendOTP(email, otp) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'HatDeChill <onboarding@resend.dev>', // Miễn phí, không cần domain
      to: [email],
      subject: 'Xác thực tài khoản - HatDeChill',
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
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #aaa;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend ERROR:', error);
      return { success: false, error: error.message };
    }

    console.log('OTP sent via Resend:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('Resend FATAL:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOTP };