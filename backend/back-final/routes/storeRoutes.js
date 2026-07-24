const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController'); // Aponta pro arquivo que editamos!

router.post('/comprar', storeController.comprarPacote);
router.post('/salvar-figurinhas', storeController.salvarFigurinhas);
router.get('/album/:email', storeController.buscarMeuAlbum); // A rota que estamos testando!

module.exports = router;