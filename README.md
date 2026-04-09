# 🌸 Sakhi Ride – Women-Only Ride Booking & Safety Platform

A full-stack web application for safe, women-only ride booking with SOS alerts, admin approvals, and ride tracking.

---

## 📁 PROJECT FOLDER STRUCTURE

```
sakhi-ride/
├── server.js                  ← Main Express server
├── package.json               ← Node dependencies
├── .env                       ← Environment config (edit this!)
│
├── config/
│   └── db.js                  ← MySQL connection
│
├── middleware/
│   └── auth.js                ← JWT auth middleware
│
├── routes/
│   ├── auth.js                ← Register, Login, Profile
│   ├── rides.js               ← Book, Accept, Track rides
│   ├── sos.js                 ← SOS emergency alerts
│   ├── ratings.js             ← Rate rides
│   └── admin.js               ← Admin management routes
│
├── frontend/
│   ├── index.html             ← Main HTML (all pages)
│   ├── style.css              ← All styles
│   └── app.js                 ← Frontend JavaScript
│
└── database/
    └── schema.sql             ← MySQL database schema
```

---

## ⚙️ SETUP INSTRUCTIONS

### STEP 1 – Prerequisites
Make sure you have installed:
- **Node.js** (v16+): https://nodejs.org
- **MySQL** (v8+): https://www.mysql.com/downloads/
- **VS Code**: https://code.visualstudio.com

---

### STEP 2 – Configure Environment

Open `.env` and update your MySQL password:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE   ← Change this!
DB_NAME=sakhi_ride
JWT_SECRET=sakhi_ride_secret_key_2024
PORT=3000
```

---

### STEP 3 – Setup Database

Open MySQL Workbench (or any MySQL client) and run:

```sql
-- Option A: From MySQL Workbench
-- File > Open SQL Script > select: database/schema.sql > Execute

-- Option B: From Terminal
mysql -u root -p < database/schema.sql
```

This creates the `sakhi_ride` database with all tables and a default admin user.

---

### STEP 4 – Install Dependencies

Open terminal in the `sakhi-ride` folder and run:

```bash
npm install
```

---

### STEP 5 – Start the Server

```bash
node server.js
```

Or for auto-reload during development:
```bash
npx nodemon server.js
```

You should see:
```
✅ Database connected successfully!
✅ Server running at: http://localhost:3000
📊 Admin Login: admin@sakhi.com / admin123
```

---

### STEP 6 – Open the App

Open your browser and go to:
```
http://localhost:3000
```

---

## 🔑 DEFAULT LOGIN CREDENTIALS

| Role    | Email               | Password  |
|---------|---------------------|-----------|
| Admin   | admin@sakhi.com     | admin123  |

> Passengers and riders must register through the app.

---

## 🧪 HOW TO TEST ALL FEATURES

### 1. Register a Passenger
- Click "Register" tab
- Select "Passenger"
- Fill details and submit
- Login with those credentials

### 2. Register a Rider
- Register with "Rider" role
- Fill vehicle details
- Login as Admin → Rider Approvals → Approve the rider
- Now login as rider

### 3. Book a Ride (as Passenger)
- Login as passenger
- Go to "Book a Ride" tab
- Enter pickup & dropoff
- Click "Find My Ride"

### 4. Accept a Ride (as Rider)
- Login as rider
- Go to "Available Rides" tab
- Click "Accept Ride"

### 5. Track Ride Status (as Rider)
- Go to "My Rides" tab
- Click "Start Ride" → "Complete"

### 6. Rate the Ride (as Passenger)
- Go to "My Rides" tab
- Find completed ride
- Click "Rate Ride" and submit stars

### 7. SOS Alert (as Passenger)
- Go to "SOS Safety" tab
- Click the red SOS button
- Check Admin → SOS Alerts to see it

### 8. Admin Dashboard
- Login as admin
- View all stats, users, rides, SOS alerts
- Approve/deactivate riders
- Resolve SOS alerts

---

## 🔌 API ENDPOINTS REFERENCE

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/profile | Get own profile |

### Rides
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/rides/book | Book a ride |
| GET | /api/rides/available | Available rides (rider) |
| PUT | /api/rides/:id/accept | Accept ride (rider) |
| PUT | /api/rides/:id/cancel | Cancel ride |
| PUT | /api/rides/:id/status | Update status |
| GET | /api/rides/my-rides | My ride history |

### SOS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/sos/trigger | Send SOS alert |
| GET | /api/sos/my-alerts | My SOS history |

### Ratings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ratings | Submit rating |
| GET | /api/ratings/user/:id | Get user's ratings |

### Admin (requires admin token)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Dashboard stats |
| GET | /api/admin/users | All users |
| PUT | /api/admin/approve-rider/:id | Approve rider |
| PUT | /api/admin/reject-rider/:id | Deactivate rider |
| GET | /api/admin/rides | All rides |
| GET | /api/admin/sos-alerts | All SOS alerts |
| PUT | /api/admin/sos-alerts/:id/resolve | Resolve SOS |

---

## 🛠️ TROUBLESHOOTING

**"Database connection failed"**
→ Check MySQL is running, and `.env` password is correct

**"Cannot find module"**
→ Run `npm install` again

**Page shows blank**
→ Make sure server is running on port 3000

**"Access token required"**
→ Try logging out and logging back in

---

## 📦 TECH STACK
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL with mysql2 driver
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Other**: CORS, dotenv
