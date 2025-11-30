# ConnectHub - Responsive MERN Social Media Platform

A full-featured social media platform built with Next.js, Express.js, Prisma, and PostgreSQL.

## Features

- 🔐 User Authentication (Register/Login with JWT)
- 👤 User Profiles
- 📝 Posts & Feed
- 💬 Comments
- ❤️ Likes
- 👥 Friend System
- 🔔 Notifications
- 🌓 Dark/Light Mode
- 📱 Fully Responsive Design

## Tech Stack

### Frontend
- Next.js 16
- React 19
- Tailwind CSS 4

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcryptjs (Password Hashing)

## Prerequisites

- Node.js (>= 14.0.0)
- PostgreSQL database
- npm or yarn

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd connecthub
```

### 2. Backend Setup

```bash
cd server
npm install
```

### 3. Database Setup

1. Create a PostgreSQL database
2. Create a `.env` file in the `server` directory:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/connecthub?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=3001
CLIENT_URL="http://localhost:3000"
NODE_ENV="development"
```

3. Generate Prisma Client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Or push schema directly (for development):

```bash
npm run prisma:push
```

### 4. Start Backend Server

```bash
npm run dev
```

The server will run on `http://localhost:3001`

### 5. Frontend Setup

Open a new terminal:

```bash
cd client
npm install
```

### 6. Frontend Environment Setup

Create a `.env.local` file in the `client` directory (optional, defaults to localhost):

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### 7. Start Frontend Development Server

```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
connecthub/
├── server/
│   ├── src/
│   │   ├── app.js                 # Express app setup
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT authentication middleware
│   │   │   └── upload.js          # Multer file upload configuration
│   │   └── routes/
│   │       ├── auth.js            # Authentication routes
│   │       ├── users.js           # User routes (profile, friends, search)
│   │       ├── posts.js           # Post routes (CRUD, like, comment)
│   │       └── notifications.js   # Notification routes
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── uploads/                   # Uploaded files (avatars, images)
│   └── package.json
│
└── client/
    ├── app/
    │   ├── layout.js              # Root layout with theme provider
    │   ├── page.js                # Home page
    │   ├── login/
    │   │   └── page.js           # Login page
    │   ├── signup/
    │   │   └── page.js           # Signup page
    │   ├── feed/
    │   │   └── page.js           # Feed page (posts, create, like, comment)
    │   ├── profile/
    │   │   └── [id]/
    │   │       └── page.js       # User profile page
    │   └── friends/
    │       └── page.js           # Friends page (search, requests)
    ├── components/
    │   ├── Navbar.js              # Navigation bar
    │   └── ThemeProvider.js       # Dark/light mode provider
    ├── lib/
    │   ├── api.js                 # API utility functions
    │   └── auth.js                # Auth utility functions
    └── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Users
- `GET /api/users/search?q=query` - Search users (Protected)
- `GET /api/users/:id` - Get user by ID (Protected)
- `PUT /api/users/:id` - Update user profile (Protected)
- `POST /api/users/:id/avatar` - Upload avatar (Protected)
- `GET /api/users/:id/friends` - Get user's friends (Protected)
- `POST /api/users/:id/friend-request` - Send friend request (Protected)
- `PATCH /api/users/friend-requests/:id/accept` - Accept friend request (Protected)
- `PATCH /api/users/friend-requests/:id/reject` - Reject friend request (Protected)
- `GET /api/users/friend-requests/all` - Get all friend requests (Protected)
- `DELETE /api/users/:id/friend` - Remove friend (Protected)

### Posts
- `GET /api/posts` - Get all posts/feed (Protected)
- `POST /api/posts` - Create new post (Protected)
- `PUT /api/posts/:id` - Update post (Protected, Author only)
- `DELETE /api/posts/:id` - Delete post (Protected, Author only)
- `PATCH /api/posts/:id/like` - Like/unlike post (Protected)
- `POST /api/posts/:id/comment` - Comment on post (Protected)
- `POST /api/posts/upload-image` - Upload post image (Protected)

### Notifications
- `GET /api/notifications` - Get all notifications (Protected)
- `PATCH /api/notifications/:id/read` - Mark notification as read (Protected)
- `PATCH /api/notifications/read-all` - Mark all as read (Protected)
- `GET /api/notifications/unread/count` - Get unread count (Protected)

## Database Models

- **User**: Users with authentication and profile info
- **Post**: User posts with content and images
- **Comment**: Comments on posts
- **Like**: Likes on posts
- **FriendRequest**: Friend request system
- **UserFriend**: Friend relationships
- **Notification**: User notifications

## Development

### Backend Commands

```bash
npm run dev              # Start development server with nodemon
npm run start            # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Create and run migrations
npm run prisma:studio    # Open Prisma Studio (Database GUI)
npm run prisma:push      # Push schema changes to database
```

### Frontend Commands

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
```

## Environment Variables

### Server (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Frontend URL for CORS
- `NODE_ENV` - Environment (development/production)

## Features Implemented

✅ User Authentication (Register/Login with JWT)  
✅ User Profiles with avatar upload  
✅ Create, Read, Update, Delete Posts  
✅ Like/Unlike Posts  
✅ Comment on Posts  
✅ Friend System (Search, Send/Accept/Reject Requests)  
✅ Notifications System  
✅ Dark/Light Mode Toggle  
✅ Image Upload (Avatars & Post Images)  
✅ Fully Responsive Design  

## Deployment

### Backend (Render/Railway)
1. Set environment variables in your hosting platform
2. Ensure PostgreSQL database is configured
3. Run migrations: `npm run prisma:migrate`
4. Update `CLIENT_URL` to your frontend URL

### Frontend (Vercel/Netlify)
1. Set `NEXT_PUBLIC_API_URL` to your backend API URL
2. Deploy using Vercel or Netlify

## Notes

- Image uploads are stored locally in `server/uploads/` directory
- For production, consider using cloud storage (AWS S3, Cloudinary, etc.)
- Update `JWT_SECRET` with a strong random string in production
- Ensure CORS is properly configured for your domain

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
