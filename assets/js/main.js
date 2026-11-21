/* =====================================================================
   main.js — interações do portfólio (JavaScript puro)
   Partes:
   0. Referências e estado compartilhado
   1. Botão copiar e-mail
   2. Menu ativo + linha de progresso
   3. Entrada com fade ao rolar
   4. Cards de projetos e certificados a partir de data/
   5. Modo tela cheia (transição entre seções no desktop)
   ===================================================================== */

// ===== 0. Referências e estado compartilhado =====
const html = document.documentElement;
const secoes = Array.from(document.querySelectorAll("main > section[id]"));
const linksMenu = document.querySelectorAll('header nav a[href^="#"]');
const barraProgresso = document.querySelector("#progresso");

let modoSlides = false; // true quando o modo tela cheia está ligado
let indiceAtual = 0; // seção atual no modo tela cheia
let idAtivo = secoes.length ? secoes[0].id : ""; // seção "atual" em qualquer modo

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

// rolagem normal: o "vigia" avisa qual seção cruza o meio da tela
const observador = new IntersectionObserver(
  (entradas) => {
    if (modoSlides) return; // no modo tela cheia quem decide é o irPara()

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
    // sem rolagem: o progresso é a posição da seção atual na lista
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

// função (e não só um laço) porque os cards criados na parte 4 também precisam ser vigiados
function observarRevelar(raiz = document) {
  raiz.querySelectorAll(".revelar:not(.visivel)").forEach((el) => observadorRevelar.observe(el));
}

observarRevelar();

// ===== 4. Cards de projetos e certificados a partir de data/ =====

// cria um elemento com classe e texto. Usamos textContent (e não innerHTML)
// para que o texto do JSON nunca seja interpretado como HTML: é mais seguro.
function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function criarImagem(classe, src, alt, largura, altura) {
  const img = criar("img", classe);
  img.src = src;
  img.alt = alt || "";
  img.width = largura;
  img.height = altura;
  img.loading = "lazy";
  img.decoding = "async";
  return img;
}

// só aceita links que começam com http:// ou https://
function linkSeguro(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

function linkExterno(href, texto, classe) {
  const a = criar("a", classe, texto);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.append(criar("span", "sr-only", " (abre em nova aba)"));
  return a;
}

async function carregarJSON(caminho) {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao ler ${caminho}`);
  return resposta.json();
}

function criarCardProjeto(p) {
  const card = criar("article", "card-projeto revelar");
  card.append(criarImagem("projeto-imagem", p.imagem, p.alt, 1200, 675));

  const corpo = criar("div", "projeto-corpo");
  corpo.append(criar("h3", "", p.nome));
  corpo.append(criar("p", "meta", `${p.categoria} · ${p.status}`));

  if (p.privado) {
    corpo.append(criar("p", "selo", "Repositório privado"));
  }

  corpo.append(criar("p", "", p.descricao));

  const links = (p.links || []).filter((l) => linkSeguro(l.url));
  if (links.length > 0) {
    const grupo = criar("div", "projeto-links");
    links.forEach((l) => {
      grupo.append(linkExterno(l.url, l.rotulo, "botao botao-secundario botao-pequeno"));
    });
    corpo.append(grupo);
  }

  const lista = criar("ul", "etiquetas");
  lista.setAttribute("aria-label", `Tecnologias do ${p.nome}`);
  p.tecnologias.forEach((tecnologia) => lista.append(criar("li", "", tecnologia)));
  corpo.append(lista);

  card.append(corpo);
  return card;
}

// "2026-09-20" -> "20/09/2026" (sem new Date, para não ter surpresa com fuso horário)
function formatarData(iso) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function criarCardCertificado(c) {
  const card = criar("article", "card-certificado revelar");
  card.append(criarImagem("certificado-imagem", c.imagem, c.alt, 1200, 800));

  const corpo = criar("div", "certificado-corpo");
  corpo.append(criar("h3", "", c.titulo));
  corpo.append(criar("p", "", `${c.instituicao} · ${c.horas} horas`));

  const pData = criar("p", "", "Data do certificado: ");
  const hora = criar("time", "", formatarData(c.data));
  hora.dateTime = c.data;
  pData.append(hora);
  corpo.append(pData);

  const link = linkSeguro(c.link);
  if (link) {
    corpo.append(linkExterno(link, "Visualizar certificado"));
  }

  card.append(corpo);
  return card;
}

function textoResumoProjetos(lista) {
  const total = lista.length;
  const emDesenvolvimento = lista.filter((p) => p.status === "Em desenvolvimento").length;

  let texto = `${total} ${total === 1 ? "projeto" : "projetos"}`;
  if (emDesenvolvimento > 0) texto += ` · ${emDesenvolvimento} em desenvolvimento`;
  return texto;
}

// Lê o JSON e troca os cards fixos do HTML pelos gerados.
// Se algo falhar, os cards fixos continuam lá (o site não quebra).
async function montarCards(seletor, caminho, criarCard, aoTerminar) {
  const container = document.querySelector(seletor);
  if (!container) return;

  try {
    const dados = await carregarJSON(caminho);
    if (!Array.isArray(dados) || dados.length === 0) return;

    container.replaceChildren(...dados.map(criarCard));
    observarRevelar(container);
    if (aoTerminar) aoTerminar(dados);

    // os cards mudaram a altura da seção: confere se o modo tela cheia ainda cabe
    avaliarModo();
  } catch (erro) {
    console.warn(`Não consegui montar os cards de ${caminho}:`, erro);
  }
}

// ===== 5. Modo tela cheia (transição entre seções) =====
const consultaDesktop = window.matchMedia("(min-width: 64rem) and (min-height: 560px)");
const consultaMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
const botaoProxima = document.querySelector("#proxima");
const botaoProximaTexto = document.querySelector("#proxima-texto");

const DURACAO_TRANSICAO = 1000; // ms: um pouco mais que o CSS (0,1 s de atraso + 0,9 s)
let liberadoEm = 0; // até quando ignorar novos comandos de rolagem
let ultimoWheel = 0; // horário do último evento da roda do mouse

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

// Mostra no Console (F12) por que o modo tela cheia está ligado ou desligado.
let ultimoMotivo = "";
function registrarMotivo(motivo) {
  if (motivo === ultimoMotivo) return;
  ultimoMotivo = motivo;
  console.info(`[portfólio] Modo tela cheia: ${motivo}`);
}

// Devolve a lista de seções cujo conteúdo NÃO cabe na altura da janela, sem invadir as margens
// reservadas (o menu em cima e o botão "próxima seção" embaixo).
// A classe "medindo" desliga transformações e fades por um instante, para medir o tamanho real.
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

// Tenta o layout normal; se não couber, tenta o layout compacto (classe "compacto").
// Devolve true se alguma das duas versões coube.
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

// Confere se o style.css novo está mesmo carregado: no modo tela cheia o <main> vira "fixed".
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
    secao.classList.toggle("ativa", i === novo); // a que aparece
    secao.classList.toggle("antes", i < novo); // as que já passaram ficam "em cima"
  });

  if (!animar) {
    void html.offsetHeight; // força o navegador a aplicar o estilo agora, sem animar
    html.classList.remove("sem-transicao");
  } else {
    liberadoEm = performance.now() + DURACAO_TRANSICAO;
    try {
      history.replaceState(null, "", `#${secoes[novo].id}`);
    } catch {
      /* alguns ambientes (ex.: file://) não deixam mexer na URL: tudo bem */
    }
  }

  marcarItemAtivo(secoes[novo].id);
  atualizarProgresso();
  atualizarIndicacao();
}

function ligarSlides(indiceInicial) {
  html.classList.add("modo-slides");

  if (!cssDoModoTelaCheiaCarregado()) {
    // o JavaScript é novo, mas o style.css não: não liga, para não deixar a página pela metade
    html.classList.remove("modo-slides");
    registrarMotivo("desligado (o style.css carregado está desatualizado: substitua o arquivo inteiro e recarregue com Ctrl+Shift+R)");
    return;
  }

  if (!ajustarEncaixe()) {
    // não cabe na tela: volta para a rolagem normal, para nunca esconder conteúdo
    html.classList.remove("modo-slides");
    return;
  }

  modoSlides = true;
  indiceAtual = -1; // "nenhuma", para o irPara() aceitar o primeiro destino
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

// decide se o modo tela cheia deve estar ligado ou desligado agora
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

// roda do mouse / touchpad: uma "virada" por gesto
window.addEventListener(
  "wheel",
  (e) => {
    if (!modoSlides || e.ctrlKey) return;
    if (e.target instanceof Element && e.target.closest("textarea")) return;

    const agora = performance.now();
    const pausa = agora - ultimoWheel;
    ultimoWheel = agora;

    if (agora < liberadoEm) return; // animação em andamento
    if (pausa < 120) return; // continuação do mesmo gesto (inércia do touchpad)
    if (Math.abs(e.deltaY) < 4) return; // movimento muito pequeno

    irPara(indiceAtual + (e.deltaY > 0 ? 1 : -1));
  },
  { passive: true }
);

// teclado
document.addEventListener("keydown", (e) => {
  if (!modoSlides || e.altKey || e.ctrlKey || e.metaKey) return;

  const alvo = e.target instanceof Element ? e.target : document.body;
  // não atrapalha quem está digitando ou escolhendo opções do formulário
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
      if (alvo.closest("a, button")) return; // espaço em botão/link é "clicar"
      destino = indiceAtual + (e.shiftKey ? -1 : 1);
      break;
    default:
      return;
  }

  e.preventDefault();
  if (performance.now() >= liberadoEm) irPara(destino);
});

// links do menu e botões internos (href="#sobre", "#projetos"...)
document.addEventListener("click", (e) => {
  if (!modoSlides || !(e.target instanceof Element)) return;

  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  const indice = indiceDoId(link.getAttribute("href").slice(1));
  if (indice === -1) return; // ex.: "Pular para o conteúdo" segue o caminho normal

  e.preventDefault();
  irPara(indice);
});

// botão "próxima seção"
if (botaoProxima) {
  botaoProxima.addEventListener("click", () => {
    irPara(indiceAtual === secoes.length - 1 ? 0 : indiceAtual + 1);
  });
}

// botão voltar/avançar do navegador
window.addEventListener("hashchange", () => {
  if (modoSlides) irPara(indiceDoHash());
});

// reavalia quando a janela muda de tamanho, a preferência de movimento muda ou a página termina de carregar
let esperaResize;
window.addEventListener("resize", () => {
  clearTimeout(esperaResize);
  esperaResize = setTimeout(() => avaliarModo(), 200);
});
consultaDesktop.addEventListener("change", () => avaliarModo());
consultaMovimento.addEventListener("change", () => avaliarModo());
window.addEventListener("load", () => avaliarModo()); // fontes e imagens podem mudar as alturas

// ===== Início =====
avaliarModo(true);

montarCards("#lista-projetos", "data/projetos.json", criarCardProjeto, (dados) => {
  const resumo = document.querySelector("#resumo-projetos");
  if (resumo) resumo.textContent = textoResumoProjetos(dados);
});

montarCards("#lista-certificados", "data/certificados.json", criarCardCertificado);