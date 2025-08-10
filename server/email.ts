import nodemailer from 'nodemailer';

// Email configuration
const createTransporter = () => {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    // Gmail SMTP configuration
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  } else {
    // Development fallback - log emails to console
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }
};

export async function sendVerificationEmail(email: string, token: string) {
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.GMAIL_USER || 'noreply@atomtools.ai',
    to: email,
    subject: 'Verify your atomtools.ai account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Account</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #0f0f23; color: #e2e8f0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: #1a1a2e; border-radius: 12px; padding: 40px; border: 1px solid #2d2d44;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #6366f1; font-size: 28px; font-weight: 700; margin: 0;">atomtools.ai</h1>
              <p style="color: #94a3b8; font-size: 16px; margin: 8px 0 0 0;">AI-Powered Marketing Tools</p>
            </div>
            
            <!-- Main Content -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h2 style="color: #f1f5f9; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                Verify Your Email Address
              </h2>
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thanks for signing up! Please click the button below to verify your email address and activate your account.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${verificationUrl}" 
                 style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; 
                        padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <!-- Alternative Link -->
            <div style="text-align: center; margin-bottom: 24px;">
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #6366f1; font-size: 14px; word-break: break-all; margin: 0;">
                ${verificationUrl}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #2d2d44; padding-top: 24px; text-align: center;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                This verification link will expire in 24 hours for security reasons.
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 8px 0 0 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to atomtools.ai!
      
      Please verify your email address by clicking this link:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development' && !process.env.GMAIL_USER) {
      console.log('📧 Verification email (development mode):');
      console.log('To:', email);
      console.log('Verification URL:', verificationUrl);
      console.log('---');
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}