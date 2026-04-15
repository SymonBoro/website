const adminState = {
  overview: null,
  tasks: [],
  users: [],
  completions: [],
  withdrawals: []
};

const adminQs = (selector) => document.querySelector(selector);

async function adminApi(url, options = {}) {
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

function adminToast(message) {
  window.alert(message);
}

function renderSummaryCards() {
  const root = adminQs("#adminSummary");
  const summary = adminState.overview.summary;
  root.innerHTML = `
    <article class="stat-card">
      <span>Total users</span>
      <strong>${summary.totalUsers}</strong>
      <p>All registered Google accounts</p>
    </article>
    <article class="stat-card">
      <span>Suspicious users</span>
      <strong>${summary.suspiciousUsers}</strong>
      <p>Accounts requiring review</p>
    </article>
    <article class="stat-card">
      <span>Pending completions</span>
      <strong>${summary.pendingCompletions}</strong>
      <p>Awaiting postback or admin action</p>
    </article>
    <article class="stat-card">
      <span>Pending withdrawals</span>
      <strong>${summary.pendingWithdrawals}</strong>
      <p>Need approval or payout</p>
    </article>
  `;
}

function renderSettings() {
  const settings = adminState.overview.settings;
  const form = adminQs("#settingsForm");
  form.xpPerInr.value = settings.economy.xpPerInr;
  form.minimumWithdrawalInr.value = settings.economy.minimumWithdrawalInr;
  form.dailyEarningCapXp.value = settings.economy.dailyEarningCapXp;
  form.inviteBonusXp.value = settings.referrals.inviteBonusXp;
  form.contentLockerSeconds.value = settings.security.contentLockerSeconds;
  form.maxAccountsPerDevice.value = settings.security.maxAccountsPerDevice;
  form.maxAccountsPerIp.value = settings.security.maxAccountsPerIp;
}

function offerTemplate(offer = {}) {
  return `
    <div class="offer-item">
      <input type="text" data-field="name" placeholder="Offer name" value="${offer.name || ""}" />
      <input type="text" data-field="network" placeholder="Network" value="${offer.network || ""}" />
      <input type="url" data-field="url" placeholder="https://example.com/offer" value="${offer.url || ""}" />
      <input type="number" data-field="rotationWeight" min="1" placeholder="Weight" value="${offer.rotationWeight || 1}" />
      <label class="checkbox-label">
        <input type="checkbox" data-field="contentLocker" ${offer.contentLocker ? "checked" : ""} />
        Locker
      </label>
      <button class="ghost-button small-button remove-offer-btn" type="button">Remove</button>
    </div>
  `;
}

function bindOfferRemove() {
  adminQs("#offerList").querySelectorAll(".remove-offer-btn").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".offer-item").remove();
    });
  });
}

function addOfferRow(offer) {
  adminQs("#offerList").insertAdjacentHTML("beforeend", offerTemplate(offer));
  bindOfferRemove();
}

function renderTasks() {
  const root = adminQs("#adminTaskList");
  root.innerHTML = adminState.tasks
    .map(
      (task) => `
        <div class="table-row">
          <div>
            <strong>${task.title}</strong>
            <span class="subline">${task.category} \u2022 ${task.rewardXp} XP \u2022 ${task.offers.length} offer(s)</span>
          </div>
          <div class="row-actions">
            <button class="ghost-button small-button edit-task-btn" data-task-id="${task._id}">Edit</button>
            <button class="ghost-button small-button delete-task-btn" data-task-id="${task._id}">Delete</button>
          </div>
        </div>
      `
    )
    .join("");

  root.querySelectorAll(".edit-task-btn").forEach((button) => {
    button.addEventListener("click", () => populateTaskForm(button.dataset.taskId));
  });
  root.querySelectorAll(".delete-task-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Delete this task?")) {
        return;
      }
      try {
        await adminApi(`/api/admin/tasks/${button.dataset.taskId}`, { method: "DELETE" });
        await loadAdminData();
      } catch (error) {
        adminToast(error.message);
      }
    });
  });
}

