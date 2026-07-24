const express = require('express');
const router = express.Router();

// Importamos o controller de usuários
const userController = require('../controllers/userController');

// 1. Rota para salvar o progresso (moedas e figurinhas)
router.post('/progresso', userController.salvarProgresso);

// 2. NOVA ROTA: Buscar dados atualizados do usuário pelo e-mail
router.get('/buscar/:email', userController.getUsuarioPorEmail);

module.exports = router;