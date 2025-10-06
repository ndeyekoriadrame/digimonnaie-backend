const express = require('express');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Transaction = require('../models/Transaction');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * -------------------------------
 * Récupérer toutes les transactions (admin only)
 * -------------------------------
 */
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(transactions.map(async (tx) => {
      const txObj = tx.toObject();
      let from = null;
      let to = null;

      // Vérifie si "from" est un User ou un Admin
      if (tx.from) {
        from = await User.findById(tx.from).select("fullname email accountNumber").lean();
        if (!from) {
          from = await Admin.findById(tx.from).select("fullname email accountNumber").lean();
        }
      }

      if (tx.to) {
        to = await User.findById(tx.to).select("fullname email accountNumber").lean();
      }

      return {
        ...txObj,
        from,
        to,
      };
    }));

    res.json({ transactions: enriched });
  } catch (error) {
    console.error("Erreur GET /transactions:", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

/**
 * -------------------------------
 * Dépôt d'argent (admin only)
 * -------------------------------
 */
router.post('/deposit', verifyToken, isAdmin, async (req, res) => {
  try {
    const { accountNumber, amount } = req.body;
    if (!accountNumber || !amount || amount <= 0)
      return res.status(400).json({ message: 'Paramètres invalides' });

    const user = await User.findOne({ accountNumber });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const admin = await Admin.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: 'Admin non trouvé' });

    if ((admin.balance || 0) < amount)
      return res.status(400).json({ message: 'Solde admin insuffisant' });

    admin.balance -= amount;
    user.balance = (user.balance || 0) + amount;

    await admin.save();
    await user.save();

    const transaction = await Transaction.create({
      transactionId: uuidv4(),
      type: 'deposit',
      from: admin._id,
      to: user._id,
      amount,
    });

    res.json({
      message: `Dépôt de ${amount} effectué sur le compte ${accountNumber}`,
      userBalance: user.balance,
      adminBalance: admin.balance,
      transactionId: transaction.transactionId
    });
  } catch (err) {
    console.error("Erreur dépôt:", err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

/**
 * -------------------------------
 * Transfert entre utilisateurs
 * -------------------------------
 */
router.post('/transfer', verifyToken, async (req, res) => {
  try {
    const { toAccountNumber, amount } = req.body;
    if (!toAccountNumber || !amount || amount <= 0)
      return res.status(400).json({ message: 'Paramètres invalides' });

    const fromUser = await User.findById(req.user.id);
    const toUser = await User.findOne({ accountNumber: toAccountNumber });

    if (!fromUser || !toUser)
      return res.status(404).json({ message: 'Utilisateur non trouvé' });

    if ((fromUser.balance || 0) < amount)
      return res.status(400).json({ message: 'Solde insuffisant' });

    fromUser.balance -= amount;
    toUser.balance += amount;

    await fromUser.save();
    await toUser.save();

    const transaction = await Transaction.create({
      transactionId: uuidv4(),
      type: 'transfer',
      from: fromUser._id,
      to: toUser._id,
      amount,
    });

    res.json({
      message: `Transfert de ${amount} effectué vers le compte ${toAccountNumber}`,
      fromBalance: fromUser.balance,
      toBalance: toUser.balance,
      transactionId: transaction.transactionId
    });
  } catch (err) {
    console.error("Erreur transfert:", err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

/**
 * -------------------------------
 * Annuler une transaction (admin only)
 * -------------------------------
 */
router.post('/cancel', verifyToken, isAdmin, async (req, res) => {
  try {
    const { transactionId } = req.body;
    const transaction = await Transaction.findOne({ transactionId });

    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });
    if (transaction.status === 'cancelled')
      return res.status(400).json({ message: 'Transaction déjà annulée' });

    if (transaction.type === 'deposit') {
      const admin = await Admin.findById(transaction.from);
      const user = await User.findById(transaction.to);

      if (user.balance < transaction.amount)
        return res.status(400).json({ message: 'Solde utilisateur insuffisant pour annuler' });

      user.balance -= transaction.amount;
      admin.balance += transaction.amount;

      await user.save();
      await admin.save();
    }

    if (transaction.type === 'transfer') {
      const fromUser = await User.findById(transaction.from);
      const toUser = await User.findById(transaction.to);

      if (toUser.balance < transaction.amount)
        return res.status(400).json({ message: 'Solde insuffisant pour annuler' });

      toUser.balance -= transaction.amount;
      fromUser.balance += transaction.amount;

      await toUser.save();
      await fromUser.save();
    }

    transaction.status = 'cancelled';
    await transaction.save();

    res.json({ message: 'Transaction annulée avec succès', transaction });
  } catch (err) {
    console.error("Erreur annulation:", err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

module.exports = router;
