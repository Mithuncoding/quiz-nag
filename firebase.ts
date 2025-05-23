// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics"; // Optional, but in user's config

// Your web app's Firebase configuration
// THIS IS PUBLIC AND SAFE TO INCLUDE. It identifies your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyBKWepQTLbCWylvOyNYLoq4ro4XcoD1Tw0",
  authDomain: "quiz-46b98.firebaseapp.com",
  projectId: "quiz-46b98",
  storageBucket: "quiz-46b98.firebasestorage.app",
  messagingSenderId: "662655938965",
  appId: "1:662655938965:web:0629803c4171d4ff91c69c",
  measurementId: "G-BHHL8Q2P0L" // Optional
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') { // Ensure analytics only initializes on client
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Firebase Analytics could not be initialized:", e);
  }
}


export { app, auth, db, analytics };
