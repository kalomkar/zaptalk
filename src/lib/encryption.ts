import CryptoJS from 'crypto-js';

const SECRET_KEY = 'nexus-chat-e2ee-secret'; // In a real app, this would be derived per chat

export const encryptMessage = (text: string): string => {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
};

export const decryptMessage = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Decryption Error]';
  }
};
