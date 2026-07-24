const { poolPromise, sql } = require('../config/db');

// ==========================================
// 1. O "CARTEIRO" (Enviar pedido de Troca Justa)
// ==========================================
exports.enviarTroca = async (req, res) => {
    try {
        const { remetenteEmail, remetenteNome, destinatarioEmail, cartaPedida, cartaOferecida } = req.body;
        const db = await poolPromise;

        const textoTroca = `quer a sua carta #${cartaPedida} em troca da carta #${cartaOferecida}.`;

        const notificacaoQuery = `
            INSERT INTO Notificacoes (DestinatarioEmail, RemetenteEmail, RemetenteNome, Texto, Tipo, Status, Lida, DataCriacao)
            OUTPUT Inserted.Id 
            VALUES (@Dest, @RemetEmail, @RemetNome, @Texto, 'troca', 'pendente', 0, GETDATE())
        `;

        const notifResult = await db.request()
            .input('Dest', sql.VarChar, destinatarioEmail)
            .input('RemetEmail', sql.VarChar, remetenteEmail)
            .input('RemetNome', sql.VarChar, remetenteNome)
            .input('Texto', sql.VarChar, textoTroca)
            .query(notificacaoQuery);

        const novaNotificacaoId = notifResult.recordset[0].Id;

        await db.request()
            .input('NotifId', sql.Int, novaNotificacaoId)
            .input('Pedida', sql.Int, cartaPedida)
            .input('Oferecida', sql.Int, cartaOferecida)
            .query('INSERT INTO TrocaCartas (NotificacaoId, CartaId, CartaOferecidaId) VALUES (@NotifId, @Pedida, @Oferecida)');

        res.json({ sucesso: true, mensagem: "Pedido de troca enviado com sucesso!" });

    } catch (err) {
        console.error("❌ Erro ao enviar troca:", err);
        res.status(500).json({ erro: "Erro ao registrar pedido de troca", detalhe: err.message });
    }
};

// ==========================================
// 2. O "TINDER" (Sugerir Trocas Inteligente)
// ==========================================
exports.sugerirTrocas = async (req, res) => {
    try {
        const meuEmail = req.params.email;
        const db = await poolPromise;

        const queryTinder = `
            WITH MinhasCartas AS (
                SELECT c.Figurinha_ID 
                FROM Colecao_Usuario c
                INNER JOIN Usuarios u ON c.Usuario_ID = u.Id
                WHERE u.Email = @Email
            ),
            RepetidasDosOutros AS (
                SELECT u.Email AS UsuarioEmail, u.Nome AS NomeColega, c.Figurinha_ID
                FROM Colecao_Usuario c
                INNER JOIN Usuarios u ON c.Usuario_ID = u.Id
                WHERE u.Email != @Email AND c.Quantidade > 1
            )
            SELECT r.UsuarioEmail, r.NomeColega, r.Figurinha_ID AS CartaId
            FROM RepetidasDosOutros r
            WHERE r.Figurinha_ID NOT IN (SELECT Figurinha_ID FROM MinhasCartas)
        `;

        const result = await db.request()
            .input('Email', sql.VarChar, meuEmail)
            .query(queryTinder);
        
        const matchesAgrupados = {};
        
        result.recordset.forEach(linha => {
            if (!matchesAgrupados[linha.UsuarioEmail]) {
                matchesAgrupados[linha.UsuarioEmail] = {
                    email: linha.UsuarioEmail,
                    name: linha.NomeColega,
                    cartasParaMim: []
                };
            }
            matchesAgrupados[linha.UsuarioEmail].cartasParaMim.push(linha.CartaId);
        });

        res.json(Object.values(matchesAgrupados));

    } catch (err) {
        console.error("❌ Erro ao buscar matches no Tinder:", err);
        res.status(500).json({ erro: "Erro ao buscar sugestões." });
    }
};

