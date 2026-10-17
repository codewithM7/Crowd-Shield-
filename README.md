# Crowd-Shield-


**Crowd Shield** is a full stack web application that detects crowd levels and alerts people about potential danger, helping prevent overcrowding incidents and keep public spaces safe.

---

## 🚨 Problem

Overcrowding at events, stations, temples, and public gatherings can quickly turn dangerous, and by the time authorities notice, it is often too late. Crowd Shield aims to detect risky crowd density early and send timely alerts so action can be taken before something goes wrong.

## ✨ Features

- 📹 **Crowd detection** using an AI model to estimate crowd density from [camera feed / video / images]
- ⚠️ **Real-time danger alerts** when crowd levels cross a safe threshold
- 📊 **Dashboard** to monitor crowd status [add: live counts, history, charts]
- 🔐 **User authentication** [add if implemented]
- 🔌 **REST API** for communication between the AI module, backend, and frontend

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| AI / Detection | [Python, OpenCV, YOLO / your model] |
| API Testing | Postman |

## 📁 Project Structure

```
Crowd-Shield-
├── ai/          # Crowd detection model and scripts
├── backend/     # Node.js + Express server, APIs, database logic
├── frontend/    # React user interface
├── .postman/    # Postman API collection
└── README.md
```

## ⚙️ How It Works

1. The **AI module** analyzes the input [video / camera feed] and estimates crowd density.
2. The result is sent to the **backend** through an API.
3. The backend checks it against a danger threshold and stores the data in **MongoDB**.
4. If the level is unsafe, an **alert** is triggered [on the dashboard / via notification / SMS].
5. The **frontend** displays the live status to the user.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or above)
- MongoDB (local or Atlas)
- Python 3.9+ (for the AI module)

### 1. Clone the repository

```bash
git clone https://github.com/codewithM7/Crowd-Shield-.git
cd Crowd-Shield-
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

Start the server:

```bash
npm start
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm start
```

### 4. Set up the AI module

```bash
cd ai
pip install -r requirements.txt
python main.py
```

> Update the file names and commands above to match your actual project.

## 📸 Screenshots

_Add screenshots of your dashboard and alerts here._

## 🔮 Future Improvements

- Improve detection accuracy and speed with better ML models
- Add SMS and push notification alerts
- Support multiple camera feeds
- Build a mobile app version using Flutter
- Add crowd prediction using historical data

## 🤝 Contributing

Contributions are welcome. Fork the repo, create a branch, and open a pull request.

## 👤 Author

**Dilsad Ali**
3rd Year CSE Student | Web Developer
GitHub: [@codewithM7](https://github.com/codewithM7)

---

⭐ If you like this project, consider giving it a star!
