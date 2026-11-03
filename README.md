# BlogSpace – Full Stack Blog Application

A responsive blog platform where users can register, log in, and create, edit, search and manage their own blog posts.
Built as the final project of the **Codomax Virtual Internship** (Full Stack Web Development).

**Live demo:** https://YOUR-SITE.netlify.app
**Backend API:** https://YOUR-BACKEND-NAME.onrender.com
**Source code:** https://github.com/dreemcoree/codomax-blog-app

> The backend runs on a free plan and sleeps when unused. The first request after a pause can take up to a minute.

## Screenshots

| Home | Dashboard |
|------|-----------|
| ![Home](screenshots/home.png) | ![Dashboard](screenshots/dashboard.png) |

| Single blog | Profile |
|-------------|---------|
| ![Blog](screenshots/blog.png) | ![Profile](screenshots/profile.png) |

## Features

- User registration and login with **JWT authentication**
- Passwords are **hashed** (scrypt with a random salt) and never stored in plain text
- **Protected routes**: dashboard, create, edit and profile need a valid login
- Full **CRUD** on blogs: create, read, update and delete
- Only the author can edit or delete their own blog (checked on the server)
- Dashboard shows **only the logged-in user's blogs**
- **Search** blogs by title or content and **filter** by category
- Profile page: change name and password, logout
- Single blog page with reading time and a copy-link button
- Responsive design for mobile, tablet and desktop
- Black and crimson theme with smooth animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Flexbox, Grid, animations), JavaScript (fetch API) |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas with Mongoose |
| Authentication | JSON Web Tokens (jsonwebtoken) |
| Hosting | Netlify (frontend), Render (backend) |

## Project Structure

```
codomax-blog-app/
├── index.html            Home page
├── login.html            Login
├── register.html         Register
├── dashboard.html        User dashboard (protected)
├── create-blog.html      Create a blog (protected)
├── edit-blog.html        Edit a blog (protected)
├── blog.html             Single blog page
├── profile.html          Profile (protected)
├── css/style.css         Styling
├── js/main.js            Frontend logic
└── backend/
    ├── server.js         Express server and API routes
    ├── middleware/auth.js  JWT check
    ├── models/           Mongoose models (User, Blog)
    └── .env.example      Example environment variables
```

## API Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/register | Public | Create an account |
| POST | /api/login | Public | Log in, returns a token |
| GET | /api/blogs | Public | All blogs (`?search=` `?category=`) |
| GET | /api/blogs/:id | Public | One blog |
| GET | /api/blogs/mine | Login | The logged-in user's blogs |
| POST | /api/blogs | Login | Create a blog |
| PUT | /api/blogs/:id | Owner | Update a blog |
| DELETE | /api/blogs/:id | Owner | Delete a blog |
| GET | /api/me | Login | Own profile |
| PUT | /api/me | Login | Change name or password |

## Run Locally

1. Clone the repository
   ```
   git clone https://github.com/dreemcoree/codomax-blog-app.git
   cd codomax-blog-app
   ```
2. Set up the backend
   ```
   cd backend
   npm install
   ```
3. Create `backend/.env` (see `.env.example`):
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_long_random_secret
   ```
4. Start the server
   ```
   npm start
   ```
   The API runs on http://localhost:5000
5. Open `index.html` with the VS Code **Live Server** extension.

## Deployment

- **Backend:** Render Web Service, root directory `backend`, build `npm install`, start `npm start`, with `MONGO_URI` and `JWT_SECRET` set as environment variables.
- **Frontend:** Netlify, deployed from this repository.
- **Database:** MongoDB Atlas.

## What I Learned

- Building REST APIs with Express and connecting them to a frontend with fetch
- Storing and querying data in MongoDB with Mongoose
- Securing an app: password hashing, JWT, protected routes and owner checks
- Deploying a full stack application and managing environment variables

## Author

**Guru Prasath** – Codomax Virtual Internship
