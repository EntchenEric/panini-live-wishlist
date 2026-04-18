import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) throw new Error('SECRET_KEY is missing in environment variables');
  if (secretKey.length !== 32) throw new Error('SECRET_KEY must be 32 bytes');
  return Buffer.from(secretKey, 'utf8');
}

const encrypt = (text: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export { encrypt };