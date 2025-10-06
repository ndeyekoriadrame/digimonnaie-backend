const Admin = require('./models/Admin'); 
const bcrypt = require('bcrypt');

async function createAdmin() {
  try {
    const adminExists = await Admin.findOne({ email: 'admin@gmail.com' }); 
    if (!adminExists) {
      const hashed = await bcrypt.hash('1234', 10);
      await Admin.create({
        prenom: "ndeye koria",
        nom: "drame",
        adresse: "Dakar",
        telephone: "773432485",
        fullname: 'ndeye koria drame',
        email: 'admin@gmail.com',
        password: hashed,
        role: 'admin'
      });
      console.log('✅ Admin créé');
    } else {
      console.log('ℹ️ Admin déjà existant');
    }
  } catch (err) {
    console.error('❌ Erreur lors de la création de l’admin :', err.message);
  }
}

module.exports = createAdmin;
