// Um único editor cuida do cadastro, da leitura, das listas e das anotações.
const dialogo = document.getElementById("detalhes");
let livroEmEdicao = null, editorAlterado = false, capaEnviada = "", carregandoCapa = false;
const campoLivro = (nome) => document.getElementById(`livro-${nome}`);

function abrirDetalhes(livro) {
  livroEmEdicao = livro; editorAlterado = false; capaEnviada = "";
  const removido = !!livro && carregarDadosUsuario().removidos.includes(livro.id);
  const campos = { titulo: livro?.titulo || "", autor: livro?.autor || "", descricao: livro?.descricao || "",
    status: livro?.status || "quero-ler", nota: livro?.nota || 0, pagina: livro?.paginaAtual || 0,
    total: livro?.totalPaginas || 0, anotacoes: livro?.anotacoes || "", capa: livro?.capa || "", pdf: livro?.pdf || "" };
  // Conserva avaliações fracionadas que já existam no catálogo.
  if (![...campoLivro("nota").options].some((o) => o.value === String(campos.nota))) {
    const opcao = criar("option", "", `${campos.nota} estrelas`); opcao.value = campos.nota;
    campoLivro("nota").append(opcao);
  }
  if (campos.capa.startsWith("data:")) { capaEnviada = campos.capa; campos.capa = ""; }
  for (const [nome, valor] of Object.entries(campos)) campoLivro(nome).value = valor;
  campoLivro("imagem").value = "";
  campoLivro("categoria").replaceChildren(...CATEGORIAS.map((c) => {
    const opcao = criar("option", "", c.nome); opcao.value = c.id; return opcao;
  }));
  campoLivro("categoria").value = livro?.categoria || CATEGORIAS[0].id;
  document.getElementById("detalhes-titulo").textContent = livro?.titulo || "Adicionar livro";
  document.getElementById("editor-autor").textContent = livro?.autor || "Autor não informado";
  document.getElementById("editor-capa").replaceChildren(livro ? criarCapa(livro) : criar("p", "editor__capa-vazia", "A capa aparece aqui depois de salvar."));
  document.getElementById("cadastro-campos").open = !livro;
  document.getElementById("remover-livro").hidden = !livro || removido;
  document.getElementById("restaurar-livro").hidden = !removido;
  document.getElementById("salvar-livro").hidden = removido;
  const listas = carregarDadosUsuario().listas;
  document.getElementById("editor-listas").replaceChildren(...listas.map((lista) => {
    const label = criar("label", "lista-opcao"); const check = criar("input");
    check.type = "checkbox"; check.value = lista.id; check.name = "listas";
    check.checked = livro ? lista.livros.includes(livro.id) : estado.lista === lista.id;
    label.append(check, criar("span", "", lista.nome)); return label;
  }));
  if (!listas.length) document.getElementById("editor-listas").append(criar("p", "texto-suave", "Crie suas listas na lateral da Biblioteca."));
  for (const campo of dialogo.querySelectorAll("input, select, textarea")) campo.disabled = removido;
  document.getElementById("editor-aviso").textContent = removido ? "Restaure este livro para voltar a editar." : "As alterações são guardadas ao salvar.";
  atualizarIndicadorLeitura();
  atualizarBotoesPdf(livro);   // js/leitor-pdf.js
  if (!dialogo.open) dialogo.showModal();
  if (!livro) campoLivro("titulo").focus();
}

function atualizarIndicadorLeitura() {
  const pagina = Number(campoLivro("pagina").value), total = Number(campoLivro("total").value);
  document.getElementById("editor-progresso").textContent = total > 0
    ? `${Math.min(100, Math.round(pagina / total * 100))}% da leitura · página ${pagina} de ${total}` : "Informe o total de páginas para acompanhar a porcentagem.";
}
function fecharEditor() {
  if (carregandoCapa) return;
  if (editorAlterado && !confirm("Fechar sem salvar as alterações deste livro?")) return;
  editorAlterado = false; dialogo.close();
}
dialogo.addEventListener("cancel", (e) => { e.preventDefault(); fecharEditor(); });
document.getElementById("fechar-editor").addEventListener("click", fecharEditor);
dialogo.addEventListener("input", () => { editorAlterado = true; atualizarIndicadorLeitura(); });
campoLivro("capa").addEventListener("input", () => { capaEnviada = ""; });
window.addEventListener("beforeunload", (e) => { if (dialogo.open && editorAlterado) { e.preventDefault(); e.returnValue = ""; } });

