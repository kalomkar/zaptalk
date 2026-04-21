import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with settings to improve connectivity in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Help with connectivity in some environments
}, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Attempting to read a non-existent doc from server to verify connectivity
    await getDocFromServer(doc(db, 'system', 'connection-check'));
    console.log("Firestore connection verified");
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Firestore is offline. Please check your internet connection and Firebase config.");
    } else {
      console.error("Firestore connection error:", error);
    }
  }
}
testConnection();

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
