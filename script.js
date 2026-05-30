/* ─── DARK MODE ─────────────────────────────── */
function toggleDark(){
  document.body.classList.toggle('dark');
  const btn = document.querySelector('.btn-icon[onclick="toggleDark()"]');
  btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

/* ─── HAMBURGER ─────────────────────────────── */
function toggleMenu(){
  const ul = document.getElementById('nav-links');
  const btn = document.getElementById('ham-btn');
  const open = ul.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
}

/* ─── MOBILE POEM TABS ──────────────────────── */
function switchTab(which, btn){

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  const orig = document.getElementById('panel-orig');
  const trans = document.getElementById('panel-trans');

  if(which === 'orig'){
    orig.classList.remove('hidden');
    trans.classList.add('hidden');
  } else {
    trans.classList.remove('hidden');
    orig.classList.add('hidden');
  }
}

/* ─── PROGRESS BAR ──────────────────────────── */
window.addEventListener('scroll',()=>{
  const scrolled = document.documentElement.scrollTop;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  // FIX 4: Guard against division by zero when page has no scroll
  const pct = total > 0 ? (scrolled / total * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';

  const backTop = document.getElementById('back-top');
  scrolled > 400 ? backTop.classList.add('visible') : backTop.classList.remove('visible');
});

/* ─── REVEAL ON SCROLL ──────────────────────── */
const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{threshold:0.12});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

/* ─── ANIMATE HERO ON LOAD ──────────────────── */
window.addEventListener('load',()=>{
  document.querySelectorAll('.hero .reveal').forEach(el=>el.classList.add('visible'));
});

/* ─── CLOSE MENU ON LINK CLICK ──────────────── */
document.querySelectorAll('#nav-links a').forEach(a=>{
  a.addEventListener('click',()=>{
    document.getElementById('nav-links').classList.remove('open');
  });
});

/* ─── AUTH LOGIC ──────────────────────────────────────────────── */
// Initialize Firebase Auth
const auth = firebase.auth();
// Initialize Firestore (used for username uniqueness)
const db = firebase.firestore();

// FIX 1: Removed unused hashPassword() — Firebase handles password hashing securely on its own.
// Never hash passwords before passing them to Firebase; it would break login.

/* Password strength validator */
function validatePassword(pwd) {
  const lengthOk  = pwd.length >= 8;
  const upperOk   = /[A-Z]/.test(pwd);
  const numberOk  = /[0-9]/.test(pwd);
  const specialOk = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  return lengthOk && upperOk && numberOk && specialOk;
}

/* ── Helper: show / hide inline form messages ── */
function showFormMsg(elId, msg, isError = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.classList.toggle('form-msg--error',   isError);
  el.classList.toggle('form-msg--success', !isError);
}

function hideFormMsg(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = 'none';
}

// FIX 3 & 5: Clear all inline messages — called when modal closes
function resetAllFormMessages() {
  ['username-error', 'password-error', 'register-error', 'register-success', 'login-error']
    .forEach(hideFormMsg);
}

/* Show / hide the auth modal */
function toggleAuthModal(open) {
  const modal = document.getElementById('auth-modal');
  modal.classList.toggle('modal-hidden', !open);
  if (!open) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    // FIX 3: Clear all error/success messages when modal is closed
    resetAllFormMessages();
  }
}

/* Switch between Login and Register tabs */
function switchAuthTab(target) {
  document.querySelectorAll('.auth-tab').forEach(tab =>
    tab.classList.toggle('active', tab.dataset.target === target)
  );
  document.getElementById('login-form').classList.toggle('hidden', target !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', target !== 'register');
}

/* Password-visibility toggle */
function togglePwdVisibility(btn) {
  // Find the nearest input element within the same label/container
  let input = btn.previousElementSibling;
  while (input && input.tagName !== 'INPUT') {
    input = input.previousElementSibling;
  }
  // Fallback: search within the parent element if not found
  if (!input) {
    input = btn.parentElement.querySelector('input[type="password"], input[type="text"]');
  }
  if (!input) return; // safety check
  const newType = input.type === 'password' ? 'text' : 'password';
  input.type = newType;
  btn.textContent = newType === 'password' ? '👁️' : '👀';
}

/* Register form handler */
async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const pwd = form.password.value;
  const usernameRaw = form.username?.value?.trim();
  const username = usernameRaw ? usernameRaw.toLowerCase() : '';
  const displayName = usernameRaw ? usernameRaw : '';

  // Reset all inline messages at the start of each attempt
  hideFormMsg('username-error');
  hideFormMsg('password-error');
  hideFormMsg('register-error');
  hideFormMsg('register-success');

  // Username is required
  if (!username) {
    showFormMsg('username-error', 'Username is required.');
    return;
  }

  // Enforce strong password rules
  if (!validatePassword(pwd)) {
    showFormMsg('password-error', 'Password must be 8+ characters, include an uppercase letter, a number and a special character.');
    return;
  }

  // Username uniqueness check (always runs)
  try {
    const snap = await db.collection('usernames').doc(username).get();
    if (snap.exists) {
      showFormMsg('username-error', 'Username already taken. Please choose another.');
      return;
    }
  } catch (dbErr) {
    console.error('Username check failed:', dbErr);
    showFormMsg('username-error', 'Could not verify username uniqueness. Please try again later.');
    return;
  }

  // Create the account
  let result;
  try {
    result = await auth.createUserWithEmailAndPassword(email, pwd);
  } catch (err) {
    let friendlyMsg;
    switch (err.code) {
      case 'auth/email-already-in-use':
        friendlyMsg = 'An account with this email already exists.';
        break;
      case 'auth/invalid-email':
        friendlyMsg = 'The email address is badly formatted.';
        break;
      case 'auth/operation-not-allowed':
        friendlyMsg = 'Email/password sign-in is disabled for this project.';
        break;
      default:
        friendlyMsg = err.message;
    }
    showFormMsg('register-error', friendlyMsg);
    return;
  }

  // Save username to Firestore — roll back account if it fails
  try {
    await db.collection('usernames').doc(username).set({ uid: result.user.uid });
    await result.user.updateProfile({ displayName });
  } catch (saveErr) {
    console.error('Username save failed:', saveErr);
    await result.user.delete().catch(delErr => console.error('Rollback failed:', delErr));
    showFormMsg('register-error', 'Registration failed while saving your username. Please try again.');
    return;
  }

  // All steps succeeded — show success message, then auto-switch to login after 2 seconds
  showFormMsg('register-success', 'Registration successful – you can now log in!', false);
  setTimeout(() => {
    hideFormMsg('register-success');
    switchAuthTab('login');
  }, 2000);
  auth.signOut().catch(err => console.error('Sign-out failed:', err));
}

