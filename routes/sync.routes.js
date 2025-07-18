const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connexion MongoDB
mongoose.connect('mongodb://localhost:27017/synchronisation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
app.post('/evenements', async (req, res) => {
  try {
    const data = req.body; // tableau de données
    const collection = db.collection('evenement');
    const inserted = await collection.insertMany(data);
    res.json({ success: true, count: inserted.insertedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST générique : /sync/:type
app.post('/sync/:type', async (req, res) => {
  const { type } = req.params; // ex : "evenement", "login"
  const data = req.body;       // tableau de données
  const collection = db.collection(type);

  try {
    for (const item of data) {
      // Si chaque élément a un champ unique (ex: "numero" ou "id"), utilise-le
      const filter = item.numero ? { numero: item.numero } :
        item.id ? { id: item.id } :
          item; // Si pas de clé unique, ça créera des doublons

      await collection.updateOne(
        filter,
        { $set: { ...item, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    res.json({ success: true, message: `Synchronisation de ${type} réussie.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: `Erreur pour ${type}` });
  }
});

// ✅ GET générique : /sync/:type
app.get('/sync/:type', async (req, res) => {
  const { type } = req.params;
  const collection = db.collection(type);

  try {
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Erreur de lecture des données ${type}` });
  }
});

module.exports = app
