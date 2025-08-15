// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // for Firestore DB
import { getAuth } from "firebase/auth";

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

const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics only on the client side
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);


export { app, db, auth, analytics };
