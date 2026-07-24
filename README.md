# 🏆 Álbum de Figurinhas Digital - Plataforma Gamificada

## 💻 Sobre o Projeto
Uma aplicação web gamificada desenvolvida para promover engajamento corporativo através da simulação de um álbum de figurinhas. O projeto foi arquitetado para suportar acesso contínuo e estável a longo prazo (com infraestrutura projetada para operar até dezembro de 2026), oferecendo uma experiência interativa e competitiva para os usuários.

O foco principal do desenvolvimento foi a construção de um back-end robusto e uma modelagem de banco de dados eficiente para lidar com regras de negócio específicas e sistemas de pontuação dinâmica.

## ⚙️ Principais Funcionalidades
*   **Coleção e Gerenciamento:** Sistema para usuários abrirem "pacotes", colecionarem itens e gerenciarem seu inventário digital.
*   **Motor de Gamificação e Ranking Customizado:** Implementação de um placar de líderes (Leaderboard). A regra de negócio principal do ranking foi desenvolvida para calcular o **total de itens acumulativos** de cada usuário, em vez da simples contagem de entradas únicas, exigindo consultas otimizadas no banco de dados.
*   **Interface Interativa:** [Descreva brevemente como o usuário interage, ex: Painel web para visualização do progresso].

## 🛠️ Arquitetura e Tecnologias
*   **Back-end:** [Inserir a linguagem/framework, ex: Python/FastAPI, Node.js, C#]
*   **Banco de Dados:** SQL (Utilização extensiva de *Views* para processar lógicas de agregação complexas e alimentar o motor de ranking com performance).
*   **Cloud e Deploy:** Infraestrutura hospedada e gerenciada no **Azure**, com processos de deploy e versionamento estruturados para garantir alta disponibilidade.

## 🧠 Desafios Técnicos e Soluções
1.  **Lógica do Ranking Cumulativo:** O maior desafio no banco de dados foi estruturar as *Views* em SQL para que a pontuação refletisse a soma real de itens acumulados no histórico do usuário. Isso evitou bugs de contagem de itens únicos e garantiu que o sistema de engajamento fosse justo e preciso.
2.  **Deploy e Estabilidade:** Toda a arquitetura no Azure foi desenhada prevendo um ciclo de vida longo para a aplicação. A configuração do ambiente em nuvem garante que o servidor e o banco de dados suportem o tráfego contínuo sem gargalos de performance.

## 🚀 Como Executar o Projeto Localmente
*(Caso o projeto seja privado ou dependa de chaves específicas, você pode adaptar esta seção)*

1. Clone este repositório:
   `git clone https://github.com/BrunaStefany/Album_Copa_Nestle_Brasil.git`
2. Instale as dependências:
   `[comando de instalação, ex: npm install ou pip install -r requirements.txt]`
3. Configure as variáveis de ambiente (Crie um arquivo `.env` baseado no `.env.example`).
4. Inicie o servidor:
   `[comando para rodar, ex: npm start ou uvicorn main:app --reload]`

---
**Desenvolvido por [Bruna Stefany](https://github.com/BrunaStefany) - Software Engineer**
