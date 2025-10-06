const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true }, // numéro unique
  type: { type: String, enum: ['deposit', 'transfer'], required: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // ou Admin
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
