const { poolPromise, sql } = require('../config/db'); 

exports.buscarNotificacoes = async (req, res) => {
    try {
        const { email } = req.params;
        const db = await poolPromise; 
        
        // Nomes idênticos à planilha da Ana
        const result = await db.request()
            .input('email', sql.VarChar, email)
            .query("SELECT Id, Texto, Tipo, Status, Lida, DataCriacao,RemetenteNome FROM Notificacoes WHERE DestinatarioEmail = @email ORDER BY Id DESC");

        res.json(result.recordset);
    } catch (err) {
        console.error("❌ ERRO REAL AQUI:", err);
        res.status(500).json({ mensagem: "Deu erro no backend ao buscar notificacoes" });
    }
};