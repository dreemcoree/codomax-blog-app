// ===== auth.js — checks the login token on protected routes =====
const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  // The browser sends:  Authorization: Bearer <token>
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Please log in first." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id; // the routes below use this to know WHO is calling
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
};