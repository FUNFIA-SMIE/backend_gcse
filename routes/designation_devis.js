const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = (db) => {
    const router = express.Router();
    const collection = db.collection('designation_devis');

    // 🚀 Compteur ATOMIQUE pour générer un id unique
    async function generate_number() {
        const counter = await db.collection("counters").findOneAndUpdate(
            { _id: "designation_devis" },
            { $inc: { seq: 1 } },
            { returnDocument: "after", upsert: true }
        );
        return counter.value.seq;
    }

    // 🚀 Génère un numéro du type 0001/DEV/MMYY (sécurisé)
    async function genererNumero(prefix = 'DBR') {
        const now = new Date();
        const mois = String(now.getMonth() + 1).padStart(2, '0');
        const annee = String(now.getFullYear()).slice(-2);
        const suffix = `${mois}${annee}`;

        const counterValue = await generate_number();
        const compteurStr = String(counterValue).padStart(4, '0');

        return `${compteurStr}/${prefix}/${suffix}`;
    }

    // 🟦 ROUTE: POST (insert / update)
    router.post('/', async (req, res) => {
        try {
            const data = req.body;

            if (!Array.isArray(data)) {
                return res.status(400).json({ message: 'Le corps doit être un tableau' });
            }

            let insertedCount = 0;
            let updatedCount = 0;
            let ignoredCount = 0;

            for (const item of data) {

                // 🔷 CAS : UPDATE (document avec _id)
                if (item._id) {
                    let objectId;
                    try {
                        objectId = new ObjectId(item._id);
                    } catch {
                        console.warn(`⚠️ _id invalide ignoré: ${item._id}`);
                        ignoredCount++;
                        continue;
                    }

                    const existing = await collection.findOne({ _id: objectId });
                    if (!existing) {
                        console.warn(`❌ Document introuvable _id=${item._id}`);
                        ignoredCount++;
                        continue;
                    }

                    const incomingDate = new Date(item.updatedAt);
                    const existingDate = new Date(existing.updatedAt);

                    if (incomingDate > existingDate) {
                        await collection.updateOne(
                            { _id: objectId },
                            { $set: { ...item, updatedAt: incomingDate } }
                        );
                        updatedCount++;
                    } else {
                        ignoredCount++;
                    }

                    continue;
                }

                // 🔷 INSERTION (nouveau document)
                const newId = await generate_number();
                const numero = await genererNumero("DBR");

                const newItem = {
                    ...item,
                    id: newId,
                    numero,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // Sécurise INSERT : empêche les doublons
                try {
                    await collection.insertOne(newItem);
                    insertedCount++;
                } catch (err) {
                    if (err.code === 11000) {
                        console.warn("⚠️ Duplicate détecté → ignoré");
                        ignoredCount++;
                    } else {
                        throw err;
                    }
                }
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

    // 🔷 GET : lire tout
    router.get('/', async (req, res) => {
        try {
            const data = await collection.find({}).toArray();
            res.json(data);
        } catch (error) {
            res.status(500).json({ message: 'Erreur lors de la lecture' });
        }
    });

    return router;
};
