import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAqmfMhByHGIkD4Q1z4J9Kj3WmhxvO_tH8",
  authDomain: "barber-blueprint.firebaseapp.com",
  projectId: "barber-blueprint",
  storageBucket: "barber-blueprint.firebasestorage.app",
  messagingSenderId: "1020768949297",
  appId: "1:1020768949297:web:567c48bc3bbc2e98537110",
  measurementId: "G-K39ZPXBW35"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
