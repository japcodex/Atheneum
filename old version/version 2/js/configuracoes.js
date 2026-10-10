// Preferências opcionais da versão 2. Dados antigos recebem valores padrão.
function preferenciasPadrao() {
  return { nome: "", tamanho: "padrao", animacoes: true, ambiente: true, visualizacao: "carrossel" };
}
function validarPreferencias(valor) {
  if (valor === undefined) return preferenciasPadrao();
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw Error("Preferências inválidas.");
  const p = { ...preferenciasPadrao(), ...valor };
  if (typeof p.nome !== "string" || p.nome.length > 60 || !["padrao", "grande"].includes(p.tamanho)
    || typeof p.animacoes !== "boolean" || typeof p.ambiente !== "boolean"
    || !["carrossel", "capas", "lista"].includes(p.visualizacao)) throw Error("Preferências inválidas.");
  return { nome: p.nome.trim(), tamanho: p.tamanho, animacoes: p.animacoes, ambiente: p.ambiente, visualizacao: p.visualizacao };
}
function aplicarPreferencias() {
  const p = carregarDadosUsuario().preferencias, raiz = document.documentElement;
  raiz.dataset.movimento = p.animacoes ? "suave" : "reduzido";
  raiz.dataset.ambiente = p.ambiente ? "imersivo" : "discreto";
  raiz.dataset.texto = p.tamanho;
  document.dispatchEvent(new CustomEvent("preferencias:alteradas"));
}
document.getElementById("exportar-backup").addEventListener("click", () => {
  try {
  const salvo = localStorage.getItem(CHAVE_DADOS_USUARIO);
  const dados = salvo === null ? criarDadosUsuario() : validarDadosUsuario(JSON.parse(salvo));
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `atheneum-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.getElementById("backup-aviso").textContent = "Backup preparado para download. Guarde este arquivo.";
  } catch (erro) { document.getElementById("backup-aviso").textContent = `Não foi possível exportar: ${erro.message}`; }
});
let backupSelecionado = null;
document.getElementById("arquivo-backup").addEventListener("change", async (e) => {
  backupSelecionado = null; document.getElementById("restaurar-backup").disabled = true;
  const arquivo = e.target.files[0]; if (!arquivo) return;
  try {
    if (arquivo.size > 10000000) throw Error("O backup deve ter até 10 MB.");
    backupSelecionado = validarDadosUsuario(JSON.parse(await arquivo.text()));
    document.getElementById("backup-aviso").textContent = `${obterLivrosUsuario(backupSelecionado).length} livros e ${backupSelecionado.listas.length} listas. Restaurar substituirá a coleção atual.`;
    document.getElementById("restaurar-backup").disabled = false;
  } catch (erro) { document.getElementById("backup-aviso").textContent = `Backup inválido: ${erro.message}`; }
});
document.getElementById("restaurar-backup").addEventListener("click", () => {
  if (!backupSelecionado || !confirm("Substituir seus livros, listas, anotações e progresso pelos dados deste backup?")) return;
  try {
    const dados = validarDadosUsuario(backupSelecionado);
    verificarConquistas(dados);
    // Também permite recuperar um estado corrompido, após confirmação explícita.
    const anterior = localStorage.getItem(CHAVE_DADOS_USUARIO);
    if (anterior !== null) localStorage.setItem("atheneum:antes-importacao", anterior);
    localStorage.setItem(CHAVE_DADOS_USUARIO, JSON.stringify(dados));
    aplicarPreferencias(); selecionarLista(); estado.visao = dados.preferencias.visualizacao;
    montarCategorias(); atualizar(); renderizarSantuario(); renderizarInicio();
    backupSelecionado = null; document.getElementById("restaurar-backup").disabled = true;
    document.getElementById("arquivo-backup").value = "";
    document.getElementById("backup-aviso").textContent = "Backup restaurado. Seus dados já estão disponíveis.";
  } catch (erro) { document.getElementById("backup-aviso").textContent = `Não foi possível restaurar: ${erro.message}`; }
});
