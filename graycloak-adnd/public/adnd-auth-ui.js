// adnd-auth-ui.js v1.0.0
// Sign-in / sign-out UI and status display. Extracted from adnd-test.js
// when the Week 1 smoke test was retired.

(function() {

  const $ = id => document.getElementById(id);

  function render(user) {
    if (user) {
      $('status').textContent = `Signed in as ${user.displayName || user.email} (uid: ${user.uid})`;
      $('signin-btn').style.display = 'none';
      $('signout-btn').style.display = 'inline-block';
    } else {
      $('status').textContent = 'Not signed in';
      $('signin-btn').style.display = 'inline-block';
      $('signout-btn').style.display = 'none';
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

})();