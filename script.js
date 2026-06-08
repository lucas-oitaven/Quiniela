const favorites = [
  "España",
  "Francia",
  "Argentina",
  "Inglaterra",
  "Brasil",
  "Portugal",
  "Alemania",
  "Países Bajos / Holanda",
  "Uruguay",
  "Croacia",
  "Bélgica"
];

const medium = [
  "Marruecos",
  "Corea del Sur",
  "Senegal",
  "México",
  "Estados Unidos",
  "Japón",
  "Suiza",
  "Ecuador",
  "Turquía",
  "República Checa",
  "Suecia"
];

const lessLikely = [
  "Austria",
  "Colombia",
  "Irán",
  "Noruega",
  "Sudáfrica",
  "Canadá", 
  "Bosnia",
  "Catar",
  "Haití",
  "Escocia",
  "Paraguay",
  "Australia",
  "Curazao",
  "Costa de Marfil",
  "Túnez",
  "Egipto",
  "Nueva Zelanda",
  "Cabo Verde",
  "Arabia Saudita",
  "Irak",
  "Argelia",
  "Jordania",
  "República Democrática del Congo",
  "Uzbekistán",
  "Ghana",
  "Panamá"
];

const participants = [
  "Jorge",
  "Silvia",
  "Sylvia",
  "Lily",
  "Romi",
  "Estefi",
  "Lucas",
  "Luis",
  "Julian",
  "Allegra",
  "Jorgito"
];

let lastResultsText = "";
let revealTimers = [];
let drawTimer = null;
let scrollTimers = [];
let isDrawing = false;

const teamFlagCodes = {
  "España": "es",
  "Francia": "fr",
  "Argentina": "ar",
  "Inglaterra": "gb-eng",
  "Brasil": "br",
  "Portugal": "pt",
  "Alemania": "de",
  "Países Bajos / Holanda": "nl",
  "Uruguay": "uy",
  "Croacia": "hr",
  "Bélgica": "be",
  "Marruecos": "ma",
  "Colombia": "co",
  "Senegal": "sn",
  "México": "mx",
  "Estados Unidos": "us",
  "Japón": "jp",
  "Suiza": "ch",
  "Ecuador": "ec",
  "Turquía": "tr",
  "Sudáfrica": "za",
  "República Checa": "cz",
  "Canadá": "ca",
  "Bosnia": "ba",
  "Catar": "qa",
  "Haití": "ht",
  "Escocia": "gb-sct",
  "Paraguay": "py",
  "Australia": "au",
  "Curazao": "cw",
  "Costa de Marfil": "ci",
  "Suecia": "se",
  "Túnez": "tn",
  "Egipto": "eg",
  "Nueva Zelanda": "nz",
  "Cabo Verde": "cv",
  "Arabia Saudita": "sa",
  "Irak": "iq",
  "Argelia": "dz",
  "Jordania": "jo",
  "República Democrática del Congo": "cd",
  "Uzbekistán": "uz",
  "Ghana": "gh",
  "Panamá": "pa",
  "Austria": "at",
  "Corea del Sur": "kr",
  "Noruega": "no",
  "Irán": "ir"
};

const drawBtn = document.getElementById("drawBtn");
const resetBtn = document.getElementById("resetBtn");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const printBtn = document.getElementById("printBtn");
const participantList = document.getElementById("participantList");
const counter = document.getElementById("counter");
const message = document.getElementById("message");
const resultsSection = document.getElementById("resultsSection");
const results = document.getElementById("results");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function updateUI() {
  counter.textContent = `${participants.length} participantes`;

  participantList.innerHTML = "";

  participants.forEach(name => {
    const item = document.createElement("li");
    item.dataset.participant = name;

    item.innerHTML = `
      <span>${escapeHTML(name)}</span>
    `;

    participantList.appendChild(item);
  });

  syncActionButtons();
}

function shuffle(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }

  return copy;
}

