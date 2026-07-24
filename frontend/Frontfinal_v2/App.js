const DB_KEY = 'world_cup_data_v2';
const SESSION_KEY = 'active_session';

// --- CONFIGURAÇÃO DE CAMINHOS e SERVIDOR/ DB---
const STICKER_IMG_PATH = "static/figurinhas/";
const DEFAULT_IMG = "Imagens/LogoPreta.png";

// --- CONFIGURAÇÃO DE CAMINHOS e SERVIDOR/ DB---const STICKER_IMG_PATH = "static/figurinhas/";const DEFAULT_IMG = "Imagens/LogoPreta.png";
// ☁️ OPÇÃO 1: Servidor na Nuvem (Azure)

const API_URL = "https://nbra-pp-albumback-app-ashdb6gvgsbeeaeu.eastus-01.azurewebsites.net/api";
//💻 OPÇÃO 2: Computador da Ana (Teste Local) (localhost)
//const API_URL = "http://localhost:3000/api";//

const INITIAL_USERS = {
    "admin@company.com": { name: "Admin", password: "123", coins: 2500, stickers: [], completedMissions: [], streak: 1, lastLoginDate: "" },
    "user@company.com": { name: "Colaborador 01", password: "123", coins: 500, stickers: [], completedMissions: [], streak: 1, lastLoginDate: "" }
};

let STICKER_DB = [];
let currentUser = null;
let currentBookPage = 1;
const totalStickers = 283;


// --- INICIALIZAÇÃO ---
async function init() {
    try {
        const response = await fetch('album.json'); // CONEXAO DE FIGURINHAS COM O BANCO DE DADOS
        if (response.ok) {
            STICKER_DB = await response.json();
        } else {
            console.warn("Arquivo album.json não encontrado. Usando banco vazio.");
        }
    } catch (error) {
        console.error("Erro ao carregar banco de figurinhas:", error);
    }

    if (!localStorage.getItem(DB_KEY)) localStorage.setItem(DB_KEY, JSON.stringify(INITIAL_USERS));
    const savedEmail = localStorage.getItem(SESSION_KEY);

    if (savedEmail) {
        const users = JSON.parse(localStorage.getItem(DB_KEY));
        if (users[savedEmail]) {
            currentUser = { ...users[savedEmail], email: savedEmail };
            
            // 👇 BUSCANDO OS DADOS COMPLETOS DO BANCO
            try {
                console.log("🔄 Buscando dados fresquinhos no banco (Moedas e Sequência)...");
                const respostaBanco = await fetch(`${API_URL}/usuarios/buscar/${savedEmail}`);
                
                if (respostaBanco.ok) {
                    const dadosBanco = await respostaBanco.json();
                    
                    // 1. Atualiza as variáveis do jogador atual
                    currentUser.coins = dadosBanco.Saldo_Moedas || 0;
                    currentUser.lastLoginDate = dadosBanco.Ultimo_Login || "";
                    
                    // 2. Salva todas essas informações no cache do navegador (localStorage)
                    users[savedEmail].coins = currentUser.coins;
                    users[savedEmail].lastLoginDate = currentUser.lastLoginDate;
                    
                    localStorage.setItem(DB_KEY, JSON.stringify(users));
                    console.log("✅ Dados sincronizados com o banco! Moedas:", currentUser.coins, "| Sequência:", currentUser.streak);
                } else {
                    console.warn("A rota de busca não retornou dados. Usando valores locais.");
                }
            } catch (erro) {
                console.error("Aviso: Servidor offline ou erro ao buscar dados atualizados.", erro);
            }
            // 👆 FIM DA BUSCA NO BANCO

            loadGameInterface();
        }
    }
}

// --- NAVEGAÇÃO ---
function showSection(id, addToHistory = true) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    
    if (addToHistory) {
        history.pushState({ section: id }, "", `#${id}`);
    }

    // Executa funções específicas de cada página
    if (id === 'album') renderAlbum();
    if (id === 'ranking') renderRanking(); 
    if (id === 'missions') refreshMissionsUI();
    if (id === 'trocas') renderTrocas();
    if (id === 'aprovacoes') carregarPendentes();

    // 👇 CORREÇÃO: Chama o updateUI() inteiro para carregar a barra e o texto juntos!
    if (id === 'home') {
        updateUI();
    }
}

function toggleLogout() {
    const menu = document.getElementById('logout-menu');
    if (menu) menu.classList.toggle('hidden');
}

function logout() {
    localStorage.removeItem(SESSION_KEY); 
    currentUser = null;                  
    window.location.reload();             
}

// ==========================================
// MÓDULO DE RANKING (CONECTADO AO BACKEND NOVO)
// ==========================================


// Função inicial que a tela chama ao abrir o menu "Ranking"
function renderRanking() {
    // Carrega o ranking individual como padrão para a tela não ficar vazia
    carregarRankingIndividual(); 
}

// 1. O CONTROLADOR DOS BOTÕES
window.mudarVisaoRanking = function(tipo, btnElement) {
    // Tira o brilho de todos os botões
    const abas = document.querySelectorAll('.ranking-tab');
    abas.forEach(btn => {
        btn.classList.remove('bg-blue-600', 'border-white', 'opacity-100', 'text-white');
        btn.classList.add('opacity-50', 'text-slate-400');
    });

    // Pinta de azul apenas o botão que você clicou
    if (btnElement) {
        btnElement.classList.remove('opacity-50', 'text-slate-400');
        btnElement.classList.add('bg-blue-600', 'border-white', 'opacity-100', 'text-white');
    }

    // Chama a rota específica do backend
    if (tipo === 'individual') {
        carregarRankingIndividual();
    } else if (tipo === 'plantas') {
        carregarRankingFabricas();
    }
};

// ==========================================
// 2. BUSCA O RANKING DE USUÁRIOS NO BACKEND
// ==========================================
async function carregarRankingIndividual() {
    try {
        const corpoTabela = document.getElementById('ranking-body');
        const cabecalhoNome = document.getElementById('coluna-nome-ranking');
        if (!corpoTabela) return;

        if (cabecalhoNome) cabecalhoNome.innerText = "Jogador";
        corpoTabela.innerHTML = `<tr><td colspan="4" class="text-center py-8 font-bold text-slate-400">Buscando jogadores no servidor... ⏳</td></tr>`;

        // Bate na rota de usuários do seu backend
        const response = await fetch(`${API_URL}/ranking/usuarios`);
        const dados = await response.json();

        corpoTabela.innerHTML = '';

        dados.forEach((usuario, index) => {
            const linha = document.createElement('tr');
            linha.className = 'border-b border-white/5 hover:bg-white/5';

            let medalha = (index + 1) + 'º';
            let cor = 'text-white';
            if (index === 0) { medalha = '🥇'; cor = 'text-yellow-400 font-black scale-110'; }
            if (index === 1) { medalha = '🥈'; cor = 'text-slate-300 font-black'; }
            if (index === 2) { medalha = '🥉'; cor = 'text-amber-600 font-black'; }

            // Lendo as colunas EXATAS da view vw_Ranking_Usuarios
            const nomeExibir = usuario.Usuario || "Jogador Desconhecido";
            const figurinhasExibir = usuario.Total_Figurinhas || 0;
            
            // CORREÇÃO: Agora estamos pegando o valor de 'Moedas' vindo do banco!
            const moedasExibir = usuario.Total_Moedas || 0; 

            linha.innerHTML = `
                <td class="px-8 py-4"><span class="text-2xl inline-block w-8 text-center ${cor}">${medalha}</span></td>
                <td class="px-8 py-4 font-bold text-white">${nomeExibir}</td>
                <td class="px-8 py-4 text-center text-emerald-400 font-black">${figurinhasExibir}</td>
                <td class="px-8 py-4 text-right text-yellow-400 font-bold">${moedasExibir} pts</td>
            `;
            corpoTabela.appendChild(linha);
        });
    } catch (error) {
        console.error("Erro no ranking de usuários:", error);
        document.getElementById('ranking-body').innerHTML = `<tr><td colspan="4" class="text-center text-red-500 font-bold">Erro ao carregar ranking. Verifique o console.</td></tr>`;
    }
}

// ==========================================
// 3. BUSCA O RANKING DE FÁBRICAS NO BACKEND
// ==========================================
async function carregarRankingFabricas() {
    try {
        const corpoTabela = document.getElementById('ranking-body');
        const cabecalhoNome = document.getElementById('coluna-nome-ranking');
        if (!corpoTabela) return;

        if (cabecalhoNome) cabecalhoNome.innerText = "Fábrica / Planta";
        corpoTabela.innerHTML = `<tr><td colspan="4" class="text-center py-8 font-bold text-slate-400">Buscando dados das fábricas... ⚙️</td></tr>`;

        // Bate na rota de fábricas do seu backend
        const response = await fetch(`${API_URL}/ranking/fabricas`);
        const dados = await response.json();

        corpoTabela.innerHTML = '';

        dados.forEach((fabrica, index) => {
            const linha = document.createElement('tr');
            linha.className = 'border-b border-white/5 hover:bg-white/5';

            let medalha = (index + 1) + 'º';
            let cor = 'text-white';
            if (index === 0) { medalha = '🏆'; cor = 'text-yellow-400 font-black scale-125'; }

            // Lendo as colunas EXATAS da view vw_Ranking_Fabricas
            const nomeFabrica = fabrica.Fabricas || "Fábrica Desconhecida";
            const pontuacaoExibir = fabrica.Pontuacao_Total || 0;
            
            // CORREÇÃO: Pegando o valor de 'Moedas' vindo da View das plantas!
            const moedasExibir = fabrica.Moedas || 0; 

            linha.innerHTML = `
                <td class="px-8 py-4"><span class="text-2xl inline-block w-8 text-center ${cor}">${medalha}</span></td>
                <td class="px-8 py-4 font-black uppercase text-white tracking-widest">${nomeFabrica}</td>
                <td class="px-8 py-4 text-center text-emerald-400 font-black">${pontuacaoExibir}</td>
                <td class="px-8 py-4 text-right text-yellow-400 font-bold">${moedasExibir} pts</td>
            `;
            corpoTabela.appendChild(linha);
        });
    } catch (error) {
        console.error("Erro no ranking de fábricas:", error);
        document.getElementById('ranking-body').innerHTML = `<tr><td colspan="4" class="text-center text-red-500 font-bold">Erro ao carregar ranking. Verifique o console.</td></tr>`;
    }
}

