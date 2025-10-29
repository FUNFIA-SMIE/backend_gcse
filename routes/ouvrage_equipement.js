const express = require('express');

module.exports = (db) => {
    const router = express.Router();
    const collection = db.collection('ouvrage_equipement');

    // Génère un numero du type 0001/DEV/MMYY
    async function genererNumero(prefix = 'DBR') {
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

   async function generate_number() {
       // Compute the next numeric id by finding the current max 'id' in the MongoDB collection.
       // Assumes documents may have an 'id' field that can be parsed as a number.
       const docs = await collection.find({}, { projection: { id: 1 } }).sort({ id: -1 }).limit(1).toArray();
       if (docs.length === 0) return 1;
       const maxId = Number(docs[0].id) || 0;
       return maxId + 1;
   }

    const { ObjectId } = require('mongodb');
    router.post('/', async (req, res) => {
        try {
            const data = req.body;

            if (!Array.isArray(data)) {
                return res.status(400).json({ message: 'Le corps doit être un tableau' });
            }

            const collection = db.collection('ouvrage_equipement');

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
                    /*
                    numero: await genererNumero(),
                    ancien_numero: itemSansId.numero || null,*/
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
            const collection = db.collection('ouvrage_equipement');
            const data = await collection.find({}).toArray();
            res.json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de la lecture' });
        }
    });

    return router;
};
