const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send({ status: 'ok' });
});


module.exports = router;
