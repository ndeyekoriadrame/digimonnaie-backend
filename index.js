require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const createAdmin = require('./InitAdmin');

// Importation des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionsRoutes = require('./routes/transactions');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Connexion à MongoDB Atlas
connectDB(process.env.MONGO_URI);

// Création de l’administrateur par défaut (si inexistant)
createAdmin();

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionsRoutes);

// Dossier statique (pour les images, par ex.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Si tu veux servir ton frontend (React buildé) depuis le backend :
const __dirname1 = path.join();
app.use(express.static(path.join(__dirname1, '/frontend/dist')));

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname1, 'frontend', 'dist', 'index.html'));
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));
