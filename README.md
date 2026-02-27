# Quality Education Backend

📖 Project Title
🎓 Quality Education
#A Web-Based Peer Learning and Tutoring Platform for School Students

📌 Overview

Quality Education is a web-based peer-learning and tutoring platform designed to connect school students with qualified tutors in an efficient and scalable manner.

The platform enables students to request academic help, automatically translates Sinhala messages into English using the Google Gemini API, and allows tutors to respond effectively.

This system promotes accessible, structured, and collaborative digital education.


(IT23472020-H A S Maduwantha)


🚀 Key Features

🔐 Authentication & Authorization

Role-based access control (RBAC)

Secure login & registration

JWT-based authentication

Roles:

   Student (User)

   Tutor

   Admin


💬 Help Request Management (Full CRUD)

Students can:

      Create help requests

      View submitted requests

      Update messages

      Delete requests

Tutors & Admin can:

      View all help requests

      Respond to student queries


🌍 Sinhala to English Translation

      Detects Sinhala Unicode range (0D80–0DFF)

      Automatically translates to English using Google Gemini API

      Stores translated message in database

      Avoids API call if message is already English (optimization)

🏗️ System Architecture

      Role-Based Access Control (RBAC)

      RESTful API architecture

      Third-party API integration

      Modular controller-service structure

      Secure environment variable configuration


🛠️ Tech Stack
Backend

       Node.js

       Express.js

       MongoDB

       JWT Authentication

Third-Party Integration

    Google Gemini API for translation


API Workflow Example

    Student submits help request (Sinhala or English)

 System checks:

    If Sinhala → Call Gemini API → Translate

    If English → Save directly

 Message stored in database

    Tutors & Admin can view all requests

    Tutor responds to request


 📂 Project Structure

├── controllers/
├── services/
├── models/
├── routes/
├── middleware/
├── config/
├── utils/
└── server.js

🔐 Security Considerations

    Password hashing (bcrypt)

    JWT authentication

    Role-based authorization middleware

    Environment variable protection for API keys

👨‍💻 Author

IT23472020-H A S Maduwantha(Group no-122)

Project Run

   npm run dev

End Points With Request and Response Examples

User Register  POST   localhost:5000/api/auth/register

Requset---->  {
                "fullName": "shani navodya",
                "email": "shaninavodya@2001gamil.com",
                "password": "shaninavodya@2001",
                "phoneNumber": "0771234568",
                "location": "weligama"
              }

Response--->  {
                 "msg": "User Created Successfully"
              }



Tutor Register  POST  localhost:5000/api/auth/register

Requset---->  {
                "fullName": "shani",
                "email": "shaninavodya@2002gamil.com",
                "password": "shaninavodya@2002",
                "phoneNumber": "0771234512",
                "location": "weligama",
                "role":"tutor",
                "subjects":["Science"]
              }

Response---> {
                "msg": "Tutor registered successfully"
             }

Admin Register  POST   localhost:5000/api/auth/register


Requset---->  {
                "fullName": "John Doe",
                "email": "john.doe@example.com",
                "password": "password123",
                "phoneNumber": "0771234512",
                "location": "weligama",
                "role":"admin",
              }

Response---> {
                "msg": "admin registered successfully"
             }


