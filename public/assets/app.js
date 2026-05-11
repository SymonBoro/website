import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzsdOhrTI-_Ac7C6iDFe_WBFDSv4ogATQ",
  authDomain: "xpreward-febfc.firebaseapp.com",
  projectId: "xpreward-febfc"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userRef = null;

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");

  if (!btn) {
    console.log("Login button not found");
    return;
  }

  btn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  });
});

const ADMIN_EMAIL = "xpreward125@gmail.com";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  if (user.email === ADMIN_EMAIL) {
    window.location.href = "/admin.html";
    return;
  }

  userRef = doc(db, "users", user.uid);

  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      xp: 0,
      createdAt: new Date()
    });
  }

  document.getElementById("dashboard")?.classList.remove("hidden");
  document.getElementById("loginBtn").style.display = "none";

  listenXP();
  setupTasks();
});

function listenXP() {
  onSnapshot(userRef, (docSnap) => {
    const xp = docSnap.data().xp || 0;
    const inr = (xp / 1000).toFixed(2);

    document.getElementById("dashboardXp").innerText = xp + " XP";
    document.getElementById("dashboardInr").innerText = "₹" + inr;

    document.getElementById("phoneXpBalance").innerText = xp + " XP";
    document.getElementById("phoneInrBalance").innerText =
      "₹" + inr + " ready for withdrawal";
  });
}

function setupTasks() {
  document.querySelectorAll(".task-card button").forEach((btn, index) => {
    btn.addEventListener("click", async () => {

      const taskId = "task_" + index;
      const now = Date.now();

      const snap = await getDoc(userRef);
      const data = snap.data();

      const last = data[taskId] || 0;

      if (now - last < 60000) {
        alert("Wait 1 minute");
        return;
      }

      const rewardText = btn.parentElement.querySelector("strong").innerText;
      const reward = parseInt(rewardText.replace(/\D/g, ""));

      await updateDoc(userRef, {
        xp: increment(reward),
        [taskId]: now
      });

      btn.innerText = "Completed ✅";
      btn.disabled = true;

      setTimeout(() => {
        btn.innerText = "Start Task";
        btn.disabled = false;
      }, 60000);
    });
  });
}

document.getElementById("withdrawForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const amount = parseInt(e.target.amount.value);
  const xpNeeded = amount * 1000;

  const snap = await getDoc(userRef);
  const xp = snap.data().xp || 0;

  if (xp < xpNeeded) {
    alert("Not enough XP");
    return;
  }

  await updateDoc(userRef, {
    xp: increment(-xpNeeded)
  });

  await addDoc(collection(db, "withdrawals"), {
    userId: userRef.id,
    amount,
    status: "pending",
    createdAt: new Date()
  });

  alert("Withdrawal requested!");
});
