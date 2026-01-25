import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log('Email service not configured:', error.message);
  }
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetCode: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Code</h2>
      <p style="color: #666; font-size: 16px;">
        You requested to reset your password. Here is your reset code:
      </p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center;">
        <h1 style="color: #4f46e5; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
      </div>
      <p style="color: #666; font-size: 14px;">
        This code will expire in 10 minutes. If you did not request this password reset, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
      <p style="color: #999; font-size: 12px; text-align: center;">
        TypingAI Team
      </p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Code - TypingAI',
    html,
  });
}