// ==========================================
// 3. O "CARTÓRIO" (Aprovar/Recusar e Transferir 1x1)
// ==========================================
exports.responderTroca = async (req, res) => {
    try {
        const { notificacaoId, acao } = req.body; 
        const db = await poolPromise;

        // 1. Atualiza o status da notificação original
        await db.request()
            .input('Id', sql.Int, notificacaoId)
            .input('Status', sql.VarChar, acao)
            .query("UPDATE Notificacoes SET Status = @Status WHERE Id = @Id");

        // 2. Descobre quem é quem na jogada PRIMEIRO (Evita o erro!)
        const notif = await db.request()
            .input('Id', sql.Int, notificacaoId)
            .query("SELECT RemetenteEmail, DestinatarioEmail FROM Notificacoes WHERE Id = @Id");

        if (notif.recordset.length === 0) {
            return res.status(404).json({ erro: "Notificação não encontrada" });
        }

        const { RemetenteEmail, DestinatarioEmail } = notif.recordset[0];

        // 3. Busca os IDs e Nomes
        const usuarios = await db.request()
            .input('RemEmail', sql.VarChar, RemetenteEmail)
            .input('DestEmail', sql.VarChar, DestinatarioEmail)
            .query("SELECT Id, Email, Nome FROM Usuarios WHERE Email IN (@RemEmail, @DestEmail)");

        let remetenteId, destinatarioId, nomeAprovador;
        usuarios.recordset.forEach(u => {
            if (u.Email === RemetenteEmail) remetenteId = u.Id;
            if (u.Email === DestinatarioEmail) {
                destinatarioId = u.Id;
                nomeAprovador = u.Nome; // Pega o nome de quem aprovou!
            }
        });

        // 4. SE RECUSOU: Manda um aviso triste pro sininho e para aqui
        if (acao === 'recusado') {
            await db.request()
                .input('Dest', sql.VarChar, RemetenteEmail)
                .input('RemEmail', sql.VarChar, DestinatarioEmail)
                .input('Nome', sql.VarChar, nomeAprovador)
                // 👇 AQUI EU MUDEI DE 'aviso' PARA 'troca' 👇
                .query("INSERT INTO Notificacoes (DestinatarioEmail, RemetenteEmail, RemetenteNome, Texto, Tipo, Status, Lida, DataCriacao) VALUES (@Dest, @RemEmail, @Nome, 'recusou o seu pedido de troca.', 'troca', 'pendente', 0, GETDATE())");
            
            return res.json({ sucesso: true, mensagem: "Troca recusada." });
        }

        // 5. SE APROVOU: Descobre as cartas para transferir
        const cartas = await db.request()
            .input('NotifId', sql.Int, notificacaoId)
            .query("SELECT CartaId, CartaOferecidaId FROM TrocaCartas WHERE NotificacaoId = @NotifId");

        if (cartas.recordset.length === 0) {
            throw new Error("Cartas da troca não encontradas.");
        }

        const cartaPedida = cartas.recordset[0].CartaId;
        const cartaOferecida = cartas.recordset[0].CartaOferecidaId;

        // Função mágica de transferência
        const transferirCarta = async (deId, paraId, cartaTransferida) => {
            await db.request()
                .input('DeId', sql.Int, deId)
                .input('CartaId', sql.Int, cartaTransferida)
                .query("UPDATE Colecao_Usuario SET Quantidade = Quantidade - 1 WHERE Usuario_ID = @DeId AND Figurinha_ID = @CartaId");

            const check = await db.request()
                .input('ParaId', sql.Int, paraId)
                .input('CartaId', sql.Int, cartaTransferida)
                .query("SELECT 1 FROM Colecao_Usuario WHERE Usuario_ID = @ParaId AND Figurinha_ID = @CartaId");

            if (check.recordset.length > 0) {
                await db.request()
                    .input('ParaId', sql.Int, paraId)
                    .input('CartaId', sql.Int, cartaTransferida)
                    .query("UPDATE Colecao_Usuario SET Quantidade = Quantidade + 1 WHERE Usuario_ID = @ParaId AND Figurinha_ID = @CartaId");
            } else {
                await db.request()
                    .input('ParaId', sql.Int, paraId)
                    .input('CartaId', sql.Int, cartaTransferida)
                    .query("INSERT INTO Colecao_Usuario (Usuario_ID, Figurinha_ID, Quantidade, Data_Ganhou, Tipo_Figurinha) VALUES (@ParaId, @CartaId, 1, GETDATE(), 'Comum')");
            }
        };

        // 6. Transfere as duas cartas!
        await transferirCarta(destinatarioId, remetenteId, cartaPedida);
        await transferirCarta(remetenteId, destinatarioId, cartaOferecida);

        // 7. A MÁGICA DO SININHO AQUI: Manda o "Recibo" de sucesso!
        await db.request()
            .input('Dest', sql.VarChar, RemetenteEmail)
            .input('RemEmail', sql.VarChar, DestinatarioEmail)
            .input('Nome', sql.VarChar, nomeAprovador)
            // 👇 AQUI EU MUDEI DE 'aviso' PARA 'troca' 👇
            .query("INSERT INTO Notificacoes (DestinatarioEmail, RemetenteEmail, RemetenteNome, Texto, Tipo, Status, Lida, DataCriacao) VALUES (@Dest, @RemEmail, @Nome, 'aceitou sua troca! As cartas já estão no seu álbum.', 'troca', 'pendente', 0, GETDATE())");

        res.json({ sucesso: true, mensagem: "Troca 1x1 concluída com sucesso!" });

    } catch (err) {
        console.error("❌ Erro na transferência 1x1:", err);
        res.status(500).json({ erro: "Erro ao processar a troca." });
    }
};

// ==========================================
// FUNÇÃO TAMPÃO (NÃO APAGUE!)
// ==========================================
exports.listarNotificacoes = async (req, res) => {
    res.json([]);
};