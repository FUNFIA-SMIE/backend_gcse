const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  const { ObjectId } = require('mongodb');
/*
  router.post('/', async (req, res) => {
    try {
      const data = req.body;


      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Le corps doit être un tableau' });
      }

      const collection = db.collection('devis');

      let insertedCount = 0;
      let updatedCount = 0;
      let dernierInsere = null;

      for (const item of data) {
        if (item._id) {
          const { _id, ...itemSansId } = item;

          continue;
        }

        const { _id, ...itemSansId } = item;

        const newItem = {
          ...itemSansId,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await collection.insertOne(newItem);

        insertedCount++;
        dernierInsere = { _id: result.insertedId, ...newItem };
      }

      res.status(200).json({
        success: true,
        message: `${insertedCount} inséré(s), ${updatedCount} mis à jour.`,
        dernier: dernierInsere
      });
    } catch (error) {
      console.error('❌ Erreur serveur :', error);
      res.status(500).json({ message: 'Erreur lors du traitement' });
    }
  });
*/

router.post('/', async (req, res) => {
  try {
    const data = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Le corps doit être un tableau' });
    }

    const collection = db.collection('devis');

    let insertedCount = 0;
    let ignoredCount = 0;
    let dernierInsere = null;

    for (const item of data) {
      const { numero_decl, ...autresChamps } = item;

      if (!numero_decl) {
        console.warn('⚠️ Facture sans numero_decl ignorée.');
        continue;
      }

      const existing = await collection.findOne({ numero_decl });

      if (existing) {
        // On ignore complètement si le numero_decl existe déjà
        ignoredCount++;
        console.log(`⚠️ Ignoré : ${numero_decl} déjà existant.`);
        continue;
      }

      const now = new Date();
      const newItem = {
        numero_decl,
        ...autresChamps,
        createdAt: now,
        updatedAt: now
      };

      const result = await collection.insertOne(newItem);
      insertedCount++;
      dernierInsere = { _id: result.insertedId, ...newItem };
    }

    res.status(200).json({
      success: true,
      message: `${insertedCount} inséré(s), ${ignoredCount} ignoré(s car déjà existants).`,
      dernier: dernierInsere
    });
  } catch (error) {
    console.error('❌ Erreur serveur :', error);
    res.status(500).json({ message: 'Erreur lors du traitement' });
  }
});



  // GET /evenements
  router.get('/', async (req, res) => {
    try {
      const collection = db.collection('devis');
      const data = await collection.find({}).toArray();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la lecture' });
    }
  });

  return router;
};
