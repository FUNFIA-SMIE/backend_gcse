const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Création du dossier de destination s’il n'existe pas
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de multer avec vérification de doublon
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const fullPath = path.join(uploadDir, file.originalname);
    if (fs.existsSync(fullPath)) {
      // Si le fichier existe, renvoyer une erreur
      return cb(new Error('Fichier déjà existant'));
    }
    cb(null, file.originalname); // Sinon, enregistrer normalement
  },
});

const upload = multer({ storage });

// Route POST /images
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu ou doublon détecté.' });
  }

  console.log('📥 Fichier reçu :', req.file.originalname);
  return res.status(200).json({
    message: 'Fichier reçu avec succès',
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
  });
});

// Gestion des erreurs de multer ()
router.use((err, req, res, next) => {
  if (err.message === 'Fichier déjà existant') {
    return res.status(409).json({ error: '❌ Fichier déjà existant.' });
  }
  return res.status(500).json({ error: '❌ Erreur serveur.' });
});

module.exports = router;
