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

## 🎨 Personalizar

**Livros e organização:** prefira os formulários da biblioteca para cadastrar obras, editar capas, criar listas e gerenciar tags. As alterações ficam na biblioteca daquele navegador.

**Coleção inicial do repositório:** edite `data/personal-library.json` em conjunto com `lib/collection.js`. A importação valida o identificador da coleção e a quantidade de livros; o número total, os resumos por caderno e o identificador da edição precisam acompanhar a nova coleção. Coleções já importadas não são reaplicadas automaticamente a cada visita.

**Identidade visual:** cores, tipografia e regras gerais ficam em `styles/base.css` e nos demais arquivos de `styles/`. A marca e a gravura ficam em `assets/`; as citações e a curadoria, em `lib/catalog.js`.

**Animações:** o comportamento geral está em `lib/motion.js`, a folha em `lib/motion/paper.js` e os estilos em `styles/motion.css`. As animações usam Web Animations API e CSS, sem seletor de intensidade na interface.

---

<div align="center">

**Julio André Cimarosti** · [@japcodex](https://github.com/japcodex)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/julioandrecimarosti/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/japcodex)
[![Behance](https://img.shields.io/badge/Behance-1769FF?style=for-the-badge&logo=behance&logoColor=white)](https://www.behance.net/julioandre7)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/julio_a_/)

**Sua coleção. Suas ideias. Sua próxima página.**

</div>

---

