import CryptoJS from 'crypto-js';

const SECRET_KEY = 'nexus-chat-e2ee-secret'; // In a real app, this would be derived per chat

export const encryptMessage = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptMessage = (ciphertext: string): string => {
  if (!ciphertext) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted && ciphertext) {
        // If it's not empty but decryption resulted in empty, it's likely not ciphertext or wrong key
        return ciphertext;
    }
    return decrypted || ciphertext;
  } catch (error) {
    // If decryption fails completely, return the original text instead of crashing
    return ciphertext;
  }
};
