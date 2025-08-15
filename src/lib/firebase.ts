// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // for Firestore DB

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHobHm1mjKiEqgsS7zunsLu3OD9n9GWyc",
  authDomain: "instagenius20.firebaseapp.com",
  projectId: "instagenius20",
  storageBucket: "instagenius20.appspot.com",  // ✅ fixed bucket name
  messagingSenderId: "283711629046",
  appId: "1:283711629046:web:46a4281019473cd68b2ed7",
  measurementId: "G-V486ELQ7J7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, db, analytics };