/* Login form handler */
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const pwd = form.password.value;

  // Reset inline message at the start of each attempt
  hideFormMsg('login-error');

  try {
    const cred = await auth.signInWithEmailAndPassword(email, pwd);
    toggleAuthModal(false);
    if (cred && cred.user) {
      const name = cred.user.displayName || cred.user.email;
      sessionStorage.setItem('greetingName', name);
    }
    sessionStorage.setItem('loginJustHappened', 'true');
    window.location.reload();
  } catch (err) {
    let friendlyMsg;
    switch (err.code) {
      case 'auth/user-not-found':
        friendlyMsg = 'No account found for that email.';
        break;
      case 'auth/wrong-password':
        friendlyMsg = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        friendlyMsg = 'The email address is badly formatted.';
        break;
      case 'auth/invalid-login-credentials':
        friendlyMsg = 'Invalid login credentials. Please check your email and password.';
        break;
      default:
        friendlyMsg = err.message;
    }
    showFormMsg('login-error', friendlyMsg);
    if (form) form.reset();
  }
}

/* Initialise UI according to stored session */
function initAuthState() {
  const authBtn   = document.getElementById('auth-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const greetSpan = document.getElementById('user-greeting');
  const nameEl    = document.getElementById('user-name');

  const justLoggedIn = sessionStorage.getItem('loginJustHappened') === 'true';
  const storedName = sessionStorage.getItem('greetingName');
  if (justLoggedIn && storedName) {
    if (authBtn) authBtn.style.display = 'none';
    if (logoutBtn) {
      logoutBtn.hidden = false;
      logoutBtn.style.display = '';
    }
    greetSpan.classList.remove('hidden');
    nameEl.textContent = storedName;
    if (document.body.classList.contains('preload')) {
      document.body.classList.remove('preload');
    }
    sessionStorage.removeItem('greetingName');
    sessionStorage.removeItem('loginJustHappened');
    return;
  }

  const user = auth.currentUser;
  if (user) {
    if (authBtn) authBtn.style.display = 'none';
    if (logoutBtn) {
      logoutBtn.hidden = false;
      logoutBtn.style.display = '';
    }
    greetSpan.classList.remove('hidden');
    const displayName = user.displayName || user.email;
    nameEl.textContent = displayName;
  } else {
    if (authBtn) authBtn.style.display = '';
    if (logoutBtn) {
      logoutBtn.hidden = true;
      logoutBtn.style.display = 'none';
    }
    greetSpan.classList.add('hidden');
    nameEl.textContent = '';
  }
}

/* Logout – clears session */
function handleLogout() {
  auth.signOut()
    .then(() => {
      window.location.reload();
    })
    .catch(err => console.error('Logout error', err));
}

// FIX 2: Removed clearAccounts() — it only cleared old localStorage keys that no
// longer exist in the Firebase setup and gave a false impression of deleting accounts.

/* Run after the page loads */
window.addEventListener('load', () => {
  initAuthState();
  if (sessionStorage.getItem('postRegisterShowLogin') === 'true') {
    toggleAuthModal(true);
    switchAuthTab('login');
    sessionStorage.removeItem('postRegisterShowLogin');
  }
  document.body.classList.remove('preload');

  const authBtn = document.getElementById('auth-btn');
  if (authBtn) authBtn.addEventListener('click', () => toggleAuthModal(true));

  // FIX 5: modal-close (X button) now also clears inline messages via toggleAuthModal(false)
  const modalClose = document.querySelector('.modal-close');
  if (modalClose) modalClose.addEventListener('click', () => toggleAuthModal(false));

  const logoutClose = document.getElementById('logout-close');
  if (logoutClose) logoutClose.addEventListener('click', () => toggleLogoutModal(false));

  const cancelLogout = document.getElementById('cancel-logout');
  if (cancelLogout) cancelLogout.addEventListener('click', () => toggleLogoutModal(false));

  const confirmLogout = document.getElementById('confirm-logout');
  if (confirmLogout) confirmLogout.addEventListener('click', () => { handleLogout(); toggleLogoutModal(false); });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => toggleLogoutModal(true));

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.target));
  });

  const registerForm = document.getElementById('register-form');
  const loginForm    = document.getElementById('login-form');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (loginForm)    loginForm.addEventListener('submit', handleLogin);

  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => togglePwdVisibility(btn));
  });
});

// Firebase auth state listener
auth.onAuthStateChanged(() => initAuthState());

/* Show / hide the logout confirmation modal */
function toggleLogoutModal(open) {
  const modal = document.getElementById('logout-modal');
  modal.classList.toggle('modal-hidden', !open);
}

/* ─── END OF AUTH LOGIC ──────────────────────────────────────────────── */
