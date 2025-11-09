import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  MAIL_FROM_ADDRESS = 'no-reply@loan-manager.app',
  MAIL_FROM_NAME = 'Loan Manager',
} = process.env;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn('SMTP environment variables are not fully configured. Emails will not be sent.');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.info(`Email (not sent): ${subject} -> ${to}\n${html}`);
    return;
  }

  await mailer.sendMail({
    from: `${MAIL_FROM_NAME} <${MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  });
}

