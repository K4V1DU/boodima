# 🏠 Boodima.lk

A full-stack boarding rental platform connecting tenants with verified local listings — featuring real-time search, location filtering, listing management, and a fully responsive UI.

This platform revolutionizes how students and professionals find accommodation. Built with modern web technology, it provides seamless browsing, secure communication, and verified landlords.

**[🔗 Live Demo](#)**

![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

---

## ✨ Features

- 🔍 **Real-time Search & Location Filtering** — Find boarding listings by location, price, and amenities
- 🏘️ **Listing Management** — Owners can add, edit, delete, and toggle listing status
- 💬 **In-app Chat** — Real-time messaging between tenants and landlords with read receipts and file sharing
- 📅 **Booking System** — Inquiry-based booking with status tracking
- 🔐 **Secure Authentication** — Email/password login with password recovery
- 📱 **Fully Responsive UI** — Optimized experience across desktop, tablet, and mobile

---

## 🛠️ Tech Stack

**Frontend:** React, Tailwind CSS / CSS3
**Backend:** Node.js, Express
**Database:** MongoDB
**Other:** Real-time chat (Socket.io), JWT Authentication

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/boodima.lk.git
cd boodima.lk

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Environment Variables

Create a `.env` file in the `server` directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Run Locally

```bash
# Start the backend
cd server
npm run dev

# Start the frontend (in a new terminal)
cd client
npm start
```

The app should now be running at `http://localhost:3000`.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues).

---

## 📬 Contact

For questions or feedback, feel free to reach out via GitHub Issues.
