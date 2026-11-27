// Explicit opt-in to a separate demo Firebase project. Never writes to the existing Graycloak project.
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
export async function connectLobby() {
    const [appSdk, authSdk, fnSdk] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-functions.js`)]);
    const app = appSdk.getApps().find(a => a.name === 'gw-dev-lobby') ?? appSdk.initializeApp({ apiKey: 'demo-key', authDomain: 'demo-graycloak-gw.firebaseapp.com', projectId: 'demo-graycloak-gw', appId: '1:123:web:gammaworld' }, 'gw-dev-lobby');
    const auth = authSdk.getAuth(app), fns = fnSdk.getFunctions(app, 'us-central1');
    authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
    fnSdk.connectFunctionsEmulator(fns, '127.0.0.1', 5101);
    const call = fnSdk.httpsCallable(fns, 'gwLobby');
    return { onUser: cb => authSdk.onAuthStateChanged(auth, cb), signIn: (e, p) => authSdk.signInWithEmailAndPassword(auth, e, p), register: (e, p) => authSdk.createUserWithEmailAndPassword(auth, e, p), signOut: () => authSdk.signOut(auth), list: async () => (await call({ op: 'list' })).data.messages, send: async (name, message, commandId) => (await call({ op: 'send', name, message, commandId })).data };
}
