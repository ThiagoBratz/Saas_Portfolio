// Só aceita links que começam com http:// ou https://
function linkSeguro(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

// Cria um elemento; o texto entra por textContent (seguro, nunca innerHTML)
function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto) elemento.textContent = texto;
  return elemento;
}

// Ícone de documento (SVG criado por código, sem innerHTML)
function criarIconeDocumento() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icone-linha");
  svg.setAttribute("aria-hidden", "true");

  [
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z",
    "M14 3v5h5",
    "M9 13h6M9 17h6",
  ].forEach((d) => {
    const caminho = document.createElementNS(NS, "path");
    caminho.setAttribute("d", d);
    svg.append(caminho);
  });

  return svg;
}

// comFade = true na index.html (o card aparece com fade ao rolar);
// em projetos.html não existe esse efeito, então passamos false.
function criarCardProjeto(p, comFade = true) {
  const card = criarElemento("article", comFade ? "card-projeto revelar" : "card-projeto");

  const imagem = criarElemento("img", "projeto-imagem");
  imagem.src = p.imagem;
  imagem.alt = p.alt;
  imagem.width = 1200;
  imagem.height = 675;
  imagem.loading = "lazy";
  imagem.decoding = "async";

  // wrapper da imagem: é nele que o hover acontece
  const midia = criarElemento("div", "projeto-midia");
  midia.append(imagem);

  // botão de documento: só existe se o projeto tiver "slug" no JSON
  if (p.slug) {
    const detalhes = criarElemento("a", "projeto-detalhes");
    detalhes.href = `projeto.html?id=${encodeURIComponent(p.slug)}`;
    detalhes.setAttribute("aria-label", `Ver detalhes do projeto ${p.nome}`);
    detalhes.append(criarIconeDocumento());
    midia.append(detalhes);
  }

  const corpo = criarElemento("div", "projeto-corpo");
  corpo.append(criarElemento("h3", "", p.nome));
  corpo.append(criarElemento("p", "meta", `${p.categoria} · ${p.status}`));
  if (p.privado) corpo.append(criarElemento("p", "selo", "Repositório privado"));
  corpo.append(criarElemento("p", "", p.descricao));

  const etiquetas = criarElemento("ul", "etiquetas");
  etiquetas.setAttribute("aria-label", `Tecnologias do ${p.nome}`);
  (p.tecnologias || []).forEach((t) => etiquetas.append(criarElemento("li", "", t)));
  corpo.append(etiquetas);

  // links (só http/https)
  const links = (p.links || []).filter((l) => linkSeguro(l.url));
  if (links.length > 0) {
    const lista = criarElemento("ul", "projeto-links");
    links.forEach((l) => {
      const item = criarElemento("li");
      const a = criarElemento("a", "", l.rotulo);
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", `${l.rotulo} (abre em nova aba)`);
      item.append(a);
      lista.append(item);
    });
    corpo.append(lista);
  }

  card.append(midia, corpo);
  return card;
}

function textoResumoProjetos(projetos) {
  const total = projetos.length;
  const emDesenvolvimento = projetos.filter((p) => p.status.toLowerCase().includes("desenvolvimento")).length;
  const palavra = total === 1 ? "projeto" : "projetos";
  return `${total} ${palavra} · ${emDesenvolvimento} em desenvolvimento`;
}

/* ---------- Galeria de projetos (projetos.html) ---------- */

async function iniciarPaginaProjetos() {
  const grade = document.querySelector("#todos-projetos");
  if (!grade) return; // esta página não é a galeria

  const resumo = document.querySelector("#projetos-resumo");

  try {
    const resposta = await fetch("data/projetos.json");
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const projetos = await resposta.json();
    grade.replaceChildren(...projetos.map((p) => criarCardProjeto(p, false)));
    resumo.textContent = textoResumoProjetos(projetos);
  } catch (erro) {
    console.error("[projetos] Falha ao carregar o JSON:", erro);
    resumo.textContent = "Não foi possível carregar os projetos agora.";
  }
}

iniciarPaginaProjetos();