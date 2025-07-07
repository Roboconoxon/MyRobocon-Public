
import nodemailer from 'nodemailer';
import { loadSettings } from '@/actions/settingsActions';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  const settings = await loadSettings();
  const smtpConfig = settings.smtpSettings;

  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    console.error("SMTP Email Service is not configured in Site Settings.");
    throw new Error("Email service is not configured on the server.");
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: Number(smtpConfig.port || 587),
    secure: Number(smtpConfig.port || 587) === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  const mailOptions = {
    from: `"${smtpConfig.fromName || 'MyRobocon Portal'}" <${smtpConfig.fromEmail || smtpConfig.user}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}
