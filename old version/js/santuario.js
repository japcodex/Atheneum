// Apresentação do progresso e navegação; não calcula XP nem grava dados.

/* Atualiza usando o estado real salvo, independente dos filtros da biblioteca. */
function renderizarSantuario(anunciar = false) {
  const progresso = obterProgressoUsuario();
  const porId = (id) => document.getElementById(id);
  porId("santuario-nivel").textContent = `Nível ${progresso.nivel}`;
  porId("santuario-titulo-usuario").textContent = progresso.titulo;
  porId("santuario-xp").textContent = `${progresso.xp} XP acumulados`;
  porId("santuario-proximo").textContent = `${progresso.xpNoNivel} de ${progresso.xpProximoNivel} XP · Faltam ${progresso.xpProximoNivel - progresso.xpNoNivel} XP para o nível ${progresso.nivel + 1}.`;
  porId("santuario-barra").setAttribute("aria-valuenow", progresso.xpNoNivel);
  porId("santuario-barra").setAttribute("aria-valuetext", `${progresso.xpNoNivel} de ${progresso.xpProximoNivel} XP`);
  porId("santuario-preenchimento").style.width = `${progresso.percentual}%`;

  const livros = obterLivrosUsuario();
  const contagens = { "lendo": 0, "lido": 0 };
  for (const livro of livros) {
    if (Object.hasOwn(contagens, livro.status)) contagens[livro.status]++;
  }
  for (const [status, total] of Object.entries(contagens)) {
    porId(`santuario-${status}`).textContent = total;
  }
  porId("santuario-paginas").textContent = livros.reduce((n, l) => n + l.paginaAtual, 0).toLocaleString("pt-BR");
  porId("santuario-notas").textContent = livros.filter((l) => l.anotacoes.trim()).length;

  const emblemas = CONQUISTAS_LEITURA.map((conquista) => {
    const desbloqueado = progresso.conquistas.includes(conquista.id);
    const item = criar("li", "santuario__emblema");
    item.dataset.desbloqueado = String(desbloqueado);
    item.append(criar("strong", "", conquista.nome));
    const requisito = conquista.tipo === "qualquer" ? "Comece ou conclua seu primeiro livro."
      : `Conclua ${conquista.quantidade} ${conquista.quantidade === 1 ? "livro" : "livros"}.`;
    item.append(criar("p", "", `${desbloqueado ? "Desbloqueada" : "Bloqueada"} · ${requisito}`));
    return item;
  });
  porId("santuario-emblemas").replaceChildren(...emblemas);
  const desbloqueadas = CONQUISTAS_LEITURA.filter((item) => progresso.conquistas.includes(item.id)).length;
  porId("santuario-conquistas-resumo").textContent = `${desbloqueadas} de ${CONQUISTAS_LEITURA.length} conquistas desbloqueadas.`;
  if (anunciar) porId("santuario-aviso").textContent = `Nível ${progresso.nivel}, ${progresso.xp} XP, ${desbloqueadas} conquistas.`;
}

/* Trocar de área preserva categoria, busca, ordem e visão da biblioteca. */
function mostrarPagina(pagina) {
  if (!["biblioteca", "santuario"].includes(pagina)) return;
  const noSantuario = pagina === "santuario";
  document.getElementById("biblioteca").hidden = noSantuario;
  document.getElementById("santuario").hidden = !noSantuario;
  document.getElementById("busca").disabled = noSantuario;
  const pular = document.querySelector(".pular");
  pular.href = noSantuario ? "#santuario" : "#biblioteca";
  pular.textContent = noSantuario ? "Pular para o Santuário" : "Pular para os livros";
  for (const botao of document.querySelectorAll("[data-pagina]")) {
    botao.setAttribute("aria-pressed", String(botao.dataset.pagina === pagina));
  }
  if (noSantuario) renderizarSantuario(true);
  document.body.dataset.pagina = pagina;
  history.replaceState(null, "", `#${pagina}`);
}

document.getElementById("navegacao").addEventListener("click", ({ target }) => {
  const botao = target.closest("[data-pagina]");
  if (botao) mostrarPagina(botao.dataset.pagina);
});
document.addEventListener("progresso:atualizado", () => {
  renderizarSantuario(!document.getElementById("santuario").hidden);
});
renderizarSantuario();
document.addEventListener("colecao:alterada", () => renderizarSantuario());
document.getElementById("voltar-leitura").addEventListener("click", () => {
  mostrarPagina("biblioteca"); selecionarLista();
  estado.status = "lendo"; elementos.status.value = "lendo"; atualizar();
});
document.querySelector(".marca").addEventListener("click", (e) => { e.preventDefault(); mostrarPagina("biblioteca"); });
mostrarPagina(location.hash === "#santuario" ? "santuario" : "biblioteca");

// Artes opcionais: basta colocar os PNGs nestes caminhos, sem desenhar por JS.
for (const [id, caminho] of [["arte-marca", "img/logo/marca.png"], ["arte-santuario", "img/santuario/arte.png"]]) {
  const img = document.getElementById(id);
  img.addEventListener("load", () => { img.hidden = false; });
  img.addEventListener("error", () => { img.hidden = true; });
  img.src = caminho;
}
