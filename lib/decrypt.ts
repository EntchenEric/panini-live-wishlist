import CryptoJS from 'crypto-js';

const decrypt = (encryptedText: string) => {
    const secretKey: string | undefined = process.env.SECRET_KEY;
    if (!secretKey) {
        throw "No secret key defined in env."
    }
    const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
};

export { decrypt }