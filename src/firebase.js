import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCU8gB21qsHCJ4oHniFJkN4KrIVyiz-t8w",
  authDomain: "fgcbrasil-banco.firebaseapp.com",
  projectId: "fgcbrasil-banco",
  storageBucket: "fgcbrasil-banco.firebasestorage.app",
  messagingSenderId: "891150279225",
  appId: "1:891150279225:web:e08068726d02da2abc23e8",
  measurementId: "G-5BEK0HGZ6W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };