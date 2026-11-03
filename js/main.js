// ===== main.js — shared by all pages (Module 05: JWT login) =====

// Where your backend runs. When you deploy the backend later, change only this line.
const IS_LOCAL = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
const API_URL = IS_LOCAL
  ? "http://localhost:5000/api"                       // your computer
  : "https://codomax-blog-app.onrender.com/api";     // deployed site: change after deploying the backend

// ----- Session helpers (token + user are kept in the browser) -----
function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser")); }
  catch { return null; }
}
function getToken() { return localStorage.getItem("token"); }
function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("currentUser", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
}
function logout() {
  clearSession();
  window.location.href = "index.html";
}

// Protect a page: no token means go to Login
function requireLogin() {
  if (!getToken() || !getUser()) {
    clearSession();
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// ----- Small helpers -----
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = "msg " + type;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Small pop-up message in the corner
function toast(text, type = "success") {
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("hide"), 2500);
  setTimeout(() => el.remove(), 3000);
}

// Live word + character counter under a textarea
function addCounter(textarea) {
  const info = document.createElement("div");
  info.className = "counter";
  textarea.insertAdjacentElement("afterend", info);
  const update = () => {
    const words = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
    info.textContent = words + " words · " + textarea.value.length + " characters";
  };
  textarea.addEventListener("input", update);
  update();
  return update;
}

// One function for every API call. It adds the login token automatically.
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  // Free hosting sleeps when unused: tell the user if the server is slow to answer
  const wakeTimer = setTimeout(() => toast("Server is waking up, please wait a few seconds...", "success"), 4000);
  let res;
  try {
    res = await fetch(API_URL + path, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the server. Please try again in a moment.");
  } finally {
    clearTimeout(wakeTimer);
  }
  const data = await res.json().catch(() => ({}));

  // Token missing, wrong or expired: log out and go to Login
  if (res.status === 401 && token && path !== "/login") {
    clearSession();
    window.location.href = "login.html";
  }
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

// ----- Runs on every page -----
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("menuBtn");
  const links = document.getElementById("navLinks");
  if (btn) btn.addEventListener("click", () => links.classList.toggle("open"));

  // Navbar: show Dashboard / Profile / Logout when signed in
  const authLinks = document.getElementById("authLinks");
  if (authLinks && getToken() && getUser()) {
    authLinks.innerHTML =
      '<a href="dashboard.html">Dashboard</a>' +
      '<a href="profile.html">Profile</a>' +
      '<a href="#" id="logoutLink">Logout</a>';
    document.getElementById("logoutLink").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  const page = document.body.dataset.page;
  if (page === "home") initHome();
  if (page === "register") initRegister();
  if (page === "login") initLogin();
  if (page === "dashboard") initDashboard();
  if (page === "create") initCreate();
  if (page === "blog") initBlog();
  if (page === "edit") initEdit();
  if (page === "profile") initProfile();
});

// ----- Home: blogs list with search + category filter -----
function initHome() {
  renderHome();

  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  if (!searchInput || !categoryFilter) return;

  let timer;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(renderHome, 300);
  });
  categoryFilter.addEventListener("change", renderHome);
}

