const { poolPromise, sql } = require('../config/db');

// ==========================================
// 1. SALVAR PROGRESSO DO USUÁRIO
// ==========================================
exports.salvarProgresso = async (req, res) => {
    // 💡 PASSO 1: Recebemos apenas o Email e Moedas (repare que tirei o 'stickers' daqui)
    const { Email, Moedas } = req.body; 
    
    // Garantimos que o valor de moedas seja um número inteiro seguro
    const moedasSeguras = parseInt(Moedas) || 0;
    
    try {
        const db = await poolPromise; 
        
        // 💡 PASSO 2: Verifica se o usuário existe no banco de dados
        const userResult = await db.request()
            .input('email', sql.VarChar, Email)
            .query('SELECT ID FROM Usuarios WHERE Email = @email');

        // Se não achar o usuário, retorna erro 404
        if (userResult.recordset.length === 0) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        // 💡 PASSO 3: Atualiza APENAS o saldo de moedas do usuário
        // Todo o código perigoso de DELETE que apagava as figurinhas foi removido!
        await db.request()
            .input('email', sql.VarChar, Email)
            .input('moedas', sql.Int, moedasSeguras)
            .query('UPDATE Usuarios SET Saldo_Moedas = @moedas WHERE Email = @email');
        
        // Responde ao Front-end que deu tudo certo
        res.json({ ok: true });
        
    } catch (err) {
        console.error("❌ Erro fatal em salvarProgresso:", err.message); 
        res.status(500).json({ erro: "Erro ao salvar", detalhe: err.message });
    }
};


// ==========================================
// 2. BUSCAR DADOS ATUALIZADOS DO USUÁRIO
// ==========================================
// (Esta função estava perfeita, mantivemos exatamente igual!)
exports.getUsuarioPorEmail = async (req, res) => {
    try {
        const email = req.params.email;
        const db = await poolPromise;
        
        const result = await db.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Usuarios WHERE Email = @email');

        if (result.recordset.length > 0) {
            res.status(200).json(result.recordset[0]);
        } else {
            res.status(404).json({ erro: "Usuário não encontrado" });
        }
    } catch (err) {
        console.error("❌ Erro em getUsuarioPorEmail:", err.message);
        res.status(500).json({ erro: "Erro ao buscar os dados do usuário", detalhe: err.message });
    }
};