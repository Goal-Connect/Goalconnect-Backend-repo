# GoalConnect Backend API

Backend API server for GoalConnect - A Digital Talent Scouting and Development Platform for Young Footballers in Ethiopia.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation

1. Clone the repository and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend folder:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/goalconnect
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:5000`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (academy/scout) |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/updatepassword` | Update password |
| POST | `/api/auth/logout` | Logout user |

### Academies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/academies` | Get all approved academies |
| GET | `/api/academies/:id` | Get single academy |
| GET | `/api/academies/me` | Get current academy profile |
| PUT | `/api/academies/me` | Update academy profile |
| GET | `/api/academies/me/players` | Get academy's players |

### Players
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players` | Get all players (with filters) |
| GET | `/api/players/:id` | Get single player |
| POST | `/api/players` | Create player (academy only) |
| PUT | `/api/players/:id` | Update player (academy only) |
| DELETE | `/api/players/:id` | Archive player (academy only) |
| GET | `/api/players/:id/videos` | Get player's videos |

### Scouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scouts/me` | Get scout profile |
| PUT | `/api/scouts/me` | Update scout profile |
| GET | `/api/scouts/saved-players` | Get saved players |
| POST | `/api/scouts/saved-players/:id` | Save a player |
| DELETE | `/api/scouts/saved-players/:id` | Unsave a player |

### Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | Get all public videos |
| GET | `/api/videos/:id` | Get single video |
| POST | `/api/videos` | Upload video (academy only) |
| PUT | `/api/videos/:id` | Update video |
| DELETE | `/api/videos/:id` | Delete video |
| GET | `/api/videos/:id/analysis` | Get video analysis |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Get dashboard stats |
| GET | `/api/admin/academies` | Get all academies |
| PUT | `/api/admin/academies/:id/approve` | Approve academy |
| PUT | `/api/admin/academies/:id/reject` | Reject academy |
| PUT | `/api/admin/academies/:id/suspend` | Suspend academy |
| GET | `/api/admin/scouts` | Get all scouts |
| PUT | `/api/admin/scouts/:id/approve` | Approve scout |

## User Roles

1. **Admin**: Full system access, approves/rejects registrations
2. **Academy**: Manages players, uploads videos
3. **Scout**: Searches and views players, saves favorites
4. **Player**: Views own profile and videos (managed by academy)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── models/
│   │   ├── User.js
│   │   ├── Academy.js
│   │   ├── Player.js
│   │   ├── Scout.js
│   │   ├── Video.js
│   │   ├── DrillAnalysis.js
│   │   ├── Match.js
│   │   └── MatchStats.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── academy.routes.js
│   │   ├── player.routes.js
│   │   ├── scout.routes.js
│   │   ├── video.routes.js
│   │   └── admin.routes.js
│   ├── controllers/
│   │   └── [controller files]
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   ├── utils/
│   │   └── helpers.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Scripts

```bash
npm start      # Start production server
npm run dev    # Start development server with nodemon
```

## Team

- **Backend Development**: Metasebiyaw Asfaw
- **AI/Computer Vision**: Leul Gedion
- **Frontend Development**: Mikiyas Hailegebreal
- **Mobile Development**: Yafet Tesfaye
- **Project Management**: Yordanos Belayneh

## License

ISC - Adama Science and Technology University