async function renderHome() {
  const grid = document.getElementById("blogGrid");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");

  const params = new URLSearchParams();
  if (searchInput && searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (categoryFilter && categoryFilter.value) params.set("category", categoryFilter.value);
  const query = params.toString() ? "?" + params.toString() : "";

  try {
    const blogs = await api("/blogs" + query);
    let count = document.getElementById("resultCount");
    if (!count) {
      count = document.createElement("p");
      count.id = "resultCount";
      count.className = "result-count";
      grid.insertAdjacentElement("beforebegin", count);
    }
    count.textContent = blogs.length + (blogs.length === 1 ? " blog found" : " blogs found");
    if (!blogs.length) {
      grid.innerHTML = '<p style="color:var(--muted)">No blogs found.</p>';
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

// ----- Login: saves the token -----
function initLogin() {
  // Already logged in? Skip the login page
  if (getToken() && getUser()) { window.location.href = "dashboard.html"; return; }

  const form = document.getElementById("loginForm");
  const msg = document.getElementById("msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify({ email: form.email.value, password: form.password.value })
      });
      saveSession(data.token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// ----- Dashboard (protected): only MY blogs -----
async function initDashboard() {
  if (!requireLogin()) return;
  const user = getUser();

  document.getElementById("welcome").textContent = "Welcome back, " + user.name + "!";
  const tbody = document.getElementById("blogRows");

  try {
    const [mine, all] = await Promise.all([api("/blogs/mine"), api("/blogs")]);
    document.getElementById("statPosts").textContent = mine.length;
    document.getElementById("statAll").textContent = all.length;

    tbody.innerHTML = mine.length
      ? mine.map(b => `
        <tr>
          <td><a href="blog.html?id=${b.id}">${escapeHTML(b.title)}</a></td>
          <td>${escapeHTML(b.category)}</td>
          <td>${b.date}</td>
          <td>
            <a class="btn btn-outline" href="edit-blog.html?id=${b.id}">Edit</a>
            <button class="btn btn-danger" data-id="${b.id}">Delete</button>
          </td>
        </tr>`).join("")
      : '<tr><td colspan="4">No posts yet. Click "Create Blog" to write your first one.</td></tr>';
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4">' + escapeHTML(err.message) + "</td></tr>";
  }

  if (!tbody.dataset.bound) {
    tbody.dataset.bound = "1";
    tbody.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (!confirm("Delete this blog? This cannot be undone.")) return;
      try {
        await api("/blogs/" + id, { method: "DELETE" });
        toast("Blog deleted");
        initDashboard();
      } catch (err) {
        toast(err.message, "error");
      }
    });
  }
}

// ----- Create Blog (protected) -----
function initCreate() {
  if (!requireLogin()) return;

  const form = document.getElementById("blogForm");
  const msg = document.getElementById("msg");
  addCounter(form.content);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/blogs", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.value,
          category: form.category.value,
          content: form.content.value
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
    const words = b.content.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    box.innerHTML = `
      <span class="tag">${escapeHTML(b.category)}</span>
      <h1>${escapeHTML(b.title)}</h1>
      <div class="meta">By ${escapeHTML(b.author)} · ${b.date} · ${minutes} min read · ${words} words</div>
      <div class="article-body">${escapeHTML(b.content)}</div>
      <button class="btn btn-outline share-btn" id="shareBtn">Copy link</button>`;
    document.getElementById("shareBtn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast("Link copied");
      } catch {
        toast("Could not copy the link", "error");
      }
    });
  } catch (err) {
    box.innerHTML = "<p>" + escapeHTML(err.message) + "</p>";
  }
}

// ----- Edit Blog (protected) -----
async function initEdit() {
  if (!requireLogin()) return;
  const user = getUser();

  const form = document.getElementById("blogForm");
  const msg = document.getElementById("msg");
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) { showMessage(msg, "No blog selected.", "error"); return; }

  try {
    const b = await api("/blogs/" + id);
    if (String(b.authorId) !== String(user.id)) {
      showMessage(msg, "You can only edit your own blogs.", "error");
      form.style.display = "none";
      return;
    }
    form.title.value = b.title;
    form.category.value = b.category;
    form.content.value = b.content;
  } catch (err) {
    showMessage(msg, err.message, "error");
    form.style.display = "none";
    return;
  }

  addCounter(form.content);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/blogs/" + id, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title.value,
          category: form.category.value,
          content: form.content.value
        })
      });
      showMessage(msg, "Blog updated! Redirecting...", "success");
      setTimeout(() => (window.location.href = "dashboard.html"), 1000);
    } catch (err) {
      showMessage(msg, err.message, "error");
    }
  });
}

// ----- Profile (protected) -----
async function initProfile() {
  if (!requireLogin()) return;

  const nameForm = document.getElementById("nameForm");
  const pwForm = document.getElementById("pwForm");
  const nameMsg = document.getElementById("nameMsg");
  const pwMsg = document.getElementById("pwMsg");

  async function load() {
    try {
      const me = await api("/me");
      document.getElementById("avatar").textContent = me.name.charAt(0).toUpperCase();
      document.getElementById("profileName").textContent = me.name;
      document.getElementById("profileEmail").textContent = me.email;
      document.getElementById("profileJoined").textContent = me.joined;
      document.getElementById("profileBlogs").textContent = me.blogCount;
      nameForm.name.value = me.name;
    } catch (err) {
      showMessage(nameMsg, err.message, "error");
    }
  }
  await load();

  document.getElementById("logoutBtn").addEventListener("click", logout);

  nameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const data = await api("/me", { method: "PUT", body: JSON.stringify({ name: nameForm.name.value }) });
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      showMessage(nameMsg, "Name updated.", "success");
      load();
    } catch (err) {
      showMessage(nameMsg, err.message, "error");
    }
  });

  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (pwForm.newPassword.value !== pwForm.confirmPassword.value) return showMessage(pwMsg, "New passwords do not match.", "error");
    try {
      await api("/me", {
        method: "PUT",
        body: JSON.stringify({ currentPassword: pwForm.currentPassword.value, newPassword: pwForm.newPassword.value })
      });
      showMessage(pwMsg, "Password changed.", "success");
      pwForm.reset();
    } catch (err) {
      showMessage(pwMsg, err.message, "error");
    }
  });
}