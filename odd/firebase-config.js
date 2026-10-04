// firebase-config.js — the same Firebase project as GCC, graycloak-adnd and
// Traveller, so one sign-in works across every Graycloak game. These values
// are public by design; Firestore rules enforce security, not secrecy.
// Copied from traveller/client/firebase-config.js.

export const ODD_FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyCzSsI-NrUpts5sGQf23TqB9Y-skg2WpoY',
  authDomain: 'graycloaks-campaign-corner.firebaseapp.com',
  projectId: 'graycloaks-campaign-corner',
  storageBucket: 'graycloaks-campaign-corner.firebasestorage.app',
  messagingSenderId: '367365603870',
  appId: '1:367365603870:web:5a854f86d68ddbddd9e40f'
});
