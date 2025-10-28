import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "/firebase-config.js";

let app;
let auth;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (e) {
  console.error("Failed to initialize Firebase. Did you fill public/firebase-config.js?", e);
}

function setUserUI(user) {
  const emailEl = document.getElementById("user-email");
  const btn = document.getElementById("logout-btn");
  if (emailEl) {
    emailEl.textContent = user ? (user.displayName || user.email || "Signed in") : "";
  }
  if (btn) {
    btn.style.display = user ? "inline-block" : "none";
    btn.onclick = async () => {
      try {
        await signOut(auth);
        window.location.href = "/login.html";
      } catch (err) {
        console.error("Logout failed", err);
      }
    };
  }
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      if (location.pathname !== "/login.html") {
        location.href = "/login.html";
      }
    } else {
      setUserUI(user);
      if (location.pathname === "/login.html") {
        location.href = "/";
      }
    }
  });
}
