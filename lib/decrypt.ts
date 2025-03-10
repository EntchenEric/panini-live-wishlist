import crypto from 'crypto';

const decrypt = (encryptedText: string) => {
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
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;

};

export { decrypt }