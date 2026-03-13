// ── State ──────────────────────────────────────────────
let userGoals = {};

// ── DOM refs ───────────────────────────────────────────
const chatbox      = () => document.getElementById("chatbox");
const userInput    = () => document.getElementById("userInput");
const sendBtn      = () => document.getElementById("sendBtn");
const typingRow    = () => document.getElementById("typingRow");

// ── Init ───────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("introTs").textContent = formatTime();

  userInput().addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

// ── Onboarding ─────────────────────────────────────────
async function submitGoals() {
  const name    = document.getElementById("goalName").value.trim();
  const career  = document.getElementById("goalCareer").value.trim();
  const fitness = document.getElementById("goalFitness").value.trim();
  const life    = document.getElementById("goalLife").value.trim();

  userGoals = { name, career, fitness, life };

  const btn = document.getElementById("startBtn");
  btn.disabled = true;
  btn.textContent = "Opening portal…";

  try {
    await fetch("/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userGoals)
    });
  } catch (e) { console.error(e); }

  launchApp(name);
}

function skipOnboarding() {
  launchApp("");
}

function launchApp(name) {
  document.getElementById("onboardingModal").style.display = "none";
  const app = document.getElementById("app");
  app.style.display = "flex";
  app.style.flexDirection = "column";

  if (name) {
    document.getElementById("introText").textContent = `Hey, ${name}. It's you — from 2035.`;
  }
}

// ── Chat ───────────────────────────────────────────────
async function sendMessage() {
  const input   = userInput();
  const message = input.value.trim();
  if (!message) return;

  appendMsg("user", message);
  input.value = "";
  setLoading(true);

  try {
    const res  = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    appendMsg("ai", data.reply);
  } catch (e) {
    appendMsg("ai", "Something went wrong on my end. Try again in a moment — I'm still here.");
  } finally {
    setLoading(false);
  }
}

function appendMsg(role, text) {
  const box    = chatbox();
  const row    = document.createElement("div");
  row.className = `msg-row ${role}`;

  if (role === "ai") {
    const av = document.createElement("div");
    av.className = "avatar-ai";
    av.textContent = "✦";
    row.appendChild(av);
  }

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}-bubble`;

  text.split(/\n+/).filter(p => p.trim()).forEach(p => {
    const el = document.createElement("p");
    el.textContent = p;
    bubble.appendChild(el);
  });

  const ts = document.createElement("span");
  ts.className = "ts";
  ts.textContent = formatTime();
  bubble.appendChild(ts);

  row.appendChild(bubble);

  if (role === "user") {
    const av = document.createElement("div");
    av.className = "avatar-ai";
    av.style.background = "linear-gradient(135deg, rgba(125,211,252,0.15), rgba(251,191,120,0.1))";
    av.style.borderColor = "rgba(125,211,252,0.2)";
    av.style.color = "#7dd3fc";
    av.textContent = userGoals.name ? userGoals.name[0].toUpperCase() : "Y";
    row.appendChild(av);
  }

  box.appendChild(row);
  box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
}

function setLoading(on) {
  sendBtn().disabled = on;
  typingRow().classList.toggle("visible", on);
  if (on) {
    const box = chatbox();
    setTimeout(() => box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }), 50);
  }
}

// ── Tabs ───────────────────────────────────────────────
function switchTab(id, el) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  document.getElementById(`tab-${id}`).classList.add("active");
}

// ── Future Letter ──────────────────────────────────────
async function generateLetter() {
  const btn     = document.getElementById("letterBtn");
  const loading = document.getElementById("letterLoading");
  const output  = document.getElementById("letterOutput");
  const content = document.getElementById("letterContent");

  btn.disabled = true;
  output.style.display  = "none";
  loading.style.display = "flex";

  try {
    const res  = await fetch("/letter", { method: "POST" });
    const data = await res.json();
    content.textContent  = data.letter;
    output.style.display = "block";
  } catch (e) {
    content.textContent = "Unable to generate your letter right now. Please try again.";
    output.style.display = "block";
  } finally {
    loading.style.display = "none";
    btn.disabled = false;
    btn.textContent = "Generate again ↻";
  }
}

function copyLetter() {
  const text = document.getElementById("letterContent").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const b = document.querySelector(".letter-output .btn-ghost");
    b.textContent = "Copied! ✓";
    setTimeout(() => b.textContent = "Copy letter ↗", 2000);
  });
}

// ── Future Day ─────────────────────────────────────────
async function generateDay() {
  const btn     = document.getElementById("dayBtn");
  const loading = document.getElementById("dayLoading");
  const output  = document.getElementById("dayOutput");
  const content = document.getElementById("dayContent");

  btn.disabled = true;
  output.style.display  = "none";
  loading.style.display = "flex";

  try {
    const res  = await fetch("/day", { method: "POST" });
    const data = await res.json();
    content.textContent  = data.simulation;
    output.style.display = "block";
  } catch (e) {
    content.textContent = "Unable to generate simulation right now. Please try again.";
    output.style.display = "block";
  } finally {
    loading.style.display = "none";
    btn.disabled = false;
    btn.textContent = "Simulate again ↻";
  }
}

function copyDay() {
  const text = document.getElementById("dayContent").textContent;
  navigator.clipboard.writeText(text).then(() => {
    const b = document.querySelector(".day-output .btn-ghost");
    b.textContent = "Copied! ✓";
    setTimeout(() => b.textContent = "Copy simulation ↗", 2000);
  });
}

// ── Reset ──────────────────────────────────────────────
async function resetApp() {
  if (!confirm("Start a new conversation? This will clear your current chat and goals.")) return;
  try { await fetch("/reset", { method: "POST" }); } catch (e) {}
  location.reload();
}

// ── Utils ──────────────────────────────────────────────
function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}