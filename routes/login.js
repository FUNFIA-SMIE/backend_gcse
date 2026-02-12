const express = require('express');

module.exports = (db) => {
  const router = express.Router();
  const collection = db.collection('login');
  const { ObjectId } = require('mongodb');

  // Génère un numero du type 0001/GCSE/MMYY
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

  // POST /login - Insertion et mise à jour
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

      console.log(`📥 Traitement de ${data.length} éléments...`);

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

          // Vérifier si le document existe
          const existing = await collection.findOne({ _id: objectId });
          
          if (!existing) {
            console.warn(`⚠️ Document non trouvé pour _id=${_id}`);
            continue;
          }

          console.log(`🔍 Avant MAJ _id=${_id}:`, existing.username);

          const updateDoc = {
            $set: {
              ...itemSansId,
              updatedAt: new Date()
            }
          };

          const result = await collection.updateOne(
            { _id: objectId }, 
            updateDoc
          );

          console.log(`🔄 Mise à jour _id=${_id} → matched: ${result.matchedCount}, modifié: ${result.modifiedCount}`);

          if (result.matchedCount > 0) {
            updatedCount++;
            
            // Récupérer le document mis à jour
            const updated = await collection.findOne({ _id: objectId });
            console.log(`✅ Après MAJ _id=${_id}:`, updated.username);
            
            dernierModifie = updated;
          }

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
          
          console.log(`✅ Inséré avec _id=${result.insertedId}`);
        }
      }

      const response = {
        success: true,
        message: `${insertedCount} inséré(s), ${updatedCount} mis à jour.`,
        inserted: insertedCount,
        updated: updatedCount,
        dernier: dernierInsere || dernierModifie
      };

      console.log(`📤 Réponse:`, response.message);

      res.status(200).json(response);
      
    } catch (error) {
      console.error('❌ Erreur serveur :', error);
      res.status(500).json({
        message: 'Erreur lors du traitement',
        error: error.message
      });
    }
  });

  // POST /login/envoyer_seulement - Insertion uniquement
  router.post('/envoyer_seulement', async (req, res) => {
    try {
      const data = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Le corps doit être un tableau' });
      }

      // ❌ SUPPRIMER cette redéfinition
      // const collection = db.collection('login');

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

  // PUT /login - Modification d'un login par _id
  router.put('/', async (req, res) => {
    const { _id, ...fieldsToUpdate } = req.body;

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

      res.json({ 
        success: true, 
        message: 'Modification réussie',
        modified: result.modifiedCount
      });
    } catch (error) {
      console.error('❌ Erreur PUT:', error);
      res.status(500).json({ message: 'Erreur lors de la modification' });
    }
  });

  // GET /login - Récupérer tous les logins
  router.get('/', async (req, res) => {
    try {
      // ❌ SUPPRIMER cette redéfinition
      // const collection = db.collection('login');
      
      const data = await collection.find({}).toArray();
      res.json(data);
    } catch (error) {
      console.error('❌ Erreur GET:', error);
      res.status(500).json({ message: 'Erreur lors de la lecture' });
    }
  });

  return router;
};