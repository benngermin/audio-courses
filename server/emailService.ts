import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendMagicLinkEmail(toEmail: string, magicLinkUrl: string): Promise<boolean> {
  try {
    if (!resend) {
      console.warn('Email service not configured. Magic link:', magicLinkUrl);
      return true; // Return true to allow testing without email
    }
    
    const fromEmail = process.env.AUTH_FROM_EMAIL || 'Audio Courses <no-reply@audiocourses.theinstituteslab.org>';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to Audio Learning Platform</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
          <h1 style="color: #0066cc; margin-bottom: 20px;">Audio Courses</h1>
          <h2 style="color: #333; margin-bottom: 30px;">Sign in to your account</h2>
          
          <p style="font-size: 16px; margin-bottom: 30px;">Click the button below to securely sign in to your account:</p>
          
          <a href="${magicLinkUrl}" 
             style="display: inline-block; background: #0066cc; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Sign In
          </a>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This link expires in 15 minutes and can only be used once.
          </p>
          
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
              If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const textContent = `
      Sign in to Audio Courses
      
      Click this link to sign in: ${magicLinkUrl}
      
      This link expires in 15 minutes and can only be used once.
      
      If you didn't request this email, you can safely ignore it.
    `;
    
    const response = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Your Audio Courses sign-in link',
      html: htmlContent,
      text: textContent,
    });
    
    console.log(`Magic link email sent to ${toEmail}, response:`, response);
    return true;
  } catch (error) {
    console.error(`Failed to send magic link email to ${toEmail}:`, error);
    return false;
  }
}