function drawTeams() {
  if (isDrawing) {
    return;
  }

  const requiredLessLikely = participants.length * 2;

  if (
    favorites.length < participants.length ||
    medium.length < participants.length ||
    lessLikely.length < requiredLessLikely
  ) {
    setMessage("No hay selecciones suficientes para realizar este sorteo.", "error");
    return;
  }

  const shuffledFavorites = shuffle(favorites);
  const shuffledMedium = shuffle(medium);
  const shuffledLessLikely = shuffle(lessLikely);

  const draw = participants.map((participant, index) => ({
    participant,
    favorite: shuffledFavorites[index],
    medium: shuffledMedium[index],
    lessLikely: [
      shuffledLessLikely[index * 2],
      shuffledLessLikely[index * 2 + 1]
    ]
  }));

  startDrumRoll(draw);
}

function renderResults(draw) {
  clearTimers();
  results.innerHTML = "";
  results.classList.remove("is-empty");
  resultsSection.classList.remove("hidden");

  lastResultsText = "Resultado del sorteo\n\n";

  draw.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "result-card is-pending";

    const teams = [item.favorite, item.medium, item.lessLikely[0], item.lessLikely[1]];
    const teamsMarkup = teams
      .map(team => {
        const flagMarkup = getFlagMarkup(team);
        return `
          <li>
            <span class="flag" aria-hidden="true">${flagMarkup}</span>
            <span class="team-name">${escapeHTML(team)}</span>
          </li>
        `;
      })
      .join("");

    card.innerHTML = `
      <h3>${escapeHTML(item.participant)}</h3>
      <ul class="pick-list">
        ${teamsMarkup}
      </ul>
    `;

    results.appendChild(card);

    const timer = window.setTimeout(() => {
      card.classList.remove("is-pending");
      card.classList.add("revealed");
    }, index * 130);
    revealTimers.push(timer);

    lastResultsText += `${item.participant}\n`;
    lastResultsText += `- ${item.favorite}\n`;
    lastResultsText += `- ${item.medium}\n`;
    lastResultsText += `- ${item.lessLikely[0]}\n`;
    lastResultsText += `- ${item.lessLikely[1]}\n\n`;
  });

}

