export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  console.info(
    'Email delivery is disabled. The following message was not sent:',
    JSON.stringify({ to, subject, html }, null, 2),
  );
}