window.addEventListener('click', function (e) {
    const menu = document.getElementById('logout-menu');
    const profileArea = document.querySelector('.group[onclick="toggleLogout()"]');
    if (menu && profileArea && !profileArea.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

// 👇 1. DICIONÁRIO DE PLANTAS (Coloque logo acima da função de login)
const NOME_DAS_PLANTAS = {
    1: "Sede",
    2: "Araçatuba",
    3: "Araras",
    4: "Caçapava CPW",
    5: "Ibiá",
    6: "Ituiutaba",
    7: "Marília",
    8: "Rio Pardo",
    9: "Vila Velha",
    10: "Feira de Santana",
    11: "NDG",
    12: "Montes Claros", 
    13: "Caçapava",      
    14: "Goiânia",        
    28: "HUB CCT",
    29: "CIT"
};

// --- 1. FUNÇÃO DE LOGIN (A QUE ABRE O SITE) ---
async function handleLogin(e) { 
    e.preventDefault(); 
    
    const emailInput = document.getElementById('email').value;
    const passInput = document.getElementById('password').value;

    console.log("🔑 Tentando logar com:", emailInput);

    try {
        const pacoteLogin = { 
            Email: emailInput, 
            Senha_Hash: passInput 
        };
        console.log("pacotelogin criado!")

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacoteLogin) 
        });
        console.log("API foi chamada e passamos o pacotelogin")

        const dados = await response.json();

        if (response.ok) {
            console.log("✅ Login aceito pelo servidor!");
            
            // 1. Salva os dados do usuário de forma limpa (Corrigido para evitar conflito de referência)
            currentUser = {
                name: dados.Nome || dados.nome, 
                email: dados.Email || dados.email,
                coins: dados.Saldo_Moedas || dados.saldo_moedas || 0,
            };

            // Ajuste do ID e Cargo do banco de dados (Lendo direto do objeto dados)
            const idDaPlanta = dados.Local_ID || dados.local_id || 1; 
            currentUser.city = NOME_DAS_PLANTAS[idDaPlanta] || 'Sede'; 
            currentUser.role = dados.Cargo || dados.cargo || 'Colaborador';

            
            // 3. Salva a sessão no navegador (O resto do seu código continua idêntico)
            localStorage.setItem(SESSION_KEY, emailInput);
            
            // 4. Troca as telas (Esconde o login e mostra o sistema)
            document.getElementById('login').classList.add('hidden');       
            document.getElementById('main-header').classList.remove('hidden'); 
            document.getElementById('home').classList.remove('hidden');        
            
            loadGameInterface(); // Inicia a interface do jogo
            
            console.log("⚽ Sucesso! Entrando no álbum...");
        } else {
            // Se a senha tiver errada ou o e-mail não existir
            alert(dados.mensagem || "Login ou senha inválidos!");
        }
    } catch (error) {
        console.error("❌ Erro no processo de login:", error.message, error);
        alert("Não consegui falar com o servidor. Verifique se o terminal está rodando!");
    }
}

// ==========================================
// FUNÇÃO DE REDEFINIÇÃO DE SENHA (DIRETA)
// ==========================================
async function handleResetPassword(e) {
    e.preventDefault(); // Impede a página de recarregar

    // Passo 1: Pega os valores que o usuário digitou nas caixinhas novas
    const emailInput = document.getElementById('reset-email').value.trim();
    const novaSenha = document.getElementById('reset-nova-senha').value;
    const confirmaSenha = document.getElementById('reset-confirma-senha').value;

    // Passo 2: Verifica no front-end se as senhas batem
    if (novaSenha !== confirmaSenha) {
        alert("⚠️ As senhas digitadas não combinam! Tente novamente.");
        return;
    }

    try {
        // Passo 3: Monta o pacote igualzinho o backend espera
        const pacoteRedefinir = {
            Email: emailInput,
            NovaSenha: novaSenha,
            ConfirmaSenha: confirmaSenha
        };

        // Passo 4: Envia para a nova rota de redefinir-senha
        const response = await fetch(`${API_URL}/auth/redefinir-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacoteRedefinir)
        });

        const dados = await response.json();

        // Passo 5: Reação do sistema com base na resposta do servidor
        if (response.ok) {
            alert("✅ " + dados.mensagem); 
            
            // Limpa os campos para o próximo uso
            document.getElementById('reset-email').value = '';
            document.getElementById('reset-nova-senha').value = '';
            document.getElementById('reset-confirma-senha').value = '';
            
            // Esconde a tela de redefinir e volta pro login
            document.getElementById('reset-password').classList.add('hidden');
            document.getElementById('login').classList.remove('hidden');
        } else {
            // Caso o e-mail não exista ou outro erro (vem do backend)
            alert("❌ " + (dados.mensagem || dados.erro || "Erro ao redefinir a senha."));
        }

    } catch (error) {
        console.error("Erro na redefinição:", error);
        alert("Erro ao conectar com o servidor. Verifique a internet ou se o terminal está online.");
    }
}




// --- 2. FUNÇÃO DE SALVAR PROGRESSO (A QUE ENVIA MOEDAS/FIGURINHAS) ---
async function saveUserData() { 
    if (!currentUser) return;
    
    // Salva no navegador para backup rápido
    const users = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    users[currentUser.email] = currentUser;
    localStorage.setItem(DB_KEY, JSON.stringify(users));

    // Monta o pacote para a Azure
    const pacoteParaSalvar = {
        Email: currentUser.email,
        Moedas: currentUser.coins,
        UltimoLogin: currentUser.lastLoginDate || "",
        stickers: currentUser.stickers || []
    };

    try {
        const response = await fetch(`${API_URL}/usuarios/progresso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacoteParaSalvar)
        });
        console.log("💾 Progresso sincronizado com a Azure!");
    } catch (err) {
        console.error("❌ Erro ao salvar no banco:", err);
    }
}

// SUBSTITUA A SUA FUNÇÃO loadGameInterface POR ESTA:
function loadGameInterface() {
    document.getElementById('main-header').classList.remove('hidden');
    const loginSec = document.getElementById('login');
    const registerSec = document.getElementById('register');
    if (loginSec) loginSec.classList.add('hidden');
    if (registerSec) registerSec.classList.add('hidden');

    updateUI();
    refreshMissionsUI(); 
    showSection('home');

    // 👇 CORREÇÃO 1: Adicionando os e-mails específicos na regra de Gestores
    const emailSeguro = (currentUser.email || currentUser.Email || "").toLowerCase();
    
    const isGestor = 
      emailSeguro === 'rh@company.com' || 
      emailSeguro === 'she@company.com' || 
      emailSeguro === 'ini@company.com' || 
      currentUser.Cargo === 'Gestor' || 
      currentUser.Cargo === 'Administrador';
    
    const btnAprovacoes = document.getElementById('btn-menu-aprovacoes');
    if (btnAprovacoes) {
        if (isGestor) {
            btnAprovacoes.classList.remove('hidden');
        } else {
            btnAprovacoes.classList.add('hidden');
        }
    }
    
    // Só carrega as notificações normais se NÃO for a conta raiz do gestor
    if (currentUser.Cargo !== 'Gestor' && !isGestor) {
        carregarNotificacoesDoBanco(); 
    }

    carregarAlbumDoBanco();
    
    // 👇 A MÁGICA ACONTECE AQUI: Puxamos o histórico de missões!
    sincronizarMissoesDoBanco();
}

// 👇 NOVA FUNÇÃO: Bate na sua rota do backend e monta o álbum!
async function carregarAlbumDoBanco() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/loja/album/${currentUser.email}`);
        if (response.ok) {
            const albumDoBanco = await response.json();
            
            // O Backend devolve [{ID: 1, Quantidade: 2}]. 
            // O frontend gosta do formato [1, 1]. Vamos converter para não quebrar a sua UI!
            let figurinhasConvertidas = [];
            albumDoBanco.forEach(item => {
                for(let i = 0; i < item.Quantidade; i++) {
                    figurinhasConvertidas.push(item.ID);
                }
            });
            
            // Atualiza a memória local com a verdade que veio do banco
            currentUser.stickers = figurinhasConvertidas;
            console.log("📘 Álbum carregado da nuvem!", currentUser.stickers);
            
            // Manda desenhar na tela e atualizar a barra de %
            renderAlbum(); 
            updateUI();
        }
    } catch (err) {
        console.error("❌ Erro ao buscar álbum do banco:", err);
    }
}

async function handleRegister(e) {
    e.preventDefault(); 
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const city = document.getElementById('reg-city').value;
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-password-confirm').value;

    if (password !== confirmPassword) {
        alert("Ops! As senhas não coincidem.");
        return;
    }

    // O pacote exato que o Backend precisa
    const pacoteParaBackend = {
        Nome: name,
        Email: email,
        Senha: password,
        Local_ID: parseInt(city) || 1, 
        Cargo: role
    };

    // 🕵️‍♀️ NOSSO ESPIÃO: Vai imprimir o pacote no console do navegador
    console.log("📦 Pacote que está sendo enviado:", pacoteParaBackend);

    try {
        const response = await fetch(`${API_URL}/auth/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacoteParaBackend) 
        });

        const dados = await response.json();

        if (response.ok) {
            alert("Cadastro realizado com sucesso na nuvem! ☁️ Agora você pode fazer o login.");
            document.getElementById('register').classList.add('hidden');
            document.getElementById('login').classList.remove('hidden');
        } else {
            alert(dados.mensagem || "Erro ao cadastrar!");
        }
    } catch (error) {
        console.error("Erro na comunicação:", error);
        alert("Servidor offline! Verifique se o Node está rodando na porta 3000.");
    }
}

