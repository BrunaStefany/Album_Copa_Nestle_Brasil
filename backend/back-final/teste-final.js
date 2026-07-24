require('dotenv').config();
const sql = require('mssql');

// Pega o banco de dados seja qual for o nome da variável no .env
const dbName = process.env.DB_DATABASE || process.env.DB_NAME;
const senha = process.env.DB_PASSWORD || "";

console.log("🕵️‍♂️ --- MODO DETETIVE ATIVADO ---");
console.log("Servidor configurado:", process.env.DB_SERVER);
console.log("Usuário configurado:", process.env.DB_USER);
console.log("Banco de Dados:", dbName);
console.log("Tamanho da Senha:", senha.length, "caracteres");
console.log("--------------------------------");

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: dbName,
    options: {
        encrypt: true,
        // Às vezes o Node.js bloqueia certificados da Azure, isso resolve:
        trustServerCertificate: true 
    }
};

sql.connect(config)
    .then(() => {
        console.log("✅ VITÓRIA! Conectado ao SQL Server (Azure)!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Ocorreu um erro:", err.message);
        process.exit(1);
    });