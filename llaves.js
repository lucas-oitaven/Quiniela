// llaves.js — llave profesional para GitHub Pages (sin backend ni API key)
// Fuente prioritaria: worldcup26.ir/get/games
// Fallback: openfootball/worldcup.json mediante wcLoadData().

const BRACKET_STAGES = [
  { key: "round32", title: "Ronda de 32", expected: 16, aliases: ["round of 32", "round 32", "r32", "dieciseisavos", "1/16"] },
  { key: "round16", title: "Octavos", expected: 8, aliases: ["round of 16", "round 16", "r16", "octavos", "1/8"] },
  { key: "quarterfinal", title: "Cuartos", expected: 4, aliases: ["quarterfinal", "quarter", "qf", "cuartos", "1/4"] },
  { key: "semifinal", title: "Semifinales", expected: 2, aliases: ["semifinal", "semi", "sf"] },
  { key: "final", title: "Final", expected: 1, aliases: ["final"] },
];

const THIRD_PLACE = { key: "third", aliases: ["third place", "third", "3rd", "tercer lugar", "third-place"] };
const FREE_BRACKET_ENDPOINT = "https://worldcup26.ir/get/games";
const REQUEST_TIMEOUT_MS = 7000;

function normalizeRound(round) {
  const value = String(round || "").trim().toLowerCase();
  if (!value) return "";
  const allStages = [...BRACKET_STAGES, THIRD_PLACE];
  const found = allStages.find(stage => stage.aliases.some(alias => value === alias || value.includes(alias)));
  return found ? found.key : "";
}

function sortMatches(matches) {
  return [...matches].sort((a, b) => {
    const aKey = `${a.date || "9999-99-99"} ${a.time || "99:99"}`;
    const bKey = `${b.date || "9999-99-99"} ${b.time || "99:99"}`;
    return aKey.localeCompare(bKey);
  });
}

function isPlaceholder(team) {
  const value = String(team || "").trim();
  return !value || /^(tbd|winner|loser|1st|2nd|3rd|ganador|perdedor|primero|segundo|tercero|runner-up)/i.test(value);
}

function teamRow(team, score, won) {
  const safeTeam = wcEscapeHTML(team || "Por definir");
  const visual = isPlaceholder(team)
    ? '<span class="bracket-seed" aria-hidden="true">?</span>'
    : `<span class="flag bracket-flag" aria-hidden="true">${wcGetFlag(team, "sm")}</span>`;
  return `
    <div class="bracket-team${won ? " bracket-team--winner" : ""}">
      ${visual}<span class="bracket-team-name">${safeTeam}</span>
      <span class="bracket-team-score">${score ?? ""}</span>
    </div>`;
}

function formatMatchMeta(match) {
  const date = match.date ? match.date.split("-").reverse().join("/") : "Fecha por definir";
  const time = wcFormatMexicoTime(match.time) || (match.time ? String(match.time).split(" ")[0] : "");
  return [date, time].filter(Boolean).join(" · ");
}

function renderMatch(match, index, stageKey) {
  const card = document.createElement("article");
  const completed = Boolean(match.score && match.score.ft);
  const scores = completed ? match.score.ft : ["", ""];
  const winner = completed ? (scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1) : -1;
  card.className = `bracket-match${completed ? " bracket-match--done" : ""}`;
  card.dataset.stage = stageKey;
  card.dataset.matchIndex = String(index);
  card.innerHTML = `
    <div class="bracket-match-topline"><span>${wcEscapeHTML(formatMatchMeta(match))}</span></div>
    <div class="bracket-pair">
      ${teamRow(match.team1, scores[0], winner === 0)}
      ${teamRow(match.team2, scores[1], winner === 1)}
    </div>
    ${match.score?.p ? `<div class="bracket-extra-score">Pen. ${match.score.p[0]}-${match.score.p[1]}</div>` : match.score?.et ? '<div class="bracket-extra-score">Tiempo extra</div>' : ""}
  `;
  return card;
}

function stageMatchTop(index, expected) {
  const multiplier = 16 / expected;
  return ((index + 0.5) * multiplier / 16) * 100;
}

function renderStage(stage, matches, thirdPlaceMatch) {
  const column = document.createElement("section");
  column.className = `bracket-stage bracket-stage--${stage.key}`;
  column.setAttribute("aria-label", stage.title);
  column.innerHTML = `<h3 class="bracket-stage-title">${stage.title}</h3><div class="bracket-stage-matches"></div>`;
  const matchesWrap = column.querySelector(".bracket-stage-matches");

  if (!matches.length) {
    matchesWrap.innerHTML = '<p class="bracket-empty">Por definir</p>';
  } else {
    matches.forEach((match, index) => {
      const card = renderMatch(match, index, stage.key);
      card.style.top = `${stageMatchTop(index, stage.expected)}%`;
      matchesWrap.appendChild(card);
    });
  }

  if (stage.key === "final" && thirdPlaceMatch) {
    const third = renderMatch(thirdPlaceMatch, 0, "third");
    third.classList.add("bracket-match--third");
    third.innerHTML = `<div class="bracket-third-label">Tercer lugar</div>${third.innerHTML}`;
    matchesWrap.appendChild(third);
  }
  return column;
}

function getRelativeBox(element, parentRect) {
  const rect = element.getBoundingClientRect();
  return { left: rect.left - parentRect.left, right: rect.right - parentRect.left, cy: rect.top - parentRect.top + rect.height / 2 };
}

