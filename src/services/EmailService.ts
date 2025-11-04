/**
 * Email Service
 * Handles sending emails via Resend
 */

import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private resend: Resend | null = null;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env['RESEND_API_KEY'];
    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      console.log('✅ Resend configured successfully');
    } else {
      console.warn('⚠️  Resend API key not found. Email functionality will be disabled.');
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.resend) {
      console.warn('⚠️  Resend not configured. Email not sent.');
      console.log('📧 Email would have been sent to:', options.to);
      console.log('📧 Subject:', options.subject);
      return false;
    }

    try {
      const fromEmail = process.env['RESEND_FROM_EMAIL'] || 'onboarding@resend.dev';
      const fromName = process.env['RESEND_FROM_NAME'] || 'Flowence';

      await this.resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log('✅ Email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(
    email: string,
    storeName: string,
    inviterName: string,
    invitationUrl: string,
    expiresAt: Date
  ): Promise<boolean> {
    const expirationDate = expiresAt.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const subject = `Invitación para unirte a ${storeName} en Flowence`;

    const text = `
Hola,

${inviterName} te ha invitado a unirte a ${storeName} en Flowence.

Para aceptar la invitación y crear tu cuenta, haz clic en el siguiente enlace:
${invitationUrl}

Esta invitación expirará el ${expirationDate}.

Si no esperabas esta invitación, puedes ignorar este correo.

Saludos,
El equipo de Flowence
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a Flowence</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Flowence</h1>
    <h2 style="color: #1f2937; margin-bottom: 20px;">Invitación para unirte a ${storeName}</h2>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hola,
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> te ha invitado a unirte a <strong>${storeName}</strong> en Flowence.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationUrl}" 
         style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
        Aceptar Invitación
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      O copia y pega este enlace en tu navegador:<br>
      <a href="${invitationUrl}" style="color: #2563eb; word-break: break-all;">${invitationUrl}</a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      <strong>Nota:</strong> Esta invitación expirará el ${expirationDate}.
    </p>
  </div>
  
  <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">
    <p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
    <p style="margin-top: 10px;">© ${new Date().getFullYear()} Flowence. Todos los derechos reservados.</p>
  </div>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to: email,
      subject,
      text,
      html
    });
  }
}

export const emailService = new EmailService();
