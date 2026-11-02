// ===== server.js — Blog API (Module 05: JWT authentication) =====
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("./models/User");
const Blog = require("./models/Blog");
const auth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) console.log("WARNING: JWT_SECRET is missing in .env. Login will not work.");

// ----- Middleware -----
app.use(cors());
app.use(express.json());

// ----- Connect to MongoDB -----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

// ----- Password hashing (built into Node) -----
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

function formatBlog(b) {
  return {
    id: b._id,
    title: b.title,
    category: b.category,
    content: b.content,
    authorId: b.author,
    author: b.authorName,
    date: b.createdAt.toISOString().slice(0, 10)
  };
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===================== PUBLIC ROUTES (no login needed) =====================
app.get("/", (req, res) => res.json({ message: "BlogSpace API is running" }));

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });

    const cleanEmail = email.trim().toLowerCase();
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(409).json({ message: "This email is already registered." });

    await User.create({ name, email: cleanEmail, password: hashPassword(password) });
    res.status(201).json({ message: "Registered successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Login: checks the password, then gives back a signed token
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !checkPassword(password, user.password)) return res.status(401).json({ message: "Invalid email or password." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "Login successful.", token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Read all blogs (public). Optional filters: ?category=  ?search=
app.get("/api/blogs", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search && req.query.search.trim()) {
      const pattern = new RegExp(escapeRegex(req.query.search.trim()), "i");
      filter.$or = [{ title: pattern }, { content: pattern }];
    }
    const blogs = await Blog.find(filter).sort({ createdAt: 1 });
    res.json(blogs.map(formatBlog));
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// ===================== PROTECTED ROUTES (token required) =====================

// My blogs only (must be BEFORE /api/blogs/:id)
app.get("/api/blogs/mine", auth, async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.userId }).sort({ createdAt: 1 });
    res.json(blogs.map(formatBlog));
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Read one blog (public)
app.get("/api/blogs/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Blog not found." });
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found." });
    res.json(formatBlog(blog));
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Create blog: the author comes from the TOKEN, not from the request body
app.post("/api/blogs", auth, async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title || !category || !content) return res.status(400).json({ message: "Title, category and content are required." });

    const author = await User.findById(req.userId);
    if (!author) return res.status(401).json({ message: "User not found. Please log in again." });

    const blog = await Blog.create({ title, category, content, author: author._id, authorName: author.name });
    res.status(201).json({ message: "Blog created.", blog: formatBlog(blog) });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Update blog (owner only)
app.put("/api/blogs/:id", auth, async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title || !category || !content) return res.status(400).json({ message: "Title, category and content are required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Blog not found." });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found." });
    if (String(blog.author) !== String(req.userId)) return res.status(403).json({ message: "You can only edit your own blogs." });

    blog.title = title.trim();
    blog.category = category;
    blog.content = content.trim();
    await blog.save();
    res.json({ message: "Blog updated.", blog: formatBlog(blog) });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Delete blog (owner only)
app.delete("/api/blogs/:id", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Blog not found." });
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found." });
    if (String(blog.author) !== String(req.userId)) return res.status(403).json({ message: "You can only delete your own blogs." });

    await blog.deleteOne();
    res.json({ message: "Blog deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Profile: read
app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "User not found. Please log in again." });
    const blogCount = await Blog.countDocuments({ author: user._id });
    res.json({ id: user._id, name: user.name, email: user.email, joined: user.createdAt.toISOString().slice(0, 10), blogCount });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Profile: change name and/or password
app.put("/api/me", auth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: "User not found. Please log in again." });

    if (name && name.trim()) {
      user.name = name.trim();
      await Blog.updateMany({ author: user._id }, { authorName: user.name });
    }

    if (newPassword) {
      if (!currentPassword || !checkPassword(currentPassword, user.password)) return res.status(400).json({ message: "Current password is wrong." });
      if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters." });
      user.password = hashPassword(newPassword);
    }

    await user.save();
    res.json({ message: "Profile updated.", user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));