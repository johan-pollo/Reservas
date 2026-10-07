require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { initializeCollections } = require('./database/initialize');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/', {
    dbName: process.env.MONGODB_DB_NAME || 'Reservas'
  });
  await initializeCollections();

  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`API de reservas disponible en http://localhost:${port}`));
}

start().catch((error) => {
  console.error('No se pudo iniciar la API:', error.message);
  process.exit(1);
});