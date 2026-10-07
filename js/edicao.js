// Organização recolhida no celular; respeita a escolha manual até mudar de tamanho.
const telaCompacta = matchMedia("(max-width: 860px)");
const organizacaoBiblioteca = document.getElementById("organizacao-biblioteca");
function ajustarOrganizacao() { organizacaoBiblioteca.open = !telaCompacta.matches; }
ajustarOrganizacao();
telaCompacta.addEventListener("change", ajustarOrganizacao);

// A leitura em andamento pertence ao usuário, não à sugestão editorial do dia.
function atualizarRetomada() {
  const botao = document.getElementById("inicio-retomar");
  const livro = obterLivrosUsuario().find((l) => l.status === "lendo");
  botao.hidden = !livro;
  if (!livro) return;
  const texto = criar("span");
  texto.append(criar("small", "", "Continue de onde parou"), criar("strong", "", livro.titulo),
    criar("small", "", livro.totalPaginas ? `Página ${livro.paginaAtual} de ${livro.totalPaginas}` : `Página ${livro.paginaAtual || 0}`));
  botao.replaceChildren(criarIcone("livro"), texto, criarIcone("seta"));
  botao.onclick = () => abrirDetalhes(obterLivrosUsuario().find((l) => l.id === livro.id));
}
atualizarRetomada();
document.addEventListener("colecao:alterada", atualizarRetomada);

// Movimentos importantes param também ao mudar a preferência com a página aberta.
function conterMovimento() {
  if (!movimentoSuave() && tiltAtivo) soltar(tiltAtivo);
}
reduzirMovimento.addEventListener("change", conterMovimento);
document.addEventListener("preferencias:alteradas", conterMovimento);
