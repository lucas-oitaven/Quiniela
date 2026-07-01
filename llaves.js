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
    const aId = Number(a.matchId ?? a.id);
    const bId = Number(b.matchId ?? b.id);
    if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
      return aId - bId;
    }

    const aKey = `${a.date || "9999-99-99"} ${a.time || "99:99"}`;
    const bKey = `${b.date || "9999-99-99"} ${b.time || "99:99"}`;
    return aKey.localeCompare(bKey);
  });
}

function getMatchId(match) {
  const value = Number(match?.matchId ?? match?.id);
  return Number.isFinite(value) ? value : null;
}

function parseWinnerMatchRef(label) {
  const match = String(label || "").match(/winner\s+match\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildBracketOrderMap(stageMatches) {
  const orderMap = new Map();

  const finalIds = stageMatches.final
    .map(getMatchId)
    .filter(id => id !== null);
  if (!finalIds.length) return orderMap;

  const stagesAsc = ["round32", "round16", "quarterfinal", "semifinal", "final"];
  const byId = new Map();
  stagesAsc.forEach(stageKey => {
    (stageMatches[stageKey] || []).forEach(match => {
      const id = getMatchId(match);
      if (id !== null) byId.set(id, match);
    });
  });

  orderMap.set("final", finalIds);

  for (let i = stagesAsc.length - 1; i > 0; i--) {
    const currentStage = stagesAsc[i];
    const prevStage = stagesAsc[i - 1];
    const currentOrder = orderMap.get(currentStage) || [];
    const prevOrder = [];

    currentOrder.forEach(matchId => {
      const match = byId.get(matchId);
      if (!match) return;
      const homeRef = parseWinnerMatchRef(match.homeLabel || match.home_team_label);
      const awayRef = parseWinnerMatchRef(match.awayLabel || match.away_team_label);
      if (homeRef !== null) prevOrder.push(homeRef);
      if (awayRef !== null) prevOrder.push(awayRef);
    });

    if (prevOrder.length) {
      orderMap.set(prevStage, prevOrder);
    }
  }

  return orderMap;
}

function orderStageMatches(stageKey, matches, orderMap) {
  const orderedIds = orderMap.get(stageKey);
  if (!orderedIds?.length) return sortMatches(matches);

  const byId = new Map();
  const withoutId = [];

  matches.forEach(match => {
    const id = getMatchId(match);
    if (id === null) withoutId.push(match);
    else byId.set(id, match);
  });

  const ordered = orderedIds
    .map(id => byId.get(id))
    .filter(Boolean);

  const leftovers = matches.filter(match => {
    const id = getMatchId(match);
    return id !== null && !orderedIds.includes(id);
  });

  return [...ordered, ...sortMatches(leftovers), ...sortMatches(withoutId)];
}

function normalizeTeamKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function isPlaceholder(team) {
  const value = String(team || "").trim();
  return !value || /^(tbd|winner|loser|1st|2nd|3rd|ganador|perdedor|primero|segundo|tercero|runner-up)/i.test(value);
}

function teamRow(team, score, won, eliminated) {
  const displayTeam = typeof wcGetDisplayTeamName === "function"
    ? wcGetDisplayTeamName(team || "Por definir")
    : (team || "Por definir");
  const safeTeam = wcEscapeHTML(displayTeam);
  const visual = isPlaceholder(team)
    ? '<span class="bracket-seed" aria-hidden="true">?</span>'
    : `<span class="flag bracket-flag" aria-hidden="true">${wcGetFlag(team, "sm")}</span>`;
  return `
    <div class="bracket-team${won ? " bracket-team--winner" : ""}${eliminated ? " bracket-team--eliminated" : ""}">
      ${visual}<span class="bracket-team-name">${safeTeam}</span>
      <span class="bracket-team-score">${score ?? ""}</span>
    </div>`;
}

function formatMatchMeta(match) {
  const date = match.date ? match.date.split("-").reverse().join("/") : "Fecha por definir";
  const time = wcFormatMexicoTime(match.time) || (match.time ? String(match.time).split(" ")[0] : "");
  return [date, time].filter(Boolean).join(" · ");
}

function winnerIndex(score) {
  if (!score?.ft) return -1;
  const [ft1, ft2] = score.ft;
  if (ft1 > ft2) return 0;
  if (ft2 > ft1) return 1;
  if (Array.isArray(score.p) && score.p.length >= 2) {
    if (score.p[0] > score.p[1]) return 0;
    if (score.p[1] > score.p[0]) return 1;
  }
  if (Array.isArray(score.et) && score.et.length >= 2) {
    if (score.et[0] > score.et[1]) return 0;
    if (score.et[1] > score.et[0]) return 1;
  }
  return -1;
}

function teamDisplayScore(score, teamIndex) {
  if (!score?.ft) return "";
  const base = score.ft[teamIndex];
  if (!Array.isArray(score.p) || score.p.length < 2 || score.ft[0] !== score.ft[1]) {
    return String(base);
  }
  return `${base} (${score.p[teamIndex]})`;
}

function renderMatch(match, index, stageKey, eliminatedTeamKeys) {
  const card = document.createElement("article");
  const completed = Boolean(match.score && match.score.ft);
  const scores = completed
    ? [teamDisplayScore(match.score, 0), teamDisplayScore(match.score, 1)]
    : ["", ""];
  const winner = completed ? winnerIndex(match.score) : -1;
  const team1Eliminated = eliminatedTeamKeys.has(normalizeTeamKey(match.team1)) && winner !== 0;
  const team2Eliminated = eliminatedTeamKeys.has(normalizeTeamKey(match.team2)) && winner !== 1;
  card.className = `bracket-match${completed ? " bracket-match--done" : ""}`;
  card.dataset.stage = stageKey;
  card.dataset.matchIndex = String(index);
  card.innerHTML = `
    <div class="bracket-match-topline"><span>${wcEscapeHTML(formatMatchMeta(match))}</span></div>
    <div class="bracket-pair">
      ${teamRow(match.team1, scores[0], winner === 0, team1Eliminated)}
      ${teamRow(match.team2, scores[1], winner === 1, team2Eliminated)}
    </div>
    ${match.score?.et ? '<div class="bracket-extra-score">Tiempo extra</div>' : ""}
  `;
  return card;
}

function stageMatchTop(index, expected) {
  const multiplier = 16 / expected;
  return ((index + 0.5) * multiplier / 16) * 100;
}

function renderStage(stage, matches, thirdPlaceMatch, eliminatedTeamKeys) {
  const column = document.createElement("section");
  column.className = `bracket-stage bracket-stage--${stage.key}`;
  column.setAttribute("aria-label", stage.title);
  column.innerHTML = `<h3 class="bracket-stage-title">${stage.title}</h3><div class="bracket-stage-matches"></div>`;
  const matchesWrap = column.querySelector(".bracket-stage-matches");

  if (!matches.length) {
    matchesWrap.innerHTML = '<p class="bracket-empty">Por definir</p>';
  } else {
    matches.forEach((match, index) => {
      const card = renderMatch(match, index, stage.key, eliminatedTeamKeys);
      card.style.top = `${stageMatchTop(index, stage.expected)}%`;
      matchesWrap.appendChild(card);
    });
  }

  if (stage.key === "final" && thirdPlaceMatch) {
    const third = renderMatch(thirdPlaceMatch, 0, "third", eliminatedTeamKeys);
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

  const knockoutEliminated = typeof wcComputeKnockoutEliminatedTeams === "function"
    ? wcComputeKnockoutEliminatedTeams(matches)
    : new Set();
  const eliminatedTeamKeys = new Set([...knockoutEliminated].map(normalizeTeamKey));

  const stageMatches = Object.fromEntries(BRACKET_STAGES.map(stage => [stage.key, sortMatches(knockout.filter(match => normalizeRound(match.round) === stage.key))]));
  const orderMap = buildBracketOrderMap(stageMatches);
  const thirdPlaceMatch = sortMatches(knockout.filter(match => normalizeRound(match.round) === "third"))[0];
  BRACKET_STAGES.forEach(stage => {
    const orderedStageMatches = orderStageMatches(stage.key, stageMatches[stage.key], orderMap);
    canvas.appendChild(renderStage(stage, orderedStageMatches, thirdPlaceMatch, eliminatedTeamKeys));
  });
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
  const homePen = Number(game.home_penalty_score);
  const awayPen = Number(game.away_penalty_score);
  const penalties = Number.isFinite(homePen) && Number.isFinite(awayPen) ? [homePen, awayPen] : null;
  return {
    matchId: Number(game.id),
    team1: game.home_team_name_en || game.home_team_label || "Por definir",
    team2: game.away_team_name_en || game.away_team_label || "Por definir",
    homeLabel: game.home_team_label || "",
    awayLabel: game.away_team_label || "",
    date,
    time,
    round,
    score: completed && Number.isFinite(homeScore) && Number.isFinite(awayScore)
      ? { ft: [homeScore, awayScore], ...(penalties ? { p: penalties } : {}) }
      : null,
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
