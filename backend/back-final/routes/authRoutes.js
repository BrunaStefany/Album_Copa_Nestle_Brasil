const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// O erro acontecia aqui porque authController.cadastro não existia no outro ficheiro
router.post('/login', authController.login);
router.post('/cadastro', authController.cadastro);
// 👇 NOVA ROTA: O "recepcionista" que atende o pedido direto de nova senha
router.post('/redefinir-senha', authController.redefinirSenha);

module.exports = router;