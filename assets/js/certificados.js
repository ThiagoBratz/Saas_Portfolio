(function () {
  "use strict";

  const CAMINHO_DADOS = "data/certificados.json";
  const LIMITE_ARRASTE = 50; // px que o dedo/mouse precisa andar para trocar de slide

  /* ---------- 1. Funções de apoio ---------- */

  // "2026-09-20" -> "20/09/2026". Separamos o texto em vez de usar new Date()
  // para evitar o erro de fuso horário (o dia poderia aparecer como 19).
  function formatarData(iso) {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  // Só aceita links que começam com http:// ou https://
  function linkSeguro(url) {
    return typeof url === "string" && /^https?:\/\//.test(url);
  }

  // Cria um elemento; o texto entra por textContent (seguro, nunca innerHTML)
  function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto) elemento.textContent = texto;
    return elemento;
  }

  async function carregarCertificados() {
    const resposta = await fetch(CAMINHO_DADOS);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
  }

  /* ---------- 2. Carrossel (página principal) ---------- */

  async function iniciarCarrossel() {
    const carrossel = document.querySelector("#carrossel");
    if (!carrossel) return; // esta página não tem carrossel

    const palco = carrossel.querySelector("#carrossel-palco");
    const botaoAnterior = carrossel.querySelector("#carrossel-anterior");
    const botaoProximo = carrossel.querySelector("#carrossel-proximo");
    const titulo = carrossel.querySelector("#carrossel-titulo");
    const contador = carrossel.querySelector("#carrossel-contador");
    const validar = carrossel.querySelector("#carrossel-validar");

    function mostrarErro(mensagem) {
      titulo.textContent = mensagem;
      contador.textContent = "";
      validar.hidden = true;
      botaoAnterior.hidden = true;
      botaoProximo.hidden = true;
    }

    // 2.1 Buscar os dados e ficar só com os destaques
    let certificados;
    try {
      const todos = await carregarCertificados();
      certificados = todos.filter((c) => c.destaque === true);
    } catch (erro) {
      console.error("[certificados] Falha ao carregar o JSON:", erro);
      mostrarErro("Não foi possível carregar os certificados agora.");
      return;
    }

    if (certificados.length === 0) {
      mostrarErro("Nenhum certificado em destaque por enquanto.");
      return;
    }

    // 2.2 Criar um slide para cada certificado
    const total = certificados.length;
    const slides = [];

    certificados.forEach((c, i) => {
      const slide = criar("article", "slide");
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} de ${total}`);

      const imagem = criar("img");
      imagem.src = c.imagem;
      imagem.alt = c.alt;
      imagem.draggable = false; // senão o navegador "arrasta a imagem" e atrapalha o arraste do carrossel

      slide.append(imagem);
      palco.append(slide);
      slides.push(slide);
    });

    // 2.3 Estado: um único número, o índice do slide atual
    let indiceAtual = 0;

    // Dado o índice de um slide, diz onde ele está em relação ao atual.
    // O resto da divisão (%) faz a lista "dar a volta" (circular).
    function posicaoDoSlide(i) {
      const distancia = (i - indiceAtual + total) % total;
      if (distancia === 0) return "atual";
      if (distancia === 1) return "proximo";
      if (distancia === total - 1) return "anterior";
      return "oculto";
    }

    // Única função que mexe na tela: tudo passa por ela
    function atualizar() {
      slides.forEach((slide, i) => {
        const posicao = posicaoDoSlide(i);
        slide.dataset.posicao = posicao; // o CSS reage a [data-posicao="..."]
        slide.setAttribute("aria-hidden", posicao === "atual" ? "false" : "true");
      });

      const c = certificados[indiceAtual];
      const numero = String(indiceAtual + 1).padStart(2, "0");
      const quantidade = String(total).padStart(2, "0");

      titulo.textContent = c.titulo;
      contador.textContent = `${numero} / ${quantidade} · ${c.instituicao} · ${c.horas} h · ${formatarData(c.data)}`;

      if (linkSeguro(c.link)) {
        validar.href = c.link;
        validar.hidden = false;
      } else {
        validar.hidden = true;
      }
    }

    function irPara(novoIndice) {
      indiceAtual = (novoIndice + total) % total;
      atualizar();
    }

    // 2.4 Setas na tela
    if (total === 1) {
      botaoAnterior.hidden = true;
      botaoProximo.hidden = true;
    }
    botaoAnterior.addEventListener("click", () => irPara(indiceAtual - 1));
    botaoProximo.addEventListener("click", () => irPara(indiceAtual + 1));

    // 2.5 Teclado: só funciona com o foco dentro do carrossel.
    // stopPropagation impede que o evento suba até o modo tela cheia do main.js.
    carrossel.addEventListener("keydown", (evento) => {
      if (evento.key === "ArrowLeft") {
        irPara(indiceAtual - 1);
      } else if (evento.key === "ArrowRight") {
        irPara(indiceAtual + 1);
      } else {
        return; // outras teclas seguem o caminho normal
      }
      evento.preventDefault();
      evento.stopPropagation();
    });

    // 2.6 Toque e arraste (pointer events: mouse, dedo e caneta no mesmo código)
    let inicioX = null;
    let arrastou = false;

    palco.addEventListener("pointerdown", (evento) => {
      if (evento.pointerType === "mouse" && evento.button !== 0) return;
      inicioX = evento.clientX;
      arrastou = false;
    });

    palco.addEventListener("pointerup", (evento) => {
      if (inicioX === null) return;
      const deslocamento = evento.clientX - inicioX;
      inicioX = null;

      if (Math.abs(deslocamento) > LIMITE_ARRASTE) {
        arrastou = true;
        // arrastou para a esquerda (negativo) -> próximo slide
        irPara(indiceAtual + (deslocamento < 0 ? 1 : -1));
      }
    });

    palco.addEventListener("pointercancel", () => {
      inicioX = null;
    });

    palco.addEventListener("click", (evento) => {
      if (arrastou) {
        arrastou = false; 
        return;
      }
      const slide = evento.target.closest(".slide");
      if (!slide) return;
      if (slide.dataset.posicao === "anterior") irPara(indiceAtual - 1);
      if (slide.dataset.posicao === "proximo") irPara(indiceAtual + 1);
    });

    atualizar(); 
  }

  /* ---------- 3. Galeria (certificados.html) ---------- */

  async function iniciarGaleria() {
    const grade = document.querySelector("#galeria-grade");
    if (!grade) return;

    const resumo = document.querySelector("#galeria-resumo");

    let certificados;
    try {
      const todos = await carregarCertificados();
      // Datas ISO ("2026-09-20") ordenam corretamente como texto: mais recente primeiro
      certificados = [...todos].sort((a, b) => b.data.localeCompare(a.data));
    } catch (erro) {
      console.error("[certificados] Falha ao carregar o JSON:", erro);
      resumo.textContent = "Não foi possível carregar os certificados agora.";
      return;
    }

    const totalHoras = certificados.reduce((soma, c) => soma + Number(c.horas), 0);
    const palavra = certificados.length === 1 ? "certificado" : "certificados";
    resumo.textContent = `${certificados.length} ${palavra} · ${totalHoras} horas no total`;

    certificados.forEach((c) => {
      const item = criar("li", "galeria-item");
      const card = criar("article", "galeria-card");

      const imagem = criar("img", "galeria-imagem");
      imagem.src = c.imagem;
      imagem.alt = c.alt;
      imagem.loading = "lazy"; 
      imagem.decoding = "async";

      const corpo = criar("div", "galeria-corpo");
      const meta = criar("p", "galeria-meta", `${c.instituicao} · ${c.horas} h`);
      const nome = criar("h2", "galeria-titulo", c.titulo);

      const data = criar("time", "galeria-data", formatarData(c.data));
      data.dateTime = c.data;

      corpo.append(meta, nome, data);

      if (linkSeguro(c.link)) {
        const link = criar("a", "galeria-link", "Ver credencial");
        link.href = c.link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", `Ver credencial de ${c.titulo} (abre em nova aba)`);
        corpo.append(link);
      }

      card.append(imagem, corpo);
      item.append(card);
      grade.append(item);
    });
  }

  /* ---------- 4. Arranque ---------- */
  // Cada função confere se a página tem o seu elemento e, se não tiver, sai logo.
  iniciarCarrossel();
  iniciarGaleria();
})();