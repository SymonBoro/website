const state = {
  summary: null,
  auth: null,
  dashboard: null
};

const qs = (selector) => document.querySelector(selector);

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function formatXp(value) {
  return `${Number(value || 0).toLocaleString("en-IN")} XP`;
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;
}

function showToast(message, persistent = false) {
  const toast = qs("#liveToast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  if (!persistent) {
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
}

function getReferralParam() {
  return new URLSearchParams(window.location.search).get("ref");
}

function getDeviceFingerprint() {
  const key = "xp_reward_fingerprint";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const randomId =
    crypto?.randomUUID?.() ||
    `fp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const seed = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    randomId
  ].join("|");

  const encoded = btoa(seed).slice(0, 180);
  localStorage.setItem(key, encoded);
  return encoded;
}

function renderSummary() {
  if (!state.summary) return;

  qs("#statUsers").textContent =
    Number(state.summary.stats.totalUsers || 0).toLocaleString("en-IN");

  qs("#statXp").textContent =
    Number(state.summary.stats.xpDistributed || 0).toLocaleString("en-IN");

  qs("#statDaily").textContent = formatMoney(
    state.summary.stats.dailyEarningsInr || 0
  );

  qs("#rateText").textContent = `${state.summary.settings.xpPerInr} XP = ₹1`;
  qs("#minimumText").textContent = `₹${state.summary.settings.minimumWithdrawalInr}`;
}

function wireLoginButtons() {
  const login = () => {
    if (!state.summary?.googleConfigured) {
      showToast("Google login not configured.");
      return;
    }

    const ref = getReferralParam();
    const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    window.location.href = `/api/auth/google${suffix}`;
  };

  qs("#loginBtn")?.addEventListener("click", login);
  qs("#heroCta")?.addEventListener("click", login);
}

function renderPhoneWallet() {
  const xpPerInr = state.summary?.settings?.xpPerInr || 1000;
  const minInr = state.summary?.settings?.minimumWithdrawalInr || 100;
  const userXp = state.dashboard?.user?.xpBalance || 0;

  const inr = userXp / xpPerInr;
  const progress = Math.min(100, Math.round((inr / minInr) * 100));

  qs("#phoneXpBalance").textContent = formatXp(userXp);
  qs("#phoneInrBalance").textContent =
    `${formatMoney(inr)} ready for withdrawal`;

  qs("#phoneProgressText").textContent = `${progress}%`;
  qs("#phoneProgressBar").style.width = `${progress}%`;
}

function renderDashboard() {
  if (!state.dashboard) return;

  const section = qs("#dashboard");
  if (section) section.classList.remove("hidden");

  qs("#dashboardGreeting").textContent =
    `Welcome back, ${state.dashboard.user.firstName || "User"}`;

  qs("#dashboardXp").textContent =
    formatXp(state.dashboard.user.xpBalance);

  qs("#dashboardInr").textContent =
    `${formatMoney(state.dashboard.user.inrBalance)} available`;

  renderPhoneWallet();
}

async function loadDashboard() {
  state.dashboard = await api("/api/user/dashboard");
  renderDashboard();
}

async function init() {
  wireLoginButtons();

  const [summary, auth] = await Promise.all([
    api("/api/public/home"),
    api("/api/auth/me")
  ]);

  state.summary = summary;
  state.auth = auth;

  renderSummary();

  if (auth.authenticated) {
    await loadDashboard();
  } else {
    renderPhoneWallet();
  }
}

let localXP = localStorage.getItem("xp")
  ? parseInt(localStorage.getItem("xp"))
  : 0;

const XP_RATE = 1000;

function fallbackMode() {
  console.log("Running in LOCAL MODE");

  const section = document.getElementById("dashboard");
  if (section) section.classList.remove("hidden");

  function updateUI() {
    const xpDisplay = document.getElementById("dashboardXp");
    const inrDisplay = document.getElementById("dashboardInr");

    if (xpDisplay) xpDisplay.innerText = localXP + " XP";

    const inr = (localXP / XP_RATE).toFixed(2);
    if (inrDisplay) inrDisplay.innerText = "₹" + inr;

    const phoneXP = document.getElementById("phoneXpBalance");
    const phoneINR = document.getElementById("phoneInrBalance");

    if (phoneXP) phoneXP.innerText = localXP + " XP";
    if (phoneINR)
      phoneINR.innerText = "₹" + inr + " ready for withdrawal";
  }

  function saveXP() {
    localStorage.setItem("xp", localXP);
  }

  document.querySelectorAll(".task-card button:not([data-init])")
    .forEach((btn) => {
      btn.setAttribute("data-init", "true");

      btn.addEventListener("click", () => {
        const rewardText =
          btn.parentElement.querySelector("strong").innerText;

        const reward = parseInt(rewardText.replace(/\D/g, ""));

        localXP += reward;
        saveXP();
        updateUI();

        btn.innerText = "Completed ✅";
        btn.disabled = true;

        showToast("+" + reward + " XP earned 🎉");
      });
    });

  updateUI();
}

init().catch((error) => {
  console.error(error);
  showToast("Server offline — running demo mode ⚡");
  fallbackMode();
});
