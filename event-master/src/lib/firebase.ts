// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBBeFQkjXXyglk1wSxlw4pa-G47KpYKB8Y",
  authDomain: "virex-a686c.firebaseapp.com",
  projectId: "virex-a686c",
  storageBucket: "virex-a686c.firebasestorage.app",
  messagingSenderId: "183892430102",
  appId: "1:183892430102:web:8c04a7238216ada0975437",
  measurementId: "G-MXTQ06RSMF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app); // Initialize Database
export const analytics = getAnalytics(app);

export default app;