const express = require('express');

module.exports = (db) => {
  const router = express.Router();
  const collection = db.collection('login');

  // Génère un numero du type 0001/DEV/MMYY
  async function genererNumero(prefix = 'GCSE') {
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

  const { ObjectId } = require('mongodb');
  /*
    router.post('/', async (req, res) => {
      try {
        const data = req.body;
  
        if (!Array.isArray(data)) {
          return res.status(400).json({ message: 'Le corps doit être un tableau' });
        }
  
        const collection = db.collection('login');
  
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

      let insertedCount = 0;
      let updatedCount = 0;
      let dernierInsere = null;
      let dernierModifie = null;

      for (const item of data) {
        if (item._id) {
          // === MISE À JOUR ===
          const { _id, ...itemSansId } = item;

          let objectId;
          try {
            objectId = new ObjectId(_id);
          } catch (e) {
            console.warn(`⚠️ _id invalide ignoré: ${_id}`);
            continue;
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
            dernierModifie = { _id: _id, ...itemSansId }; // ✅ Stocker le dernier modifié
          } else {
            console.warn(`⚠️ Document non trouvé pour _id=${_id}`);
          }

          // ✅ ENLEVER le continue ou le remplacer par :
          // continue; 

        } else {
          // === INSERTION ===
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
      }

      res.status(200).json({
        success: true,
        message: `${insertedCount} inséré(s), ${updatedCount} mis à jour.`,
        inserted: insertedCount,
        updated: updatedCount,
        dernier: dernierInsere || dernierModifie // ✅ Retourner soit l'insertion soit la MAJ
      });
    } catch (error) {
      console.error('❌ Erreur serveur :', error);
      res.status(500).json({
        message: 'Erreur lors du traitement',
        error: error.message
      });
    }
  });
  router.post('/envoyer_seulement', async (req, res) => {
    try {
      const data = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Le corps doit être un tableau' });
      }

      const collection = db.collection('login');

      let insertedCount = 0;
      let dernierInsere = null;

      for (const item of data) {
        // Ignorer tout item avec un _id
        if (item._id) {
          console.log(`⏭️ Ignoré (déjà existant) _id=${item._id}`);
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
        message: `${insertedCount} inséré(s).`,
        dernier: dernierInsere
      });
    } catch (error) {
      console.error('❌ Erreur serveur :', error);
      res.status(500).json({ message: 'Erreur lors du traitement' });
    }
  });

  // ...existing code...

  // PUT /login/modifier : modifie un login avec _id dans le body
  router.put('/', async (req, res) => {
    const { _id, ...fieldsToUpdate } = req.body;
    const { ObjectId } = require('mongodb');

    if (!_id) {
      return res.status(400).json({ message: "L'_id est requis dans le body" });
    }

    let objectId;
    try {
      objectId = new ObjectId(_id);
    } catch (e) {
      return res.status(400).json({ message: "Format d'_id invalide" });
    }

    try {
      const result = await collection.updateOne(
        { _id: objectId },
        { $set: { ...fieldsToUpdate, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Login non trouvé' });
      }

      res.json({ success: true, message: 'Modification réussie' });
    } catch (error) {
      res.status(500).json({ message: 'Erreur lors de la modification' });
    }
  });

  // ...existing code...



  // GET /evenements
  router.get('/', async (req, res) => {
    try {
      const collection = db.collection('login');
      const data = await collection.find({}).toArray();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la lecture' });
    }
  });

  return router;
};
