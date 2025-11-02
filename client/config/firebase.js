import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBT5MuebkIZOizMgb0RvPprNsJj784hCSM",
  authDomain: "commutr-1060.firebaseapp.com",
  projectId: "commutr-1060",
  storageBucket: "commutr-1060.firebasestorage.app",
  messagingSenderId: "560327247015",
  appId: "1:560327247015:web:77b6ed2f6a3e4787508782",
  measurementId: "G-YH33X5JL59"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
