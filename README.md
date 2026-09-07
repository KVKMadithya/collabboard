# SyncBoard (CollabBoard) - Workspace Environment 🚀

SyncBoard is a full-stack collaborative workspace application designed to streamline team communication, project management, and development workflows. Built using the MERN stack, it centralizes essential productivity tools into a single, highly interactive dashboard.

## ✨ Key Features
* **Real-Time Whiteboard:** Low-latency, multi-user drawing interface powered by Socket.io.
* **AI Workspace Companion:** Integrated Groq AI assistant that analyzes workspace data and answers team-specific queries.
* **Live GitHub Integration:** Seamless GitHub API connection tracking repository commit history.
* **Project Management:** Secure authentication and task delegation via MongoDB Atlas.

## 🛠️ Tech Stack
* **Frontend:** React.js (Deployed on Vercel)
* **Backend:** Node.js, Express.js, Socket.io (Deployed on Railway)
* **Database:** MongoDB Atlas
* **External APIs:** Groq AI, GitHub API

## 🚀 Live Demo
* **Frontend Deployment:** [Insert your Vercel URL here]
* **Backend API:** [Insert your Railway URL here]

## 💻 Local Setup Instructions

To run this project locally for grading or development, follow these steps:

### 1. Clone the Repository
\`\`\`bash
git clone [Insert your GitHub Repo URL here]
cd collab-board
\`\`\`

### 2. Install Dependencies
You will need to install the Node modules for both the frontend and the backend.
\`\`\`bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
\`\`\`

### 3. Environment Variables
Create a `.env` file in the `/server` directory. To evaluate the backend, please use the following MongoDB Atlas connection string provisioned specifically for this assessment:

\`\`\`env
PORT=5000
MONGODB_URI=mongodb+srv://kavindumadithya_db_user:<YOUR_PASSWORD>@cluster0.xxxxxx.mongodb.net/collabboard?retryWrites=true&w=majority
GROQ_API_KEY=[Insert your Groq Key or leave a placeholder]
\`\`\`
*(Note: Replace `<YOUR_PASSWORD>` and the cluster URL with your actual database credentials before pushing!)*

### 4. Start the Application
Open two separate terminals.

**Terminal 1 (Backend):**
\`\`\`bash
cd server
npm start
\`\`\`

**Terminal 2 (Frontend):**
\`\`\`bash
cd client
npm start
\`\`\`