function renderCompletions() {
  const root = adminQs("#completionList");
  root.innerHTML = adminState.completions
    .map(
      (item) => `
        <div class="table-row">
          <div>
            <strong>${item.title}</strong>
            <span class="subline">${item.user?.displayName || "Unknown"} \u2022 ${item.rewardXp} XP \u2022 ${item.status}</span>
            <span class="subline">${item.flags?.join(", ") || "No flags"}</span>
          </div>
          <div class="row-actions">
            ${item.status === "pending" ? `<button class="primary-button small-button review-completion-btn" data-status="approved" data-id="${item.id}">Approve</button>
            <button class="ghost-button small-button review-completion-btn" data-status="rejected" data-id="${item.id}">Reject</button>` : ""}
          </div>
        </div>
      `
    )
    .join("");

  root.querySelectorAll(".review-completion-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await adminApi(`/api/admin/completions/${button.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status })
        });
        await loadAdminData();
      } catch (error) {
        adminToast(error.message);
      }
    });
  });
}

function renderWithdrawals() {
  const root = adminQs("#withdrawalList");
  root.innerHTML = adminState.withdrawals
    .map(
      (item) => `
        <div class="table-row">
          <div>
            <strong>${item.user?.displayName || "Unknown"}</strong>
            <span class="subline">${item.method} \u2022 \u20B9${item.inrAmount} \u2022 ${item.status}</span>
            <span class="subline">${item.paymentDetails}</span>
          </div>
          <div class="row-actions">
            ${item.status === "pending" ? `<button class="primary-button small-button withdrawal-btn" data-status="approved" data-id="${item.id}">Approve</button>` : ""}
            ${item.status !== "paid" ? `<button class="ghost-button small-button withdrawal-btn" data-status="paid" data-id="${item.id}">Mark Paid</button>` : ""}
            ${item.status !== "rejected" ? `<button class="ghost-button small-button withdrawal-btn" data-status="rejected" data-id="${item.id}">Reject</button>` : ""}
          </div>
        </div>
      `
    )
    .join("");

  root.querySelectorAll(".withdrawal-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await adminApi(`/api/admin/withdrawals/${button.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: button.dataset.status })
        });
        await loadAdminData();
      } catch (error) {
        adminToast(error.message);
      }
    });
  });
}

function renderUsers() {
  const root = adminQs("#userList");
  root.innerHTML = adminState.users
    .map(
      (user) => `
        <div class="table-row">
          <div>
            <strong>${user.displayName}</strong>
            <span class="subline">${user.email} \u2022 ${user.xpBalance} XP \u2022 ${user.isSuspicious ? "Flagged" : "Healthy"}</span>
            <span class="subline">${user.flags.map((flag) => flag.reason).join(", ") || "No active flags"}</span>
          </div>
          <div class="row-actions">
            <input class="xp-input" type="number" placeholder="XP delta" data-id="${user.id}" />
            <button class="ghost-button small-button add-xp-btn" data-id="${user.id}">Apply XP</button>
            <button class="ghost-button small-button flag-user-btn" data-id="${user.id}">Flag</button>
            <button class="ghost-button small-button clear-user-btn" data-id="${user.id}">Clear Flags</button>
          </div>
        </div>
      `
    )
    .join("");

  root.querySelectorAll(".add-xp-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const input = root.querySelector(`.xp-input[data-id="${button.dataset.id}"]`);
      try {
        await adminApi(`/api/admin/users/${button.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ xpDelta: Number(input.value || 0) })
        });
        await loadAdminData();
      } catch (error) {
        adminToast(error.message);
      }
    });
  });

  root.querySelectorAll(".flag-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const reason = window.prompt("Flag reason");
      if (!reason) {
        return;
      }
      try {
        await adminApi(`/api/admin/users/${button.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ flagReason: reason })
        });
        await loadAdminData();
      } catch (error) {
        adminToast(error.message);
      }
    });
  });

  root.querySelectorAll(".clear-user-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await adminApi(`/api/admin/users/${button.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ clearFlags: true })
        });
        await loadAdminData();
      } catch (error) {
        adminToast(error.message);
      }
    });
  });
}

