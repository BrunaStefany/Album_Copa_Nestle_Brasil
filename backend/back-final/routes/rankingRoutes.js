const express = require('express');
const router = express.Router();

// Importamos o controller que criamos hoje
const rankingController = require('../controllers/rankingController');

// Quando chamarem /usuarios, executa o ranking de usuários
router.get('/usuarios', rankingController.getRankingUsuarios);

// Quando chamarem /fabricas, executa o ranking de fábricas
router.get('/fabricas', rankingController.getRankingFabricas);

module.exports = router;