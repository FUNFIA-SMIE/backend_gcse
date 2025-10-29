const express = require('express');

module.exports = (db) => {
  const router = express.Router();
  const collection = db.collection('historique_decl');

  // Génère un numero du type 0001/DEV/MMYY
  // ...existing code...
  async function genererNumero() {
    try {
      // cherche le document ayant le plus grand champ `numero`
      const doc = await collection.find().sort({ numero: -1 }).limit(1).next();
      const dernierNumero = doc && typeof doc.numero === 'number' ? doc.numero : 0;
      return dernierNumero + 1;
    } catch (err) {
      console.error('Erreur genererNumero:', err);
      // en cas d'erreur retourne 1 (évite Date.now ou autres)
      return 1;
    }
  }

  const { ObjectId } = require('mongodb');
  /*
    router.post('/', async (req, res) => {
      try {
        const data = req.body;
  
        if (!Array.isArray(data)) {
          return res.status(400).json({ message: 'Le corps doit être un tableau' });
        }
  
        const collection = db.collection('branchements');
  
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
    */

  router.post('/', async (req, res) => {
    try {
      const data = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Le corps doit être un tableau' });
      }

      const collection = db.collection('historique_decl');

      let insertedCount = 0;
      let updatedCount = 0;
      let ignoredCount = 0;

      for (const item of data) {
        if (item._id) {
          const { _id, ...itemSansId } = item;

          let objectId;
          try {
            objectId = new ObjectId(_id);
          } catch (e) {
            console.warn(`⚠️ _id invalide ignoré: ${_id}`);
            continue;
          }

          const existing = await collection.findOne({ _id: objectId });

          if (!existing) {
            console.warn(`❌ Document avec _id=${_id} introuvable.`);
            continue;
          }

          const incomingDate = new Date(item.updatedAt);
          const existingDate = new Date(existing.updatedAt);

          // 🔁 Comparer les updatedAt
          if (incomingDate > existingDate) {
            const result = await collection.updateOne(
              { _id: objectId },
              {
                $set: {
                  ...itemSansId,
                  updatedAt: incomingDate
                }
              }
            );

            console.log(`✅ Mise à jour _id=${_id}`);
            updatedCount++;
          } else {
            console.log(`⏩ Ignoré _id=${_id} → base plus récente ou identique`);
            ignoredCount++;
          }

          continue;
        }

        // ➕ INSERTION (nouveau document sans _id)
        const { _id, ...itemSansId } = item;

        const newItem = {
          ...itemSansId,
          numero: await genererNumero(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await collection.insertOne(newItem);
        insertedCount++;
      }

      res.status(200).json({
        success: true,
        inserted: insertedCount,
        updated: updatedCount,
        ignored: ignoredCount,
        message: `${insertedCount} inséré(s), ${updatedCount} mis à jour, ${ignoredCount} ignoré(s)`
      });
    } catch (error) {
      console.error('❌ Erreur serveur :', error);
      res.status(500).json({ message: 'Erreur lors du traitement' });
    }
  });



  // GET /evenements
  router.get('/', async (req, res) => {
    try {
      const collection = db.collection('historique_decl');
      const data = await collection.find({}).toArray();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la lecture' });
    }
  });

  return router;
};