function startDrumRoll(draw) {
  clearTimers();
  isDrawing = true;
  syncActionButtons();
  lastResultsText = "";
  resultsSection.classList.remove("hidden");
  scrollToResultsSection();
  results.innerHTML = "";
  results.classList.remove("is-empty");

  participants.forEach((participant, index) => {
    const card = document.createElement("article");
    card.className = "result-card drum-roll-card";
    card.style.animationDelay = `${index * 70}ms`;
    card.innerHTML = `
      <h3>${escapeHTML(participant)}</h3>
      <div class="drum-roll-body" aria-hidden="true">
        <p class="drum-roll-label">Sorteando...</p>
        <div class="drum-roll-lines">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    results.appendChild(card);
  });

  setMessage("Girando bolitas...", "");

  drawTimer = window.setTimeout(() => {
    drawTimer = null;
    isDrawing = false;
    renderResults(draw);
    setMessage("Sorteo realizado con éxito.", "success");
    syncActionButtons();
  }, 1800);
}

async function copyResults() {
  if (!lastResultsText) {
    setMessage("Primero realiza un sorteo.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(lastResultsText);
    setMessage("Resultado copiado al portapapeles.", "success");
  } catch {
    setMessage("No fue posible copiar automáticamente.", "error");
  }
}

async function downloadResultsImage() {
  if (!lastResultsText) {
    setMessage("Primero realiza un sorteo.", "error");
    return;
  }

  if (typeof window.html2canvas !== "function") {
    setMessage("La herramienta de imagen no está disponible en este momento.", "error");
    return;
  }

  try {
    resultsSection.classList.add("capture-export");

    const canvas = await window.html2canvas(resultsSection, {
      backgroundColor: "#123a31",
      scale: 2,
      useCORS: true,
      onclone: clonedDocument => {
        const clonedSection = clonedDocument.getElementById("resultsSection");
        if (!clonedSection) {
          return;
        }

        const cloneStyle = clonedDocument.createElement("style");
        cloneStyle.textContent = `
          #resultsSection {
            background: #123a31 !important;
            border-color: rgba(0, 204, 142, 0.35) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: 0 18px 44px rgba(3, 17, 14, 0.45) !important;
            opacity: 1 !important;
            filter: none !important;
          }

          #resultsSection * {
            opacity: 1 !important;
            filter: none !important;
            mix-blend-mode: normal !important;
          }

          #resultsSection .result-card {
            background: #f8f8f8 !important;
          }

          #resultsSection .pick-list li {
            background: #ffffff !important;
            border-color: #d2d9d6 !important;
            color: #0f231e !important;
          }
        `;
        clonedDocument.head.appendChild(cloneStyle);

        clonedSection.style.background = "#16362f";
        clonedSection.style.backdropFilter = "none";
        clonedSection.style.webkitBackdropFilter = "none";
        clonedSection.style.boxShadow = "0 18px 44px rgba(3, 17, 14, 0.45)";
        clonedSection.style.opacity = "1";
        clonedSection.style.filter = "none";
      }
    });

    const link = document.createElement("a");
    link.download = "resultado-quiniela.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    setMessage("Imagen del sorteo generada con éxito.", "success");
  } catch {
    setMessage("No fue posible generar la imagen ahora.", "error");
  } finally {
    resultsSection.classList.remove("capture-export");
  }
}

function printResults() {
  if (!lastResultsText) {
    setMessage("Primero realiza un sorteo.", "error");
    return;
  }

  window.print();
}

function resetAll() {
  clearTimers();
  isDrawing = false;
  lastResultsText = "";
  results.innerHTML = "";
  results.classList.add("is-empty");
  resultsSection.classList.add("hidden");
  setMessage("");
  syncActionButtons();
}

function syncActionButtons() {
  const hasResults = Boolean(lastResultsText);
  drawBtn.disabled = isDrawing;
  resetBtn.disabled = isDrawing;
  copyBtn.disabled = isDrawing || !hasResults;
  downloadBtn.disabled = isDrawing || !hasResults;
  printBtn.disabled = isDrawing || !hasResults;
}

function clearTimers() {
  revealTimers.forEach(timer => window.clearTimeout(timer));
  revealTimers = [];

  scrollTimers.forEach(timer => window.clearTimeout(timer));
  scrollTimers = [];

  if (drawTimer) {
    window.clearTimeout(drawTimer);
    drawTimer = null;
  }
}

function scrollToResultsSection() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = prefersReducedMotion ? "auto" : "smooth";

  const performScroll = () => {
    resultsSection.scrollIntoView({ behavior, block: "start" });
  };

  performScroll();

  // Retry after initial layout/font/image settling so the first click is reliable.
  [90, 240, 480].forEach(delay => {
    const timer = window.setTimeout(() => {
      if (!resultsSection.classList.contains("hidden")) {
        performScroll();
      }
    }, delay);
    scrollTimers.push(timer);
  });
}

function showEstefiHeartPop() {
  const existingPop = document.querySelector(".easter-heart-pop");
  if (existingPop) {
    existingPop.remove();
  }

  const pop = document.createElement("div");
  pop.className = "easter-heart-pop";
  pop.setAttribute("role", "status");
  pop.setAttribute("aria-live", "polite");
  pop.innerHTML = "<span class=\"easter-heart-icon\" aria-hidden=\"true\">&#10084;&#65039;</span>";

  document.body.appendChild(pop);

  window.requestAnimationFrame(() => {
    pop.classList.add("show");
  });

  window.setTimeout(() => {
    pop.classList.remove("show");
    window.setTimeout(() => {
      pop.remove();
    }, 260);
  }, 1400);
}

function getFlagMarkup(team) {
  const countryCode = teamFlagCodes[team];

  if (!countryCode) {
    return "<span class=\"flag-fallback\">?</span>";
  }

  const src = `https://flagcdn.com/${countryCode}.svg`;
  const alt = `Bandera de ${escapeHTML(team)}`;

  return `<img class=\"flag-svg\" src=\"${src}\" alt=\"${alt}\" loading=\"lazy\" decoding=\"async\">`;
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

drawBtn.addEventListener("click", drawTeams);
resetBtn.addEventListener("click", resetAll);
copyBtn.addEventListener("click", copyResults);
downloadBtn.addEventListener("click", downloadResultsImage);
printBtn.addEventListener("click", printResults);
participantList.addEventListener("click", event => {
  const item = event.target.closest("li");
  if (!item) {
    return;
  }

  if (item.dataset.participant === "Estefi") {
    showEstefiHeartPop();
  }
});

updateUI();
results.innerHTML = "";
results.classList.add("is-empty");
resultsSection.classList.add("hidden");
setMessage("Sorteo listo para ejecutar.", "success");
