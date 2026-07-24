const { poolPromise, sql } = require('../config/db');

// 1. LISTAR MISSÕES
exports.listarMissoes = async (req, res) => {
    try {
        const db = await poolPromise;
        const result = await db.request().query('SELECT * FROM Missoes WHERE Ativa = 1');
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Erro em listarMissoes:", err);
        res.status(500).json({ erro: "Erro ao buscar missões" });
    }
};
// 2. SOLICITAR MISSÃO (A NOSSA FUNÇÃO CORRIGIDA COM O 'VALOR'!)
exports.solicitarMissao = async (req, res) => {
    console.log("📥 [solicitarMissao] Dados recebidos do frontend:", req.body);
    const { usuarioEmail, missaoId } = req.body;

    if (!usuarioEmail || !missaoId) {
        console.log("❌ Bloqueado: Faltou o 'usuarioEmail' ou o 'missaoId'.");
        return res.status(400).json({ erro: "Faltam dados!" });
    }

    try {
        const db = await poolPromise;

        const userResult = await db.request()
            .input('Email', sql.VarChar, usuarioEmail)
            .query('SELECT ID FROM Usuarios WHERE Email = @Email');

        if (userResult.recordset.length === 0) {
            console.log(`❌ Bloqueado: Usuário com email ${usuarioEmail} não existe.`);
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }
        const usuarioId = userResult.recordset[0].ID;

        const missaoResult = await db.request()
            .input('Missao_ID', sql.Int, missaoId)
            .query('SELECT Valor_Recompensa FROM Missoes WHERE ID = @Missao_ID');

        if (missaoResult.recordset.length === 0) {
            console.log(`❌ Bloqueado: Missão ID ${missaoId} não existe no banco.`);
            return res.status(404).json({ erro: "Missão não encontrada" });
        }
        const valorMissao = missaoResult.recordset[0].Valor_Recompensa;

        const check = await db.request()
            .input('Usuario_ID', sql.Int, usuarioId)
            .input('Missao_ID', sql.Int, missaoId)
            .query(`SELECT ID FROM Historico_Transacoes WHERE Usuario_ID = @Usuario_ID AND Missao_ID = @Missao_ID AND Status IN ('Pendente','Aprovado') AND Tipo = 'Missão'`);

        if (check.recordset.length > 0) {
            console.log("⚠️ Bloqueado: Missão já foi solicitada antes.");
            return res.status(400).json({ mensagem: "Missão já solicitada ou aprovada!" });
        }

        await db.request()
            .input('Usuario_ID', sql.Int, usuarioId)
            .input('Missao_ID', sql.Int, missaoId)
            .input('Valor', sql.Int, valorMissao)
            .query(`INSERT INTO Historico_Transacoes (Usuario_ID, Missao_ID, Tipo, Status, Valor, Data_Transacao) VALUES (@Usuario_ID, @Missao_ID, 'Missão', 'Pendente', @Valor, GETDATE())`);

        console.log(`✅ Sucesso! Missão ${missaoId} solicitada pelo usuário ${usuarioId} no valor de ${valorMissao}.`);
        res.json({ ok: true, mensagem: "Solicitação enviada com sucesso!" });

    } catch (err) {
        console.error("❌ Erro fatal no SQL:", err.message);
        res.status(500).json({ erro: "Erro interno no banco de dados", detalhe: err.message });
    }
};

// 3. LISTAR PENDENTES (BUSCA FLEXÍVEL)
exports.listarPendentes = async (req, res) => {
    try {
        const areaGestor = req.query.area || 'ADMIN'; 
        const db = await poolPromise;
        const request = db.request(); 

        // Retiramos o filtro ht.Tipo = 'Missão' para evitar o bug do acento (Til)
       // Retiramos o filtro ht.Tipo = 'Missão' para evitar o bug do acento (Til)
        let query = `
            SELECT 
                ht.ID as Id, 
                u.Email as UsuarioEmail, 
                u.Nome as UsuarioNome, 
                u.Local_ID as Cidade, 
                m.Titulo as MissaoNome, 
                m.Descricao as MissaoDescricao, /* 👈 Adicionamos a Descrição aqui! */
                m.Valor_Recompensa as Recompensa, 
                m.Area 
                FROM Historico_Transacoes ht 
                JOIN Usuarios u ON ht.Usuario_ID = u.ID 
                JOIN Missoes m ON ht.Missao_ID = m.ID 
                WHERE ht.Status = 'Pendente'
        `;

        if (areaGestor !== 'ADMIN') {
            // Usamos LIKE para driblar possíveis espaços em branco no banco (ex: 'RH ')
            query += ` AND m.Area LIKE '%' + @AreaGestor + '%'`;
            request.input('AreaGestor', sql.VarChar, areaGestor);
        }

        const result = await request.query(query);
        res.json(result.recordset);
        
    } catch (err) {
        console.error("❌ Erro no SQL de listarPendentes:", err.message);
        res.status(200).json([]);
    }
};

