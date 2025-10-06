const Counter = require('../models/Counter');

async function getNextSequence(name) {
  // Atome: increment or create
  const updated = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  return updated.seq;
}

function formatAccountNumber(seq) {
  // format DIGI + 5 chiffres (padded)
  return `DIGI${String(seq).padStart(5, '0')}`;
}

async function generateAccountNumber() {
  const seq = await getNextSequence('accountNumber');
  return formatAccountNumber(seq);
}

module.exports = { generateAccountNumber, formatAccountNumber, getNextSequence };
