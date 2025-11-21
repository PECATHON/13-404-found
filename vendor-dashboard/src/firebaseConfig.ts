import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAEDCYovFDcs07y3cIbSxzOGF3QOUUsZgA",
  authDomain: "dormdashbykris.firebaseapp.com",
  projectId: "dormdashbykris",
  storageBucket: "dormdashbykris.firebasestorage.app",
  messagingSenderId: "1066950302072",
  appId: "1:1066950302072:web:89831b624100efd01bd08d",
  measurementId: "G-981ZKC7GYV"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
