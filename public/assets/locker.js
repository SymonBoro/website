const params = new URLSearchParams(window.location.search);
const clickId = params.get("clickId");
const configuredSeconds = Number(params.get("seconds") || 5);
const progressBar = document.querySelector("#lockerProgressBar");
const label = document.querySelector("#lockerCountdown");

async function loadRedirect() {
  const response = await fetch(`/api/tasks/clicks/${encodeURIComponent(clickId)}/redirect`, {
    credentials: "include"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Could not prepare redirect.");
  }
  return data.redirectUrl;
}

async function initLocker() {
  if (!clickId) {
    label.textContent = "Missing click ID.";
    return;
  }

  const totalSeconds = Number.isFinite(configuredSeconds) && configuredSeconds > 0 ? configuredSeconds : 5;
  let seconds = totalSeconds;
  progressBar.style.width = "0%";
  label.textContent = `Redirecting in ${seconds}s`;

  const timer = window.setInterval(() => {
    seconds -= 1;
    progressBar.style.width = `${Math.min(100, ((totalSeconds - seconds) / totalSeconds) * 100)}%`;
    label.textContent = seconds > 0 ? `Redirecting in ${seconds}s` : "Opening verified offer...";
  }, 1000);

  try {
    const redirectUrl = await loadRedirect();
    window.setTimeout(() => {
      window.clearInterval(timer);
      window.location.href = redirectUrl;
    }, totalSeconds * 1000);
  } catch (error) {
    window.clearInterval(timer);
    label.textContent = error.message;
  }
}

initLocker();
