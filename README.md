# 🏠 Boodima.lk

A full-stack boarding rental platform connecting tenants with verified local listings — featuring real-time search, location filtering, listing management, and a fully responsive UI.

This platform revolutionizes how students and professionals find accommodation. Built with modern web technology, it provides seamless browsing, secure communication, and verified landlords.

**[🔗 Live Demo](https://www.boodima.lk/)**

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
**Other:** JWT Authentication, Cloudinary (image storage), Groq API (AI features)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/K4V1DU/boodima.git
cd boodima

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Environment Variables

Create a `.env` file in the `client` directory:

```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

Create a `.env` file in the `server` directory:

```env
GROQ_API_KEY=your_groq_api_key
MONGO_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
PORT=8000
```

> ⚠️ Never commit your actual `.env` file. Add it to `.gitignore` and share only a `.env.example` with placeholder values.

### Run Locally

```bash
# Start the backend
cd server
npm run dev

# Start the frontend (in a new terminal)
cd client
npm start
```

The app should now be running at `http://localhost:3000`, with the API served from `http://localhost:8000`.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/K4V1DU/boodima/issues).

---

## 📬 Contact

For questions or feedback, feel free to reach out via GitHub Issues.
