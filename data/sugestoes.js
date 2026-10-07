/* ==========================================================================
   SUGESTÕES  (livros para descobrir, escolhidos à mão)

   Aparecem na aba Descobrir e na sugestão do dia da tela inicial. Nenhum deles
   precisa estar na sua estante: quem já tem o título é filtrado sozinho.
   Para acrescentar, copie uma linha. "categoria" é a seção em que o livro
   entra se você clicar em "Guardar para ler".
   ========================================================================== */
const GENEROS_SUGESTOES = ["Ficção científica", "Fantasia", "Brasileiros", "Poesia", "Filosofia e ensaio", "Terror e mistério", "Ciência e história", "Ofício", "Quadrinhos"];

const SUGESTOES = [
  { id: "duna", titulo: "Duna", autor: "Frank Herbert", genero: "Ficção científica", categoria: "ficcao", motivo: "Deserto, especiaria e política numa saga só. Prova que ficção científica também é sobre poder." },
  { id: "fahrenheit-451", titulo: "Fahrenheit 451", autor: "Ray Bradbury", genero: "Ficção científica", categoria: "ficcao", motivo: "Bombeiros que queimam livros. Curto, direto e feito para quem gosta de estante." },
  { id: "neuromancer", titulo: "Neuromancer", autor: "William Gibson", genero: "Ficção científica", categoria: "ficcao", motivo: "O livro que deu forma ao cyberpunk. Denso, cheio de neon e de linguagem inventada." },
  { id: "a-mao-esquerda-da-escuridao", titulo: "A Mão Esquerda da Escuridão", autor: "Ursula K. Le Guin", genero: "Ficção científica", categoria: "ficcao", motivo: "Um enviado visita um planeta onde o gênero das pessoas funciona diferente. Ficção científica que fala de gente." },
  { id: "o-guia-do-mochileiro-das-galaxias", titulo: "O Guia do Mochileiro das Galáxias", autor: "Douglas Adams", genero: "Ficção científica", categoria: "ficcao", motivo: "Humor absurdo no espaço. Bom para quando o resto da pilha pesou." },
  { id: "solaris", titulo: "Solaris", autor: "Stanisław Lem", genero: "Ficção científica", categoria: "ficcao", motivo: "Um oceano que pensa e uma estação espacial. Pergunta o que significa entender o que é estranho." },
  { id: "fundacao", titulo: "Fundação", autor: "Isaac Asimov", genero: "Ficção científica", categoria: "ficcao", motivo: "Um império em queda e uma ciência que prevê o futuro. Ideias grandes em capítulos curtos." },

  { id: "um-mago-de-terramar", titulo: "Um Mago de Terramar", autor: "Ursula K. Le Guin", genero: "Fantasia", categoria: "ficcao", motivo: "Um jovem mago descobre que dar nome às coisas tem custo. Fantasia sóbria e bonita." },
  { id: "a-princesa-prometida", titulo: "A Princesa Prometida", autor: "William Goldman", genero: "Fantasia", categoria: "ficcao", motivo: "Aventura, romance e piada no mesmo parágrafo. Leitura leve e esperta." },
  { id: "o-nome-do-vento", titulo: "O Nome do Vento", autor: "Patrick Rothfuss", genero: "Fantasia", categoria: "ficcao", motivo: "Um homem conta a própria vida ao longo de três dias. Para quem gosta de mundo construído com calma." },
  { id: "deuses-americanos", titulo: "Deuses Americanos", autor: "Neil Gaiman", genero: "Fantasia", categoria: "ficcao", motivo: "Deuses antigos disputam espaço com os novos nos Estados Unidos. Estrada, mitologia e estranheza." },

  { id: "dom-casmurro", titulo: "Dom Casmurro", autor: "Machado de Assis", genero: "Brasileiros", categoria: "classicos", motivo: "Bentinho garante que foi traído. Você decide se acredita nele." },
  { id: "memorias-postumas-de-bras-cubas", titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", genero: "Brasileiros", categoria: "classicos", motivo: "Narrado por um defunto, com humor ácido. Um dos livros mais divertidos do século XIX." },
  { id: "grande-sertao-veredas", titulo: "Grande Sertão: Veredas", autor: "João Guimarães Rosa", genero: "Brasileiros", categoria: "classicos", motivo: "Um jagunço conta sua vida num português inventado. Pede paciência e devolve muito." },
  { id: "vidas-secas", titulo: "Vidas Secas", autor: "Graciliano Ramos", genero: "Brasileiros", categoria: "classicos", motivo: "Uma família sertaneja em capítulos curtos. Seco, direto e difícil de esquecer." },
  { id: "torto-arado", titulo: "Torto Arado", autor: "Itamar Vieira Junior", genero: "Brasileiros", categoria: "ficcao", motivo: "Duas irmãs, uma fazenda na Bahia e a disputa pela terra. Romance brasileiro recente." },

  { id: "a-rosa-do-povo", titulo: "A Rosa do Povo", autor: "Carlos Drummond de Andrade", genero: "Poesia", categoria: "classicos", motivo: "Poemas escritos durante a Segunda Guerra. Bom ponto de entrada na poesia brasileira." },
  { id: "cartas-a-um-jovem-poeta", titulo: "Cartas a um Jovem Poeta", autor: "Rainer Maria Rilke", genero: "Poesia", categoria: "classicos", motivo: "Dez cartas sobre escrever e viver. Dá para ler numa tarde." },

  { id: "ensaios-montaigne", titulo: "Ensaios", autor: "Michel de Montaigne", genero: "Filosofia e ensaio", categoria: "classicos", motivo: "Um homem pensando sobre amizade, medo e canibais, sem pressa. Abra em qualquer capítulo." },
  { id: "sobre-a-brevidade-da-vida", titulo: "Sobre a Brevidade da Vida", autor: "Sêneca", genero: "Filosofia e ensaio", categoria: "classicos", motivo: "Uma carta curta sobre como gastamos o tempo. Cabe numa viagem de ônibus." },
  { id: "em-busca-de-sentido", titulo: "Em Busca de Sentido", autor: "Viktor Frankl", genero: "Filosofia e ensaio", categoria: "classicos", motivo: "Um psiquiatra conta o que aprendeu em campos de concentração. Pesado e muito citado." },
  { id: "o-mundo-de-sofia", titulo: "O Mundo de Sofia", autor: "Jostein Gaarder", genero: "Filosofia e ensaio", categoria: "classicos", motivo: "Romance que ensina a história da filosofia. Boa porta de entrada." },

  { id: "frankenstein", titulo: "Frankenstein", autor: "Mary Shelley", genero: "Terror e mistério", categoria: "classicos", motivo: "A criatura é mais interessante do que o cientista. O livro é bem diferente dos filmes." },
  { id: "dracula", titulo: "Drácula", autor: "Bram Stoker", genero: "Terror e mistério", categoria: "classicos", motivo: "Contado em cartas e diários. Terror de 1897 que ainda funciona." },
  { id: "assassinato-no-expresso-do-oriente", titulo: "Assassinato no Expresso do Oriente", autor: "Agatha Christie", genero: "Terror e mistério", categoria: "ficcao", motivo: "Um crime num trem parado pela neve. Mistério clássico, rápido de ler." },

  { id: "cosmos", titulo: "Cosmos", autor: "Carl Sagan", genero: "Ciência e história", categoria: "classicos", motivo: "A história do universo contada por quem queria que você se encantasse com ela." },
  { id: "o-gene-egoista", titulo: "O Gene Egoísta", autor: "Richard Dawkins", genero: "Ciência e história", categoria: "classicos", motivo: "Evolução vista do ponto de vista do gene. Ideia simples, consequências grandes." },
  { id: "uma-breve-historia-do-tempo", titulo: "Uma Breve História do Tempo", autor: "Stephen Hawking", genero: "Ciência e história", categoria: "classicos", motivo: "Buracos negros e origem do universo, sem equações no caminho." },
  { id: "armas-germes-e-aco", titulo: "Armas, Germes e Aço", autor: "Jared Diamond", genero: "Ciência e história", categoria: "classicos", motivo: "Por que algumas sociedades dominaram outras? Uma resposta longa e discutida." },
  { id: "o-queijo-e-os-vermes", titulo: "O Queijo e os Vermes", autor: "Carlo Ginzburg", genero: "Ciência e história", categoria: "classicos", motivo: "A vida de um moleiro do século XVI julgado pela Inquisição. História contada por quem não escrevia." },

  { id: "nao-me-faca-pensar", titulo: "Não Me Faça Pensar", autor: "Steve Krug", genero: "Ofício", categoria: "carreira", motivo: "Usabilidade em linguagem simples. Dá para ler num fim de semana e rever todo site que você faz." },
  { id: "o-mitico-homem-mes", titulo: "O Mítico Homem-Mês", autor: "Frederick P. Brooks Jr.", genero: "Ofício", categoria: "carreira", motivo: "Ensaios sobre por que projetos de software atrasam. Dos anos 70 e ainda atual." },
  { id: "elementos-do-estilo-tipografico", titulo: "Elementos do Estilo Tipográfico", autor: "Robert Bringhurst", genero: "Ofício", categoria: "carreira", motivo: "O manual de quem escolhe fontes e margens. Útil para qualquer pessoa que monta páginas." },
  { id: "refatoracao", titulo: "Refatoração", autor: "Martin Fowler", genero: "Ofício", categoria: "carreira", motivo: "Como melhorar código sem quebrar o que funciona. Catálogo para consultar sempre." },
  { id: "peopleware", titulo: "Peopleware", autor: "Tom DeMarco e Timothy Lister", genero: "Ofício", categoria: "carreira", motivo: "Equipes pesam mais do que ferramentas. Curto e direto." },

  { id: "maus", titulo: "Maus", autor: "Art Spiegelman", genero: "Quadrinhos", categoria: "ficcao", motivo: "O pai do autor conta o Holocausto, desenhado com ratos e gatos. Um quadrinho que muda quem lê." },
  { id: "persepolis", titulo: "Persépolis", autor: "Marjane Satrapi", genero: "Quadrinhos", categoria: "ficcao", motivo: "Infância e adolescência no Irã da revolução, em preto e branco. Ótimo para quem nunca leu HQ." },
  { id: "watchmen", titulo: "Watchmen", autor: "Alan Moore e Dave Gibbons", genero: "Quadrinhos", categoria: "ficcao", motivo: "Super-heróis num mundo que não precisa deles. Construído como poucos quadrinhos." },
];
