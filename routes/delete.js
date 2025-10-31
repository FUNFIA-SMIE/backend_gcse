const express = require('express');
const { ObjectId } = require('mongodb');

module.exports = (db) => {
  const router = express.Router();

  // 🗑️ Supprimer un document par son _id dans la collection spécifiée
  router.delete('/:table/:_id', async (req, res) => {
    try {
      const { table, _id } = req.params;
      const collection = db.collection(table); // sélectionne la collection selon l'URL

      if (!ObjectId.isValid(_id)) {
        return res.status(400).json({ success: false, message: 'ID invalide' });
      }

      const result = await collection.deleteOne({ _id: new ObjectId(_id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: `Aucun document trouvé avec l'ID ${id}` });
      }

      res.json({ success: true, message: `Document ${_id} supprimé avec succès dans ${table}` });
    } catch (error) {
      console.error('❌ Erreur suppression :', error);
      res.status(500).json({ success: false, message: 'Erreur serveur lors de la suppression' });
    }
  });

  return router;
};
