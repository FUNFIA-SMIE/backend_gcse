const express = require('express');

module.exports = (db) => {
    const router = express.Router();
    const collection = db.collection('designation_devis');


    let currentMaxId = null; // variable globale pour suivre le max en mémoire

    async function generate_number() {
        // Si on a déjà calculé le max en mémoire, on l'utilise
        if (currentMaxId !== null) {
            currentMaxId++;
            return currentMaxId;
        }

        // Sinon, on cherche le max existant dans la base
        const docs = await collection.find({}, { projection: { id: 1 } })
            .sort({ id: -1 })
            .limit(1)
            .toArray();

        if (docs.length === 0) {
            currentMaxId = 1;
        } else {
            currentMaxId = Number(docs[0].id) || 0;
            currentMaxId++; // premier id disponible
        }

        return currentMaxId;
    }

    const { ObjectId } = require('mongodb');
    
    router.post('/', async (req, res) => {
        try {
            const data = req.body;

            if (!Array.isArray(data)) {
                return res.status(400).json({ message: 'Le corps doit être un tableau' });
            }

            const collection = db.collection('designation_devis');

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

                    id: await generate_number(),
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
            const collection = db.collection('designation_devis');
            const data = await collection.find({}).toArray();
            res.json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de la lecture' });
        }
    });

    return router;
};
