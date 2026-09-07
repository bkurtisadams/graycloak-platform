// firebase-config.js v1.0.0
// The same Firebase project as GCC and graycloak-adnd, so one sign-in works
// across every Graycloak game. These values are public by design; security is
// enforced by Firestore rules, not by hiding them.
//
// Copied verbatim from graycloak-adnd/public/adnd-firebase-config.js.

export const TRAVELLER_FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyCzSsI-NrUpts5sGQf23TqB9Y-skg2WpoY',
  authDomain: 'graycloaks-campaign-corner.firebaseapp.com',
  projectId: 'graycloaks-campaign-corner',
  storageBucket: 'graycloaks-campaign-corner.firebasestorage.app',
  messagingSenderId: '367365603870',
  appId: '1:367365603870:web:5a854f86d68ddbddd9e40f'
});
