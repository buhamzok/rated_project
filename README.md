# Rated Uganda — NEWS PLATFORM

A modern, secure, and user-friendly web-based news platform providing reliable 
and timely information to readers across Uganda.

---

## Project Overview

The Rated Uganda project is a full-stack web application developed by Group 14 
as part of the UCU Recess workshop practice. It addresses challenges associated with 
limited access to localized news, outdated interfaces, and inefficient content 
management by providing a centralized digital environment for publishing and 
consuming news across Uganda.

---

## Team — Group 14

| Name | Registration No. | Role |
|---|---|---|
| Ms. Desire Kisakye | — | Product Owner |
| Mugabi Jeremy | S25B23/011 | Scrum Master |
| Obitre Warren & Ayebare Samuel | S25B13/041 / S25B13/029 | Frontend Developers |
| Buhamizo Elijah | S25B23/064 | Backend Developer |
| Atti Cindy Lynnette | S25B38/001 | Quality Assurance Tester |
| Mugisha Timothy Naabaasa | S25B38/041 | Documentation & UX Lead |

---

## Tech Stack

- **Frontend:** React.js, HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Version Control:** Git & GitHub

---

## Project Structure
rated_project/

├── frontend/         # React frontend application

├── backend/          # Express.js backend server

├── .gitignore

└── README.md


---

## Getting Started

### Prerequisites
- Node.js installed
- npm installed

### Backend Setup
```bash
cd backend
npm install
node index.js
```
Server runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
App runs on `http://localhost:5173`

### Health Check
Once the backend is running, visit: http://localhost:5000/api/health


Expected response:
```json
{
  "status": "success",
  "message": "Request API is running"
}
```

---

## Key Features (Planned)

- User authentication and role-based access (reader, journalist, editor, admin)
- News article creation, review, and publishing workflow
- Category and district-based news filtering
- Search functionality
- Advertisement management
- Reader comments and engagement

---

## Methodology

This project follows the **Agile** software development methodology, using sprints, 
daily stand-ups, product backlogs, and retrospectives to manage progress and adapt 
to changing requirements throughout the bootcamp.

---

## Institution

Uganda Christian University  
Faculty of Engineering, Design and Technology  
Department of Computing and Technology  
Mentor: Mr. Christopher Ssemambo

