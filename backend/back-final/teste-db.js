const { poolPromise } = require('./config/db');

async function testarConexao() {
    try {
        const pool = await poolPromise;
        // Tenta ler a versão do SQL Server na Azure
        const result = await pool.request().query('SELECT @@VERSION as versao');
        console.log('✅ CONEXÃO COM AZURE OK!');
        console.log('Dados do servidor:', result.recordset[0].versao);
        process.exit();
    } catch (err) {
        console.error('❌ ERRO NO TESTE:', err.message);
        process.exit();
    }
}
testarConexao();
