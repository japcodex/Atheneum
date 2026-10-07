<div align="center">

<img src="img/logo/logo.svg" alt="Logo do Atheneum: a coruja de Atena" width="96">

# Atheneum

**A biblioteca de um leitor, guardada sob o olhar de Atena.**

Uma estante digital com clássicos, ficção e livros de ofício.<br>
Feita com HTML, CSS e JavaScript puro, sem instalar nada.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-zero-c9a85c?style=flat-square)
![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-4d8a78?style=flat-square)
![Código aberto](https://img.shields.io/badge/c%C3%B3digo-aberto-8a3a4a?style=flat-square)
<br>

</div>

---

## 📜 Sobre o projeto

O **Atheneum** é a minha coleção de livros, organizada em uma biblioteca que dá gosto de visitar. A ideia é entrar no site e sentir que está num daqueles salões clássicos, cheios de colunas, estátuas e estantes até o teto.

Ele nasceu de uma lista que eu mantenho no Obsidian. Em vez de deixá-la guardada em um arquivo de texto, transformei tudo num site com busca, categorias, capas e prateleiras por autor, e agora ele mostra **+130 livros** em três seções: **Clássicos**, **Ficção** e **Carreira**.

### 🏛️ Código aberto, para cada um fazer a sua

Este projeto é **completamente aberto**. Ele é a minha coleção, mas o código é de todos:

- Você pode **copiar, modificar e usar** para a sua própria biblioteca.
- Pode trocar os livros, as cores, a foto, o logo, o nome e o que mais quiser.
- Pode publicar o seu e compartilhar com amigos.
---

## ✨ Funcionalidades

| | Recurso | Detalhes |
|---|---|---|
| 🔎 | **Busca** | Procura em título, autor, prateleira e descrição. Ignora acentos (`edipo` acha `Édipo`). Atalho: tecle `/`. |
| 🗂️ | **Categorias** | Abas no topo com a contagem de livros de cada uma. |
| 📚 | **Prateleiras** | Dentro de cada categoria, os livros se agrupam por autor ou tema, e você pode filtrar por uma prateleira só. |
| 🖼️ | **Dois modos de exibição** | **Capas** (vitrine de livraria) e **Estante** (lombadas sobre um friso de mármore). |
| 🏷️ | **Situação do livro** | Filtro por *Lido*, *Lendo* e *Quero ler*. |
| ↕️ | **Ordenação** | Ordem da estante, título (A a Z), autor (A a Z) ou maior nota. |
| 🔖 | **Detalhes do livro** | Ao clicar, abre uma janela com capa, autor, prateleira, situação, nota, descrição e link. |
| 🖌️ | **Capas automáticas** | Sem imagem, o site desenha uma capa com título e autor. Com imagem, basta salvar o arquivo com o nome certo. |
| 💬 | **Frases inspiradoras** | Uma frase diferente a cada visita (Cícero, Borges, Sêneca...), com botão "Outra frase". |
| 📱 | **Responsivo** | Funciona em computador, tablet e celular. |
| ♿ | **Acessível** | Navegação por teclado, foco visível, textos para leitores de tela e respeito a quem prefere menos animação. |

---

## 🚀 Rodar no seu computador

Não precisa instalar nada, não tem `npm install`, não tem servidor.

### Opção 1: dois cliques (mais simples)

1. Baixe o projeto: no GitHub, clique em **Code > Download ZIP** e extraia a pasta.
2. Abra a pasta `Atheneum`.
3. Dê dois cliques em **`index.html`**. Pronto, ele abre no navegador.

> As fontes (Cormorant Garamond e Jost) vêm do Google Fonts, então precisam de internet. Sem internet o site funciona do mesmo jeito, só com fontes parecidas do sistema.

### Opção 2: clonar com o Git

```bash
git clone https://github.com/SEU-USUARIO/atheneum.git
cd atheneum
```

Depois abra o `index.html` no navegador.

### Opção 3: servidor local (recomendado para editar)

Um servidor local atualiza a página sozinho enquanto você edita. Escolha um:

**VS Code + Live Server** (o mais fácil)
1. Instale o [VS Code] e a extensão **Live Server**.
2. Abra a pasta do projeto no VS Code.
3. Clique com o botão direito em `index.html` e escolha **Open with Live Server**.
---

## 🗺️ Como o projeto está organizado

```
Atheneum/
│
├── index.html                A página. Reúne todas as outras peças.
│
├── css/                      COMO O SITE PARECE
│   ├── base.css              Cores, fontes e medidas (comece por aqui!)
│   ├── layout.css            Estrutura: barra do topo, foto, seções, rodapé
│   └── livros.css            Capas, lombadas, prateleiras e janela de detalhes
│
├── js/                       COMO O SITE FUNCIONA
│   ├── utils.js              Ferramentas pequenas de apoio
│   ├── filtros.js            Busca, categoria, situação e ordenação
│   ├── desenho.js            Transforma a lista de livros em capas na tela
│   ├── detalhes.js           A janela que abre ao clicar num livro
│   ├── citacao.js            A frase do topo
│   └── principal.js          O "cérebro": guarda as escolhas e reage aos cliques
│
├── data/                     O CONTEÚDO
│   ├── livros.js             Todos os livros e categorias (o arquivo que você mais edita)
│   └── frases.js             As frases inspiradoras
│
├── img/                      AS IMAGENS
│   ├── logo/                 logo.svg e favicon.svg
│   ├── fundo/                A foto do Panteão
│   └── capas/                Capas dos livros (veja LISTA-DE-NOMES.txt)
│
├── obsidian/Biblioteca.md    A lista original, escrita no Obsidian
├── scripts/                  Importador opcional do Obsidian
├── docs/img/                 Imagens usadas neste README
└── LICENSE                   Licença MIT
```

## 🎨 Personalizar o Atheneum

**O que significa cada campo:**

| Campo | O que é | Exemplo |
|---|---|---|
| `id` | Nome único do livro, sem espaços nem acentos. Também é o nome do arquivo da capa. | `"o-hobbit"` |
| `titulo` | Título que aparece na tela | `"O Hobbit"` |
| `autor` | Nome do autor. Deixe `""` se não souber. | `"J.R.R. Tolkien"` |
| `categoria` | O `id` de uma categoria (veja abaixo) | `"ficcao"` |
| `grupo` | A prateleira onde o livro fica: um autor ou um tema | `"J.R.R. Tolkien"` |
| `capa` | Endereço da imagem da capa. Vazio usa `img/capas/<id>.jpg`. | `""` |
| `nota` | De `0` a `5`. Zero significa sem nota. | `5` |
| `status` | `"lido"`, `"lendo"` ou `"quero-ler"` | `"lido"` |
| `descricao` | Resumo ou opinião, mostrada ao clicar no livro | `"Uma aventura..."` |
| `link` | Endereço para comprar ou saber mais (opcional) | `"https://..."` |

### Colocar a capa de um livro

**Jeito fácil:** salve a imagem em `img/capas/` com o **mesmo nome do `id`** do livro. Exemplo: para *Crime e Castigo*, salve `img/capas/crime-e-castigo.jpg`. O site encontra sozinho.

A lista com o nome exato de todos os livros está em [`img/capas/LISTA-DE-NOMES.txt`](img/capas/LISTA-DE-NOMES.txt).

**Outro jeito:** preencha o campo `capa` do livro com o caminho ou endereço da imagem:

```js
"capa":"img/capas/minha-capa.png"
"capa":"https://exemplo.com/capa.jpg"
```

Quando a imagem não existe ou não carrega, o Atheneum mostra a capa desenhada. Nada quebra.

> 💡 Prefira imagens de até 200 KB, na proporção de livro (2:3), para a página carregar rápido.


## 📚 Montar a sua própria biblioteca

Quer usar o Atheneum para os **seus** livros? O caminho é este:

1. **Copie o projeto** (Fork, Use this template ou Download ZIP).
2. **Limpe os livros.** Em `data/livros.js`, apague todas as linhas dentro de `LIVROS` e deixe a lista vazia (`const LIVROS = [ ];`).
3. **Defina as suas categorias** na lista `CATEGORIAS`.
4. **Adicione os seus livros**, um por linha, como mostrado acima.
5. **Troque a identidade:** nome, logo, foto e frases.

> O site precisa de pelo menos uma categoria e um livro para ficar completo. Com a lista vazia ele mostra a mensagem "Nenhum livro encontrado".

---

## 🤝 Contribuindo

Sugestões, ideias e melhorias são bem-vindas:

1. Faça um **fork** do projeto.
2. Crie uma branch: `git checkout -b minha-melhoria`.
3. Faça suas mudanças e um commit: `git commit -m "Adiciona minha melhoria"`.
4. Envie: `git push origin minha-melhoria`.
5. Abra um **Pull Request** explicando o que mudou.

Se encontrou um erro ou tem uma ideia, abra uma **Issue**.

---

## 📄 Licença e créditos

- **Código:** [MIT](LICENSE). Use, copie e modifique à vontade, mantendo o aviso de licença.
- **Foto do Panteão:** Oliver NT, via [Pexels](https://www.pexels.com), sob a licença do Pexels. Ela não faz parte da licença MIT; se você trocar a foto, lembre de atualizar o crédito no rodapé.
- **Fontes:** [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) e [Jost](https://fonts.google.com/specimen/Jost), do Google Fonts, sob a licença SIL Open Font.
- **Livros, títulos e capas:** pertencem aos seus autores e editoras. Se você usar capas reais, confira os direitos de uso.
- **Frases:** de domínio público ou de autores citados com atribuição.

<div align="center">

<br>

<div align="center">

**Julio André Cimarosti** · [@japcodex](https://github.com/japcodex)

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/julioandrecimarosti/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/japcodex)
[![Behance](https://img.shields.io/badge/Behance-1769FF?style=for-the-badge&logo=behance&logoColor=white)](https://www.behance.net/julioandre7)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/julio_a_/)

<br/>

</div>

*Se você tem um jardim e uma biblioteca, você tem tudo de que necessita.*<br>
— Cícero

<br>
</div>
