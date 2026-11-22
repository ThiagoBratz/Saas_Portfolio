
// ===== 0. Referências e estado compartilhado =====
const html = document.documentElement;
const secoes = Array.from(document.querySelectorAll("main > section[id]"));
const linksMenu = document.querySelectorAll('header nav a[href^="#"]');
const barraProgresso = document.querySelector("#progresso");

let modoSlides = false; 
let indiceAtual = 0; 
let idAtivo = secoes.length ? secoes[0].id : ""; 

// ===== 1. Botão copiar e-mail =====
const botaoCopiar = document.querySelector("#botao-copiar");
const emailTexto = document.querySelector("#email-texto");
const avisoCopiado = document.querySelector("#aviso-copiado");

if (botaoCopiar && emailTexto && avisoCopiado) {
  botaoCopiar.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(emailTexto.textContent.trim());
      avisoCopiado.textContent = "E-mail copiado!";
    } catch {
      avisoCopiado.textContent = "Não consegui copiar. Selecione o e-mail e copie manualmente.";
    }

    setTimeout(() => {
      avisoCopiado.textContent = "";
    }, 2500);
  });
}

// ===== 2. Menu ativo + linha de progresso =====
function marcarItemAtivo(id) {
  idAtivo = id;

  linksMenu.forEach((link) => {
    const ativo = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("ativo", ativo);

    if (ativo) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}


const observador = new IntersectionObserver(
  (entradas) => {
    if (modoSlides) return; 

    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        marcarItemAtivo(entrada.target.id);
      }
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);

secoes.forEach((secao) => observador.observe(secao));

function atualizarProgresso() {
  if (!barraProgresso) return;

  let proporcao;

  if (modoSlides) {
    proporcao = secoes.length > 1 ? indiceAtual / (secoes.length - 1) : 0;
  } else {
    const rolado = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    proporcao = total > 0 ? rolado / total : 0;
  }

  barraProgresso.style.transform = `scaleX(${proporcao})`;
}

window.addEventListener("scroll", atualizarProgresso, { passive: true });
window.addEventListener("resize", atualizarProgresso);
atualizarProgresso();

// ===== 3. Entrada com fade ao rolar =====
const observadorRevelar = new IntersectionObserver(
  (entradas, obs) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visivel");
        obs.unobserve(entrada.target);
      }
    });
  },
  { threshold: 0.15 }
);


function observarRevelar(raiz = document) {
  raiz.querySelectorAll(".revelar:not(.visivel)").forEach((el) => observadorRevelar.observe(el));
}

observarRevelar();

// ===== 4. Cards de projetos a partir de data/projetos.json =====


function linkSeguro(url) {
  return typeof url === "string" && /^https?:\/\//.test(url);
}

function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto) elemento.textContent = texto;
  return elemento;
}

function criarCardProjeto(p) {
  const card = criarElemento("article", "card-projeto revelar");

  const imagem = criarElemento("img", "projeto-imagem");
  imagem.src = p.imagem;
  imagem.alt = p.alt;
  imagem.width = 1200;
  imagem.height = 675;
  imagem.loading = "lazy";
  imagem.decoding = "async";

  const corpo = criarElemento("div", "projeto-corpo");
  corpo.append(criarElemento("h3", "", p.nome));
  corpo.append(criarElemento("p", "meta", `${p.categoria} · ${p.status}`));
  if (p.privado) corpo.append(criarElemento("p", "selo", "Repositório privado"));
  corpo.append(criarElemento("p", "", p.descricao));

  const etiquetas = criarElemento("ul", "etiquetas");
  etiquetas.setAttribute("aria-label", `Tecnologias do ${p.nome}`);
  (p.tecnologias || []).forEach((t) => etiquetas.append(criarElemento("li", "", t)));
  corpo.append(etiquetas);

 
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

  card.append(imagem, corpo);
  return card;
}

function textoResumoProjetos(projetos) {
  const total = projetos.length;
  const emDesenvolvimento = projetos.filter((p) => p.status.toLowerCase().includes("desenvolvimento")).length;
  const palavra = total === 1 ? "projeto" : "projetos";
  return `${total} ${palavra} · ${emDesenvolvimento} em desenvolvimento`;
}

