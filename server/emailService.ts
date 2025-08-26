import { Resend } from 'resend';

// Initialize Resend with API key if available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Log initialization status
if (!resend) {
  console.warn('⚠️ Email service not configured - RESEND_API_KEY is missing');
} else {
  console.log('✅ Email service initialized with Resend');
}

export async function sendMagicLinkEmail(toEmail: string, magicLinkUrl: string): Promise<boolean> {
  // Check if we're in development mode and should log magic links for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  try {
    
    if (!resend) {
      console.warn('⚠️ Cannot send email - Resend not configured');
      console.warn('📧 Email would be sent to:', toEmail);
      console.warn('🔗 Magic link URL:', magicLinkUrl);
      console.warn('💡 To enable emails, add RESEND_API_KEY to your environment variables');
      
      // In development, still return true to allow testing the auth flow
      if (isDevelopment) {
        console.log('📝 Development mode: Magic link created (copy URL above to test)');
        return true;
      }
      return false;
    }
    
    // Use a verified domain for the from email
    // Note: For production, the domain must be verified in your Resend account
    // For testing with free accounts, you can only send to your own verified email
    const fromEmail = process.env.AUTH_FROM_EMAIL || 'onboarding@resend.dev';
    
    console.log('📧 Email configuration:', {
      to: toEmail,
      from: fromEmail,
      hasApiKey: !!process.env.RESEND_API_KEY,
      apiKeyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'not set'
    });
    
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
    
    console.log(`📤 Attempting to send magic link email...`);
    
    const response = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Your Audio Courses sign-in link',
      html: htmlContent,
      text: textContent,
    });
    
    // Log the full response for debugging
    console.log('📬 Resend API Response:', JSON.stringify(response, null, 2));
    
    // Check if response has data property (success case)
    if ('data' in response && response.data && response.data.id) {
      console.log(`✅ Email sent successfully!`, {
        id: response.data.id,
        to: toEmail,
        from: fromEmail
      });
      return true;
    }
    
    // Check for errors
    if ('error' in response && response.error) {
      console.error(`❌ Resend API error:`, response.error);
      
      // Common error explanations
      const errorMsg = typeof response.error === 'string' ? response.error : (response.error as any).message || JSON.stringify(response.error);
      
      if (errorMsg.includes('You can only send testing emails to your own email address')) {
        console.error('💡 Important: Your Resend account is in test mode.');
        console.error('   You can only send emails to your verified email address (shown in the error).');
        console.error('   To send to any email address:');
        console.error('   1. Verify a domain at https://resend.com/domains');
        console.error('   2. Update AUTH_FROM_EMAIL environment variable to use an email from that domain');
        console.error('   3. Or upgrade your Resend account');
        
        // In development, log the magic link for testing
        if (isDevelopment) {
          console.log('\n📝 Development mode: You can still test by copying this magic link:');
          console.log('🔗', magicLinkUrl);
          console.log('');
          return true; // Allow testing in development even if email fails
        }
      } else if (errorMsg.includes('domain')) {
        console.error('💡 Hint: Make sure your sending domain is verified in Resend');
      } else if (errorMsg.includes('API') || errorMsg.includes('key')) {
        console.error('💡 Hint: Check that your RESEND_API_KEY is valid');
      } else if (errorMsg.includes('from')) {
        console.error('💡 Hint: The from email must be from a verified domain or use onboarding@resend.dev for testing');
      }
      return false;
    }
    
    // Handle case where response might be just an ID string (success)
    if (typeof response === 'string') {
      console.log(`✅ Email sent successfully! ID: ${response}`);
      return true;
    }
    
    // Shouldn't reach here, but handle just in case
    console.warn('⚠️ Unexpected response format from Resend:', response);
    return false;
  } catch (error) {
    console.error(`❌ Exception while sending email:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
    }
    return false;
  }
}