// 4. RESPONDER MISSÃO (AGORA COM NOTIFICAÇÃO E MÁGICA!)
exports.responderMissao = async (req, res) => {
    const { solicitacaoId, acao } = req.body;
    const statusFormatado = acao.charAt(0).toUpperCase() + acao.slice(1);

    try {
        const db = await poolPromise;
        
        // 1. Buscamos a solicitação E o Email do usuário para mandar o aviso
        const solResult = await db.request()
            .input('ID', sql.Int, solicitacaoId)
            .query(`
                SELECT ht.Usuario_ID, ht.Missao_ID, u.Email 
                FROM Historico_Transacoes ht
                JOIN Usuarios u ON ht.Usuario_ID = u.ID
                WHERE ht.ID = @ID
            `);
            
        if (solResult.recordset.length === 0) return res.status(404).json({ mensagem: "Solicitação não encontrada" });

        const sol = solResult.recordset[0];

        // 2. Atualiza o status da missão (Pendente -> Aprovado/Recusado)
        await db.request()
            .input('ID', sql.Int, solicitacaoId)
            .input('Status', sql.VarChar, statusFormatado)
            .query(`UPDATE Historico_Transacoes SET Status = @Status WHERE ID = @ID`);

        
                
        // 👇 AQUI COMEÇA O BLOCO NOVO E FINAL 👇
        
        // 1. Buscamos a Área junto com o Valor e o Título
        const missaoResult = await db.request()
            .input('ID', sql.Int, sol.Missao_ID)
            .query('SELECT Valor_Recompensa, Titulo, Area FROM Missoes WHERE ID = @ID');
        
        const recompensa = missaoResult.recordset[0].Valor_Recompensa;
        const tituloMissao = missaoResult.recordset[0].Titulo || "Missão";
        const areaMissao = missaoResult.recordset[0].Area || "Gestão"; // Pescamos a área aqui!

        if (statusFormatado === 'Aprovado') {
            // Dá o dinheiro
            await db.request()
                .input('Usuario_ID', sql.Int, sol.Usuario_ID)
                .input('Recompensa', sql.Int, recompensa)
                .query('UPDATE Usuarios SET Saldo_Moedas = Saldo_Moedas + @Recompensa WHERE ID = @Usuario_ID');

            // Insere a notificação com a ÁREA no texto
            await db.request()
                .input('EmailUsuario', sql.VarChar, sol.Email)
                .input('Msg', sql.VarChar, `Aprovada pela área ${areaMissao}! Você ganhou +${recompensa} moedas na missão "${tituloMissao}".`)
                .query(`
                    INSERT INTO Notificacoes (DestinatarioEmail, RemetenteEmail, RemetenteNome, Texto, Tipo, Status, Lida, DataCriacao) 
                    VALUES (@EmailUsuario, 'sistema@copaengenharia.com', 'Sistema de Missões', @Msg, 'Missão', 'Aprovado', 0, GETDATE())
                `);
                
        } else if (statusFormatado === 'Recusado') {
            await db.request()
                .input('EmailUsuario', sql.VarChar, sol.Email)
                .input('Msg', sql.VarChar, `Sua missão "${tituloMissao}" foi recusada pela área ${areaMissao}.`)
                .query(`
                    INSERT INTO Notificacoes (DestinatarioEmail, RemetenteEmail, RemetenteNome, Texto, Tipo, Status, Lida, DataCriacao) 
                    VALUES (@EmailUsuario, 'sistema@copaengenharia.com', 'Sistema de Missões', @Msg, 'Missão', 'Recusado', 0, GETDATE())
                `);
        }
        
        res.json({ ok: true, mensagem: `Missão ${statusFormatado} com sucesso e notificação enviada!` });
    } catch (err) {
        console.error("❌ Erro em responderMissao:", err);
        res.status(500).json({ erro: "Erro interno ao aprovar/notificar" });
    }
};
// 5. BUSCAR HISTÓRICO DO USUÁRIO (Novo!)
// Essa função vai devolver para o Frontend as missões Pendentes e Aprovadas de um usuário específico.
exports.historicoUsuario = async (req, res) => {
    try {
        const email = req.params.email;
        const db = await poolPromise;
        
        const result = await db.request()
            .input('Email', sql.VarChar, email)
            .query(`
                SELECT ht.Missao_ID, ht.Status 
                FROM Historico_Transacoes ht 
                JOIN Usuarios u ON ht.Usuario_ID = u.ID 
                WHERE u.Email = @Email AND ht.Tipo = 'Missão'
            `);
            
        // Devolve uma lista tipo: [{ Missao_ID: 1, Status: 'Aprovado' }, { Missao_ID: 2, Status: 'Pendente' }]
        res.json(result.recordset);
    } catch (err) {
        console.error("❌ Erro ao buscar histórico:", err);
        res.status(500).json({ erro: "Erro ao buscar histórico das missões" });
    }
};

