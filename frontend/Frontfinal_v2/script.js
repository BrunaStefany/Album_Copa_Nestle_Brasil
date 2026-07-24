// 1. CONFIGURAÇÕES INICIAIS
const API_URL = "https://nbra-pr-backendalbumcopa26-brso-app-fugnawdfdaa0gnb0.eastus-01.azurewebsites.net";
const SESSION_KEY = "user_session";

// Variáveis de estado do jogo (o que está acontecendo agora)
let currentUser = null;
let albumData = []; // Aqui vão os dados do seu album.json

// 2. INICIALIZAÇÃO
// Quando a página carrega, tentamos recuperar a sessão e carregar as figurinhas
window.onload = async () => {
    const savedUser = localStorage.getItem(SESSION_KEY);
    
    // Carregar o arquivo JSON das figurinhas (aquele que a Ana fez)
    try {
        const response = await fetch('./album.json');
        albumData = await response.json();
        console.log("Figurinhas carregadas do JSON:", albumData.length);
    } catch (e) {
        console.error("Erro ao carregar album.json");
    }

    if (savedUser) {
        // Se já estava logado, vamos pegar os dados atualizados do banco
        // Para simplificar para o Júnior, vamos usar os dados salvos no login
        currentUser = JSON.parse(savedUser);
        loadGameInterface();
    }
};

// 3. FUNÇÃO DE LOGIN (AJUSTADA)
async function handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('email').value;
    const passInput = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Email: emailInput, Senha_Hash: passInput })
        });

        const dados = await response.json();

        if (response.ok) {
            currentUser = dados.user;
            // O backend retorna 'stickers' como uma lista de objetos [{Figurinha_ID, Quantidade}...]
            // Vamos transformar isso em um array simples de IDs para o seu jogo facilitar
            currentUser.listaStickers = dados.user.stickers.map(s => s.Figurinha_ID);
            
            localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
            loadGameInterface();
            showSection('album-section'); // Troca para a tela do álbum
        } else {
            alert(dados.mensagem);
        }
    } catch (error) {
        alert("Erro ao conectar ao servidor. O backend está ligado?");
    }
}

// 4. LÓGICA DE ABRIR PACOTINHO (O "PULO DO GATO")
async function comprarPacotinho() {
    const PRECO_PACOTE = 50;

    if (currentUser.Saldo_Moedas < PRECO_PACOTE) {
        alert("Moedas insuficientes! Complete missões.");
        return;
    }

    // A) Subtrai moedas
    currentUser.Saldo_Moedas -= PRECO_PACOTE;

    // B) Sorteia 3 figurinhas aleatórias do seu albumData (JSON)
    const novasFigurinhas = [];
    for (let i = 0; i < 3; i++) {
        const sorteada = albumData[Math.floor(Math.random() * albumData.length)];
        novasFigurinhas.push(sorteada.id);
        currentUser.listaStickers.push(sorteada.id);
    }

    // C) MOSTRAR NA TELA (Aqui você chama sua função de animação)
    alert(`Você ganhou as figurinhas: ${novasFigurinhas.join(", ")}`);

    // D) AMARRAR COM O BACKEND (Salvar no Banco da Ana)
    await sincronizarComBanco();
    
    // E) Atualiza a interface (moedas e brilho das figurinhas)
    updateUI();
}

// 5. FUNÇÃO PARA SALVAR TUDO NO AZURE
async function sincronizarComBanco() {
    try {
        await fetch(`${API_URL}/usuarios/progresso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Email: currentUser.Email,
                Moedas: currentUser.Saldo_Moedas,
                stickers: currentUser.listaStickers // Mandamos a lista de IDs
            })
        });
        console.log("Dados sincronizados com o Azure!");
    } catch (error) {
        console.error("Erro ao salvar no banco:", error);
    }
}

// 6. FUNÇÃO PARA ATUALIZAR A TELA
function updateUI() {
    // Atualiza o contador de moedas no HTML
    const coinDisplay = document.getElementById('coin-count');
    if (coinDisplay) coinDisplay.innerText = currentUser.Saldo_Moedas;

    // Aqui você rodaria o código que acende as figurinhas no álbum
    renderAlbum();
}

// Funções auxiliares de interface (Exemplos)
function loadGameInterface() {
    showSection('album-section');
    updateUI();
}