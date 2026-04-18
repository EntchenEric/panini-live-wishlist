import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const _IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) throw new Error('SECRET_KEY is missing in environment variables');
  if (secretKey.length !== 32) throw new Error('SECRET_KEY must be 32 bytes');
  return Buffer.from(secretKey, 'utf8');
}

const decrypt = (encryptedText: string): string => {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected GCM format: iv:authTag:ciphertext');
  }

  const key = getKey();
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export { decrypt };