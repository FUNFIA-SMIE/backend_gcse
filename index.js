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

// Configuration CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://nandriamihoatra_db_user:kHC7D1SoSkxyQz2B@cluster0.lskxmtq.mongodb.net/sync?retryWrites=true&w=majority';
const DB_NAME = 'sync';

// Configuration MongoDB optimisée
const mongoOptions = {
  // Options pour MongoDB Atlas
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1
};

// Fonction de connexion avec gestion d'erreur améliorée
async function connectToDatabase() {
  try {
    console.log('🔗 Tentative de connexion à MongoDB...');
    
    const client = new MongoClient(MONGO_URI, mongoOptions);
    await client.connect();
    
    // Test de la connexion
    await client.db(DB_NAME).command({ ping: 1 });
    console.log('✅ Connexion MongoDB réussie!');
    
    return client;
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    
    // Tentative alternative avec options différentes
    console.log('🔄 Tentative de connexion alternative...');
    const fallbackOptions = {
      tls: true,
      tlsAllowInvalidCertificates: true, // Plus permissif pour tester
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000
    };
    
    const fallbackClient = new MongoClient(MONGO_URI, fallbackOptions);
    await fallbackClient.connect();
    console.log('✅ Connexion de secours réussie!');
    
    return fallbackClient;
  }
}

// Démarrage de l'application
async function startServer() {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);

    // Configuration des routes statiques
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.use(express.static(path.join(__dirname, 'public')));

    // Configuration des routes avec injection de la DB
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

    // Route de santé
    app.get('/health', (req, res) => {
      res.json({ status: 'OK', database: 'Connected' });
    });

    // Démarrage du serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
      console.log(`📊 Base de données: ${DB_NAME}`);
    });

  } catch (error) {
    console.error('💥 Erreur critique au démarrage:', error);
    process.exit(1);
  }
}

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

// Démarrage
startServer();