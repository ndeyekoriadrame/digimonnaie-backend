const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  prenom: { type: String, required: false },
  nom: { type: String, required: false },
  adresse: { type: String, required: false },
  telephone: { type: String, required: false },
  fullname: { type: String }, // tu peux garder fullname ou le remplacer par prénom + nom
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" },
  balance: { type: Number, default: 1000000 }, // solde initial par exemple
  photo: { type: String, default: "" } // <--- ajout ici
});

module.exports = mongoose.model("Admin", adminSchema);