function drawConnectors() {
  const canvas = document.querySelector(".bracket-canvas");
  const svg = document.querySelector(".bracket-connectors");
  if (!canvas || !svg) return;
  const canvasRect = canvas.getBoundingClientRect();
  const width = canvas.scrollWidth;
  const height = canvas.scrollHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.innerHTML = "";

  for (let stageIndex = 0; stageIndex < BRACKET_STAGES.length - 1; stageIndex++) {
    const sourceStage = BRACKET_STAGES[stageIndex].key;
    const targetStage = BRACKET_STAGES[stageIndex + 1].key;
    const sourceCards = [...canvas.querySelectorAll(`.bracket-match[data-stage="${sourceStage}"]`)];
    const targetCards = [...canvas.querySelectorAll(`.bracket-match[data-stage="${targetStage}"]`)];
    sourceCards.forEach((source, index) => {
      const target = targetCards[Math.floor(index / 2)];
      if (!target) return;
      const from = getRelativeBox(source, canvasRect);
      const to = getRelativeBox(target, canvasRect);
      const elbow = from.right + Math.max(20, (to.left - from.right) * 0.48);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("class", "bracket-connector-path");
      path.setAttribute("d", `M ${from.right} ${from.cy} H ${elbow} V ${to.cy} H ${to.left}`);
      svg.appendChild(path);
    });
  }
}

function renderBracket(matches) {
  const container = document.getElementById("bracketContainer");
  const status = document.getElementById("bracketStatus");
  const knockout = matches.filter(match => !match.group && normalizeRound(match.round));
  container.innerHTML = "";
  if (!knockout.length) {
    status.className = "message error";
    status.textContent = "Todavía no hay partidos de eliminación directa disponibles en la fuente de datos.";
    return false;
  }

  status.className = "message";
  status.textContent = "";
  const canvas = document.createElement("div");
  canvas.className = "bracket-canvas";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("bracket-connectors");
  svg.setAttribute("aria-hidden", "true");
  canvas.appendChild(svg);

  const stageMatches = Object.fromEntries(BRACKET_STAGES.map(stage => [stage.key, sortMatches(knockout.filter(match => normalizeRound(match.round) === stage.key))]));
  const thirdPlaceMatch = sortMatches(knockout.filter(match => normalizeRound(match.round) === "third"))[0];
  BRACKET_STAGES.forEach(stage => canvas.appendChild(renderStage(stage, stageMatches[stage.key], thirdPlaceMatch)));
  container.appendChild(canvas);
  requestAnimationFrame(drawConnectors);
  return true;
}

function parsePrimaryDate(value) {
  const match = String(value || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})/);
  if (!match) return { date: "", time: "" };
  const [, month, day, year, time] = match;
  return { date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`, time };
}

function primaryRound(type) {
  return ({ r32: "Round of 32", r16: "Round of 16", qf: "Quarterfinal", sf: "Semifinal", third: "Third place", final: "Final" })[String(type || "").toLowerCase()] || "";
}

function primaryToMatch(game) {
  const { date, time } = parsePrimaryDate(game.local_date);
  const round = primaryRound(game.type);
  const completed = String(game.finished || "").toUpperCase() === "TRUE" || String(game.finished || "").toLowerCase() === "finished";
  const homeScore = Number(game.home_score);
  const awayScore = Number(game.away_score);
  return {
    team1: game.home_team_name_en || game.home_team_label || "Por definir",
    team2: game.away_team_name_en || game.away_team_label || "Por definir",
    date,
    time,
    round,
    score: completed && Number.isFinite(homeScore) && Number.isFinite(awayScore) ? { ft: [homeScore, awayScore] } : null,
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadPrimaryBracketData() {
  const payload = await fetchWithTimeout(FREE_BRACKET_ENDPOINT);
  const games = Array.isArray(payload) ? payload : payload?.games;
  if (!Array.isArray(games)) throw new Error("Formato de respuesta no reconocido");
  const matches = games.map(primaryToMatch).filter(match => match.round);
  if (matches.length < 16) throw new Error("La fuente no devolvió la fase eliminatoria completa");
  return matches;
}

function setSource(sourceEl, source, fallbackReason = "") {
  if (!sourceEl) return;
  if (source === "primary") {
    sourceEl.innerHTML = 'Fuente de llaves: <a class="source-link" href="https://worldcup26.ir/get/games" target="_blank" rel="noopener">worldcup26.ir</a>';
    return;
  }
  sourceEl.innerHTML = `Fuente de respaldo: <a class="source-link" href="https://github.com/openfootball/worldcup.json" target="_blank" rel="noopener">openfootball/worldcup.json</a>${fallbackReason ? " — " + wcEscapeHTML(fallbackReason) : ""}`;
}

async function initBracket() {
  const status = document.getElementById("bracketStatus");
  const sourceEl = document.getElementById("dataSource");
  try {
    const primaryMatches = await loadPrimaryBracketData();
    if (renderBracket(primaryMatches)) {
      setSource(sourceEl, "primary");
      return;
    }
    throw new Error("No se pudo construir la llave desde la fuente principal");
  } catch (primaryError) {
    try {
      const fallback = await wcLoadData();
      renderBracket(fallback.matches || []);
      setSource(sourceEl, "fallback", "Se usó automáticamente porque la fuente principal no estuvo disponible.");
    } catch (fallbackError) {
      status.className = "message error";
      status.textContent = "No fue posible cargar las llaves desde ninguna fuente.";
      if (sourceEl) sourceEl.textContent = "Error al cargar los datos.";
    }
  }
}

window.addEventListener("resize", () => requestAnimationFrame(drawConnectors));
initBracket();
