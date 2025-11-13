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
const connexion = require('./routes/connexion');
const designation_devis = require('./routes/designation_devis');
const niveau1 = require('./routes/niveau_1');
const ouvrage_equipement = require('./routes/ouvrage_equipement');
const compteur = require('./routes/compteur');
const decl_token = require('./routes/decl_token');
const historique_decl = require('./routes/historique_decl');
const demande_token = require('./routes/demande_token');
const historique_decl_manuel = require('./routes/historique_decl_manuel');
const delete_ = require('./routes/delete');
const path = require('path');
const inspection = require('./routes/inspection');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = 3000;

// ✅ CORRECTION : Utilisez l'URI STANDARD (pas mongodb+srv)
const MONGO_URI = 'mongodb://nandriamihoatra_db_user:kHC7D1SoSkxyQz2B@ac-9ph6rxx-shard-00-00.lskxmtq.mongodb.net:27017,ac-9ph6rxx-shard-00-01.lskxmtq.mongodb.net:27017,ac-9ph6rxx-shard-00-02.lskxmtq.mongodb.net:27017/sync?ssl=true&replicaSet=atlas-lmfzve-shard-0&authSource=admin&retryWrites=true&w=majority';

const DB_NAME = 'sync';

// ✅ CORRECTION : Options modernes sans useUnifiedTopology
const mongoOptions = {
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000
};

MongoClient.connect(MONGO_URI, mongoOptions)
  .then(client => {
    console.log('✅ Connexion MongoDB réussie!');
    const db = client.db(DB_NAME);
    
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    // Configuration des routes
    app.use('/evenements', evenementsRoutes(db));
    app.use('/branchements', branchementsRoutes(db));
    app.use('/login', loginRoutes(db));
    app.use('/devis', devisRoutes(db));
    app.use('/diagnostic', diagnosticRoutes(db));
    app.use('/intervention', interventionRoutes(db));
    app.use('/designation_devis', designation_devis(db));
    app.use('/niveau1', niveau1(db));
    app.use('/ouvrage_equipement', ouvrage_equipement(db));
    app.use('/compteur', compteur(db));
    app.use('/decl_token', decl_token(db));
    app.use('/historique_decl', historique_decl(db));
    app.use('/demande_token', demande_token(db));
    app.use('/historique_decl_manuel', historique_decl_manuel(db));
    app.use('/delete', delete_(db));
    app.use('/inspection', inspection(db));
    app.use('/images', imageRoutes);
    app.use('/connexion', connexion);

    app.use(express.static(path.join(__dirname, 'public')));

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB :', err);
  });