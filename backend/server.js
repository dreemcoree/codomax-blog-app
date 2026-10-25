// ===== server.js — Blog API (Module 02) =====
// Express server with 3 required APIs: register, login, create blog (+ get blogs).
// Data is stored in data.json for now. Module 03 replaces it with a real database.

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, "data.json");

// ----- Middleware -----
app.use(cors());           // lets the frontend (another port/domain) call this API
app.use(express.json());   // lets us read JSON sent in req.body

// ----- Tiny file "database" -----
function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], blogs: [] }, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ----- Password hashing (built into Node, no extra package) -----
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}
function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(test, "hex"));
}

// ----- Routes -----
app.get("/", (req, res) => res.json({ message: "BlogSpace API is running" }));

// 1. Register
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

  const db = readDB();
  const cleanEmail = email.trim().toLowerCase();
  if (db.users.some(u => u.email === cleanEmail)) return res.status(409).json({ message: "This email is already registered." });

  const user = { id: Date.now(), name: name.trim(), email: cleanEmail, password: hashPassword(password) };
  db.users.push(user);
  writeDB(db);
  res.status(201).json({ message: "Registered successfully." });
});

// 2. Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  const db = readDB();
  const user = db.users.find(u => u.email === email.trim().toLowerCase());
  if (!user || !checkPassword(password, user.password)) return res.status(401).json({ message: "Invalid email or password." });

  // Never send the password back
  res.json({ message: "Login successful.", user: { id: user.id, name: user.name, email: user.email } });
});

// 3. Create blog
app.post("/api/blogs", (req, res) => {
  const { title, category, content, authorId } = req.body;
  if (!title || !category || !content || !authorId) return res.status(400).json({ message: "Title, category, content and authorId are required." });

  const db = readDB();
  const author = db.users.find(u => u.id === Number(authorId));
  if (!author) return res.status(404).json({ message: "Author not found." });

  const blog = {
    id: Date.now(),
    title: title.trim(),
    category,
    content: content.trim(),
    authorId: author.id,
    author: author.name,
    date: new Date().toISOString().slice(0, 10)
  };
  db.blogs.push(blog);
  writeDB(db);
  res.status(201).json({ message: "Blog created.", blog });
});

// Get blogs (all, or only one author's with ?authorId=)
app.get("/api/blogs", (req, res) => {
  let blogs = readDB().blogs;
  if (req.query.authorId) blogs = blogs.filter(b => b.authorId === Number(req.query.authorId));
  res.json(blogs);
});

// Delete blog (keeps the dashboard Delete button working; full CRUD comes in Module 04)
app.delete("/api/blogs/:id", (req, res) => {
  const db = readDB();
  const before = db.blogs.length;
  db.blogs = db.blogs.filter(b => b.id !== Number(req.params.id));
  if (db.blogs.length === before) return res.status(404).json({ message: "Blog not found." });
  writeDB(db);
  res.json({ message: "Blog deleted." });
});

app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
