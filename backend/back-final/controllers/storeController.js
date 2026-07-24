const { poolPromise, sql } = require('../config/db');

// 1. COMPRAR PACOTE
exports.comprarPacote = async (req, res) => {
    try {
        const { email, preco } = req.body;
        const db = await poolPromise;
        const userResult = await db.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT ID, Saldo_Moedas FROM Usuarios WHERE Email = @Email');

        if (userResult.recordset.length === 0) return res.status(404).json({ erro: "Usuário não encontrado" });
        const usuario = userResult.recordset[0];

        if (usuario.Saldo_Moedas < preco) return res.status(400).json({ erro: "Saldo insuficiente!" });

        await db.request()
            .input('ID', sql.Int, usuario.ID)
            .input('Preco', sql.Int, preco)
            .query('UPDATE Usuarios SET Saldo_Moedas = Saldo_Moedas - @Preco WHERE ID = @ID');

        res.json({ sucesso: true, novoSaldo: usuario.Saldo_Moedas - preco });
    } catch (err) {
        console.error("❌ Erro na compra:", err);
        res.status(500).json({ erro: "Erro interno ao comprar pacote" });
    }
};

// 2. SALVAR FIGURINHAS (Usando Data_Ganhou como no seu print)
exports.salvarFigurinhas = async (req, res) => {
    try {
        const { email, figurinhasIds } = req.body; 
        const db = await poolPromise;
        const userResult = await db.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT ID FROM Usuarios WHERE Email = @Email');
        
        if (userResult.recordset.length === 0) return res.status(404).json({ erro: "Usuário não encontrado" });
        const usuarioId = userResult.recordset[0].ID;

        for (let idFigurinha of figurinhasIds) {
            const checkFig = await db.request()
                .input('UsuarioID', sql.Int, usuarioId)
                .input('FigurinhaID', sql.Int, idFigurinha)
                .query('SELECT Quantidade FROM Colecao_Usuario WHERE Usuario_ID = @UsuarioID AND Figurinha_ID = @FigurinhaID');

            if (checkFig.recordset.length > 0) {
                // Atualiza a quantidade se for repetida
                await db.request()
                    .input('UsuarioID', sql.Int, usuarioId)
                    .input('FigurinhaID', sql.Int, idFigurinha)
                    .query('UPDATE Colecao_Usuario SET Quantidade = Quantidade + 1 WHERE Usuario_ID = @UsuarioID AND Figurinha_ID = @FigurinhaID');
            } else {
                // Insere nova usando Data_Ganhou (conforme sua imagem)
                await db.request()
                    .input('UsuarioID', sql.Int, usuarioId)
                    .input('FigurinhaID', sql.Int, idFigurinha)
                    .query('INSERT INTO Colecao_Usuario (Usuario_ID, Figurinha_ID, Quantidade, Data_Ganhou) VALUES (@UsuarioID, @FigurinhaID, 1, GETDATE())');
            }
        }
        res.json({ sucesso: true, mensagem: "Figurinhas guardadas no cofre!" });
    } catch (err) {
        console.error("❌ Erro ao colar figurinhas:", err);
        res.status(500).json({ erro: "Erro ao salvar no banco", detalhe: err.message });
    }
};

exports.buscarMeuAlbum = async (req, res) => {
    // 👇 ADICIONE ESTA LINHA AQUI
    console.log("🔥🔥🔥 ENTROU NO BUSCAR ALBUM CORRETO! 🔥🔥🔥");
    
    try {
        const { email } = req.params;
        const db = await poolPromise;

        // OLHA A QUERY AQUI: Limpa, sem JOIN com tabela fantasma!
        const query = `
            SELECT 
                cu.Figurinha_ID as ID, 
                cu.Quantidade,
                cu.Tipo_Figurinha,
                cu.Data_Ganhou
            FROM Colecao_Usuario cu
            JOIN Usuarios u ON cu.Usuario_ID = u.ID
            WHERE u.Email = @Email
        `;

        const result = await db.request()
            .input('Email', sql.VarChar, email)
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Erro ao carregar álbum:", err);
        res.status(500).json({ erro: "Erro ao buscar álbum", detalhe: err.message });
    }
};