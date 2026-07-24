# 🏆 Álbum de Figurinhas Digital - Plataforma Gamificada

## 💻 Sobre o Projeto
Uma aplicação web gamificada desenvolvida para promover engajamento corporativo na Nestlé Brasil, através da simulação de um álbum de figurinhas. O projeto foi arquitetado para suportar acesso contínuo e estável a longo prazo (com infraestrutura projetada para operar até dezembro de 2026), oferecendo uma experiência interativa e competitiva para os usuários.

O foco principal do desenvolvimento foi a construção de um back-end robusto e uma modelagem de banco de dados eficiente para lidar com regras de negócio específicas e sistemas de pontuação dinâmica.

## ⚙️ Principais Funcionalidades

* **Coleção e Gerenciamento:** Infraestrutura dividida com acessos específicos para Usuários e Administradores. É orquestrado um sistema para os usuários abrirem "pacotes", colecionarem itens e gerenciarem seu inventário digital. Os Administradores conseguem validar as missões de suas respectivas áreas.

**Visão Admin:**

<img width="831" height="473" alt="image" src="https://github.com/user-attachments/assets/a0a2bf98-3983-4f69-a387-761199407e40"/>

**Visão User:**

<img width="1432" height="934" alt="image" src="https://github.com/user-attachments/assets/22c15330-4669-4587-b035-17099db2756c" />

---

* **Motor de Gamificação e Ranking Customizado:** Implementação de um placar de líderes (Leaderboard). A regra de negócio principal do ranking foi desenvolvida para calcular o total de figurinhas cumulativas de cada usuário, em vez da simples contagem de entradas únicas, exigindo consultas otimizadas no banco de dados. Essa lógica engaja o usuário a realizar as missões e conquistar mais figurinhas para, consequentemente, subir no ranking.

<img width="789" height="480" alt="image" src="https://github.com/user-attachments/assets/305598b8-98ba-490b-a56d-384fe0b4b4da" />

---

* **Interface Interativa e Fluxo de Missões:** 

**Login/Cadastro:** O usuário pode realizar um novo cadastro ou fazer login na plataforma.

<img width="1904" height="954" alt="image" src="https://github.com/user-attachments/assets/22825920-9888-4164-afee-ff274d156ad4" />

<img width="1906" height="960" alt="image" src="https://github.com/user-attachments/assets/4a7a29da-cc73-40ef-bbc5-a1ac69ad22fe" />

**Área de Missões:** Painel onde o usuário realiza os desafios das áreas de negócio.

<img width="877" height="464" alt="image" src="https://github.com/user-attachments/assets/b87c7b87-f05a-4548-8213-e757cf53dc2a" />

**Notificações:** Toda aprovação de missão é sinalizada dinamicamente na aba de avisos do usuário.

<img width="245" height="309" alt="image" src="https://github.com/user-attachments/assets/6fd524b4-233c-4c25-90e6-ba4166895211" />

**Loja:** Com o valor recebido da aprovação do ADM, ele compra os pacote, que são dividos em padrão e especial

<img width="1622" height="888" alt="image" src="https://github.com/user-attachments/assets/bace7682-7a51-4d05-8a3a-43fc3b6835c9" />

**Álbum:** Nesse album dividimos por plantas, e a lógica da figurinha é diminuir a porcentagem , dificultando em sair as especial como mais frequência

<img width="704" height="464" alt="image" src="https://github.com/user-attachments/assets/e1f54bcc-dc3a-4832-b6db-c3f9337a8ebb" />

**Trocas**: A dinamica é de igual para igual, troca de padrão para padrão e especial para especial, tudo e todos os fluxos são sinalizado na aba de avisos

<img width="694" height="471" alt="image" src="https://github.com/user-attachments/assets/e3b6c9a5-e5ee-468f-9c23-058a0a01ad84" />


## 🛠️ Arquitetura e Tecnologias
 **Back-end:** [ javascrpit,Node.js,RestClient]
 **Banco de Dados**: AZURE (SQLSever) (Utilização extensiva de Views para processar lógicas de agregação complexas e alimentar o motor de ranking com performance).
 **Cloud e Deploy:** Infraestrutura hospedada e gerenciada no **Azure**, com processos de deploy e versionamento estruturados para garantir alta disponibilidade.

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
   <img width="1432" height="934" alt="image" src="https://github.com/user-attachments/assets/29a9bf06-6a79-48bc-a075-1b6056343047" />


---
**Desenvolvido por [Bruna Stefany](https://github.com/BrunaStefany) - Software Engineer**
