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

// CORS configuration - VERSION SIMPLIFIÉE
// --------------------
app.use(cors({
  origin: [
    'https://digimonnaie.netlify.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON parser
app.use(express.json());

// --------------------
// Connexion à MongoDB
// --------------------
connectDB(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    // Création admin par défaut
    createAdmin();
  })
  .catch(err => console.error('❌ Erreur MongoDB:', err.message));

// --------------------
// Routes API
// --------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionsRoutes);

// Gestion des routes API non trouvées
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route API non trouvée' });
});

// --------------------
// Dossier statique pour les images
// --------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --------------------
// React frontend (si tu veux le servir depuis Express)
// --------------------
// Vérifie que ce dossier existe sur Render avant de déployer
const frontendPath = path.join(__dirname, 'frontend', 'dist');
if (require('fs').existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  // Fallback pour React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.warn('⚠️ Dossier frontend/dist introuvable. Servir le frontend depuis Netlify.');
}

// --------------------
// Démarrage du serveur
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
