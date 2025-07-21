const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const evenementsRoutes = require('./routes/evenements');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017'; // ou ton URI MongoDB
const DB_NAME = 'sync'; // à adapter avec le vrai nom

MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    const db = client.db(DB_NAME);

    // ✅ Injecte `db` ici
    app.use('/evenements', evenementsRoutes(db));

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB :', err);
  });


  