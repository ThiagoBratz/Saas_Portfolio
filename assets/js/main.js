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
const secoes = document.querySelectorAll("main section[id]");
const linksMenu = document.querySelectorAll('header nav a[href^="#"]');

function marcarItemAtivo(id) {
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
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        marcarItemAtivo(entrada.target.id);
      }
    });
  },
  { rootMargin: "-45% 0px -45% 0px" }
);

secoes.forEach((secao) => observador.observe(secao));

const barraProgresso = document.querySelector("#progresso");

function atualizarProgresso() {
  if (!barraProgresso) return;

  const rolado = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const proporcao = total > 0 ? rolado / total : 0;
  barraProgresso.style.transform = `scaleX(${proporcao})`;
}

window.addEventListener("scroll", atualizarProgresso, { passive: true });
window.addEventListener("resize", atualizarProgresso);
atualizarProgresso();

// ===== 3. Entrada com fade ao rolar =====
const elementosRevelar = document.querySelectorAll(".revelar");

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

elementosRevelar.forEach((el) => observadorRevelar.observe(el));