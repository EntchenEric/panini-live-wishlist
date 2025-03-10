import crypto from 'crypto';

const encrypt = (text: string): string => {
    const secretKey = process.env.SECRET_KEY;
    const secretBuffer = process.env.SECRET_BUFFER;

    if (!secretKey || !secretBuffer) {
        throw new Error('SECRET_KEY or SECRET_BUFFER is missing in environment variables');
    }

    if (secretKey.length !== 32) {
        throw new Error('SECRET_KEY must be 32 bytes');
    }

    if (secretBuffer.length !== 16) {
        throw new Error('SECRET_BUFFER must be 16 bytes');
    }

    const key = Buffer.from(secretKey, 'utf8');
    const iv = Buffer.from(secretBuffer, 'utf8');

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};
export { encrypt }