async function montarCards(seletor, caminho, criarCard, aoTerminar) {
  const lista = document.querySelector(seletor);
  if (!lista) return;

  try {
    const resposta = await fetch(caminho);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const dados = await resposta.json();
    if (!Array.isArray(dados) || dados.length === 0) throw new Error("lista vazia");

    lista.replaceChildren(...dados.map(criarCard));
    observarRevelar(lista); 
    if (aoTerminar) aoTerminar(dados);
  } catch (erro) {
    console.warn(`[portfólio] Não consegui ler ${caminho}; mantendo os cards do HTML.`, erro);
  }
}

// ===== 5. Modo tela cheia (transição entre seções) =====
const consultaDesktop = window.matchMedia("(min-width: 64rem) and (min-height: 560px)");
const consultaMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
const botaoProxima = document.querySelector("#proxima");
const botaoProximaTexto = document.querySelector("#proxima-texto");

const DURACAO_TRANSICAO = 1000; 
let liberadoEm = 0; 
let ultimoWheel = 0; 

function indiceDoId(id) {
  return secoes.findIndex((secao) => secao.id === id);
}

function indiceDoHash() {
  const indice = indiceDoId(location.hash.slice(1));
  return indice === -1 ? 0 : indice;
}

function nomeDaSecao(id) {
  const link = document.querySelector(`header nav a[href="#${id}"]`);
  return link ? link.textContent.trim() : id;
}


let ultimoMotivo = "";
function registrarMotivo(motivo) {
  if (motivo === ultimoMotivo) return;
  ultimoMotivo = motivo;
  console.info(`[portfólio] Modo tela cheia: ${motivo}`);
}

function secoesQueNaoCabem() {
  html.classList.add("medindo");

  const naoCabem = secoes
    .filter((secao) => {
      const caixa = secao.getBoundingClientRect();
      const estilo = getComputedStyle(secao);
      const topoLivre = caixa.top + parseFloat(estilo.paddingTop);
      const baseLivre = caixa.bottom - parseFloat(estilo.paddingBottom);

      return !Array.from(secao.children).every((filho) => {
        const r = filho.getBoundingClientRect();
        return r.top >= topoLivre - 2 && r.bottom <= baseLivre + 2;
      });
    })
    .map((secao) => secao.id);

  html.classList.remove("medindo");
  return naoCabem;
}

function ajustarEncaixe() {
  html.classList.remove("compacto");
  if (secoesQueNaoCabem().length === 0) return true;

  html.classList.add("compacto");
  const sobras = secoesQueNaoCabem();
  if (sobras.length === 0) return true;

  html.classList.remove("compacto");
  registrarMotivo(`desligado (o conteúdo não cabe na janela de ${window.innerHeight}px de altura: ${sobras.join(", ")})`);
  return false;
}

function cssDoModoTelaCheiaCarregado() {
  const main = document.querySelector("main");
  return !!main && getComputedStyle(main).position === "fixed";
}

function atualizarIndicacao() {
  if (!botaoProxima || !botaoProximaTexto) return;

  const ultima = indiceAtual === secoes.length - 1;
  const nome = ultima ? "Voltar ao início" : nomeDaSecao(secoes[indiceAtual + 1].id);

  botaoProximaTexto.textContent = nome;
  botaoProxima.dataset.ultima = String(ultima);
  botaoProxima.setAttribute("aria-label", ultima ? "Voltar ao início da página" : `Ir para a seção ${nome}`);
}

function irPara(novo, { animar = true } = {}) {
  if (!modoSlides) return;

  novo = Math.max(0, Math.min(secoes.length - 1, novo));
  if (novo === indiceAtual) return;

  if (!animar) html.classList.add("sem-transicao");

  indiceAtual = novo;
  secoes.forEach((secao, i) => {
    secao.classList.toggle("ativa", i === novo); 
    secao.classList.toggle("antes", i < novo); 
  });

  if (!animar) {
    void html.offsetHeight; 
    html.classList.remove("sem-transicao");
  } else {
    liberadoEm = performance.now() + DURACAO_TRANSICAO;
    try {
      history.replaceState(null, "", `#${secoes[novo].id}`);
    } catch {
      
    }
  }

  marcarItemAtivo(secoes[novo].id);
  atualizarProgresso();
  atualizarIndicacao();
}

