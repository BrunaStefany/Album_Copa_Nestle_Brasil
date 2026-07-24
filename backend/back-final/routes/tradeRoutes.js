const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

// O "Tinder": Retorna quem tem a carta que eu preciso
router.get('/sugestoes/:email', tradeController.sugerirTrocas);

// Enviar o pedido para a pessoa
router.post('/enviar', tradeController.enviarTroca);

// Ver minha caixa de notificações (quem me pediu figurinha)
router.get('/notificacoes/:email', tradeController.listarNotificacoes);

// Aprovar ou Recusar
router.post('/responder', tradeController.responderTroca);

module.exports = router;