// NOVA FUNÇÃO: O "Cérebro" dos Layouts
function getPageConfig(pageNum) {
    // 1. Mapeia a regra exata de cada página
    function getLayoutRule(p) {
        if (p === 1) return { layoutClass: 'layout-trofeu', count: 1 };
        if (p === 2) return { layoutClass: 'layout-mascotes', count: 2 };
 
        const layout3 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 45, 46];
        if (layout3.includes(p)) return { layoutClass: 'layout-colab-1', count: 9 };
 
        // 👇 TIRE O 38 DAQUI:
        const layout4 = [15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37];
        if (layout4.includes(p)) return { layoutClass: 'layout-misto', count: 5 };
 
        const layout5 = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 39, 40, 43, 44];
        if (layout5.includes(p)) return { layoutClass: 'layout-fabricas', count: 5 };
        
        const layout6 = [41, 42];
        if (layout6.includes(p)) return { layoutClass: 'layout-colab-2', count: 7 }; // Reutilizamos o colab-2 que já é (3, 3, 1)
 
        const layout7 = [38]; // Exemplo de páginas
        if (layout7.includes(p)) return { layoutClass: 'layout-piramide', count: 5 };     

        // Fallback para páginas não listadas (ex: página 36)
        return { layoutClass: 'layout-padrao', count: 9 };
    }
 
    // 2. Calcula magicamente o ID inicial somando as figurinhas de todas as páginas anteriores!
    let startId = 1;
    for (let i = 1; i < pageNum; i++) {
        startId += getLayoutRule(i).count;
    }
 
    // 3. Monta e devolve a configuração para a tela
    const currentRule = getLayoutRule(pageNum);
    const ids = Array.from({ length: currentRule.count }, (_, i) => startId + i);
 
    return {
        layoutClass: currentRule.layoutClass,
        stickerIds: ids
    };
}
// NOVA FUNÇÃO RENDER ALBUM
function renderAlbum() {
    const gridLeft = document.getElementById('album-grid-left');
    const gridRight = document.getElementById('album-grid-right');
    const pageIndicator = document.getElementById('page-indicator');

    if (!gridLeft || !gridRight || STICKER_DB.length === 0) return;

    gridLeft.innerHTML = '';
    gridRight.innerHTML = '';

    const p1 = (currentBookPage * 2) - 1;
    const p2 = (currentBookPage * 2);
    const version = Math.random(); 

    // 👇 CORREÇÃO DO BUG DAS IMAGENS TROCADAS
    let fundoEsq = p1;
    let fundoDir = p2;

    // Se for a página 25, puxa a imagem da 27 (e vice-versa)
    if (p1 === 25) fundoEsq = 27;
    else if (p1 === 27) fundoEsq = 25;

    // Se for a página 26, puxa a imagem da 28 (e vice-versa)
    if (p2 === 26) fundoDir = 28;
    else if (p2 === 28) fundoDir = 26;

    gridLeft.style.backgroundImage = `url('Pages/${fundoEsq}.svg?v=${version}')`;
    gridRight.style.backgroundImage = `url('Pages/${fundoDir}.svg?v=${version}')`;
    
    gridLeft.className = "page-texture w-1/2 relative";
    gridRight.className = "page-texture w-1/2 relative";

    [gridLeft, gridRight].forEach(grid => {
        grid.style.backgroundSize = '100% 100%';
        grid.style.backgroundPosition = 'center';
        grid.style.backgroundRepeat = 'no-repeat';
    });

    const configLeft = getPageConfig(p1);
    const configRight = getPageConfig(p2);
    const buildPageLayout = (gridElement, config) => {
        if (!config) return;
        
        // Limpa layouts anteriores para não bugar a visualização
        gridElement.classList.remove('layout-misto', 'layout-piramide', 'layout-custom-5');
        
        // Aplica a classe do layout atual definida no getPageConfig
        gridElement.classList.add(config.layoutClass);
        gridElement.innerHTML = ''; 

        config.stickerIds.forEach((id, index) => {
            const sData = STICKER_DB.find(s => s.id === id); 
            const slot = createStickerSlot(sData, id);
            
            // Adiciona a classe de posição (posicao-1, posicao-2, etc)
            slot.classList.add(`posicao-${index + 1}`);
            
            // --- REGRAS DE ORIENTAÇÃO ---
            
            // Layout Misto: apenas a 3ª figurinha é horizontal
            if (config.layoutClass === 'layout-misto' && index === 2) {
                slot.classList.add('sticker-horizontal');
            } 
            // Layout Pirâmide: 2ª e 3ª figurinhas são horizontais
            else if (config.layoutClass === 'layout-piramide') {
                if (index === 1 || index === 2) {
                    slot.classList.add('sticker-horizontal');
                }
            }
            // Layout Custom 5: 2ª e 3ª são horizontais (no meio)
            else if (config.layoutClass === 'layout-piramide') {
                if (index === 1 || index === 2) { // Isso pega a posicao-2 e posicao-3
                    slot.classList.add('sticker-horizontal');
                }
            }

            gridElement.appendChild(slot);
        });
    };

    buildPageLayout(gridLeft, configLeft);
    buildPageLayout(gridRight, configRight);

    if (pageIndicator) {
        pageIndicator.innerText = `PÁGINAS ${p1.toString().padStart(2, '0')} - ${p2.toString().padStart(2, '0')}`;
    }

    updatePageThemeAuto();
}

function updatePageThemeAuto() {
    const left = document.getElementById("album-grid-left");
    const right = document.getElementById("album-grid-right");

    if (!left || !right) return;

    const p1 = (currentBookPage * 2) - 1;
    const p2 = (currentBookPage * 2);
    const darkPages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 41, 42, 39, 40]; 

    if (darkPages.includes(p1)) left.classList.add("page-dark");
    else left.classList.remove("page-dark");

    if (darkPages.includes(p2)) right.classList.add("page-dark");
    else right.classList.remove("page-dark");
}

function createStickerSlot(sData, id) {
    // 👇 NOVA LISTA DE BLOQUEADOS (Substituindo a antiga idsGiovana)
    const idsBloqueados = [114, 124, 134, 144, 154, 164, 174, 184, 194, 204, 214, 224, 228, 229, 233, 235, 238, 240, 241, 242, 258, 259, 260, 266, 280, 281, 282, 283];
    
    // A figurinha está bloqueada se for de 4 a 111 OU (||) estiver na lista nova
    const isLocked = (id >= 4 && id <= 111) || idsBloqueados.includes(id); 

    const slot = document.createElement('div');

    if (isLocked) {
        // Define qual texto aparece no cadeado dependendo do motivo do bloqueio
        let textoCadeado = idsBloqueados.includes(id) ? "Em Breve" : "Fase 2";

        slot.className = "w-full aspect-[3/4] border-2 border-dashed border-gray-400 bg-gray-200/50 rounded-md flex flex-col items-center justify-center opacity-70 cursor-not-allowed";
        slot.innerHTML = `
            <span class="text-3xl mb-2">🔒</span>
            <span class="text-[10px] font-bold text-gray-500 uppercase text-center px-1">${textoCadeado}</span>
            <span class="font-display font-black text-gray-400 text-lg">#${id}</span>
        `;
        return slot; 
    }

    // 👇 3. SE NÃO ESTIVER BLOQUEADA, CONTINUA O SEU CÓDIGO NORMAL
    const hasSticker = currentUser?.stickers?.includes(id); 

    if (hasSticker && sData) { 
        let rColor = "sticker-common";
        if(sData.rarity === 'legendary') rColor = "sticker-legendary";
        if(sData.rarity === 'epic') rColor = "sticker-epic";
        if(sData.rarity === 'rare') rColor = "sticker-rare";

        slot.className = `${rColor} w-full h-full rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg transition-transform hover:scale-105 z-10`;
        slot.innerHTML = `
            <img src="${STICKER_IMG_PATH}${sData.url_imagem}" class="absolute inset-0 w-full h-full object-cover" onerror="this.src='${DEFAULT_IMG}';">
            <span class="absolute top-1 right-1 font-black text-white/40 text-[9px]">#${id}</span>
        `;
    } else {
        slot.className = "album-slot-empty"; 
        slot.innerHTML = `<span class="album-slot-number">${id}</span>`;
    }
    
    return slot; 
}

function changePage(direction) {
    const maxPages = 23; 
    const newPage = currentBookPage + direction;
    
    if (newPage >= 1 && newPage <= maxPages) {
        currentBookPage = newPage;
        renderAlbum();
    }
}

