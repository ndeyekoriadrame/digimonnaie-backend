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

// --------------------
// CORS configuration
// --------------------
// Tu peux ajouter plusieurs URLs de frontends autorisés ici
const allowedOrigins = [
  'https://digimonnaie.netlify.app',
  'https://spectacular-tulumba-b212d2.netlify.app'
];

app.use(cors({
  origin: function(origin, callback){
    // autoriser les requêtes sans origine (postman, curl)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `CORS policy: ${origin} non autorisé`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
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
