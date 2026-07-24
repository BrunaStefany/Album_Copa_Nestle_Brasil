const { poolPromise, sql } = require('../config/db');
const crypto = require('crypto'); // 👈 Adicionamos isso para gerar o token seguro

exports.login = async (req, res) => {
    const { Email, Senha_Hash } = req.body;
    try {
        const db = await poolPromise; 
        
        const result = await db.request()
            .input('Email', sql.VarChar, Email)
            .query('SELECT * FROM Usuarios WHERE Email = @Email');
        
        if (result.recordset.length === 0) {
            return res.status(401).json({ mensagem: "Login ou senha inválidos!" });
        }

        const user = result.recordset[0];

        // Valida a senha 
        if (user.Senha_Hash !== Senha_Hash) {
            return res.status(401).json({ mensagem: "Login ou senha inválidos!" });
        }

        // --- A LÓGICA DE SEQUÊNCIA FOI REMOVIDA DAQUI ---

        // ==========================================
        // BUSCA DE DADOS ADICIONAIS
        // ==========================================
        const stickersResult = await db.request()
            .input('Usuario_ID', sql.Int, user.ID)
            .query('SELECT Figurinha_ID, Quantidade FROM Colecao_Usuario WHERE Usuario_ID = @Usuario_ID');
        
        user.stickers = stickersResult.recordset;

        const historyResult = await db.request()
            .input('Usuario_ID', sql.Int, user.ID)
            .query("SELECT Missao_ID, Status FROM Historico_Transacoes WHERE Usuario_ID = @Usuario_ID AND Tipo = 'Missão'");
        
        user.completedMissions = historyResult.recordset.filter(m => m.Status === 'Aprovado').map(m => m.Missao_ID);
        user.pendingMissions = historyResult.recordset.filter(m => m.Status === 'Pendente').map(m => m.Missao_ID);

        // Remove a senha e envia os dados
        delete user.Senha_Hash;
        user.mensagem = "Login realizado com sucesso";

        return res.status(200).json(user);

    } catch (err) {
        console.error("❌ Erro no login:", err.message);
        if (!res.headersSent) {
            return res.status(500).json({ erro: "Erro interno no servidor" });
        }
    }
};

// --- FUNÇÃO DE CADASTRO ---
exports.cadastro = async (req, res) => {
    // (MANTIVE EXATAMENTE COMO ESTAVA, ESTÁ CORRETO!)
    const { Nome, Email, Senha, Local_ID, Cargo } = req.body;
    try {
        const db = await poolPromise;

        const check = await db.request()
            .input('Email', sql.VarChar, Email)
            .query('SELECT ID FROM Usuarios WHERE Email = @Email');

        if (check.recordset.length > 0) {
            return res.status(400).json({ mensagem: "E-mail já cadastrado!" });
        }

        await db.request()
            .input('Nome', sql.VarChar, Nome)
            .input('Email', sql.VarChar, Email)
            .input('Senha', sql.VarChar, Senha)
            .input('Local_ID', sql.Int, Local_ID)
            .input('Cargo', sql.VarChar, Cargo || 'Colaborador') 
            .query(`INSERT INTO Usuarios (Nome, Email, Senha_Hash, Saldo_Moedas, Cargo, Local_ID, Data_Cadastro) 
                    VALUES (@Nome, @Email, @Senha, 0, @Cargo, @Local_ID, GETDATE())`);

        res.json({ mensagem: "Usuário cadastrado com sucesso!" });
    } catch (err) {
        console.error("❌ Erro no cadastro:", err.message);
        res.status(500).json({ erro: "Erro interno ao cadastrar" });
    }
};

// ==========================================
// 3. NOVO: REDEFINIÇÃO DIRETA DE SENHA
// ==========================================
exports.redefinirSenha = async (req, res) => {
    // Passo 1: Recebe o e-mail e as senhas que vieram do formulário (Front-end)
    const { Email, NovaSenha, ConfirmaSenha } = req.body;

    // Passo 2: Validação básica - As senhas precisam ser idênticas
    if (NovaSenha !== ConfirmaSenha) {
        return res.status(400).json({ mensagem: "As senhas digitadas não combinam!" });
    }

    try {
        const db = await poolPromise;

        // Passo 3: Executa o comando UPDATE direto no banco de dados
        // Note que a sua coluna no banco se chama 'Senha_Hash'
        const result = await db.request()
            .input('Email', sql.VarChar, Email)
            .input('NovaSenha', sql.VarChar, NovaSenha)
            .query(`
                UPDATE Usuarios 
                SET Senha_Hash = @NovaSenha 
                WHERE Email = @Email
            `);

        // Passo 4: Verifica se o e-mail existia na tabela
        // O SQL Server (mssql) usa 'rowsAffected' para dizer quantas linhas foram alteradas
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ mensagem: "E-mail não encontrado no sistema." });
        }

        // Passo 5: Resposta de sucesso
        res.status(200).json({ mensagem: "Senha atualizada com sucesso! Você já pode fazer login." });

    } catch (err) {
        console.error("❌ Erro ao redefinir senha:", err.message);
        res.status(500).json({ erro: "Erro interno ao atualizar a senha" });
    }
};