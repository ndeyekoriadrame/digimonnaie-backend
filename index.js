require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const createAdmin = require('./InitAdmin');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionsRoutes = require('./routes/transactions');

const app = express();

// Middlewares
app.use(cors({
  origin: 'https://fantastic-tanuki-8eae4e.netlify.app/login', // ton frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true // si tu envoies des cookies/auth
}));
app.use(express.json());

// Connexion à MongoDB
connectDB(process.env.MONGO_URI);

// Création admin par défaut
createAdmin();

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionsRoutes);

// Dossier statique pour les images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Frontend React build
const frontendPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendPath));

// Middleware fallback pour React Router
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    next();
  }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
