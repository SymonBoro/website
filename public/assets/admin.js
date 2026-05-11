import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  increment,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBzsdOhrTI-_Ac7C6iDFe_WBFDSv4ogATQ",
  authDomain: "xpreward-febfc.firebaseapp.com",
  projectId: "xpreward-febfc"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


const loginSection = document.getElementById("adminLoginSection");
const adminApp = document.getElementById("adminApp");
const logoutBtn = document.getElementById("adminLogoutBtn");
const form = document.getElementById("adminLoginForm");


if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ❌ stop refresh

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login success");
    } catch (err) {
      console.error(err);
      alert("Login failed: " + err.message);
    }
  });
}


onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  console.log("Logged in UID:", user.uid);

  // 🔥 CHECK ADMIN COLLECTION
  const adminRef = doc(db, "admins", user.uid);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) {
    alert("❌ Not authorized as admin");
    await signOut(auth);
    return;
  }

  console.log("✅ Admin verified");

  loginSection.style.display = "none";
  adminApp.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  // LOAD DATA
  loadUsers();
  loadWithdrawals();
});


logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.reload();
});


async function loadUsers() {
  const container = document.getElementById("userList");
  container.innerHTML = "Loading users...";

  const snap = await getDocs(collection(db, "users"));

  container.innerHTML = "";

  snap.forEach((docSnap) => {
    const data = docSnap.data();

    const div = document.createElement("div");
    div.className = "list-item";

    div.innerHTML = `
      <strong>${docSnap.id}</strong>
      <p>XP: ${data.xp || 0}</p>
      <button>+100 XP</button>
    `;

    div.querySelector("button").onclick = async () => {
      await updateDoc(doc(db, "users", docSnap.id), {
        xp: increment(100)
      });
      alert("✅ XP Added");
      loadUsers();
    };

    container.appendChild(div);
  });
}


async function loadWithdrawals() {
  const container = document.getElementById("withdrawalList");
  container.innerHTML = "Loading withdrawals...";

  const snap = await getDocs(collection(db, "withdrawals"));

  container.innerHTML = "";

  snap.forEach((docSnap) => {
    const data = docSnap.data();

    const div = document.createElement("div");
    div.className = "list-item";

    div.innerHTML = `
      <strong>${data.userId}</strong>
      <p>₹${data.amount} - ${data.status}</p>
      <button>Approve</button>
    `;

    div.querySelector("button").onclick = async () => {
      await updateDoc(doc(db, "withdrawals", docSnap.id), {
        status: "approved"
      });
      alert("✅ Withdrawal Approved");
      loadWithdrawals();
    };

    container.appendChild(div);
  });
}
