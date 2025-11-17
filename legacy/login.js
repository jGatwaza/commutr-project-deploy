import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "/firebase-config.js";

let app;
let auth;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (e) {
  console.error("Failed to initialize Firebase. Did you fill public/firebase-config.js?", e);
}

const statusEl = document.getElementById("login-status");
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || "";
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "/";
    }
  });
}

const btn = document.getElementById("google-btn");
if (btn) {
  btn.addEventListener("click", async () => {
    if (!auth) {
      setStatus("Missing Firebase config. Fill /public/firebase-config.js");
      return;
    }
    setStatus("Opening Google sign-in...");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setStatus("Signed in. Redirecting...");
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : "Sign-in failed");
    }
  });
}