function ligarSlides(indiceInicial) {
  html.classList.add("modo-slides");

  if (!cssDoModoTelaCheiaCarregado()) {
    html.classList.remove("modo-slides");
    registrarMotivo("desligado (o style.css carregado está desatualizado: substitua o arquivo inteiro e recarregue com Ctrl+Shift+R)");
    return;
  }

  if (!ajustarEncaixe()) {
    html.classList.remove("modo-slides");
    return;
  }

  modoSlides = true;
  indiceAtual = -1; 
  irPara(indiceInicial, { animar: false });
  registrarMotivo(html.classList.contains("compacto") ? "ligado (layout compacto)" : "ligado");
}

function desligarSlides() {
  const secao = secoes[indiceAtual];

  modoSlides = false;
  html.classList.remove("modo-slides", "compacto");
  secoes.forEach((s) => s.classList.remove("ativa", "antes"));

  if (secao) window.scrollTo({ top: secao.offsetTop, behavior: "instant" });
  atualizarProgresso();
}

function avaliarModo(primeiraVez = false) {
  const querSlides = consultaDesktop.matches && !consultaMovimento.matches;

  if (!querSlides) {
    if (modoSlides) desligarSlides();

    registrarMotivo(
      consultaMovimento.matches
        ? "desligado (o sistema pede movimento reduzido)"
        : "desligado (janela pequena: precisa de 1024px de largura e 560px de altura)"
    );
    return;
  }

  if (modoSlides) {
    if (!ajustarEncaixe()) desligarSlides();
    return;
  }

  ligarSlides(primeiraVez ? indiceDoHash() : Math.max(0, indiceDoId(idAtivo)));
}

window.addEventListener(
  "wheel",
  (e) => {
    if (!modoSlides || e.ctrlKey) return;
    if (e.target instanceof Element && e.target.closest("textarea")) return;

    const agora = performance.now();
    const pausa = agora - ultimoWheel;
    ultimoWheel = agora;

    if (agora < liberadoEm) return; 
    if (pausa < 120) return; 
    if (Math.abs(e.deltaY) < 4) return; 

    irPara(indiceAtual + (e.deltaY > 0 ? 1 : -1));
  },
  { passive: true }
);

document.addEventListener("keydown", (e) => {
  if (!modoSlides || e.altKey || e.ctrlKey || e.metaKey) return;

  const alvo = e.target instanceof Element ? e.target : document.body;
  if (alvo.closest("input, textarea, select, [contenteditable='true']")) return;

  let destino;

  switch (e.key) {
    case "ArrowDown":
    case "PageDown":
      destino = indiceAtual + 1;
      break;
    case "ArrowUp":
    case "PageUp":
      destino = indiceAtual - 1;
      break;
    case "Home":
      destino = 0;
      break;
    case "End":
      destino = secoes.length - 1;
      break;
    case " ":
      if (alvo.closest("a, button")) return; 
      destino = indiceAtual + (e.shiftKey ? -1 : 1);
      break;
    default:
      return;
  }

  e.preventDefault();
  if (performance.now() >= liberadoEm) irPara(destino);
});

document.addEventListener("click", (e) => {
  if (!modoSlides || !(e.target instanceof Element)) return;

  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  const indice = indiceDoId(link.getAttribute("href").slice(1));
  if (indice === -1) return; // ex.: "Pular para o conteúdo" segue o caminho normal

  e.preventDefault();
  irPara(indice);
});

if (botaoProxima) {
  botaoProxima.addEventListener("click", () => {
    irPara(indiceAtual === secoes.length - 1 ? 0 : indiceAtual + 1);
  });
}

window.addEventListener("hashchange", () => {
  if (modoSlides) irPara(indiceDoHash());
});

let esperaResize;
window.addEventListener("resize", () => {
  clearTimeout(esperaResize);
  esperaResize = setTimeout(() => avaliarModo(), 200);
});
consultaDesktop.addEventListener("change", () => avaliarModo());
consultaMovimento.addEventListener("change", () => avaliarModo());
window.addEventListener("load", () => avaliarModo()); 

// ===== Início =====
avaliarModo(true);

montarCards("#lista-projetos", "data/projetos.json", criarCardProjeto, (dados) => {
  const resumo = document.querySelector("#resumo-projetos");
  if (resumo) resumo.textContent = textoResumoProjetos(dados);
});

