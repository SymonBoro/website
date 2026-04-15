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
  return `\u20B9${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function showToast(message, persistent = false) {
  const toast = qs("#liveToast");
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden");

  if (!persistent) {
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
      toast.classList.add("hidden");
    }, 3600);
  }
}

function getReferralParam() {
  return new URLSearchParams(window.location.search).get("ref");
}

function getDeviceFingerprint() {
  const key = "xp_reward_fingerprint";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const randomId =
    window.crypto?.randomUUID?.() || `fp-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

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
  window.localStorage.setItem(key, encoded);
  return encoded;
}

function renderTaskPreview() {
  const grid = qs("#taskPreviewGrid");
  if (!grid || !state.summary) {
    return;
  }

  grid.innerHTML = state.summary.taskPreview
    .map(
      (task) => `
        <article class="task-card">
          <div class="task-meta">
            <div>
              <span class="muted-label">${task.category}</span>
              <h3>${task.title}</h3>
            </div>
            <span class="task-reward">${formatXp(task.rewardXp)}</span>
          </div>
          <div class="task-tags">
            <span class="tag">CPA verified</span>
            <span class="tag green">Mobile ready</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSummary() {
  if (!state.summary) {
    return;
  }

  qs("#statUsers").textContent = Number(state.summary.stats.totalUsers || 0).toLocaleString("en-IN");
  qs("#statXp").textContent = Number(state.summary.stats.xpDistributed || 0).toLocaleString("en-IN");
  qs("#statDaily").textContent = formatMoney(state.summary.stats.dailyEarningsInr || 0);
  qs("#rateText").textContent = `${state.summary.settings.xpPerInr} XP = \u20B91`;
  qs("#minimumText").textContent = `\u20B9${state.summary.settings.minimumWithdrawalInr}`;
  renderTaskPreview();
}

function rotateLiveFeed() {
  if (!state.summary?.liveFeed?.length) {
    return;
  }

  let index = 0;
  showToast(state.summary.liveFeed[index].text, true);
  window.setInterval(() => {
    index = (index + 1) % state.summary.liveFeed.length;
    showToast(state.summary.liveFeed[index].text, true);
  }, 4200);
}

function wireLoginButtons() {
  const login = () => {
    if (!state.summary?.googleConfigured) {
      showToast("Google OAuth is not configured yet. Add your credentials in .env first.");
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
  qs("#phoneInrBalance").textContent = `${formatMoney(inr)} ready for withdrawal`;
  qs("#phoneProgressText").textContent = `${progress}%`;
  qs("#phoneProgressBar").style.width = `${progress}%`;
}

function renderDashboardTasks() {
  const container = qs("#dashboardTasks");
  if (!container || !state.dashboard) {
    return;
  }

  container.innerHTML = state.dashboard.tasks
    .map(
      (task) => `
        <article class="task-card">
          <div class="task-meta">
            <div>
              <span class="muted-label">${task.category}</span>
              <h3>${task.title}</h3>
            </div>
            <span class="task-reward">${formatXp(task.rewardXp)}</span>
          </div>
          <p>${task.description}</p>
          <div class="task-tags">
            <span class="tag">${task.available ? "Available now" : "Cooldown / limit"}</span>
            ${task.limitedTime ? '<span class="tag green">Limited-time bonus</span>' : ""}
            ${task.featured ? '<span class="tag">Featured</span>' : ""}
          </div>
          <div class="row-actions">
            <button class="primary-button small-button start-task-btn" data-task-id="${task.id}" ${
              task.available ? "" : "disabled"
            }>
              ${task.available ? task.ctaLabel : task.dailyLimitReached ? "Daily limit reached" : `Wait ${task.cooldownRemainingMinutes}m`}
            </button>
          </div>
          <span class="subline">${task.trustNote}</span>
        </article>
      `
    )
    .join("");

  container.querySelectorAll(".start-task-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Preparing...";
      try {
        const payload = await api(`/api/tasks/${button.dataset.taskId}/start`, {
          method: "POST",
          body: JSON.stringify({ deviceFingerprint: getDeviceFingerprint() })
        });
        window.location.href = payload.gateUrl || payload.redirectUrl;
      } catch (error) {
        showToast(error.message);
        button.disabled = false;
        button.textContent = "Retry task";
      }
    });
  });
}

function renderActivity() {
  const list = qs("#activityList");
  if (!list || !state.dashboard) {
    return;
  }

  const completions = state.dashboard.recentCompletions.map((item) => ({
    label: item.title,
    meta: `${formatXp(item.rewardXp)} \u2022 ${item.status}`,
    date: item.createdAt
  }));
  const withdrawals = state.dashboard.recentWithdrawals.map((item) => ({
    label: `${item.method} withdrawal`,
    meta: `${formatMoney(item.inrAmount)} \u2022 ${item.status}`,
    date: item.createdAt
  }));

  const merged = [...completions, ...withdrawals]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 8);

  if (!merged.length) {
    list.innerHTML = `<div class="activity-item"><div><strong>No activity yet</strong><span class="subline">Your approved tasks and withdrawals will appear here.</span></div></div>`;
    return;
  }

  list.innerHTML = merged
    .map(
      (item) => `
        <div class="activity-item">
          <div>
            <strong>${item.label}</strong>
            <span class="subline">${item.meta}</span>
          </div>
          <span class="subline">${new Date(item.date).toLocaleDateString("en-IN")}</span>
        </div>
      `
    )
    .join("");
}

function renderDashboard() {
  if (!state.dashboard) {
    return;
  }

  const section = qs("#dashboard");
  section.classList.remove("hidden");

  qs("#dashboardGreeting").textContent = `Welcome back, ${state.dashboard.user.firstName || state.dashboard.user.displayName}`;
  qs("#dashboardXp").textContent = formatXp(state.dashboard.user.xpBalance);
  qs("#dashboardInr").textContent = `${formatMoney(state.dashboard.user.inrBalance)} available`;
  qs("#referralCode").textContent = state.dashboard.user.referralCode;
  qs("#referralShareUrl").textContent = state.dashboard.referrals.shareUrl;
  qs("#streakChip").textContent = `${state.dashboard.user.streakCount} day streak`;
  qs("#referralChip").textContent = `${formatXp(state.dashboard.user.referralXp)} referral XP`;
  qs("#levelLabel").textContent = `Level ${state.dashboard.user.level.currentLevel}`;
  qs("#levelProgressBar").style.width = `${state.dashboard.user.level.progress}%`;

  const avatar = qs("#userAvatar");
  if (state.dashboard.user.avatarUrl) {
    avatar.src = state.dashboard.user.avatarUrl;
    avatar.classList.remove("hidden");
  }

  renderPhoneWallet();
  renderDashboardTasks();
  renderActivity();
}

async function loadDashboard() {
  state.dashboard = await api("/api/user/dashboard");
  renderDashboard();
}

function wireDashboardActions() {
  qs("#copyReferralBtn")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.dashboard?.referrals?.shareUrl || "");
      showToast("Referral link copied.");
    } catch (_error) {
      showToast("Could not copy the referral link.");
    }
  });

  qs("#logoutBtn")?.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  });

  qs("#withdrawForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(form.get("amount")),
          method: form.get("method"),
          paymentDetails: form.get("paymentDetails")
        })
      });
      showToast("Withdrawal request created.");
      event.currentTarget.reset();
      await loadDashboard();
    } catch (error) {
      showToast(error.message);
    }
  });
}

function handleAuthError() {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get("authError");
  if (!authError) {
    return;
  }

  const messages = {
    "google-not-configured": "Google OAuth is not configured yet. Add your credentials in .env.",
    "google-login-failed": "Google sign-in failed. Please try again."
  };

  showToast(messages[authError] || "Authentication error.");
  params.delete("authError");
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

async function init() {
  handleAuthError();
  wireLoginButtons();
  wireDashboardActions();

  const [summary, auth] = await Promise.all([api("/api/public/home"), api("/api/auth/me")]);
  state.summary = summary;
  state.auth = auth;
  renderSummary();
  rotateLiveFeed();

  if (auth.authenticated) {
    await loadDashboard();
  } else {
    renderPhoneWallet();
  }
}

init().catch((error) => {
  showToast(error.message || "Failed to load XP Reward.");
});
