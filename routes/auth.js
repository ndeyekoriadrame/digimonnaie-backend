const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Admin = require('../models/Admin');
const TokenBlacklist = require('../models/TokenBlacklist');
const { verifyToken } = require('../middleware/auth'); // si tu l'as déjà
const upload = require('../middleware/upload'); // ton multer déjà créé

const router = express.Router();

// ----------------------
// LOGIN
// ----------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Champs manquants' });

    let user = await Admin.findOne({ email });
    let role = 'admin';

    if (!user) {
      user = await User.findOne({ email });
      role = user?.role;
    }

    if (!user) return res.status(401).json({ message: 'Email ou mot de passe invalide' });
    if (user.blocked) return res.status(403).json({ message: 'Compte bloqué' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Email ou mot de passe invalide' });

    const payload = { id: user._id, role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Connecté',
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role,
        accountNumber: user.accountNumber || null,
        balance: user.balance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ----------------------
// LOGOUT
// ----------------------
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(400).json({ message: 'Token manquant' });

    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600000);
    await TokenBlacklist.create({ token, expiresAt });

    res.json({ message: 'Déconnecté' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// Modifier les infos de l'admin avec upload de photo
router.put("/update/:id", upload.single("photo"), async (req, res) => {
  try {
    const { prenom, nom, adresse, telephone } = req.body;
    const updates = { prenom, nom, adresse, telephone };

    // Si un fichier a été uploadé, on ajoute le chemin
    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true } // renvoie le document mis à jour
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin non trouvé" });
    }

res.json({ 
  message: "✅ Admin mis à jour", 
  admin: {
    ...updatedAdmin.toObject(),
    photo: updatedAdmin.photo // Assure que le chemin photo est bien renvoyé
  }
});
  } catch (err) {
    res.status(500).json({ message: "❌ Erreur serveur", error: err.message });
  }
});


// GET /admin/:id
router.get("/admin/:id", async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin non trouvé" });
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});


// Récupérer l'admin connecté
router.get("/me", verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: "Admin non trouvé" });

    res.json({
      id: admin._id,
      fullname: admin.fullname,
      email: admin.email,
      balance: admin.balance,
      photo: admin.photo || null, // <-- ajouter la photo
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});


module.exports = router;
