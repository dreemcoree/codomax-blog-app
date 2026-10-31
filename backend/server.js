// ===== server.js — Blog API (Module 04: full CRUD) =====
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("./models/User");
const Blog = require("./models/Blog");

const app = express();
const PORT = process.env.PORT || 5000;

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

// Turn a database blog into the shape the frontend expects
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

// Make user text safe to use inside a search pattern
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ----- Routes -----
app.get("/", (req, res) => res.json({ message: "BlogSpace API is running" }));

// 1. Register
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

// 2. Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !checkPassword(password, user.password)) return res.status(401).json({ message: "Invalid email or password." });

    res.json({ message: "Login successful.", user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// CREATE a blog
app.post("/api/blogs", async (req, res) => {
  try {
    const { title, category, content, authorId } = req.body;
    if (!title || !category || !content || !authorId) return res.status(400).json({ message: "Title, category, content and authorId are required." });
    if (!mongoose.isValidObjectId(authorId)) return res.status(400).json({ message: "Invalid author. Please log out and log in again." });

    const author = await User.findById(authorId);
    if (!author) return res.status(404).json({ message: "Author not found." });

    const blog = await Blog.create({ title, category, content, author: author._id, authorName: author.name });
    res.status(201).json({ message: "Blog created.", blog: formatBlog(blog) });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// READ all blogs. Optional filters: ?authorId=  ?category=  ?search=
app.get("/api/blogs", async (req, res) => {
  try {
    const filter = {};

    if (req.query.authorId) {
      if (!mongoose.isValidObjectId(req.query.authorId)) return res.json([]);
      filter.author = req.query.authorId;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }
    if (req.query.search && req.query.search.trim()) {
      const pattern = new RegExp(escapeRegex(req.query.search.trim()), "i"); // "i" = ignore capital letters
      filter.$or = [{ title: pattern }, { content: pattern }];
    }

    const blogs = await Blog.find(filter).sort({ createdAt: 1 });
    res.json(blogs.map(formatBlog));
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// READ one blog
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

// UPDATE a blog (only its author can change it)
app.put("/api/blogs/:id", async (req, res) => {
  try {
    const { title, category, content, authorId } = req.body;
    if (!title || !category || !content || !authorId) return res.status(400).json({ message: "Title, category, content and authorId are required." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Blog not found." });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found." });
    if (String(blog.author) !== String(authorId)) return res.status(403).json({ message: "You can only edit your own blogs." });

    blog.title = title.trim();
    blog.category = category;
    blog.content = content.trim();
    await blog.save();

    res.json({ message: "Blog updated.", blog: formatBlog(blog) });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// DELETE a blog
app.delete("/api/blogs/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Blog not found." });
    const deleted = await Blog.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Blog not found." });
    res.json({ message: "Blog deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));