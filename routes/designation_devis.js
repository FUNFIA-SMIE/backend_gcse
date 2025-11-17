const express = require('express');

module.exports = (db) => {
    const router = express.Router();
    const collection = db.collection('designation_devis');
    const { ObjectId } = require('mongodb');

    // --- Génération numéro ---
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

        return `${String(compteur).padStart(4, '0')}/${prefix}/${suffix}`;
    }

    // --- Génère un id numérique auto-incrémenté ---
    async function generate_number() {
        const docs = await collection.find({}, { projection: { id: 1 } })
            .sort({ id: -1 })
            .limit(1)
            .toArray();

        if (docs.length === 0) return 1;
        const maxId = Number(docs[0].id) || 0;
        return maxId + 1;
    }

    // ---------------------------------------------------
    //                     POST SYNC
    // ---------------------------------------------------
    router.post('/', async (req, res) => {
        try {
            const data = req.body;

            if (!Array.isArray(data)) {
                return res.status(400).json({ message: 'Le corps doit être un tableau' });
            }

            let insertedCount = 0;
            let updatedCount = 0;
            let ignoredCount = 0;

            for (let item of data) {

                // 🔧 Normalisation du champ _id (si reçu au format {_id: {$oid: "xxx"}})
                if (item._id && typeof item._id === 'object') {
                    if (item._id.$oid) {
                        item._id = item._id.$oid;
                    } else {
                        item._id = String(item._id);
                    }
                }

                // ---------------------------------------------------
                //           🔁 CAS 1 : DOCUMENT EXISTANT
                // ---------------------------------------------------
                if (item._id) {

                    // Vérification validité ObjectId
                    if (!ObjectId.isValid(item._id)) {
                        console.warn(`⚠️ _id invalide, update ignoré : ${item._id}`);
                        ignoredCount++;
                        continue;
                    }

                    const objectId = new ObjectId(item._id);
                    const existing = await collection.findOne({ _id: objectId });

                    if (!existing) {
                        console.warn(`❌ _id introuvable, update ignoré : ${item._id}`);
                        ignoredCount++;
                        continue;
                    }

                    // Vérification updatedAt
                    const incomingDate = new Date(item.updatedAt);
                    const existingDate = new Date(existing.updatedAt);

                    if (isNaN(incomingDate.getTime())) {
                        console.warn(`⚠️ updatedAt invalide, update ignoré pour ${item._id}`);
                        ignoredCount++;
                        continue;
                    }

                    // Mise à jour uniquement si plus récent
                    if (incomingDate > existingDate) {
                        const { _id, ...itemSansId } = item;

                        await collection.updateOne(
                            { _id: objectId },
                            {
                                $set: {
                                    ...itemSansId,
                                    updatedAt: incomingDate
                                }
                            }
                        );

                        console.log(`🔄 Mise à jour : ${item._id}`);
                        updatedCount++;
                    } else {
                        console.log(`⏩ Ignoré (plus ancien) : ${item._id}`);
                        ignoredCount++;
                    }

                    continue; // ⛔️ Empêche insertion
                }

                // ---------------------------------------------------
                //           ➕ CAS 2 : INSERTION
                // ---------------------------------------------------
                const { _id, ...itemSansId } = item;

                const newItem = {
                    ...itemSansId,
                    id: await generate_number(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await collection.insertOne(newItem);
                insertedCount++;

            }

            return res.status(200).json({
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

    // ---------------------------------------------------
    //                    GET ALL
    // ---------------------------------------------------
    router.get('/', async (req, res) => {
        try {
            const data = await collection.find({}).toArray();
            res.json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de la lecture' });
        }
    });

    return router;
};
