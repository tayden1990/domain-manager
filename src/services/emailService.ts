import axios from 'axios';

export class EmailService {
  private serviceId: string;
  private templateId: string;
  private publicKey: string;
  private privateKey?: string;

  constructor(serviceId: string, templateId: string, publicKey: string, privateKey?: string) {
    this.serviceId = serviceId;
    this.templateId = templateId;
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    // Development mode - always log the code
    console.log(`🔐 VERIFICATION CODE for ${email}: ${code}`);
    console.log(`📧 Copy this code to verify: ${code}`);
    
    try {
      // Try EmailJS with correct API format
      const emailJSResult = await this.sendViaEmailJS(email, code);
      if (emailJSResult) {
        console.log('✅ Email sent successfully via EmailJS!');
        return true;
      }
    } catch (error) {
      console.warn('EmailJS failed, but code is shown above');
    }
    
    return true; // Always return true for development
  }

  private async sendViaEmailJS(email: string, code: string): Promise<boolean> {
    try {
      // Use the successful template params (set 2) that worked
      const payload: any = {
        service_id: this.serviceId,
        template_id: this.templateId,
        user_id: this.publicKey,
        template_params: {
          email: email,
          code: code,
          name: 'User',
          subject: 'Domain Manager Bot - Email Verification',
          message: `Your Domain Manager Bot verification code is: ${code}`,
          verification_code: code, // Add this as backup
          to_email: email // Add this as backup
        }
      };

      if (this.privateKey) {
        payload.accessToken = this.privateKey;
      }

      console.log(`📤 Sending EmailJS request with verified template params...`);
      console.log(`📧 Variables being sent:`, {
        email: email,
        code: code,
        name: 'User',
        subject: 'Domain Manager Bot - Email Verification'
      });
      
      const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200) {
        console.log(`✅ EmailJS success! Check your email for the verification code.`);
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.response?.status === 422) {
        console.error('EmailJS 422 error - template parameters mismatch');
        console.error('Response data:', error.response.data);
        console.log('💡 Your template needs these variables:');
        console.log('   {{email}} - recipient email');
        console.log('   {{code}} - verification code');
        console.log('   {{name}} - recipient name');
        console.log('   {{subject}} - email subject');
        console.log('   {{message}} - email message body');
      } else if (error.response?.status === 400) {
        console.error('EmailJS 400 error - check template variables:', error.response.data);
      } else if (error.response?.status === 403) {
        console.error('EmailJS 403 error - check your API keys and account settings');
      } else {
        console.error('EmailJS error:', error.message);
      }
      throw error;
    }
  }

  generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
