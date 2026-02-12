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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(15, 23, 42, 0.12); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #22d3ee 0%, #38bdf8 45%, #34d399 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    Reset Your Password 🔐
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 24px; font-weight: 600;">
                    Here is your password reset code
                  </h2>
                  <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your TypingAI password. Use the code below to continue the reset process.
                  </p>
                  
                  <!-- Reset Code -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <div style="display: inline-block; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px 28px; border-radius: 10px;">
                          <span style="color: #0ea5e9; font-size: 28px; font-weight: 700; letter-spacing: 6px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            ${resetCode}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                    This code will expire in 10 minutes.
                  </p>
                </td>
              </tr>
              
              <!-- Security Note -->
              <tr>
                <td style="padding: 0 30px 40px 30px;">
                  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                      <strong>Security Note:</strong> If you did not request a password reset, please ignore this email. Your account remains secure.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                    Need help? Contact us at <a href="mailto:support@typingai.live" style="color: #0ea5e9; text-decoration: none;">support@typingai.live</a>
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    © 2026 TypingAI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Code - TypingAI',
    html,
  });
}

export async function sendActivationEmail(email: string, displayName: string, userId: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const activationUrl = `${frontendUrl}/activate?code=${userId}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Activate Your Account</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(15, 23, 42, 0.12); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #22d3ee 0%, #38bdf8 45%, #34d399 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                    Welcome to TypingAI! 🚀
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 24px; font-weight: 600;">
                    Hello ${displayName},
                  </h2>
                  <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                    Thank you for signing up! We're excited to have you join the typing revolution. To get started, please activate your account by clicking the button below.
                  </p>
                  
                  <!-- Activate Button -->
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${activationUrl}" style="display: inline-block; background: linear-gradient(135deg, #22d3ee 0%, #38bdf8 45%, #34d399 100%); color: #0f172a; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 8px 20px rgba(34, 211, 238, 0.35); transition: transform 0.2s;">
                          Activate My Account
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 30px 0 10px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="margin: 0; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #22d3ee; border-radius: 4px; word-break: break-all;">
                    <a href="${activationUrl}" style="color: #0ea5e9; text-decoration: none; font-size: 13px;">
                      ${activationUrl}
                    </a>
                  </p>
                </td>
              </tr>
              
              <!-- Security Note -->
              <tr>
                <td style="padding: 0 30px 40px 30px;">
                  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                      <strong>Security Note:</strong> If you did not create an account with TypingAI, please ignore this email. Your email address will not be used without activation.
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                    Need help? Contact us at <a href="mailto:support@typingai.live" style="color: #0ea5e9; text-decoration: none;">support@typingai.live</a>
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    © 2026 TypingAI. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Activate Your Account - TypingAI',
    html,
  });
}
