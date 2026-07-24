const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');

// 1. Listar todas as missões (Essa vai resolver o seu Erro 404!)
router.get('/', missionController.listarMissoes);

// 2. Solicitar uma missão
router.post('/solicitar', missionController.solicitarMissao);

// 3. Listar missões pendentes (para o gestor aprovar)
router.get('/pendentes', missionController.listarPendentes);

// 4. Aprovar ou Recusar missão
router.post('/responder', missionController.responderMissao);

// 5.Adicione esta linha logo abaixo das rotas que já existem:
router.get('/historico/:email', missionController.historicoUsuario);

// 6. Rota para resgatar o cupom da revista
router.post('/cupom', missionController.resgatarCupom);

// 7. Rota para transferência direta de moedas (Pix do Gestor)
router.post('/transferir-moedas', missionController.transferirMoedas);

module.exports = router;