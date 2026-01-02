import axios from 'axios';

// Email configuration using Brevo
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Get base URL for email links
function getBaseUrl(): string {
  return process.env.FRONTEND_URL
    || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
    || 'http://localhost:5000';
}

export async function sendVerificationEmail(
  email: string, 
  verificationToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }
  
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const emailData = {
    sender: {
      email: 'noreply@atomtools.ai',
      name: 'atomtools.ai'
    },
    to: [{ email }],
    subject: 'Verify your atomtools.ai account',
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - atomtools.ai</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #6366f1;
              color: white;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background-color: #5855eb;
            }
            .text {
              color: #6b7280;
              margin-bottom: 20px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 14px;
            }
            .security-note {
              background-color: #f3f4f6;
              padding: 16px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">atomtools.ai</div>
              <h1 class="title">Verify Your Email Address</h1>
            </div>
            
            <p class="text">
              Thank you for signing up for atomtools.ai! To complete your account setup and start using our AI-powered marketing tools, please verify your email address.
            </p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p class="text">
              If the button above doesn't work, you can also copy and paste this link into your browser:
            </p>
            
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">
              ${verificationUrl}
            </p>
            
            <div class="security-note">
              <strong>Security Notice:</strong> This verification link will expire for security reasons. If you didn't create an account with atomtools.ai, you can safely ignore this email.
            </div>
            
            <div class="footer">
              <p>
                This email was sent to ${email}.<br>
                If you have any questions, contact our support team.
              </p>
              <p>
                © 2025 atomtools.ai. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    textContent: `
      Welcome to atomtools.ai!
      
      Thank you for signing up. To complete your account setup and start using our AI-powered marketing tools, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      If the link doesn't work, copy and paste it into your browser.
      
      This verification link will expire for security reasons. If you didn't create an account with atomtools.ai, you can safely ignore this email.
      
      Best regards,
      The atomtools.ai Team
      
      ---
      This email was sent to ${email}.
      © 2025 atomtools.ai. All rights reserved.
    `,
  };

  try {
    const response = await axios.post(BREVO_API_URL, emailData, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Verification email sent successfully:', response.data.messageId);
    
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    if (axios.isAxiosError(error)) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const emailData = {
    sender: {
      email: 'noreply@atomtools.ai',
      name: 'atomtools.ai'
    },
    to: [{ email }],
    subject: 'Reset your atomtools.ai password',
    htmlContent: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password - atomtools.ai</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #6366f1;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background-color: #6366f1;
              color: white;
              padding: 16px 32px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background-color: #5855eb;
            }
            .text {
              color: #6b7280;
              margin-bottom: 20px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #9ca3af;
              font-size: 14px;
            }
            .security-note {
              background-color: #f3f4f6;
              padding: 16px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">atomtools.ai</div>
              <h1 class="title">Reset Your Password</h1>
            </div>

            <p class="text">
              We received a request to reset your password for your atomtools.ai account. Click the button below to set a new password.
            </p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p class="text">
              If the button above doesn't work, you can also copy and paste this link into your browser:
            </p>

            <p style="word-break: break-all; background-color: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 14px;">
              ${resetUrl}
            </p>

            <div class="security-note">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </div>

            <div class="footer">
              <p>
                This email was sent to ${email}.<br>
                If you have any questions, contact our support team.
              </p>
              <p>
                © 2025 atomtools.ai. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    textContent: `
      Reset Your Password

      We received a request to reset your password for your atomtools.ai account.

      To set a new password, click the link below:

      ${resetUrl}

      If the link doesn't work, copy and paste it into your browser.

      This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

      Best regards,
      The atomtools.ai Team

      ---
      This email was sent to ${email}.
      © 2025 atomtools.ai. All rights reserved.
    `,
  };

  try {
    const response = await axios.post(BREVO_API_URL, emailData, {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('Password reset email sent successfully:', response.data.messageId);

    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    if (axios.isAxiosError(error)) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}