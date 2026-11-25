// Lê o ?id= da URL, procura o projeto no JSON e monta a página de detalhes.
const area = document.getElementById("projeto");

// Cria um elemento com texto (textContent é seguro contra HTML injetado)
function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto) el.textContent = texto;
  return el;
}

// Seção "título + parágrafo", só se o texto existir
function secaoTexto(titulo, texto) {
  if (!texto) return null;
  const sec = criar("section", "projeto-secao");
  sec.append(criar("h2", "", titulo), criar("p", "", texto));
  return sec;
}

// Só aceita links http/https
function urlSegura(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

async function iniciar() {
  if (!area) return; // esta página não é a de detalhes

  const id = new URLSearchParams(window.location.search).get("id");

  try {
    const resposta = await fetch("data/projetos.json");
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const projetos = await resposta.json();
    const projeto = projetos.find((p) => p.slug === id);

    if (!projeto) {
      area.replaceChildren(criar("p", "", "Projeto não encontrado."));
      return;
    }

    document.title = `${projeto.nome} | Thiago Bratz`;
    const d = projeto.detalhes || {};
    const partes = [];

    // Topo (div, e não header, para não herdar o estilo do menu)
    const topo = criar("div", "projeto-topo");
    topo.append(
      criar("h1", "", projeto.nome),
      criar("p", "projeto-meta", [projeto.categoria, projeto.status].filter(Boolean).join(" · ")),
      criar("p", "projeto-resumo", projeto.descricao)
    );

    const chips = criar("ul", "projeto-chips");
    (projeto.tecnologias || []).forEach((t) => chips.append(criar("li", "", t)));
    topo.append(chips);

    // Links; se o repositório for privado, avisa
    if (projeto.privado) {
      topo.append(criar("p", "projeto-aviso", "Repositório privado, a pedido da empresa."));
    }
    (projeto.links || [])
      .filter((l) => urlSegura(l.url))
      .forEach((l) => {
        const a = criar("a", "projeto-link", l.rotulo);
        a.href = l.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        topo.append(a);
      });
    partes.push(topo);

    // Imagem principal
    if (projeto.imagem) {
      const img = criar("img", "projeto-capa");
      img.src = projeto.imagem;
      img.alt = projeto.alt || projeto.nome;
      partes.push(img);
    }

    // Seções de texto (só aparecem se você preencher no JSON)
    partes.push(secaoTexto("Contexto", d.contexto));
    partes.push(secaoTexto("Desafio", d.desafio));
    partes.push(secaoTexto("Solução", d.solucao));

    // Tecnologias com explicação de uso
    if (d.tecnologias && d.tecnologias.length) {
      const sec = criar("section", "projeto-secao");
      sec.append(criar("h2", "", "Tecnologias"));
      const lista = criar("ul", "projeto-tecs");
      d.tecnologias.forEach((t) => {
        const li = criar("li");
        li.append(criar("strong", "", t.uso ? `${t.nome}: ` : t.nome));
        if (t.uso) li.append(document.createTextNode(t.uso));
        lista.append(li);
      });
      sec.append(lista);
      partes.push(sec);
    }

    // Imagens com legenda
    if (d.imagens && d.imagens.length) {
      const sec = criar("section", "projeto-secao");
      sec.append(criar("h2", "", "Telas e imagens"));
      d.imagens.forEach((i) => {
        const fig = criar("figure", "projeto-figura");
        const img = criar("img");
        img.src = i.src;
        img.alt = i.alt || "";
        img.loading = "lazy";
        fig.append(img);
        if (i.legenda) fig.append(criar("figcaption", "", i.legenda));
        sec.append(fig);
      });
      partes.push(sec);
    }

    area.replaceChildren(...partes.filter(Boolean));
  } catch (erro) {
    console.error("[projeto] Falha ao carregar:", erro);
    area.replaceChildren(criar("p", "", "Não foi possível carregar o projeto."));
  }
}

iniciar();