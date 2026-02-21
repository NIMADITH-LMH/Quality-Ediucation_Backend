Quality Education Backend API

A Node.js and Express backend API for the Quality Education platform.
This system provides authentication, role-based access control, feedback management, progress tracking, messaging, and tutoring session management.

Tech Stack

Node.js

Express.js

MongoDB (Mongoose)

JWT Authentication

Cookie-based Authentication

express-validator

bcryptjs

dotenv

Project Structure

Folder name
│
├── Config/
│   └── db.js
├── Controllers/
│   └── authController.js
├── Middleware/
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   └── ValidatorMiddleware.js
├── Models/
│   ├── UserModel.js
│   ├── FeedbackModel.js
│   ├── ProgressModel.js
│   ├── MessageModel.js
│   └── TutoringSessionModel.js
├── Routes/
│   ├── authRouter.js
│   ├── feedbackRouter.js
│   ├── progressRouter.js
│   ├── messageRouter.js
│   └── tutoringSessionRouter.js
├── utils/
│   ├── generateToken.js
│   └── passwordUtils.js
├── server.js
└── package.json

Authentication System

JWT token generation

Cookie-based authentication

Optional Bearer token support

Role-based authorization (admin, user, tutor)

Protected routes middleware

Installation
1. Clone the repository
git clone <your-repo-url>
cd 3YS2 project
2. Install dependencies
npm install
3. Create a .env file

Create a .env file in the root directory:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
Running the Server
Development mode
npm run dev
Production mode
npm start
API Base URL
http://localhost:5000
Main Routes
Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
Feedback
GET    /api/feedbacks
POST   /api/feedbacks
Progress
GET    /api/progress
POST   /api/progress
Messages
GET    /api/messages
POST   /api/messages
Tutoring Sessions
GET    /api/tutoring-sessions
POST   /api/tutoring-sessions
Roles

Admin – Full system access
Tutor – Manage tutoring sessions and content
User – Access learning resources

Security Features

Password hashing with bcrypt

JWT token validation

HTTP-only cookies

Role-based authorization

Request validation middleware

Testing

You can test the API using Postman