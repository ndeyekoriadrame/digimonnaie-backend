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

// --- CORS dynamique pour plusieurs frontends ---
const allowedOrigins = [
  'https://digimonnaie.netlify.app',
  'https://spectacular-tulumba-b212d2.netlify.app',
  'https://fantastic-tanuki-8eae4e.netlify.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Autorise les requêtes sans origin (ex: Postman) ou celles dans allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// --- Middlewares ---
app.use(express.json());

// --- Connexion à MongoDB ---
(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    console.log('✅ MongoDB connecté');
    await createAdmin(); // Création de l’admin par défaut
  } catch (err) {
    console.error('❌ Erreur MongoDB ou création admin :', err.message);
  }
})();

// --- Routes API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionsRoutes);

// --- Dossier statique pour les images / uploads ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Page 404 pour API ---
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Route API non trouvée' });
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
