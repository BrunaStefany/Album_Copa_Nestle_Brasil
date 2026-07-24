const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Como a rota principal será /api/notificacoes, aqui a gente só coloca o final:
router.get('/:email', notificationController.buscarNotificacoes);

module.exports = router;
