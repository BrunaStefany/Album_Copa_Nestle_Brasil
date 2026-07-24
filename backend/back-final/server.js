const express = require('express');
const cors = require('cors'); 
const { poolPromise, sql } = require('./config/db');
const storeRoutes = require('./routes/storeRoutes');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const missionRoutes = require('./routes/missionRoutes');
const userRoutes = require('./routes/userRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// ==========================================
// 🔓 CONFIGURAÇÃO DO CORS (A Lista VIP)
// ==========================================
// Especificamos todas as permissões para o Azure não bloquear o Front-end
app.use(cors({
    origin: '*', // Permite acesso de qualquer URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Essencial ter o OPTIONS liberado
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

app.use(express.json()); // Diz ao servidor: "Entende mensagens em formato JSON"

// Status de teste
app.get('/api/status', (req, res) => {
    res.json({ mensagem: "Backend rodando! 🚀" });
});

// ==========================================
// ROTAS DA APLICAÇÃO (O "Mapa" do seu site)
// ==========================================
app.use('/api/auth', authRoutes); 
app.use('/api/missoes', missionRoutes); 
app.use('/api/usuarios', userRoutes); 
app.use('/api/trade', tradeRoutes);
app.use('/api/ranking', require('./routes/rankingRoutes'));
app.use('/api/notificacoes', notificationRoutes);
app.use('/api/loja', storeRoutes);

// --- ROTA DA BALA TRAÇANTE ---
app.get('/api/gemini/:email', async (req, res) => {
    try {
        const { poolPromise, sql } = require('./config/db');
        const email = req.params.email;
        const db = await poolPromise; 
        
        const result = await db.request()
            .input('email', sql.VarChar, email)
            .query("SELECT Id, Texto, Tipo, Status, Lida, Data FROM Notificacoes WHERE Destinatario_Email = @email ORDER BY Id DESC");

        res.json({
            sucesso: true,
            mensagem: "ROTA NOVA FUNCIONANDO!",
            dados: result.recordset
        });
    } catch (err) {
        console.error("ERRO NA ROTA GEMINI:", err);
        res.status(500).json({ erro_real: err.message });
    }
});

// ✅ COMO DEVE FICAR PARA O AZURE FUNCIONAR:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});