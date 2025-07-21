const express = require('express');

module.exports = (db) => {
  const router = express.Router();
  const collection = db.collection('evenements');

  // Génère un numero du type 0001/DEV/MMYY
  async function genererNumero(prefix = 'DEV') {
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

  // POST /evenements

  router.post('/', async (req, res) => {
    try {
      const data = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Le corps doit être un tableau' });
      }

      let insertedCount = 0;
      let dernierInsere = null;

      for (const item of data) {
        if (item._id !== undefined) {
          const { _id, ...itemSansId } = item;

          const updateDoc = {
            $set: {
              ...itemSansId,
              updatedAt: new Date()
            }
          };

          await collection.updateOne({ _id: _id }, updateDoc);
          continue; // passe à l’élément suivant
          continue;
        }

        // Supprimer _id s'il existe, juste par sécurité (mais normalement pas)
        const { _id, ...itemSansId } = item;

        // Générer un numéro (fonction personnalisée)
        const numeroGenere = await genererNumero();

        // Nouveau document à insérer
        const newItem = {
          ...itemSansId,
          numero: numeroGenere,
          updatedAt: new Date()
        };

        // Insertion — MongoDB crée _id automatiquement
        const result = await collection.insertOne(newItem);

        insertedCount++;
        dernierInsere = { _id: result.insertedId, ...newItem };
      }

      res.status(200).json({
        success: true,
        message: `${insertedCount} éléments insérés.`,
        dernier: dernierInsere
      });

    } catch (error) {
      console.error('Erreur lors de l\'insertion :', error);
      res.status(500).json({ message: 'Erreur lors de l\'insertion' });
    }
  });



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

  return router;
};