function populateTaskForm(taskId) {
  const task = adminState.tasks.find((entry) => entry._id === taskId);
  if (!task) {
    return;
  }

  const form = adminQs("#taskForm");
  form.taskId.value = task._id;
  form.slug.value = task.slug;
  form.category.value = task.category;
  form.title.value = task.title;
  form.description.value = task.description;
  form.rewardXp.value = task.rewardXp;
  form.bonusXp.value = task.bonusXp || 0;
  form.dailyLimitPerUser.value = task.dailyLimitPerUser;
  form.cooldownMinutes.value = task.cooldownMinutes;
  form.featured.checked = Boolean(task.featured);

  const offerList = adminQs("#offerList");
  offerList.innerHTML = "";
  (task.offers || []).forEach((offer) => addOfferRow(offer));
}

function resetTaskForm() {
  const form = adminQs("#taskForm");
  form.reset();
  form.taskId.value = "";
  const offerList = adminQs("#offerList");
  offerList.innerHTML = "";
  addOfferRow({});
}

function serializeOffers() {
  return Array.from(adminQs("#offerList").querySelectorAll(".offer-item"))
    .map((row) => ({
      name: row.querySelector('[data-field="name"]').value,
      network: row.querySelector('[data-field="network"]').value,
      url: row.querySelector('[data-field="url"]').value,
      rotationWeight: Number(row.querySelector('[data-field="rotationWeight"]').value || 1),
      contentLocker: row.querySelector('[data-field="contentLocker"]').checked,
      active: true
    }))
    .filter((offer) => offer.name && offer.url);
}

async function loadAdminData() {
  const [overview, tasks, users, completions, withdrawals] = await Promise.all([
    adminApi("/api/admin/overview"),
    adminApi("/api/admin/tasks"),
    adminApi("/api/admin/users"),
    adminApi("/api/admin/completions"),
    adminApi("/api/admin/withdrawals")
  ]);

  adminState.overview = overview;
  adminState.tasks = tasks;
  adminState.users = users;
  adminState.completions = completions;
  adminState.withdrawals = withdrawals;

  renderSummaryCards();
  renderSettings();
  renderTasks();
  renderCompletions();
  renderWithdrawals();
  renderUsers();
}

function showAdminApp() {
  adminQs("#adminLoginSection").classList.add("hidden");
  adminQs("#adminApp").classList.remove("hidden");
  adminQs("#adminLogoutBtn").classList.remove("hidden");
}

function wireAdminForms() {
  adminQs("#adminLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await adminApi("/api/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password")
        })
      });
      showAdminApp();
      await loadAdminData();
    } catch (error) {
      adminToast(error.message);
    }
  });

  adminQs("#settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await adminApi("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          economy: {
            xpPerInr: Number(form.xpPerInr.value),
            minimumWithdrawalInr: Number(form.minimumWithdrawalInr.value),
            dailyEarningCapXp: Number(form.dailyEarningCapXp.value)
          },
          referrals: {
            inviteBonusXp: Number(form.inviteBonusXp.value)
          },
          security: {
            contentLockerSeconds: Number(form.contentLockerSeconds.value),
            maxAccountsPerDevice: Number(form.maxAccountsPerDevice.value),
            maxAccountsPerIp: Number(form.maxAccountsPerIp.value)
          }
        })
      });
      await loadAdminData();
      adminToast("Settings saved.");
    } catch (error) {
      adminToast(error.message);
    }
  });

  adminQs("#addOfferBtn").addEventListener("click", () => addOfferRow({}));
  adminQs("#resetTaskFormBtn").addEventListener("click", resetTaskForm);

  adminQs("#taskForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      slug: form.slug.value.trim(),
      category: form.category.value,
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      rewardXp: Number(form.rewardXp.value),
      bonusXp: Number(form.bonusXp.value || 0),
      dailyLimitPerUser: Number(form.dailyLimitPerUser.value),
      cooldownMinutes: Number(form.cooldownMinutes.value),
      featured: form.featured.checked,
      active: true,
      offers: serializeOffers()
    };

    try {
      if (form.taskId.value) {
        await adminApi(`/api/admin/tasks/${form.taskId.value}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await adminApi("/api/admin/tasks", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      resetTaskForm();
      await loadAdminData();
    } catch (error) {
      adminToast(error.message);
    }
  });

  adminQs("#adminLogoutBtn").addEventListener("click", async () => {
    try {
      await adminApi("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin";
    }
  });
}

async function initAdmin() {
  wireAdminForms();
  resetTaskForm();

  try {
    await loadAdminData();
    showAdminApp();
  } catch (_error) {
  }
}

initAdmin();
