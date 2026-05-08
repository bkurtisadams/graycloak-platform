// adnd-test.js v1.0.0
// Week 1 smoke test — proves auth + Firestore read/write pipe works.

(function() {

  const $ = id => document.getElementById(id);

  function render(user) {
    if (user) {
      $('status').textContent = `Signed in as ${user.displayName || user.email} (uid: ${user.uid})`;
      $('signin-btn').style.display = 'none';
      $('signout-btn').style.display = 'inline-block';
      $('test-section').style.display = 'block';
    } else {
      $('status').textContent = 'Not signed in';
      $('signin-btn').style.display = 'inline-block';
      $('signout-btn').style.display = 'none';
      $('test-section').style.display = 'none';
    }
  }

  ADNDAuth.onAuthChange(render);

  $('signin-btn').addEventListener('click', async () => {
    try { await ADNDAuth.signInWithGoogle(); }
    catch(e) { alert('Sign-in failed: ' + e.message); }
  });

  $('signout-btn').addEventListener('click', async () => {
    await ADNDAuth.signOut();
  });

  $('test-write-btn').addEventListener('click', async () => {
    const user = ADNDAuth.getUser();
    const db = ADNDAuth.getDb();
    if (!user || !db) return;
    const out = $('test-output');
    out.textContent = 'Writing…';
    try {
      const ts = new Date().toISOString();
      await db.collection('users').doc(user.uid)
              .collection('adnd_test').doc('ping')
              .set({ ts, message: 'hello from adnd.graycloak.net' });
      const snap = await db.collection('users').doc(user.uid)
                           .collection('adnd_test').doc('ping').get();
      out.textContent = 'Write + read succeeded at ' + ts +
                        '\nRead back: ' + JSON.stringify(snap.data(), null, 2);
    } catch(e) {
      out.textContent = 'FAILED: ' + e.message +
                        '\n(likely Firestore security rules — see README)';
    }
  });

})();
