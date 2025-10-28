// src/utils/mailer.js
const sgMail = require('@sendgrid/mail');

// Cấu hình API Key cho SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email này BẮT BUỘC phải là email bạn đã xác minh trên SendGrid
const VERIFIED_SENDER = 'tandat20091979@gmail.com';

async function sendOTP(email, otp) {
    // Đây là đối tượng 'msg' mà SendGrid API yêu cầu
    const msg = {
        to: email,
        from: {
            email: VERIFIED_SENDER,
            name: 'HatDeChill'
        },
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
    };

    try {
        // Gửi email bằng API (HTTPS), không phải SMTP
        await sgMail.send(msg); 
        console.log('OTP sent via SendGrid API');
        return { success: true };
    } catch (error) {
        console.error('Lỗi gửi OTP (SendGrid API):', error);
        
        // Ghi lại chi tiết lỗi từ SendGrid (nếu có)
        if (error.response) {
            console.error(error.response.body);
        }
        
        return { success: false, error: error.message };
    }
}

module.exports = { sendOTP };
