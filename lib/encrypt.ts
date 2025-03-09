import CryptoJS from 'crypto-js';

const encrypt = (text: string) => {
    const secretKey: string | undefined = process.env.SECRET_KEY;
    if (!secretKey) {
        throw "No secret key defined in env."
    }
    const encrypted = CryptoJS.AES.encrypt(text, secretKey).toString();
    return encrypted;
};

export { encrypt }