const { NOTIFYLK_USER_ID, NOTIFYLK_API_KEY, NOTIFYLK_SENDER_ID } = process.env;

interface SendSmsOptions {
  to: string;
  message: string;
}

function normalizePhoneNumber(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return `94${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `94${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('94')) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('+94')) {
    return digits.slice(1);
  }
  return digits;
}

export async function sendSms({ to, message }: SendSmsOptions) {
  if (!NOTIFYLK_USER_ID || !NOTIFYLK_API_KEY || !NOTIFYLK_SENDER_ID) {
    throw new Error('Notify.lk credentials are not configured.');
  }

  if (!to) {
    throw new Error('A recipient phone number is required for SMS delivery.');
  }

  const normalizedTo = normalizePhoneNumber(to);
  if (!/^94\d{9}$/.test(normalizedTo)) {
    throw new Error(
      'Customer phone number must include Sri Lankan country code (e.g., 94771234567).',
    );
  }

  const body = new URLSearchParams({
    user_id: NOTIFYLK_USER_ID,
    api_key: NOTIFYLK_API_KEY,
    sender_id: NOTIFYLK_SENDER_ID,
    to: normalizedTo,
    message,
  });

  const response = await fetch('https://app.notify.lk/api/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  let payload: unknown = null;
  let rawText: string | null = null;

  try {
    payload = await response.json();
  } catch {
    try {
      rawText = await response.text();
    } catch {
      rawText = null;
    }
  }

  if (!response.ok) {
    const messageFromPayload =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : rawText || `Failed to send SMS (status ${response.status})`;
    console.error('[notify.lk] request failed', {
      status: response.status,
      body: payload ?? rawText,
    });
    throw new Error(messageFromPayload);
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    !('status' in payload) ||
    (payload as { status: unknown }).status !== 'success'
  ) {
    const errorMessage =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : rawText || 'Notify.lk did not confirm SMS delivery.';
    console.error('[notify.lk] unexpected response', { payload, rawText });
    throw new Error(errorMessage);
  }

  return payload;
}


