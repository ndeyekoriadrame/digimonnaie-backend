const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist');
const User = require('../models/User');

const auth = {};

auth.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Token manquant' });

    // Vérifier blacklist
    const black = await TokenBlacklist.findOne({ token });
    if (black) return res.status(401).json({ message: 'Token invalide (déconnecté)' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Chercher d'abord dans User
    let user = await User.findById(payload.id).select('-password');
    let role = user?.role;

    // Si pas trouvé dans User, chercher dans Admin
    if (!user) {
      const Admin = require('../models/Admin');
      user = await Admin.findById(payload.id).select('-password');
      role = 'admin';
    }

    if (!user) return res.status(401).json({ message: 'Utilisateur non trouvé' });

    // Mettre req.user avec rôle
    req.user = { ...user.toObject(), role };

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

auth.isAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé (admin only)' });
  next();
};

module.exports = auth;
