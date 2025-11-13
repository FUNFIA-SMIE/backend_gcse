const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
// ... vos autres imports

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ✅ SOLUTION : Utiliser l'URI standard au lieu de mongodb+srv
const MONGO_URI = process.env.MONGO_URI || 'mongodb://nandriamihoatra_db_user:kHC7D1SoSkxyQz2B@ac-9ph6rxx-shard-00-00.lskxmtq.mongodb.net:27017,ac-9ph6rxx-shard-00-01.lskxmtq.mongodb.net:27017,ac-9ph6rxx-shard-00-02.lskxmtq.mongodb.net:27017/sync?ssl=true&replicaSet=atlas-lmfzve-shard-0&authSource=admin&retryWrites=true&w=majority';

const DB_NAME = 'sync';

// Configuration MongoDB optimisée pour Render
const mongoOptions = {
  tls: true,
  tlsAllowInvalidCertificates: false,
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10
};

async function connectToDatabase() {
  try {
    console.log('🔗 Tentative de connexion à MongoDB...');
    console.log('URI:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    const client = new MongoClient(MONGO_URI, mongoOptions);
    await client.connect();
    
    // Test de la connexion
    await client.db(DB_NAME).command({ ping: 1 });
    console.log('✅ Connexion MongoDB réussie!');
    
    return client;
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    throw error;
  }
}

// Le reste de votre code reste identique...
async function startServer() {
  try {
    const client = await connectToDatabase();
    const db = client.db(DB_NAME);

    // Configuration des routes...
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    app.use(express.static(path.join(__dirname, 'public')));

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

    app.get('/health', (req, res) => {
      res.json({ status: 'OK', database: 'Connected' });
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
    });

  } catch (error) {
    console.error('💥 Erreur critique au démarrage:', error);
    process.exit(1);
  }
}

startServer();