function openAlbumCover() {
    const cover = document.getElementById('album-cover');
    if (cover) {
        cover.classList.add('cover-off'); 
        setTimeout(() => {
            cover.classList.add('hidden');
        }, 1000);
    }
}

// --- SISTEMA DE LOJA ---

function preparePack(type, price) {
    if (currentUser.coins < price) {
        alert("Moedas insuficientes!");
        return;
    }
    
    // Mapeia os IDs para os nomes que aparecerão no título do modal
    const packNames = { 
        'standard': 'PACOTE PADRÃO', 
        'premium': 'PACOTE ESPECIAL' 
    };
    
    const modalName = document.getElementById('modal-pack-name');
    if (modalName) modalName.innerText = packNames[type] || "PACOTE";
    
    // Reseta o estado visual do modal
    document.getElementById('pack-sealed').classList.remove('hidden');
    document.getElementById('pack-revealing').classList.add('hidden');
    document.getElementById('close-pack-btn').classList.add('hidden');
    document.getElementById('pack-modal').classList.remove('hidden');
    
    // Guarda o pacote atual para ser usado na abertura
    window.currentPack = { type, price };
}

async function startOpening() {
    const { type, price } = window.currentPack;
    
    // 👇 1. BATE NO BACKEND PARA COMPRAR (Validar saldo e descontar)
    try {
        const resCompra = await fetch(`${API_URL}/loja/comprar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, preco: price })
        });
        
        const dadosCompra = await resCompra.json();
        
        if (!resCompra.ok || !dadosCompra.sucesso) {
            alert(dadosCompra.erro || "Erro ao comprar pacote! Verifique seu saldo.");
            closePackModal();
            return; // Aborta a abertura do pacote se não tiver saldo
        }
        
        // Sucesso! Atualiza o saldo local com a resposta segura do banco
        currentUser.coins = dadosCompra.novoSaldo;

        // 👇 2. SORTEIA AS CARTAS
        const amount = (type === 'premium') ? 5 : 3;
        const newStickers = [];
        const newStickersIds = []; // Só os numerozinhos pra mandar pro backend

        // 👇 NOVA LISTA DA URNA
        const idsBloqueados = [114, 124, 134, 144, 154, 164, 174, 184, 194, 205, 214, 223, 228, 233, 235, 238, 240, 241, 242, 258, 259, 260, 266, 280, 281, 282, 283];

        // Regra matemática: Pega as liberadas da Fase 1 (menor que 4 OU maior que 111)
        // E (&&) garante que elas NÃO (!) estão na lista de bloqueados
        const figurinhasLiberadas = STICKER_DB.filter(s => (s.id < 4 || s.id > 111) && !idsBloqueados.includes(s.id));
        
        for (let i = 0; i < amount; i++) {
            // 👇 ALTERADO: Agora sorteia da urna filtrada, e não do banco todo
            const sticker = figurinhasLiberadas[Math.floor(Math.random() * figurinhasLiberadas.length)];
            newStickers.push(sticker);
           
            newStickersIds.push(sticker.id);
            currentUser.stickers.push(sticker.id); 
        }

        // 👇 3. BATE NO BACKEND PARA GUARDAR AS FIGURINHAS NO COFRE
        await fetch(`${API_URL}/loja/salvar-figurinhas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, figurinhasIds: newStickersIds })
        });
        console.log("💾 Pacote salvo no Azure com sucesso!");

        // 👇 4. RENDERIZA AS FIGURINHAS NA TELA (Sua animação original não muda!)
        const revealGrid = document.getElementById('pack-revealing');
        revealGrid.innerHTML = newStickers.map(s => {
            let rarityColor = "bg-white text-slate-800";
            if (s.rarity === "legendary") rarityColor = "bg-yellow-400 text-yellow-900";
            if (s.rarity === "epic") rarityColor = "bg-purple-400 text-purple-900";
            if (s.rarity === "rare") rarityColor = "bg-blue-400 text-blue-900";

            return `
            <div class="${rarityColor} w-28 aspect-[3/4] rounded-lg p-2 text-center flex flex-col justify-end shadow-2xl animate-in zoom-in spin-in-12 duration-500 border border-black/10 relative overflow-hidden">
                <img src="${STICKER_IMG_PATH}${s.url_imagem}" class="absolute inset-0 w-full h-full object-cover z-0" onerror="this.src='${DEFAULT_IMG}';">
                <div class="relative z-10 bg-black/60 text-white p-1 rounded">
                    <span class="text-[8px] font-black uppercase opacity-70">${s.rarity}</span>
                    <span class="block text-[10px] font-bold leading-tight mt-1">${s.nome || s.name}</span>
                </div>
                <span class="absolute top-1 right-1 font-display font-black text-white/50 z-10">#${s.id}</span>
            </div>
        `}).join('');

        // Controle visual do modal
        document.getElementById('pack-sealed').classList.add('hidden');
        revealGrid.classList.remove('hidden');
        document.getElementById('close-pack-btn').classList.remove('hidden');
        
        updateUI(); // Atualiza as moedinhas lá no topo da tela!
        renderAlbum(); // Atualiza o álbum por baixo dos panos!

    } catch (erro) {
        console.error("Erro crítico na comunicação com a Loja:", erro);
        alert("Erro no servidor da loja. Tente novamente mais tarde.");
        closePackModal();
    }
}
function closePackModal() {
    document.getElementById('pack-modal').classList.add('hidden');
    updateUI(); // Garante que o saldo de moedas atualize na tela ao fechar
}

// SUBSTITUA A SUA FUNÇÃO updateUI POR ESTA:
function updateUI() {
    if (!currentUser) return;

    // 1. Atualiza o saldo de moedas no cabeçalho superior
    const balanceEl = document.getElementById('header-coin-balance');
    if (balanceEl) balanceEl.innerText = currentUser.coins.toLocaleString();

    // 2. Atualiza os dados pessoais do jogador na tela inicial e cabeçalho
    const primeiroNome = currentUser.name.split(' ')[0];
    if (document.getElementById('header-player-name')) document.getElementById('header-player-name').innerText = primeiroNome;
    if (document.getElementById('home-player-name')) document.getElementById('home-player-name').innerText = primeiroNome;
    if (document.getElementById('header-player-role')) document.getElementById('header-player-role').innerText = currentUser.role || 'Colaborador';
    if (document.getElementById('header-player-city')) document.getElementById('header-player-city').innerText = currentUser.city || 'Sede';

    // 3. Calcula e atualiza a barra de porcentagem e progresso do Álbum
    const uniqueCount = new Set(currentUser.stickers || []).size;
    const progressPerc = totalStickers ? Math.min(Math.floor((uniqueCount / totalStickers) * 100), 100) : 0;

    const textoContadorCentral = document.getElementById('home-unique-count');
    if (textoContadorCentral) {
        textoContadorCentral.innerText = `${uniqueCount} / ${totalStickers}`;
    }

    const progressText = document.getElementById('home-progress-text');
    if (progressText) progressText.innerText = `${progressPerc}%`;

    const progressBar = document.getElementById('home-progress-bar');
    if (progressBar) progressBar.style.width = `${progressPerc}%`;

    const progressBall = document.getElementById('home-progress-ball');
    if (progressBall) {
        if (progressPerc === 0) {
            progressBall.style.opacity = "0"; 
        } else {
            progressBall.style.opacity = "1";
            let safePerc = progressPerc;
            if (safePerc < 2) safePerc = 2;   
            if (safePerc > 98) safePerc = 98; 
            progressBall.style.left = `${safePerc}%`;
        }
    }

    // 🛑 REMOVIDAS AS CHAMADAS DE ATUALIZAR A MASCOTE AQUI!

    // 4. Atualiza o sininho de notificações
    if (typeof atualizarNotificacoes === 'function') {
        atualizarNotificacoes();
    }

    // 5. Conta quantas missões o usuário já fez ou estão em aprovação
    const qtdConcluidas = currentUser.completedMissions ? currentUser.completedMissions.length : 0;
    const qtdAnalise = currentUser.pendingMissions ? currentUser.pendingMissions.length : 0;
    const saldoMoedasStats = currentUser.coins || 0;

    const elConcluidas = document.getElementById('stat-concluidas');
    const elMoedas = document.getElementById('stat-moedas');
    const elAnalise = document.getElementById('stat-analise');

    if (elConcluidas) elConcluidas.innerText = qtdConcluidas;
    if (elMoedas) elMoedas.innerText = saldoMoedasStats;
    if (elAnalise) elAnalise.innerText = qtdAnalise;
}

// SUBSTITUA A SUA FUNÇÃO checkStreak POR ESTA:
function checkStreak() {
    // 🛑 Função desativada! A gestora removeu a funcionalidade de Sequência Diária.
    return;
}

