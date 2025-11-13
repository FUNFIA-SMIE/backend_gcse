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
/*
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
*/
  const collection = db.collection('devis');


  async function genererNumero(prefix = 'DEVIS') {
    const now = new Date();
    const mois = String(now.getMonth() + 1).padStart(2, '0');
    const annee = String(now.getFullYear()).slice(-2);
    const suffix = `${mois}${annee}`;
    const regex = new RegExp(`^(\\d{4})/${prefix}/${suffix}$`);

    const dernier = await collection
      .find({ numero: { $regex: regex } })
      .sort({ numero: -1 })
      .limit(1)
      .toArray();

    let compteur = 1;
    if (dernier.length > 0) {
      const match = dernier[0].numero.match(regex);
      if (match && match[1]) {
        compteur = parseInt(match[1], 10) + 1;
      }
    }

    const compteurStr = String(compteur).padStart(4, '0');
    return `${compteurStr}/${prefix}/${suffix}`;
  }

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

          let objectId;
          try {
            objectId = new ObjectId(_id); // conversion obligatoire
          } catch (e) {
            console.warn(`⚠️ _id invalide ignoré: ${_id}`);
            continue; // passe à l'élément suivant
          }

          const updateDoc = {
            $set: {
              ...itemSansId,
              updatedAt: new Date()
            }
          };

          const result = await collection.updateOne({ _id: objectId }, updateDoc);

          console.log(`🔄 Mise à jour _id=${_id} → matched: ${result.matchedCount}, modifié: ${result.modifiedCount}`);

          if (result.matchedCount > 0) {
            updatedCount++;
          }

          continue;
        }

        const { _id, ...itemSansId } = item;

        const numeroGenere = await genererNumero();

        const newItem = {
          ...itemSansId,
          numero: numeroGenere,
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
