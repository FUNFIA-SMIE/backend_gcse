const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const evenementsRoutes = require('./routes/evenements');
const branchementsRoutes = require('./routes/branchement');
const loginRoutes = require('./routes/login');
const devisRoutes = require('./routes/devis');
const diagnosticRoutes = require('./routes/diagnostic');
const interventionRoutes = require('./routes/intervention');
const imageRoutes = require('./routes/image');
const connexion = require('./routes/connexion')
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());


const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017'; // ou ton URI MongoDB
const DB_NAME = 'sync'; // à adapter avec le vrai nom

MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    const db = client.db(DB_NAME);
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    // ✅ Injecte `db` ici
    app.use('/evenements', evenementsRoutes(db));
    app.use('/branchements', branchementsRoutes(db));
    app.use('/login', loginRoutes(db));
    app.use('/devis', devisRoutes(db));
    app.use('/diagnostic', diagnosticRoutes(db));
    app.use('/intervention', interventionRoutes(db));
    app.use('/images', imageRoutes);
    app.use('/connexion', connexion);



    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB :', err);
  });


