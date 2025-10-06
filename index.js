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
const routes = require("./routes");

const app = express();

// --------------------
// CORS configuration
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

// --------------------
// Middlewares de base
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de toutes les requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// --------------------
// Connexion à MongoDB
// --------------------
connectDB(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    createAdmin();
  })
  .catch(err => console.error('❌ Erreur MongoDB:', err.message));

// --------------------
// Route de santé (health check)
// --------------------
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API fonctionne correctement',
    timestamp: new Date()
  });
});

// --------------------
// Dossier statique pour les images
// --------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --------------------
// Routes API
// --------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionsRoutes);

console.log('✅ Routes API montées');

// --------------------
// Gestion 404 pour les routes API non trouvées
// --------------------
app.use("/api", routes);
app.all("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});


// --------------------
// React frontend (si tu veux le servir depuis Express)
// --------------------
const frontendPath = path.join(__dirname, 'frontend', 'dist');
if (require('fs').existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // Fallback pour React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.warn('⚠️ Dossier frontend/dist introuvable. Frontend servi depuis Netlify.');
}

// --------------------
// Démarrage du serveur
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
});