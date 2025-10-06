const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Admin = require('../models/Admin'); // ajouté pour vérifier admin si besoin
const { verifyToken, isAdmin } = require('../middleware/auth');
const { generateAccountNumber } = require('../utils/accountNumber');
const upload = require('../middleware/upload'); // 👈 import multer

const router = express.Router();

// Rôles autorisés pour la création par admin
const allowedRoles = ['client', 'distributeur'];

// ----------------------
// CRÉER UN UTILISATEUR (admin only + upload fichier)
// ----------------------
router.post('/', verifyToken, isAdmin, upload.single("file"), async (req, res) => {
  try {
    const { fullname, dob, idCard, phone, address, email, password, role } = req.body;

    if (!fullname || !dob || !idCard || !phone || !address || !email || !password)
      return res.status(400).json({ message: 'Champs manquants' });

    if (!allowedRoles.includes(role))
      return res.status(400).json({ message: 'Rôle invalide' });

    // Vérifications unicité
    const existingEmail = await User.findOne({ email });
    const existingIdCard = await User.findOne({ idCard });
    const existingPhone = await User.findOne({ phone });

    if (existingEmail) return res.status(409).json({ message: 'Email déjà utilisé' });
    if (existingIdCard) return res.status(409).json({ message: "Carte d'identité déjà utilisée" });
    if (existingPhone) return res.status(409).json({ message: 'Numéro de téléphone déjà utilisé' });

    const hashed = await bcrypt.hash(password, 10);
    const accountNumber = await generateAccountNumber();

    const user = new User({
      fullname,
      dob,
      idCard,
      phone,
      address,
      email,
      password: hashed,
      role,
      accountNumber,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null // 👈 lien vers le fichier
    });

    await user.save();

    res.status(201).json({
      message: 'Utilisateur créé',
      user: { 
        id: user._id, 
        fullname, 
        email, 
        role: user.role, 
        accountNumber, 
        phone, 
        address,
        fileUrl: user.fileUrl 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});
// ----------------------
// LISTER UTILISATEURS (admin only) avec pagination et filtre
// ----------------------
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.max(1, parseInt(req.query.limit || '10'));
    const search = req.query.search || '';
    const filter = search ? { fullname: { $regex: search, $options: 'i' } } : {};

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ page, limit, total, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ----------------------
// OBTENIR UN UTILISATEUR
// ----------------------
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    // Autorisation : admin ou utilisateur lui-même
    if (req.user.id !== id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès refusé' });

    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ----------------------
// MODIFIER UN UTILISATEUR (lui-même ou admin)
// ----------------------
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (req.user.id !== id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès refusé' });

    const updates = { ...req.body };
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
    if (req.user.role !== 'admin') delete updates.role; // empêche changement de rôle par user non-admin

    // Vérifier que le rôle fourni est valide si admin
    if (updates.role && !allowedRoles.includes(updates.role))
      return res.status(400).json({ message: 'Rôle invalide' });

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json({ message: 'Mis à jour', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ----------------------
// SUPPRIMER UN UTILISATEUR (admin ou lui-même)
// ----------------------
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    if (req.user.id !== id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Accès refusé' });

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ----------------------
// SUPPRESSION MULTIPLE (admin only)
// ----------------------
router.post('/delete-multiple', verifyToken, isAdmin, async (req, res) => {
  try {
    const ids = req.body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'Aucun id fourni' });

    const result = await User.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Suppression multiple effectuée', deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ----------------------
// BLOQUER / DÉBLOQUER UN OU PLUSIEURS UTILISATEURS (admin only)
// ----------------------
router.post('/block', verifyToken, isAdmin, async (req, res) => {
  try {
    const ids = req.body.ids || [];
    const block = !!req.body.block;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'Aucun id fourni' });

    const result = await User.updateMany({ _id: { $in: ids } }, { $set: { blocked: block } });
    res.json({
      message: block ? 'Utilisateurs bloqués' : 'Utilisateurs débloqués',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
