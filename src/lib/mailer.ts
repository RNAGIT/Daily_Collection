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
    console.warn(
      '[mailer] SMTP variables missing. Emails will be logged instead of delivered.',
    );
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
    console.info(
      '[mailer] Email (not sent due to missing SMTP config):',
      JSON.stringify({ to, subject, html }, null, 2),
    );
    return;
  }

  await mailer.sendMail({
    from: `${MAIL_FROM_NAME} <${MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  });
}


