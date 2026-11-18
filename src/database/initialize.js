const mongoose = require('mongoose');
const User = require('../models/user');
const Service = require('../models/service');
const Reservation = require('../models/reservation');

const models = [User, Service, Reservation];

async function initializeCollections() {
  const existingCollections = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();
  const existingNames = new Set(existingCollections.map(({ name }) => name));

  for (const model of models) {
    const collectionName = model.collection.collectionName;
    if (!existingNames.has(collectionName)) {
      await model.createCollection();
      existingNames.add(collectionName);
    }

    await model.createIndexes();
  }

  return models.map((model) => model.collection.collectionName);
}

module.exports = { initializeCollections };