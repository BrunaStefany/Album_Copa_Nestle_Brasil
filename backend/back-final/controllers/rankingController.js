const { poolPromise } = require('../config/db');

// ==========================================
// 1. OBTER RANKING DE USUÁRIOS
// ==========================================
exports.getRankingUsuarios = async (req, res) => {
    try {
        const db = await poolPromise; 
        
        // Puxa os top 10 usuários direto da View que a Ana criou
        const result = await db.request().query(`SELECT TOP 10 * FROM dbo.vw_Ranking_Usuarios WHERE Cargo <> 'Gestor' ORDER BY Total_Figurinhas DESC, Total_Moedas DESC`);
        
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("❌ Erro em getRankingUsuarios:", err);
        res.status(500).json({ erro: "Erro ao buscar o ranking de usuários" });
    }
};

// ==========================================
// 2. OBTER RANKING DE FÁBRICAS 
// ==========================================
exports.getRankingFabricas = async (req, res) => {
    try {
        const db = await poolPromise; 
        
        // Puxa o ranking das fábricas da outra View
        const result = await db.request().query('SELECT * FROM dbo.vw_Ranking_Fabricas');
        
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("❌ Erro em getRankingFabricas:", err);
        res.status(500).json({ erro: "Erro ao buscar o ranking das fábricas" });
    }
};