// ===== main.js — shared by all pages (talks to the Express + MongoDB API) =====

// Where your backend runs. When you deploy the backend later, change only this line.
const API_URL = "http://localhost:5000/api";

// ----- Small helpers -----
function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser")); }
  catch { return null; }
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = "msg " + type;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// One function for every API call. It returns the JSON or throws a readable error.
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running (npm start)?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// ----- Runs on every page -----
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
  if (page === "blog") initBlog();
});

// ----- Home: show all blogs from the API -----
async function renderHome() {
  const grid = document.getElementById("blogGrid");
  try {
    const blogs = await api("/blogs");
    if (!blogs.length) {
      grid.innerHTML = '<p style="color:var(--muted)">No blogs yet. Be the first to write one!</p>';
      return;
    }
    grid.innerHTML = blogs.slice().reverse().map(b => `
      <article class="card">
        <span class="tag">${escapeHTML(b.category)}</span>
        <h3><a href="blog.html?id=${b.id}">${escapeHTML(b.title)}</a></h3>
        <p>${escapeHTML(b.content.slice(0, 110))}...</p>
        <a class="read-more" href="blog.html?id=${b.id}">Read more →</a>
        <div class="meta">By ${escapeHTML(b.author)} · ${b.date}</div>
      </article>`).join("");
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--muted)">' + escapeHTML(err.message) + "</p>";
  }
}

// ----- Register -----
function initRegister() {
  const form = document.getElementById("registerForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = form.password.value;
    if (password.length < 6) return showMessage(msg, "Password must be at least 6 characters.", "error");
    if (password !== form.confirm.value) return showMessage(msg, "Passwords do not match.", "error");

    try {
      await api("/register", {
        method: "POST",
        body: JSON.stringify({ name: form.name.value, email: form.email.value, password })
      });
      showMessage(msg, "Account created! Redirecting to login...", "success");
      setTimeout(() => (window.location.href = "login.html"), 1200);
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// ----- Login -----
function initLogin() {
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email.value, password: form.password.value })
      });
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// ----- Dashboard -----
async function initDashboard() {
  const user = getUser();
  if (!user) { window.location.href = "login.html"; return; }

  document.getElementById("welcome").textContent = "Welcome back, " + user.name + "!";
  const tbody = document.getElementById("blogRows");

  try {
    const [mine, all] = await Promise.all([api("/blogs?authorId=" + user.id), api("/blogs")]);
    document.getElementById("statPosts").textContent = mine.length;
    document.getElementById("statAll").textContent = all.length;

    tbody.innerHTML = mine.length
      ? mine.map(b => `
        <tr>
          <td><a href="blog.html?id=${b.id}">${escapeHTML(b.title)}</a></td>
          <td>${escapeHTML(b.category)}</td>
          <td>${b.date}</td>
          <td><button class="btn btn-danger" data-id="${b.id}">Delete</button></td>
        </tr>`).join("")
      : '<tr><td colspan="4">No posts yet. Click "Create Blog" to write your first one.</td></tr>';
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4">' + escapeHTML(err.message) + "</td></tr>";
  }

  // Attach the delete handler only once
  if (!tbody.dataset.bound) {
    tbody.dataset.bound = "1";
    tbody.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      try {
        await api("/blogs/" + id, { method: "DELETE" });
        initDashboard();
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

// ----- Create Blog -----
function initCreate() {
  const user = getUser();
  if (!user) { window.location.href = "login.html"; return; }

  const form = document.getElementById("blogForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/blogs", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.value,
          category: form.category.value,
          content: form.content.value,
          authorId: user.id
        })
      });
      showMessage(msg, "Blog published! Redirecting...", "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 1000);
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// ----- Single blog page (blog.html?id=...) -----
async function initBlog() {
  const box = document.getElementById("blogDetail");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) { box.innerHTML = "<p>No blog selected.</p>"; return; }

  try {
    const b = await api("/blogs/" + id);
    document.title = "BlogSpace | " + b.title;
    box.innerHTML = `
      <span class="tag">${escapeHTML(b.category)}</span>
      <h1>${escapeHTML(b.title)}</h1>
      <div class="meta">By ${escapeHTML(b.author)} · ${b.date}</div>
      <div class="article-body">${escapeHTML(b.content)}</div>`;
  } catch (err) {
    box.innerHTML = "<p>" + escapeHTML(err.message) + "</p>";
  }
}