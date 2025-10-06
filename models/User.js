const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  dob: { type: Date, required: true },
  idCard: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'distributeur'], default: 'client' },
  blocked: { type: Boolean, default: false },
  accountNumber: { type: String, unique: true, sparse: true },
  balance: { type: Number, default: 0 },
  fileUrl: { type: String }, // 👈 ajout pour fichier (image ou document)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
