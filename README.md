<div align="center">

<img src="assets/logo.svg" alt="Atheneum — a coruja de Atena" width="96">

# Atheneum

**Um jornal da sua vida em livros.**

Uma biblioteca pessoal para organizar histórias, guardar ideias<br>
e acompanhar cada capítulo da sua jornada de leitura.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Módulos ES](https://img.shields.io/badge/m%C3%B3dulos-ES-8a3a4a?style=flat-square)
![Dados locais](https://img.shields.io/badge/dados-no_navegador-c9a85c?style=flat-square)

[Conheça o Atheneum](https://atheneum-julio.julioandre754.chatgpt.site/)

<sub>A versão hospedada pode solicitar autenticação: seu acesso atual é privado.</sub>

</div>

---

## 📜 Sobre o projeto

O **Atheneum** nasceu de uma lista de livros mantida no Obsidian e evoluiu para uma biblioteca pessoal com organização, registro de leitura e acompanhamento de metas.

Sua identidade visual remete a um jornal antigo: papel em tons envelhecidos, títulos marcantes, colunas editoriais, gravuras, selos e fitas. Cada seção funciona como um caderno da mesma edição, conectando o acervo às leituras e às conquistas do leitor.

A coleção inicial reúne **137 livros**, distribuídos entre **Clássicos (59)**, **Ficção (25)** e **Carreira (53)**. Esse acervo é um ponto de partida: a interface permite cadastrar livros, editar suas fichas e criar novas formas de organização.

## 🗞️ Os cinco cadernos

| Caderno | O que você encontra |
| --- | --- |
| **Início** | Apresentação editorial, citações, atalhos para a coleção, seleção de livros e carrossel infinito. |
| **Biblioteca** | Acervo completo, busca, filtros, listas, tags e três modos de visualização. |
| **Sala de leitura** | Progresso por página, cronômetro, sessões de leitura e acesso ao leitor de PDF quando seus arquivos de suporte estão presentes. |
| **Descobrir** | Curadoria de livros e busca bibliográfica na Open Library para ajudar a ampliar a coleção. |
| **Santuário** | Estatísticas, calendário de sessões, conquistas, níveis e metas de leitura. |

## ✨ Funcionalidades

### Sua coleção, do seu jeito

- Cadastro e edição de livros, com título, autor, ISBN, gênero, capa e informações da edição.
- Visualizações em **estante, grade e lista**.
- Busca por título, autor ou ISBN, combinada com filtros por situação de leitura, gênero, lista e tag.
- Listas personalizadas para agrupar autores, assuntos e seleções do leitor.
- **Tags com nome e cor editáveis**, exibidas junto aos livros e disponíveis como filtro.
- Avaliações de uma a cinco estrelas e capas tipográficas para livros sem imagem.
- Remoção recuperável: livros podem ser restaurados pela área de removidos.

### Um diário para cada leitura

- Situações **Quero ler**, **Lendo** e **Lido**.
- Registro da página atual e do total de páginas.
- Sessões com páginas lidas e duração, com cronômetro opcional.
- Histórico de sessões com correção e exclusão de registros.
- Anotações associadas a páginas, disponíveis na ficha do livro.
- Suporte a PDFs pessoais, armazenados no navegador, com navegação por página e download do original. O leitor depende do PDF.js local.

### Metas e memória da jornada

- Metas mensais de **livros concluídos, páginas e minutos de leitura**.
- Consulta de meses anteriores e possibilidade de pausar uma meta.
- Metas anuais, calendário de sessões e indicadores de progresso.
- Selos de conquistas, experiência, níveis e histórico de recompensas.

### A experiência de um jornal

- Folha de jornal com dobras animadas: desce para cobrir a seção e sobe para revelar a próxima.
- Entrada gradual de títulos, textos, cards e elementos editoriais.
- Carrossel infinito na primeira página, com controle para pausar e retomar.
- Resposta visual ao pressionar botões e links.
- Layout adaptável a computador e celular, navegação por teclado e foco visível.
- Página 404 com a mesma identidade visual do site.

## 💾 Dados e backups

O Atheneum funciona como uma aplicação estática. **A biblioteca pessoal é salva no navegador utilizado**, sem um servidor de contas ou sincronização automática entre dispositivos.

| Armazenamento | Conteúdo |
| --- | --- |
| **localStorage** | Livros, listas, tags, anotações, sessões, metas, conquistas e preferências. |
| **IndexedDB** | Arquivos PDF anexados aos livros. |
| **Backup JSON** | Exportação e importação dos dados; a exportação completa também pode incluir os PDFs. |

Use **Preferências e backup** para exportar sua biblioteca antes de limpar os dados do navegador ou mudar de dispositivo. O armazenamento também depende do endereço de acesso: abrir o site em outro domínio ou porta não transfere os dados automaticamente.

A consulta à Open Library e o carregamento de imagens externas precisam de internet. Os PDFs anexados são tratados localmente; não são enviados pela aplicação para um servidor de armazenamento.

## 🛡️ Cuidados implementados

- Validação de formato, assinatura e tamanho dos arquivos selecionados.
- Capas em **PNG, JPEG ou WebP**, com limite de **2 MiB**, decodificadas e reprocessadas antes de serem salvas. SVG não é aceito como upload de capa.
- PDFs com limite de **25 MiB** e validações antes de abrir no leitor.
- Validação da estrutura de backups, das referências entre registros e de propriedades perigosas.
- Escape de textos inseridos na interface e política de segurança de conteúdo definida no HTML.
- No leitor interno, PDFs são renderizados em canvas; scripts, formulários e links internos do documento não são ativados.

Esses controles são parte da implementação atual e devem ser preservados ao modificar os formulários, o armazenamento ou o tratamento de arquivos.

## 🚀 Executar localmente

O projeto usa **HTML, CSS e JavaScript com módulos ES nativos**, sem framework e sem etapa de compilação. Para executá-lo, sirva a pasta por **HTTP**: abrir `index.html` diretamente pelo explorador de arquivos pode impedir o carregamento dos módulos e da coleção.

### Com Python 3

Abra um terminal na pasta que contém `index.html` e execute:

```bash
python -m http.server 4173 --bind 127.0.0.1
```

Acesse **http://127.0.0.1:4173/** e mantenha o terminal aberto durante o uso. Se o Python estiver disponível pelo comando `python3`, substitua `python` por `python3`.

### Com um servidor estático no editor

Também é possível abrir a pasta em um editor e usar uma extensão de servidor estático, como o Live Server. Sirva a raiz da versão atual, onde estão `index.html`, `app.js`, `styles/` e `lib/`.

O `INICIAR.cmd` remanescente da estrutura anterior depende de arquivos da pasta `.dev`. Como essa pasta foi removida desta cópia, esse atalho precisa ser ajustado antes de voltar a ser usado.

## 🗺️ Estrutura atual

```text
Atheneum/
├── index.html                  Estrutura principal e entrada da aplicação
├── 404.html                    Página de erro para hospedagem estática
├── app.js                      Navegação, inicialização e integração dos módulos
├── store.js                    Estado, persistência, validações e regras da biblioteca
├── styles.css                  Entrada dos estilos
├── styles/                     Estilos separados por página e componente
├── pages/                      Início, biblioteca, descoberta, santuário e erro
├── lib/
│   ├── actions.js              Eventos e ações da interface
│   ├── collection.js           Importação da coleção inicial
│   ├── catalog.js              Curadoria e citações
│   ├── dialogs.js              Formulários e diálogos
│   ├── reader.js               Leitor, sessões e cronômetro
│   ├── uploads.js              Validação e preparação dos arquivos
│   ├── tags.js                 Componentes e formulários de tags
│   ├── goals.js                Formulários e navegação das metas mensais
│   ├── motion.js               Ciclo de vida das animações
│   ├── motion/paper.js         Geometria e movimento da folha de jornal
│   ├── page-renderer.js        Renderização e preservação de foco e formulários
│   ├── feedback.js             Mensagens e tratamento de erros na interface
│   └── ui.js                   Componentes e funções compartilhadas
├── data/
│   └── personal-library.json   Coleção inicial transcrita do Obsidian
├── assets/
│   ├── logo.svg                Identidade do Atheneum
│   ├── library-engraving.png   Gravura da primeira página
│   └── covers/                 Capas ilustrativas locais
├── old version/                Arquivo histórico, sem participação na aplicação atual
├── INICIAR.cmd                 Atalho legado de inicialização
└── README.md                   Apresentação e orientações do projeto
```

### Recursos ausentes nesta cópia

As pastas abaixo foram removidas da versão local, mas continuam referenciadas pelo código:

| Recurso | Arquivos esperados | Efeito da ausência |
| --- | --- | --- |
| **PDF.js** | `assets/pdfjs/pdf.mjs` e `assets/pdfjs/pdf.worker.mjs`, com os recursos necessários da mesma distribuição | O leitor interno não consegue abrir PDFs. O registro de leituras físicas permanece disponível. |
| **Fontes locais** | `assets/fonts/bodoni-moda-900-latin.woff2`, `instrument-serif-latin.woff2` e `dm-sans-latin.woff2` | O navegador usa fontes substitutas, alterando a tipografia e possivelmente o layout. |

Para distribuir a experiência completa, restaure esses recursos com suas licenças e avisos de origem. O CSS das fontes está em `styles/fonts.css`; o carregamento do PDF.js está em `lib/reader.js`.

## 🎨 Personalizar

**Livros e organização:** prefira os formulários da biblioteca para cadastrar obras, editar capas, criar listas e gerenciar tags. As alterações ficam na biblioteca daquele navegador.

**Coleção inicial do repositório:** edite `data/personal-library.json` em conjunto com `lib/collection.js`. A importação valida o identificador da coleção e a quantidade de livros; o número total, os resumos por caderno e o identificador da edição precisam acompanhar a nova coleção. Coleções já importadas não são reaplicadas automaticamente a cada visita.

**Identidade visual:** cores, tipografia e regras gerais ficam em `styles/base.css` e nos demais arquivos de `styles/`. A marca e a gravura ficam em `assets/`; as citações e a curadoria, em `lib/catalog.js`.

**Animações:** o comportamento geral está em `lib/motion.js`, a folha em `lib/motion/paper.js` e os estilos em `styles/motion.css`. As animações usam Web Animations API e CSS, sem seletor de intensidade na interface.

## 🌐 Hospedagem

Publique os arquivos da aplicação em uma hospedagem estática com HTTPS, mantendo os caminhos relativos. Nesta estrutura, `index.html` fica na raiz da publicação. Configure `404.html` como a página de erro do serviço.

As seções usam navegação por fragmentos, como `#biblioteca` e `#santuario`. Não há etapa de build. A pasta `old version/` é apenas histórica e pode ficar fora da publicação.

Mantenha o mesmo endereço ao atualizar o site para que o navegador continue encontrando a biblioteca já salva.

## 🤝 Contribuir

Sugestões de leitura, melhorias de interface e correções são bem-vindas.

1. Abra uma Issue descrevendo a ideia ou o problema, com os passos para reproduzi-lo.
2. Para alterações no código, crie uma branch no seu fork.
3. Verifique a navegação, os filtros e o funcionamento em telas pequenas.
4. Se alterar o armazenamento, confirme a preservação dos dados e a exportação e importação de backups.
5. Abra um Pull Request explicando a mudança e como ela foi verificada.

## 📄 Créditos e licença

- **Criação e desenvolvimento:** Julio André Cimarosti.
- **Coleção inicial:** lista pessoal mantida no Obsidian, organizada em Clássicos, Ficção e Carreira.
- **Identidade visual:** composição editorial inspirada em jornais antigos e bibliotecas clássicas; marca com a coruja de Atena.
- **Gravura da biblioteca:** imagem criada com auxílio de IA para o projeto.
- **Busca bibliográfica:** Open Library.
- **Leitor de PDF:** PDF.js, quando incluído na distribuição.
- **Tipografia prevista:** Bodoni Moda, Instrument Serif e DM Sans.

O README anterior indicava licença MIT para o código. Esta cópia ainda não contém o arquivo `LICENSE`; ele deve acompanhar o repositório para formalizar essa indicação. Bibliotecas, fontes e imagens de terceiros mantêm suas próprias licenças e créditos.

---

<div align="center">

**Julio André Cimarosti** · [@japcodex](https://github.com/japcodex)

[LinkedIn](https://www.linkedin.com/in/julioandrecimarosti/) · [Behance](https://www.behance.net/julioandre7) · [Instagram](https://www.instagram.com/julio_a_/)

**Sua coleção. Suas ideias. Sua próxima página.**

</div>
