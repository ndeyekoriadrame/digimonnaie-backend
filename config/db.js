const mongoose = require('mongoose');

async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      // options modernes intégrées dans mongoose 7+
    });
    console.log('✅ MongoDB connecté');
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB', err);
    process.exit(1);
  }
}

module.exports = connectDB;