// SUBSTITUA A SUA FUNÇÃO POR ESTA
function renderStreakBoxes() {
    const container = document.getElementById('streak-boxes');
    const message = document.getElementById('streak-message');
    if (!container || !currentUser) return;

    container.innerHTML = "";

    // Trocando os dias da semana por Dias de Sequência (Evita o "bug do Sábado")
    const dias = ["Dia 1", "Dia 2", "Dia 3", "Dia 4", "Dia 5"];
    const maxDays = 5;
    
    const streak = currentUser.streak || 1;
    const visibleStreak = streak > maxDays ? maxDays : streak;

    for (let i = 0; i < maxDays; i++) {
        const box = document.createElement('div');
        
        let classesBase = "";
        if (i < visibleStreak) {
            // Dias logados (Caixinha Brilhante)
            classesBase = "bg-white text-pitch-dark shadow-[0_0_15px_rgba(255,255,255,0.6)]"; 
        } else {
            // Dias futuros (Caixinha Apagada)
            classesBase = "bg-pitch-dark/50 text-white/30 border border-white/10"; 
        }

        // Destaca a caixinha exata do SEU progresso atual com a borda amarela
        if (i === visibleStreak - 1) {
            classesBase += " border-2 border-yellow-400 transform scale-110"; 
        }

        // Deixei o texto um pouquinho menor (text-[10px]) para caber a palavra "Dia"
        box.className = `w-11 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${classesBase}`;
        box.innerText = dias[i];
        container.appendChild(box);
    }

    const diasRestantes = maxDays - visibleStreak;
    if (diasRestantes <= 0) {
        message.innerText = "🏆 Sequência Completa! Bônus Resgatado!";
        message.className = "text-sm text-yellow-400 font-black mt-4 text-center";
    } else {
        message.innerText = `Faça login por mais ${diasRestantes} dia(s) para ganhar 100 moedas!`;
        message.className = "text-sm text-white font-bold mt-4 text-center";
    }
}

function updateMascot() {
    const mascot = document.getElementById("streak-mascot");
    if (!mascot || !currentUser) return;

    const streak = currentUser.streak ?? 0;
    mascot.className = "h-16 w-auto mx-auto transition-all duration-500";

    if (streak >= 5) {
        mascot.src = "Imagens/5-Sucesso.png";
        mascot.classList.add("animate-bounce");
    } else if (streak === 4) mascot.src = "Imagens/4-Sucesso.png";
    else if (streak === 3) mascot.src = "Imagens/3-Sucesso.png";
    else if (streak === 2) mascot.src = "Imagens/2-Sucesso.png";
    else if (streak === 1) mascot.src = "Imagens/1-Sucesso.png";
    else mascot.src = "Imagens/1-Fracasso.png";
}

