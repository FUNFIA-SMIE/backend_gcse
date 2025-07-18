const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  // POST /evenements
  /*
  router.post('/', async (req, res) => {
    try {
      const data = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Le corps doit être un tableau' });
      }

      const collection = db.collection('evenements');
      const result = await collection.insertMany(data);

      res.status(201).json({ insertedCount: result.insertedCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de l\'insertion' });
    }
  });
*/
  // GET /evenements
  router.get('/', async (req, res) => {
    try {
      const collection = db.collection('evenements');
      const data = await collection.find({}).toArray();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la lecture' });
    }
  });

  router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Le corps doit être un tableau' });
    }

    const collection = db.collection('evenements');

    for (const item of data) {
      if (!item.numero) continue;

      // Recherche de l'enregistrement existant
      const existing = await collection.findOne({ numero: item.numero });

      if (!existing) {
        // Pas trouvé => insert
        await collection.insertOne({ ...item, updatedAt: new Date() });
      } else {
        // Trouvé => comparer les données
        // Pour simplifier, on compare JSON.stringify (peut être optimisé)
        const itemSansDates = { ...item };
        delete itemSansDates.updatedAt;
        const existingSansDates = { ...existing };
        delete existingSansDates.updatedAt;
        delete existingSansDates._id; // ignore id dans comparaison

        if (JSON.stringify(itemSansDates) !== JSON.stringify(existingSansDates)) {
          // Données différentes => update avec updatedAt
          await collection.updateOne(
            { numero: item.numero },
            { $set: { ...item, updatedAt: new Date() } }
          );
        }
        // Sinon pas de changement => ne rien faire
      }
    }

    res.status(200).json({ success: true, message: `${data.length} éléments synchronisés.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la synchronisation' });
  }
});


  return router;
};
