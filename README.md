
# Issue Management System

## Introduction
This project is a full-stack **Issue Management System** built using Node.js, Express, MySQL, and Handlebars (HBS). 
It allows users to raise issues, track their status, and enables an admin to manage and resolve issues.

---

## Features
- **User Features**
  - User signup and login
  - Submit new issues with department and description
  - View all submitted issues
  - Filter issues by status (Pending, Resolved) and sort (Newest/Oldest)
  - Receive email confirmation when an issue is raised and resolved

- **Admin Features**
  - Admin login with predefined credentials
  - View all issues from all users
  - Update issue statuses (Pending / Resolved)
  - Send resolution confirmation email to users automatically

- **Additional Features**
  - Forgot password email recovery
  - Email notifications for account creation, issue submission, and resolution

---

## Tech Stack
- **Frontend:** HTML, CSS, Handlebars (HBS)
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Email Service:** Nodemailer (Gmail SMTP)

---

## System Requirements

### Hardware
- Minimum: Dual-core CPU, 4GB RAM
- Recommended: Quad-core CPU, 8GB RAM

### Software
- Node.js (v18+ recommended)
- MySQL Server
- npm or yarn

---

## Environment Variables

Create a `.env` file in the project root with the following:

```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
ADMIN_EMAIL=admin@admin.com
ADMIN_PASSWORD=admin123
ADMIN_RECOVERY=admin_recovery@gmail.com

MYSQLHOST=localhost
MYSQLUSER=root
MYSQLPASSWORD=yourpassword
MYSQLDATABASE=registration_db
MYSQLPORT=3306
PORT=9000
```

---

## Database Schema

### Table: user_informations
- Id (int, PK, auto_increment)
- name (varchar)
- email (varchar, unique)
- cpassword (varchar)
- role (enum: 'student','teacher')

### Table: issues
- id (int, PK, auto_increment)
- username (varchar)
- email (varchar)
- department (enum: 'IT','HR','Admin','Finance','Others')
- subject (varchar)
- description (text)
- status (enum: 'pending','resolved')
- completed_at (datetime, nullable)
- created_at (datetime, default CURRENT_TIMESTAMP)

---

## Running Locally

1. Clone the repo:
   ```bash
   git clone <repo_url>
   cd <project_folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your `.env` file (see above).

4. Run the app:
   ```bash
   nodemon app.js
   ```

5. Open in browser:  
   **http://localhost:9000**

---

## Deployment Instructions

1. Use **Railway.app** or Render to host the backend.
2. Add environment variables in the deployment platform (same as `.env`).
3. Use a managed MySQL database (Railway/PlanetScale). Update your DB connection accordingly.
4. Push your code to GitHub and link your repository with the deployment platform.

---

## Flow Diagram

### ER Diagram
- Users table connected to Issues table (1-to-many)

### Data Flow
1. User submits issue → Stored in DB → Email confirmation
2. Admin updates status → DB updated → Email notification to user

---

## Conclusion
This system simplifies the management and tracking of issues for both users and administrators, with email notifications improving communication.

---

## Author
Developed by Abhikraj