// SUBSTITUA A SUA FUNÇÃO claimMission POR ESTA:
async function claimMission(missionId) {
    if (!currentUser.pendingMissions) currentUser.pendingMissions = [];
    
    // Proteção nativa para evitar que a função rode se já estiver pendente/completa
    if (currentUser.completedMissions.includes(missionId) || currentUser.pendingMissions.includes(missionId)) {
        alert("Você já solicitou ou concluiu esta missão!");
        return; 
    }
    
    const emailSeguro = currentUser.email || currentUser.Email;
    const nomeSeguro = currentUser.name || currentUser.Nome || "Colaborador";

    const dadosParaEnviar = {
        usuarioEmail: emailSeguro,
        usuarioNome: nomeSeguro,
        missaoId: missionId
    };

    console.log("📦 DADOS QUE O FRONTEND ESTÁ ENVIANDO:", JSON.stringify(dadosParaEnviar));

    if (!emailSeguro) {
        alert("Erro no aplicativo: E-mail do jogador não encontrado na memória.");
        return; 
    }

    try {
        const resposta = await fetch(`${API_URL}/missoes/solicitar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosParaEnviar)
        });

        if (resposta.ok) {
            currentUser.pendingMissions.push(missionId);
            saveUserData();
            alert("Missão enviada para aprovação do Gestor!");
            renderMissions(); 
        } else {
            const erroBanco = await resposta.json();
            const mensagemErro = erroBanco.erro || erroBanco.mensagem || "";
            
            // 👇 CORREÇÃO 3: Sincronização forçada!
            // Se o backend recusar com Erro 400 avisando que já existe, nós consertamos o layout!
            if (resposta.status === 400 && (mensagemErro.toLowerCase().includes("solicitada") || mensagemErro.toLowerCase().includes("aprovada"))) {
                console.warn("A missão já existia no banco! Sincronizando o botão no frontend para bloquear cliques futuros.");
                
                // Adicionamos na memória local para "travar" o botão
                currentUser.pendingMissions.push(missionId); 
                saveUserData(); 
                
                // Renderiza as missões novamente, o que vai transformar o botão azul em "Em Análise"
                renderMissions(); 
                alert("Aviso: Esta missão já estava registrada no sistema e foi sincronizada. Está em análise!");
            } else {
                alert(`Erro ao enviar: ${mensagemErro}`);
            }
        }
    } catch (erro) {
        console.error("Erro na comunicação:", erro);
        alert("Erro ao conectar com o servidor.");
    }
}

let currentMissionTab = 'semanal';
let currentMissionArea = 'Geral';

// SUBSTITUA A SUA FUNÇÃO POR ESTA
window.filterMissions = function(area, tipo, btnElement) {
    if (area) currentMissionArea = area;
    if (tipo) currentMissionTab = tipo;

    // Se passamos o botão que foi clicado, atualizamos o visual
    if (btnElement) {
        
        // 1. LÓGICA PARA OS BOTÕES DE ÁREA (Geral, RH, I&I, SHE)
        if (btnElement.classList.contains('area-tab')) {
            const abasArea = document.querySelectorAll('.area-tab');
            
            // Reseta todos os botões de área para o estado INATIVO (apagado)
            abasArea.forEach(btn => {
                btn.className = "area-tab px-5 py-2.5 rounded-full text-sm font-bold text-slate-400 bg-white/5 border border-white/10 hover:bg-white/15 hover:text-white hover:border-white/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 tracking-wide";
            });

            // Aplica o estado ATIVO (azul neon) no botão clicado
            btnElement.className = "area-tab px-5 py-2.5 rounded-full text-sm font-black text-white bg-blue-600 border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 tracking-wide";
        } 
        
        // 2. LÓGICA PARA OS BOTÕES DE TEMPO (Semanal, Mensal)
        else if (btnElement.classList.contains('time-tab')) {
            const abasTempo = document.querySelectorAll('.time-tab');
            
            // Reseta todos os botões de tempo para o estado INATIVO (apagado)
            abasTempo.forEach(btn => {
                btn.className = "time-tab px-6 py-2 rounded-xl text-sm font-bold text-slate-400 bg-transparent border border-transparent hover:text-white hover:bg-white/5 transition-all duration-300 opacity-70";
            });

            // Aplica o estado ATIVO (azul neon) no botão clicado
            btnElement.className = "time-tab px-6 py-2 rounded-xl text-sm font-black text-white bg-blue-600 border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300";
        }
    }

    renderMissions();
};

async function refreshMissionsUI() {
    try {
        const response = await fetch(`${API_URL}/missoes`);
        if (response.ok) {
            window.MISSIONS_FROM_DB = await response.json();
            renderMissions();
        }
    } catch (e) {
        console.error("Erro ao carregar missões do servidor:", e);
    }
}

function renderMissions() {
    const grid = document.getElementById('missions-grid');
    if (!grid) {
        console.error("FALTOU A DIV NO HTML: Coloque <div id='missions-grid' class='grid grid-cols-1 md:grid-cols-2 gap-4'></div> no seu index.html");
        return;
    }
    grid.innerHTML = "";

    if (!window.MISSIONS_FROM_DB || window.MISSIONS_FROM_DB.length === 0) return;
    if (!currentUser.completedMissions) currentUser.completedMissions = [];
    if (!currentUser.pendingMissions) currentUser.pendingMissions = [];

    const todasMissoes = window.MISSIONS_FROM_DB.map(m => ({
        id: m.ID || m.Id,
        name: m.Titulo,
        desc: m.Descricao,
        reward: m.Valor_Recompensa,
        area: m.Area,
        type: (m.Frequencia || "semanal").toLowerCase()
    }));

    const filtradas = todasMissoes.filter(m => {
        const tipoMissao = m.type === 'unica' ? 'semanal' : m.type;
        return tipoMissao === currentMissionTab && (m.area === 'Geral' || m.area === currentMissionArea);
    });

    if (filtradas.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 font-bold">Nenhuma missão de ${currentMissionArea} para a aba ${currentMissionTab}.</div>`;
        return;
    }

    filtradas.forEach(mission => {
        let btnHtml = `<button onclick="claimMission(${mission.id})" class="bg-[#003366] hover:bg-blue-500 px-6 py-2.5 rounded-xl font-bold transition text-white text-sm uppercase tracking-wider">Resgatar</button>`;

        if (currentUser.completedMissions.includes(mission.id)) {
            btnHtml = `<button disabled class="bg-emerald-900 text-emerald-400 px-6 py-2.5 rounded-xl font-black cursor-not-allowed text-sm uppercase">✓ Feito</button>`;
        } else if (currentUser.pendingMissions.includes(mission.id)) {
            btnHtml = `<button disabled class="bg-amber-900 text-amber-400 px-6 py-2.5 rounded-xl font-bold cursor-not-allowed text-sm uppercase">Em Análise</button>`;
        }

        const card = document.createElement('div');
        card.className = "bg-[#001f3f] border border-white/20 p-4 rounded-2xl flex items-center justify-between shadow-lg mb-4";
        card.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-xl bg-blue-900/50 flex items-center justify-center text-2xl border border-white/10">🎯</div>
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-black text-lg text-white">${mission.name}</h4>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white">${mission.area}</span>
                    </div>
                    <p class="text-slate-400 text-sm mb-1">${mission.desc}</p>
                    <span class="text-yellow-400 text-sm font-black">+${mission.reward} moedas</span>
                </div>
            </div>
            ${btnHtml}
        `;
        grid.appendChild(card);
    });
}

// ==========================================
// 🔄 SINCRONIZAÇÃO DE MISSÕES (NOVO!)
// ==========================================
async function sincronizarMissoesDoBanco() {
    // Se não tiver ninguém logado, não faz nada
    if (!currentUser) return;
    
    try {
        const emailUsuario = currentUser.email || currentUser.Email;
        
        // Bate na nossa rota NOVA do Backend!
        const resposta = await fetch(`${API_URL}/missoes/historico/${emailUsuario}`);
        
        if (resposta.ok) {
            const historico = await resposta.json();
            
            // 1. Limpa a memória local para não duplicar dados antigos
            currentUser.completedMissions = [];
            currentUser.pendingMissions = [];
            
            // 2. Separa as missões nas caixinhas certas lendo o que veio do banco
            historico.forEach(item => {
                const status = (item.Status || "").toLowerCase();
                if (status === 'aprovado') {
                    currentUser.completedMissions.push(item.Missao_ID);
                } else if (status === 'pendente') {
                    currentUser.pendingMissions.push(item.Missao_ID);
                }
            });
            
            // 3. Salva no navegador e atualiza a tela!
            saveUserData();
            
            // Transforma os botões em "✓ Feito" ou "Em Análise"
            renderMissions(); 
            
            // Atualiza os contadores numéricos (Ex: "1 Em Análise")
            updateUI();       
            
            console.log("✅ Histórico de missões sincronizado com sucesso!");
        }
    } catch (erro) {
        console.error("❌ Erro ao sincronizar missões do banco:", erro);
    }
}

function updateMissionTimer() {
    const timerEl = document.getElementById('mission-timer');
    if(!timerEl) return;
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    let diff = tomorrow - now;
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    timerEl.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
setInterval(updateMissionTimer, 1000);

// ==========================================
// --- SISTEMA DE TROCAS (MATCHING) ---
// ==========================================
function getDuplicadas(stickersArray) {
    const counts = {};
    const duplicadas = new Set();
    stickersArray.forEach(id => {
        counts[id] = (counts[id] || 0) + 1; 
        if (counts[id] > 1) duplicadas.add(id); 
    });
    return Array.from(duplicadas);
}


// ==========================================
// --- SISTEMA DE TROCAS (MATCHING E RECEBIDOS) ---
// ==========================================
async function renderTrocas() {
    const containerMatches = document.getElementById('trocas-grid');
    const containerRecebidos = document.getElementById('trocas-recebidas-container');
    const gridRecebidos = document.getElementById('trocas-recebidas-grid');

    if (!containerMatches) return;

    containerMatches.innerHTML = `<div class="col-span-full text-center py-16"><p class="text-white font-bold text-xl mb-2 animate-pulse">Buscando colegas na nuvem... ⏳</p></div>`;

    // --- PARTE 1: CAIXA DE CORREIO (Buscando direto do Azure!) ---
    if (containerRecebidos && gridRecebidos) {
        try {
            const resNotif = await fetch(`${API_URL}/notificacoes/${currentUser.email}`);
            const todasNotificacoes = await resNotif.json();

            // Filtra só as notificações de troca que estão "pendentes"
            const pendentes = todasNotificacoes.filter(n => 
                (n.Tipo === 'troca' || n.tipo === 'troca') && 
                (n.Status === 'pendente' || n.status === 'pendente')
            );

            if (pendentes.length > 0) {
                containerRecebidos.classList.remove('hidden');
                gridRecebidos.innerHTML = '';

                pendentes.forEach(req => {
                    const remetente = req.RemetenteNome || req.remetenteNome || "Um Colega";
                    const texto = req.Texto || req.texto || "Quer trocar cartas com você!";
                    const idNotif = req.Id || req.id;

                    gridRecebidos.innerHTML += `
                        <div class="bg-gradient-to-br from-[#0a1828] to-[#112943] border border-blue-500/30 p-6 rounded-3xl shadow-xl flex flex-col relative overflow-hidden">
                            <div class="flex items-center gap-4 mb-4 relative z-10">
                                <div class="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center font-black text-xl text-white shadow-lg border-2 border-white/10">
                                    ${remetente.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 class="font-bold text-white text-lg leading-tight">${remetente}</h3>
                                </div>
                            </div>
                            <p class="text-xs text-blue-200 mb-4 font-bold bg-black/20 p-2 rounded-lg border border-white/5">${texto}</p>
                            <div class="flex gap-3 mt-auto relative z-10">
                                <button onclick="aprovarTroca(${idNotif})" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg transition-transform hover:scale-[1.02]">Aprovar</button>
                                <button onclick="recusarTroca(${idNotif})" class="flex-1 bg-white/5 hover:bg-red-500/80 hover:text-white text-red-400 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs border border-white/10 transition-colors">Recusar</button>
                            </div>
                        </div>
                    `;
                });
            } else {
                containerRecebidos.classList.add('hidden');
            }
        } catch (e) {
            console.error("Erro ao buscar caixa de correio:", e);
        }
    }

    // --- PARTE 2: O TINDER (Matches na Azure) ---
    try {
        const response = await fetch(`${API_URL}/trade/sugestoes/${currentUser.email}`);
        const matches = await response.json();
        containerMatches.innerHTML = '';

        if (matches.length > 0) {
            matches.forEach(colega => {
                const card = document.createElement('div');
                card.className = "bg-gradient-to-br from-[#003366] to-[#001f3f] border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col hover:border-white/20 transition-colors";

                let htmlCard = `
                    <div class="flex items-center gap-3 mb-5">
                        <div class="w-12 h-12 bg-gradient-to-tr from-[#0078D4] to-[#005fa3] rounded-full flex items-center justify-center font-black text-xl text-white shadow-md">
                            ${colega.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="font-bold text-white text-lg leading-tight">${colega.name}</h3>
                            <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Tem ${colega.cartasParaMim.length} carta(s) pra você!</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2 mb-6">
                `;

                colega.cartasParaMim.slice(0, 10).forEach(id => {
                    const figurinhaData = STICKER_DB.find(s => s.id === id);
                    if (figurinhaData) {
                        htmlCard += `
                            <div onclick="prepararTrocaJusta('${colega.email}', '${colega.name}', ${id})" 
                                 class="cursor-pointer w-12 aspect-[3/4] bg-[#001f3f] rounded flex-shrink-0 border border-white/20 overflow-hidden relative shadow-sm hover:scale-110 hover:border-emerald-400 transition-transform group" title="Clique para pedir esta carta">
                                <img src="${STICKER_IMG_PATH}${figurinhaData.url_imagem}" class="absolute inset-0 w-full h-full object-cover" onerror="this.src='${DEFAULT_IMG}';">
                                <span class="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-center text-white font-bold backdrop-blur-sm">#${id}</span>
                                <div class="absolute inset-0 bg-emerald-500/40 hidden group-hover:flex items-center justify-center backdrop-blur-[1px]">
                                    <span class="text-2xl">🔄</span>
                                </div>
                            </div>
                        `;
                    }
                });

                htmlCard += `</div>
                    <div class="mt-auto text-center p-3 bg-white/5 rounded-xl border border-white/10">
                        <p class="text-xs font-bold text-emerald-400 uppercase tracking-widest">⬆️ Clique na carta que deseja</p>
                    </div>
                `;

                card.innerHTML = htmlCard;
                containerMatches.appendChild(card);
            });
        } else {
            containerMatches.innerHTML = `<div class="col-span-full text-center py-16"><p class="text-white font-bold text-xl mb-2">Nenhum Match no momento</p></div>`;
        }
    } catch (err) {
        console.error("Erro ao buscar matches:", err);
    }
}

// ==========================================
// --- SISTEMA DE NOTIFICAÇÕES (ESTILO APP) ---
// ==========================================

function mostrarAvisoFlutuante(mensagem) {
    const aviso = document.createElement('div');
    aviso.className = "fixed bottom-10 right-10 bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black shadow-2xl z-[100] transition-all transform translate-y-0 opacity-100 flex items-center gap-3 border border-emerald-400";
    aviso.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>${mensagem}`;
    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.style.opacity = '0';
        aviso.style.transform = 'translateY(20px)';
        setTimeout(() => aviso.remove(), 500); 
    }, 3000);
}

async function aprovarTroca(notificacaoId) {
    if (!confirm("Deseja APROVAR a troca e enviar as cartas?")) return;
    
    try {
        const response = await fetch(`${API_URL}/trade/responder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificacaoId: notificacaoId, acao: 'aprovado' })
        });
        const dados = await response.json();
        
        if (dados.sucesso) {
            alert("Troca aprovada com sucesso! As cartas foram transferidas.");
            carregarAlbumDoBanco(); // Recarrega nosso álbum pra gente ver a carta sumindo
            renderTrocas(); // Dá um F5 na tela de trocas
        } else {
            alert(dados.erro || "Erro ao aprovar.");
        }
    } catch(e) {
        console.error(e);
        alert("Erro no servidor!");
    }
}

async function atualizarNotificacoes() {
    if (!currentUser) return;
    
    const lista = document.getElementById('notificacoes-lista');
    const badge = document.getElementById('notificacao-badge');
    if (!lista) return;

    try {
        // Busca as notificações do Banco de Dados
        const response = await fetch(`${API_URL}/notificacoes/${currentUser.email}`);
        
        if (!response.ok) throw new Error("Erro ao buscar notificações");
        
        const notificacoesDoBanco = await response.json();

        // Atualiza a bolinha vermelha do sininho
        const naoLidas = notificacoesDoBanco.filter(n => n.Lida === false || n.Lida === 0 || !n.Lida).length;
        if (badge) {
            if (naoLidas > 0) {
                badge.innerText = naoLidas;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        if (notificacoesDoBanco.length === 0) {
            lista.innerHTML = `<p class="text-center text-slate-400 py-6">Nenhuma notificação hoje.</p>`;
            return;
        }

        // 👇 O MAP BLINDADO (À Prova de Erros)
        const htmlAvisos = notificacoesDoBanco.map(notif => {
            // Pega o texto de qualquer jeito que o banco mandar e GARANTE que é texto (String)
            const textoOriginal = notif.Texto || notif.Mensagem || notif.mensagem || "Aviso do Sistema"; 
            const textoString = String(textoOriginal); 
            
            const tipo = notif.Tipo || notif.tipo || "";
            
            let icone = "🏆";
            let titulo = "Atualização de Missão";
            let conteudoRenderizado = textoString; // Por padrão, mostra só a mensagem da missão

            // Se for uma troca, a gente muda o ícone, o título e adiciona o nome do Remetente
            if (tipo.toLowerCase() === 'troca' || textoString.toLowerCase().includes('trocar')) {
                icone = "🤝";
                titulo = "Pedido de Troca";
                const nomeRemetente = notif.RemetenteNome || notif.Remetente_Nome || "Um colega";
                // Deixa o nome azulzinho para destacar!
                conteudoRenderizado = `<strong style="color: #60a5fa;">${nomeRemetente}</strong> ${textoString}`;
            }
            
            return `
                <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; gap: 12px; align-items: start;">
                    <div style="font-size: 24px;">${icone}</div>
                    <div style="flex: 1;">
                        <strong style="color: white; font-size: 14px;">${titulo}</strong><br>
                        <span style="color: #94a3b8; font-size: 12px;">${conteudoRenderizado}</span>
                    </div>
                </div>
            `;
        }).join('');

        lista.innerHTML = htmlAvisos;

    } catch (erro) {
        console.error("❌ Erro ao renderizar notificações:", erro);
        lista.innerHTML = `<p class="text-center text-red-400 py-6">Erro ao carregar avisos.</p>`;
    }
}

// INICIALIZADORES DA PÁGINA E EVENTOS
window.onload = init;

window.onpopstate = function (event) {
    if (event.state && event.state.section) {
        showSection(event.state.section, false);
    }
};

// ==========================================
// 🔐 MÓDULO DO GESTOR (APROVAÇÕES) COM FILTROS
// ==========================================
let pendentesGlobais = []; // Guarda as missões para filtrarmos sem precisar recarregar o servidor

async function carregarPendentes() {
    try {
        let areaExibicao = "GESTOR"; 
        
        const labelArea = document.getElementById('nome-area-gestor');
        if (labelArea && currentUser) {
            const emailSeguro = (currentUser.email || currentUser.Email || "").toLowerCase();

            if (emailSeguro === 'rh@company.com') areaExibicao = "RH";
            else if (emailSeguro === 'she@company.com' || (currentUser.Nome && currentUser.Nome.includes("SHE"))) areaExibicao = "SHE";
            else if (emailSeguro === 'ini@company.com' || (currentUser.Nome && currentUser.Nome.includes("I&I"))) areaExibicao = "I&I";
            else if (currentUser.Cargo === "Administrador") areaExibicao = "ADMIN";

            labelArea.innerText = areaExibicao;
        }

        const areaSeguraParaUrl = encodeURIComponent(areaExibicao);
        const resposta = await fetch(`${API_URL}/missoes/pendentes?area=${areaSeguraParaUrl}`);
        
        const pendentes = await resposta.json();
        pendentesGlobais = pendentes; // Salva na nossa variável
        
        // Alimenta as caixinhas de filtro
        preencherFiltrosGestor(pendentesGlobais);
        
        // Desenha a lista na tela
        renderizarListaPendentes(pendentesGlobais);

    } catch (erro) {
        console.error("Erro ao carregar painel:", erro);
    }
}

// Preenche os Selects (dropdowns) com as missões e plantas disponíveis
function preencherFiltrosGestor(lista) {
    const selectMissao = document.getElementById('filtro-missao-gestor');
    const selectPlanta = document.getElementById('filtro-planta-gestor');
    if(!selectMissao || !selectPlanta) return;

    // Extrai nomes únicos usando a nossa lista NOME_DAS_PLANTAS
    const missoesUnicas = [...new Set(lista.map(item => item.MissaoNome))].sort();
    const plantasUnicas = [...new Set(lista.map(item => NOME_DAS_PLANTAS[item.Cidade] || "Desconhecida"))].sort();

    selectMissao.innerHTML = '<option value="">Todas as Missões</option>' + missoesUnicas.map(m => `<option value="${m}">${m}</option>`).join('');
    selectPlanta.innerHTML = '<option value="">Todas as Plantas</option>' + plantasUnicas.map(p => `<option value="${p}">${p}</option>`).join('');
}

// Desenha os cards na tela
function renderizarListaPendentes(lista) {
    const container = document.getElementById('lista-pendentes');
    if (!container) return;

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="bg-[#001f3f] p-6 rounded-2xl border border-white/10 text-center text-gray-300 font-bold">
                Tudo limpo! Nenhuma missão encontrada. 🎉
            </div>`;
        return;
    }

    container.innerHTML = ''; 
    lista.forEach(sol => {
        // 👇 AQUI INSERIMOS A MÁGICA: Convertemos o ID da cidade em Nome!
        const nomePlanta = NOME_DAS_PLANTAS[sol.Cidade] || "Planta Desconhecida";

        container.innerHTML += `
            <div class="bg-[#001f3f] p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-yellow-400 mt-3 hover:bg-white/5 transition-colors">
                <div>
                    <p class="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">
                        🏢 Planta: <span class="text-blue-400">${nomePlanta}</span>
                    </p>
                    <p class="text-gray-300 text-sm">Solicitação de: <strong class="text-white">${sol.UsuarioNome}</strong></p>
                    <h3 class="text-white font-black text-xl mt-1">${sol.MissaoNome}</h3>
                    <p class="text-slate-400 text-sm mt-1 max-w-xl">${sol.MissaoDescricao || "Sem descrição adicional."}</p>
                    <p class="text-yellow-400 font-bold mt-2">+${sol.Recompensa} moedas</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="responderMissao(${sol.Id}, 'aprovado')" class="bg-green-500 hover:bg-green-400 text-black px-5 py-2 rounded-xl font-black uppercase shadow-lg transition-transform active:scale-95">
                        Aprovar
                    </button>
                    <button onclick="responderMissao(${sol.Id}, 'recusado')" class="bg-red-500 hover:bg-red-400 text-white px-5 py-2 rounded-xl font-black uppercase shadow-lg transition-transform active:scale-95">
                        Recusar
                    </button>
                </div>
            </div>
        `;
    });
}

// Ação do Botão "Filtrar"
window.aplicarFiltrosGestor = function() {
    const nomeFiltro = document.getElementById('filtro-nome-gestor').value.toLowerCase();
    const missaoFiltro = document.getElementById('filtro-missao-gestor').value;
    const plantaFiltro = document.getElementById('filtro-planta-gestor').value;

    const filtrados = pendentesGlobais.filter(sol => {
        const nomeUsuario = (sol.UsuarioNome || "").toLowerCase();
        const nomeMissao = sol.MissaoNome || "";
        const nomePlanta = NOME_DAS_PLANTAS[sol.Cidade] || "Desconhecida";

        const passaNome = nomeUsuario.includes(nomeFiltro);
        const passaMissao = missaoFiltro === "" || nomeMissao === missaoFiltro;
        const passaPlanta = plantaFiltro === "" || nomePlanta === plantaFiltro;

        return passaNome && passaMissao && passaPlanta;
    });

    renderizarListaPendentes(filtrados);
};

// Ação do Botão "Limpar"
window.limparFiltrosGestor = function() {
    document.getElementById('filtro-nome-gestor').value = '';
    document.getElementById('filtro-missao-gestor').value = '';
    document.getElementById('filtro-planta-gestor').value = '';
    renderizarListaPendentes(pendentesGlobais);
};

async function responderMissao(solicitacaoId, acao) {
    // 1. Pede confirmação (Ex: Deseja marcar como APROVADO?)
    if (!confirm(`Deseja marcar como ${acao.toUpperCase()}?`)) return;

    try {
        // 2. Envia o pacote para o servidor
        const resposta = await fetch(`${API_URL}/missoes/responder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ solicitacaoId, acao })
        });

        // 3. Lê a resposta
        const dados = await resposta.json();
        
        if (dados.ok) {
            // Sucesso! Atualiza a tela
            alert(`✅ Sucesso! Missão ${acao}.`);
            carregarPendentes(); // Atualiza a lista na hora
            updateUI(); // Atualiza o saldo
        } else {
            // 👇 BLINDAGEM: Tenta ler 'mensagem'. Se não existir, lê 'erro'. Se não tiver nenhum, exibe texto padrão.
            const mensagemErro = dados.mensagem || dados.erro || "Erro desconhecido ao processar.";
            alert(`❌ Erro: ${mensagemErro}`);
        }
    } catch (erro) {
        console.error("Erro ao enviar resposta:", erro);
        alert("❌ Erro de conexão com o servidor. Tente novamente.");
    }
}
// --- FUNÇÃO PARA GERAR NOTIFICAÇÃO DE MISSÃO APROVADA ---
async function buscarNotificacoesDeMissoes() {
    if (!currentUser) return;

    try {
        // Buscamos o histórico desse usuário específico
        const response = await fetch(`${API_URL}/missoes/historico/${currentUser.Email}`);
        const historico = await response.json();

        // Filtramos apenas o que foi aprovado recentemente
        const aprovadas = historico.filter(h => h.Status === 'Aprovado');

        aprovadas.forEach(missao => {
            // Se essa missão ainda não estiver na lista de notificações local
            const jaNotificado = currentUser.notificacoes?.find(n => n.id_missao === missao.Id);
            
            if (!jaNotificado) {
                if (!currentUser.notificacoes) currentUser.notificacoes = [];
                
                currentUser.notificacoes.push({
                    id: Date.now() + Math.random(),
                    id_missao: missao.Id,
                    tipo: 'missao',
                    titulo: 'Missão Aprovada! 🎉',
                    texto: `Sua missão "${missao.MissaoNome}" foi aprovada e +${missao.Recompensa} moedas caíram na conta!`,
                    lida: false
                });
            }
        });

        saveUserData(); // Salva no local/nuvem
        atualizarNotificacoes(); // Faz o sininho brilhar
    } catch (e) {
        console.error("Erro ao buscar avisos de missões:", e);
    }
}
async function carregarNotificacoesDoBanco() {
    if (!currentUser) return;

    try {
        const emailUsuario = currentUser.email || currentUser.Email;
        const response = await fetch(`${API_URL}/notificacoes/${emailUsuario}`);
        const dadosDoBanco = await response.json();

        if (dadosDoBanco.length === 0) return;

        // 3. Converte para o sininho (A PROVA DE LETRAS MAIÚSCULAS/MINÚSCULAS)
        currentUser.notificacoes = dadosDoBanco.map(n => ({
            id: n.Id || n.ID || n.id || Date.now(),
            tipo: n.Tipo || n.tipo || 'missao',
            titulo: 'Missão Atualizada! 🎉',
            // 👇 O Segredo estava aqui: pegando a mensagem de todos os jeitos
            texto: n.Mensagem || n.mensagem || n.MENSAGEM || "Sua missão foi aprovada!", 
            lida: n.Lida === 1 || n.Lida === true || n.lida === true,
            data: n.Data_Envio || n.data_envio || n.Data_Criacao || ""
        }));

        if (typeof atualizarNotificacoes === 'function') {
            atualizarNotificacoes();
        }
    } catch (e) {
        console.error("❌ Erro no Front:", e);
    }
}
// 🧠 A Inteligência da Troca Justa (Verifica a Raridade)
function prepararTrocaJusta(emailDoColega, nomeDoColega, cartaPedidaId) {
    const cartaDesejada = STICKER_DB.find(s => s.id === cartaPedidaId);
    if (!cartaDesejada) return;

    // Se o seu banco de figurinhas usa 'rarity', 'tipo' ou 'categoria', ajustamos aqui. 
    // Vou usar 'rarity' como padrão, ou 'comum' se não tiver.
    const raridadeDesejada = cartaDesejada.rarity || cartaDesejada.tipo || 'comum';

    // Pega todas as minhas cartas repetidas
    const minhasRepetidas = getDuplicadas(currentUser.stickers || []);

    // Procura UMA carta repetida minha que tenha a MESMA raridade
    const repetidasValidas = minhasRepetidas.filter(id => {
        const dbCarta = STICKER_DB.find(s => s.id === id);
        const raridadeDesta = dbCarta ? (dbCarta.rarity || dbCarta.tipo || 'comum') : 'comum';
        return raridadeDesta === raridadeDesejada;
    });

    // Se eu não tiver cartas da mesma raridade pra trocar, bloqueia!
    if (repetidasValidas.length === 0) {
        alert(`❌ Troca Injusta!\n\nA carta #${cartaPedidaId} é de raridade "${raridadeDesejada}".\nVocê precisa ter uma carta repetida dessa MESMA raridade para oferecer em troca!`);
        return;
    }

    // Pega a primeira carta válida que achei para oferecer
    const cartaOferecidaId = repetidasValidas[0];

    // Pede confirmação final ao usuário
    if (confirm(`🤝 TROCA JUSTA (1 por 1)\n\nVocê vai RECEBER a carta #${cartaPedidaId} do(a) ${nomeDoColega}.\nVocê vai DAR a sua carta repetida #${cartaOferecidaId}.\n\nDeseja enviar essa proposta?`)) {
        enviarSolicitacaoDeTroca(emailDoColega, nomeDoColega, cartaPedidaId, cartaOferecidaId);
    }
}

// 🚀 O Disparo para o Servidor
async function enviarSolicitacaoDeTroca(emailDoColega, nomeDoColega, cartaPedida, cartaOferecida) {
    const pacoteTrade = {
        remetenteEmail: currentUser.email || currentUser.Email,
        remetenteNome: currentUser.name || currentUser.Nome,
        destinatarioEmail: emailDoColega,
        cartaPedida: cartaPedida,
        cartaOferecida: cartaOferecida
    };

    try {
        const response = await fetch(`${API_URL}/trade/enviar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacoteTrade)
        });

        const dados = await response.json();

        if (response.ok && dados.sucesso) {
            alert(`Proposta enviada para ${nomeDoColega} com sucesso!`);
        } else {
            throw new Error(dados.erro || "Falha no servidor");
        }
    } catch (erro) {
        console.error("❌ Erro:", erro);
        alert("Erro ao enviar. Verifique o terminal do VS Code.");
    }
}

// SUBSTITUA A SUA FUNÇÃO resgatarCupom POR ESTA:
window.resgatarCupom = async function() {
    if (!currentUser) return;

    // Busca o campo de digitar e o local da mensagem no HTML
    const inputEl = document.getElementById('cupom-input');
    const msgEl = document.getElementById('cupom-message');
    const codigo = inputEl.value.trim();

    // Se a pessoa clicou sem digitar nada
    if (!codigo) {
        msgEl.innerText = "⚠️ Digite um código válido!";
        msgEl.className = "text-sm text-center font-bold mt-4 text-red-400";
        msgEl.classList.remove('hidden');
        return;
    }

    // Mostra mensagem de carregamento
    msgEl.innerText = "⏳ Validando cupom...";
    msgEl.className = "text-sm text-center font-bold mt-4 text-blue-400";
    msgEl.classList.remove('hidden');

    try {
        const emailUsuario = currentUser.email || currentUser.Email;
        
        // Manda o pacote para o Backend
        const resposta = await fetch(`${API_URL}/missoes/cupom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailUsuario, codigo: codigo })
        });

        const dados = await resposta.json();

        // Se o Backend disser que deu tudo certo...
        if (resposta.ok && dados.sucesso) {
            // 1. Atualiza as moedas na memória do Frontend
            currentUser.coins += dados.valorGanho;
            
            // 2. Salva e atualiza o número amarelo lá no topo da tela!
            saveUserData(); 
            updateUI(); 
            
            // 3. Mostra a festa na tela
            msgEl.innerText = `🎉 ${dados.mensagem}`;
            msgEl.className = "text-sm text-center font-black mt-4 text-emerald-400";
            inputEl.value = ""; // Limpa o campo
            
        } else {
            // Se o Backend recusar (Cupom inválido, já usado, etc)
            msgEl.innerText = `❌ ${dados.erro || "Erro ao resgatar cupom."}`;
            msgEl.className = "text-sm text-center font-bold mt-4 text-red-400";
        }
    } catch (erro) {
        console.error("Erro ao conectar com o servidor:", erro);
        msgEl.innerText = "❌ Erro de conexão. Tente novamente.";
        msgEl.className = "text-sm text-center font-bold mt-4 text-red-400";
    }
};


// SUBSTITUA A SUA FUNÇÃO enviarPixMoedas POR ESTA:
window.enviarPixMoedas = async function() {
    const emailInput = document.getElementById('pix-email');
    const moedasInput = document.getElementById('pix-moedas');
    const motivoInput = document.getElementById('pix-motivo');
    const msgEl = document.getElementById('pix-mensagem');

    const email = emailInput.value.trim();
    const moedas = parseInt(moedasInput.value);
    const motivo = motivoInput.value.trim();
    
    // Pega o nome da área (RH, SHE, etc) que já está escrito na tela do gestor
    const areaGestor = document.getElementById('nome-area-gestor').innerText; 

    if (!email || !moedas || moedas <= 0) {
        msgEl.innerText = "⚠️ Preencha um e-mail válido e a quantidade de moedas!";
        msgEl.className = "text-sm font-bold mt-4 text-red-400 block";
        return;
    }

    msgEl.innerText = "⏳ Transferindo moedas na nuvem...";
    msgEl.className = "text-sm font-bold mt-4 text-blue-400 block";

    try {
        const pacotePix = { 
            emailDestino: email, 
            quantidade: moedas, 
            motivo: motivo, 
            areaGestor: areaGestor 
        };
        
        const resposta = await fetch(`${API_URL}/missoes/transferir-moedas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pacotePix)
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.sucesso) {
            msgEl.innerText = `🎉 ${dados.mensagem}`;
            msgEl.className = "text-sm font-black mt-4 text-emerald-400 block";
            
            // Limpa os campos para o gestor poder mandar outro
            emailInput.value = '';
            moedasInput.value = '';
            motivoInput.value = '';
        } else {
            msgEl.innerText = `❌ Erro: ${dados.erro}`;
            msgEl.className = "text-sm font-bold mt-4 text-red-400 block";
        }
    } catch (erro) {
        console.error("Erro na transferência:", erro);
        msgEl.innerText = "❌ Erro de conexão com o servidor.";
        msgEl.className = "text-sm font-bold mt-4 text-red-400 block";
    }
};