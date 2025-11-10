import crypto from 'crypto';

interface OtpOptions {
  digits?: number;
  ttlMs?: number;
}

export function generateOtp({ digits = 6, ttlMs = 1000 * 60 * 5 }: OtpOptions = {}) {
  const max = 10 ** digits;
  const min = 10 ** (digits - 1);
  const otp = (crypto.randomInt(min, max)).toString();
  const hash = crypto.createHash('sha256').update(otp).digest('hex');
  const expiresAt = new Date(Date.now() + ttlMs);
  return { otp, hash, expiresAt };
}

export function verifyOtp(provided: string, storedHash: string | undefined | null) {
  if (!storedHash) return false;
  const candidateHash = crypto.createHash('sha256').update(provided).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(storedHash));
}


