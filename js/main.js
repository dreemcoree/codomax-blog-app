// ===== main.js — shared by all pages =====
// Data is stored in the browser (localStorage) because Day 1-4 is frontend only.
// Later modules will replace this with a real backend/database.

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const sampleBlogs = [
  { id: 1, title: "Getting Started with HTML", category: "Web Dev", author: "Codomax Team", date: "2026-10-01",
    content: "HTML is the skeleton of every web page. Learn tags, attributes and semantic elements to build a solid foundation." },
  { id: 2, title: "CSS Flexbox vs Grid", category: "Web Dev", author: "Codomax Team", date: "2026-10-05",
    content: "Flexbox is great for one-dimensional layouts, Grid for two-dimensional ones. Use both together for responsive pages." },
  { id: 3, title: "JavaScript Basics for Beginners", category: "JavaScript", author: "Codomax Team", date: "2026-10-10",
    content: "Variables, functions, arrays and DOM manipulation: the core ideas you need before moving on to frameworks." }
];

function getBlogs() { return [...sampleBlogs, ...store.get("blogs", [])]; }
function getUser() { return store.get("currentUser", null); }

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = "msg " + type;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ----- Mobile menu toggle -----
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("menuBtn");
  const links = document.getElementById("navLinks");
  if (btn) btn.addEventListener("click", () => links.classList.toggle("open"));

  // Swap Login/Register links for Dashboard/Logout when signed in
  const user = getUser();
  const authLinks = document.getElementById("authLinks");
  if (authLinks && user) {
    authLinks.innerHTML =
      '<a href="dashboard.html">Dashboard</a>' +
      '<a href="#" id="logoutLink">Logout</a>';
    document.getElementById("logoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
  }

  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "register") initRegister();
  if (page === "login") initLogin();
  if (page === "dashboard") initDashboard();
  if (page === "create") initCreate();
});

// ----- Home -----
function renderHome() {
  const grid = document.getElementById("blogGrid");
  grid.innerHTML = getBlogs().slice().reverse().map(b => `
    <article class="card">
      <span class="tag">${escapeHTML(b.category)}</span>
      <h3>${escapeHTML(b.title)}</h3>
      <p>${escapeHTML(b.content.slice(0, 110))}...</p>
      <div class="meta">By ${escapeHTML(b.author)} · ${b.date}</div>
    </article>`).join("");
}

// ----- Register -----
function initRegister() {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim().toLowerCase();
    const password = form.password.value;
    const confirm = form.confirm.value;

    if (password.length < 6) return showMessage(msg, "Password must be at least 6 characters.", "error");
    if (password !== confirm) return showMessage(msg, "Passwords do not match.", "error");

    const users = store.get("users", []);
    if (users.some(u => u.email === email)) return showMessage(msg, "This email is already registered.", "error");

    users.push({ name, email, password }); // NOTE: plain text only for this demo. Never do this in production.
    store.set("users", users);
    showMessage(msg, "Account created! Redirecting to login...", "success");
    setTimeout(() => (window.location.href = "login.html"), 1200);
  });
}

// ----- Login -----
function initLogin() {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = form.email.value.trim().toLowerCase();
    const user = store.get("users", []).find(u => u.email === email && u.password === form.password.value);
    if (!user) return showMessage(msg, "Invalid email or password.", "error");
    store.set("currentUser", { name: user.name, email: user.email });
    window.location.href = "dashboard.html";
  });
}

// ----- Dashboard -----
function initDashboard() {
  const user = getUser();
  if (!user) { window.location.href = "login.html"; return; } // simple route protection

  document.getElementById("welcome").textContent = "Welcome back, " + user.name + "!";
  const mine = store.get("blogs", []).filter(b => b.email === user.email);
  document.getElementById("statPosts").textContent = mine.length;
  document.getElementById("statAll").textContent = getBlogs().length;

  const tbody = document.getElementById("blogRows");
  tbody.innerHTML = mine.length
    ? mine.map(b => `
      <tr>
        <td>${escapeHTML(b.title)}</td>
        <td>${escapeHTML(b.category)}</td>
        <td>${b.date}</td>
        <td><button class="btn btn-danger" data-id="${b.id}">Delete</button></td>
      </tr>`).join("")
    : '<tr><td colspan="4">No posts yet. Click "Create Blog" to write your first one.</td></tr>';

  tbody.addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    store.set("blogs", store.get("blogs", []).filter(b => String(b.id) !== id));
    initDashboard();
  });
}

// ----- Create Blog -----
function initCreate() {
  const user = getUser();
  if (!user) { window.location.href = "login.html"; return; }

  const form = document.getElementById("blogForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const blogs = store.get("blogs", []);
    blogs.push({
      id: Date.now(),
      title: form.title.value.trim(),
      category: form.category.value,
      content: form.content.value.trim(),
      author: user.name,
      email: user.email,
      date: new Date().toISOString().slice(0, 10)
    });
    store.set("blogs", blogs);
    showMessage(msg, "Blog published! Redirecting...", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 1000);
  });
}