document.getElementById("livro-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (carregandoCapa) return;
  try {
    const novo = !livroEmEdicao, listaAtual = estado.lista;
    const cadastro = { titulo: campoLivro("titulo").value, autor: campoLivro("autor").value,
      categoria: campoLivro("categoria").value, grupo: livroEmEdicao?.grupo || "Minha coleção",
      descricao: campoLivro("descricao").value, capa: capaEnviada || campoLivro("capa").value, pdf: campoLivro("pdf").value, nota: Number(campoLivro("nota").value) };
    const leitura = { paginaAtual: Number(campoLivro("pagina").value), totalPaginas: Number(campoLivro("total").value), anotacoes: campoLivro("anotacoes").value };
    const listas = [...dialogo.querySelectorAll("input[name='listas']:checked")].map((c) => c.value);
    const id = salvarLivroPessoal(livroEmEdicao?.id, cadastro, leitura, campoLivro("status").value, listas);
    if (novo) selecionarLista(listaAtual);
    editorAlterado = false;
    abrirDetalhes(obterLivrosUsuario().find((l) => l.id === id));
    document.getElementById("editor-aviso").textContent = "Livro, páginas e anotações salvos.";
    avisarUsuario("Alterações salvas na sua biblioteca.");
  } catch (erro) { document.getElementById("cadastro-campos").open = true; document.getElementById("editor-aviso").textContent = erro.message; }
});
document.getElementById("remover-livro").addEventListener("click", () => {
  if (!confirm("Mover este livro para os removidos? Você poderá restaurá-lo com suas anotações.")) return;
  try { removerLivroPessoal(livroEmEdicao.id); editorAlterado = false; dialogo.close(); avisarUsuario("Livro movido para os removidos."); }
  catch (erro) { document.getElementById("editor-aviso").textContent = erro.message; }
});
document.getElementById("restaurar-livro").addEventListener("click", () => {
  try { removerLivroPessoal(livroEmEdicao.id, true); dialogo.close(); avisarUsuario("Livro restaurado com suas anotações."); }
  catch (erro) { document.getElementById("editor-aviso").textContent = erro.message; }
});

/* Redimensiona a imagem antes de salvar, para economizar LocalStorage. */
campoLivro("imagem").addEventListener("change", async () => {
  const arquivo = campoLivro("imagem").files[0]; if (!arquivo) return;
  if (!['image/png','image/jpeg','image/webp'].includes(arquivo.type) || arquivo.size > 10000000) {
    document.getElementById("editor-aviso").textContent = "Escolha PNG, JPG ou WebP de até 10 MB."; return;
  }
  carregandoCapa = true; document.getElementById("salvar-livro").disabled = true;
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const escala = Math.min(1, 600 / img.width, 900 / img.height), canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala); canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const imagem = canvas.toDataURL("image/webp", 0.8);
    if (imagem.length > 1000000) throw Error("A imagem ainda é grande. Use uma capa menor.");
    capaEnviada = imagem; campoLivro("capa").value = ""; editorAlterado = true;
    document.getElementById("editor-capa").replaceChildren(criarCapa({ id: "preview", titulo: campoLivro("titulo").value, autor: campoLivro("autor").value, capa: imagem }));
    document.getElementById("editor-aviso").textContent = "Capa pronta. Clique em Salvar alterações.";
  } catch (erro) { document.getElementById("editor-aviso").textContent = erro.message; }
  finally { URL.revokeObjectURL(url); carregandoCapa = false; document.getElementById("salvar-livro").disabled = false; }
});
