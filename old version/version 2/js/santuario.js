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

  const totais = medirConquistas(carregarDadosUsuario());
  const emblemas = CONQUISTAS_LEITURA.map((conquista) => {
    const desbloqueado = progresso.conquistas.includes(conquista.id);
    const item = criar("li", "santuario__emblema");
    item.dataset.desbloqueado = String(desbloqueado);
    item.append(criarIcone(conquista.icone), criar("strong", "", conquista.nome));
    item.append(criar("p", "", conquista.descricao));
    item.append(criar("span", "emblema__estado", desbloqueado ? "Conquistada" : `${Math.min(totais[conquista.tipo], conquista.quantidade)} / ${conquista.quantidade}`));
    return item;
  });
  porId("santuario-emblemas").replaceChildren(...emblemas);
  const desbloqueadas = CONQUISTAS_LEITURA.filter((item) => progresso.conquistas.includes(item.id)).length;
  porId("santuario-conquistas-resumo").textContent = `${desbloqueadas} de ${CONQUISTAS_LEITURA.length} conquistas desbloqueadas.`;
  if (anunciar) porId("santuario-aviso").textContent = `Nível ${progresso.nivel}, ${progresso.xp} XP, ${desbloqueadas} conquistas.`;
}

document.addEventListener("progresso:atualizado", () => renderizarSantuario());
document.addEventListener("colecao:alterada", () => renderizarSantuario());