// 6. RESGATAR CUPOM (Novo!)
exports.resgatarCupom = async (req, res) => {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ erro: "Faltam dados!" });

    try {
        const db = await poolPromise;

        // 1. Verifica se o cupom existe e se está ativo (Lemos tudo em MAIÚSCULO para não dar erro)
        const cupomResult = await db.request()
            .input('Codigo', sql.VarChar, codigo.toUpperCase())
            .query('SELECT ID, Valor_Moedas FROM Cupons WHERE Codigo = @Codigo AND Ativo = 1');

        if (cupomResult.recordset.length === 0) {
            return res.status(404).json({ erro: "Cupom inválido ou expirado!" });
        }
        const cupom = cupomResult.recordset[0];

        // 2. Verifica se o usuário já usou este cupom específico
        const usoResult = await db.request()
            .input('Email', sql.VarChar, email)
            .input('Cupom_ID', sql.Int, cupom.ID)
            .query('SELECT ID FROM Cupons_Usados WHERE Usuario_Email = @Email AND Cupom_ID = @Cupom_ID');

        if (usoResult.recordset.length > 0) {
            return res.status(400).json({ erro: "Você já resgatou este cupom!" });
        }

        // 3. Tudo certo! Dá as moedas para o usuário...
        await db.request()
            .input('Email', sql.VarChar, email)
            .input('Valor', sql.Int, cupom.Valor_Moedas)
            .query('UPDATE Usuarios SET Saldo_Moedas = Saldo_Moedas + @Valor WHERE Email = @Email');

        // 4. ... e registra que ele acabou de usar!
        await db.request()
            .input('Email', sql.VarChar, email)
            .input('Cupom_ID', sql.Int, cupom.ID)
            .query('INSERT INTO Cupons_Usados (Usuario_Email, Cupom_ID) VALUES (@Email, @Cupom_ID)');

        // 5. Retorna o sucesso para o Frontend mostrar a festa
        res.json({ 
            sucesso: true, 
            mensagem: `Cupom resgatado! Você ganhou +${cupom.Valor_Moedas} moedas.`, 
            valorGanho: cupom.Valor_Moedas 
        });

    } catch (err) {
        console.error("❌ Erro ao resgatar cupom:", err);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
};


// 7. TRANSFERÊNCIA DIRETA (PIX DE MOEDAS GESTOR)
exports.transferirMoedas = async (req, res) => {
    const { emailDestino, quantidade, motivo, areaGestor } = req.body;

    // Blindagem de erros
    if (!emailDestino || !quantidade || quantidade <= 0) {
        return res.status(400).json({ erro: "E-mail e quantidade de moedas são obrigatórios." });
    }

    try {
        const db = await poolPromise;

        // 1. Verifica se o colaborador existe usando o e-mail
        const userResult = await db.request()
            .input('Email', sql.VarChar, emailDestino)
            .query('SELECT ID, Nome FROM Usuarios WHERE Email = @Email');

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ erro: "Nenhum colaborador encontrado com este e-mail." });
        }
        const colaborador = userResult.recordset[0];

        // 2. Transfere as moedas para a conta dele
        await db.request()
            .input('Email', sql.VarChar, emailDestino)
            .input('Qtd', sql.Int, quantidade)
            .query('UPDATE Usuarios SET Saldo_Moedas = Saldo_Moedas + @Qtd WHERE Email = @Email');

        // 3. Monta e envia a notificação!
        const textoMotivo = motivo ? ` Motivo: ${motivo}` : '';
        const msgNotificacao = `A área ${areaGestor} te enviou um bônus de +${quantidade} moedas!${textoMotivo}`;

        await db.request()
            .input('Email', sql.VarChar, emailDestino)
            .input('Msg', sql.VarChar, msgNotificacao)
            .query(`
                INSERT INTO Notificacoes (DestinatarioEmail, RemetenteEmail, RemetenteNome, Texto, Tipo, Status, Lida, DataCriacao) 
                VALUES (@Email, 'sistema@copaengenharia.com', 'Bônus Extra', @Msg, 'Bonus', 'Aprovado', 0, GETDATE())
            `);

        res.json({ sucesso: true, mensagem: `Você enviou ${quantidade} moedas para ${colaborador.Nome} com sucesso!` });

    } catch (err) {
        console.error("❌ Erro no Bônus Direto:", err);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
};
