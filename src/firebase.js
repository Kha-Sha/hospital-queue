import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAu0dX5cb1s5e6KMfGMycMI9fRxdBu8EGA",
  authDomain: "hospital-queue-80a31.firebaseapp.com",
  projectId: "hospital-queue-80a31",
  storageBucket: "hospital-queue-80a31.firebasestorage.app",
  messagingSenderId: "986739720524",
  appId: "1:986739720524:web:389d313c1984885fd9cfe9",
  measurementId: "G-0NH8XVT0PW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);