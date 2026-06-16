// partidas.js — match results with date grouping and filter tabs
// depends on wc-data.js being loaded first

const WD = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

let allMatches = [];
let activeFilter = "upcoming";

function formatDate(dateStr) {
  if (!dateStr) return "Fecha sin definir";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WD[dt.getDay()]}, ${d} ${MO[m - 1]} ${y}`;
}

function formatScore(score) {
  if (!score) return null;

  if (score.p) {
    return `${score.ft[0]}-${score.ft[1]} <small class="match-score-note">(P ${score.p[0]}-${score.p[1]})</small>`;
  }

  if (score.et) {
    const s = score.et;
    return `${s[0]}-${s[1]} <small class="match-score-note">(ET)</small>`;
  }

  return `${score.ft[0]}-${score.ft[1]}`;
}

function getGroupLabel(m) {
  if (m.group) return m.group.replace(/^Group\s+/, "Grupo ");
  return "";
}

function renderMatchCard(m) {
  const isDone = Boolean(m.score && m.score.ft);
  const groupLabel = getGroupLabel(m);
  const round = m.round || "";
  const timeStr = m.time ? m.time.split(" ")[0] : "";
  const mexicoTime = wcFormatMexicoTime(m.time);

  const badgeClass = isDone ? "match-badge match-badge--done" : "match-badge match-badge--upcoming";
  const badgeText = isDone ? "Terminado" : (mexicoTime || timeStr || "Por jugar");
  const scoreHtml = isDone
    ? `<span class="match-score-main">${formatScore(m.score)}</span>`
    : `<span class="match-vs">vs</span>`;
  const groupChip = wcEscapeHTML(groupLabel || round || "Partido");

  const card = document.createElement("article");
  card.className = `match-card${isDone ? "" : " match-card--upcoming"}`;

  card.innerHTML = `
    <div class="match-card-chip">${groupChip}</div>
    <div class="match-card-body">
      <div class="match-team">
        <span class="match-flag" aria-hidden="true">
          <span class="flag">${wcGetFlag(m.team1 || "")}</span>
        </span>
        <span class="match-team-name">${wcEscapeHTML(m.team1 || "-")}</span>
      </div>
      <div class="match-score-wrap">${scoreHtml}</div>
      <div class="match-team">
        <span class="match-flag" aria-hidden="true">
          <span class="flag">${wcGetFlag(m.team2 || "")}</span>
        </span>
        <span class="match-team-name">${wcEscapeHTML(m.team2 || "-")}</span>
      </div>
    </div>
    <div class="match-card-foot">
      <span class="${badgeClass}">${wcEscapeHTML(badgeText)}</span>
      ${m.ground ? `<span class="match-ground">${wcEscapeHTML(m.ground)}</span>` : ""}
    </div>
  `;

  return card;
}

function getFiltered() {
  switch (activeFilter) {
    case "done":     return allMatches.filter(m => m.score && m.score.ft);
    case "upcoming": return allMatches.filter(m => !m.score || !m.score.ft);
    default:         return allMatches;
  }
}

function renderMatches() {
  const container = document.getElementById("matchesContainer");
  const filtered = getFiltered();

  if (filtered.length === 0) {
    container.innerHTML = '<p class="message">Sin partidos en este filtro.</p>';
    return;
  }

  // Sort chronologically then group by date
  const sorted = [...filtered].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const byDate = new Map();
  sorted.forEach(m => {
    const key = m.date || "0000-00-00";
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(m);
  });

  container.innerHTML = "";

  byDate.forEach((dayMatches, date) => {
    const section = document.createElement("section");
    section.className = "match-day";

    const label = document.createElement("h3");
    label.className = "match-day-label";
    label.textContent = formatDate(date);
    section.appendChild(label);

    const grid = document.createElement("div");
    grid.className = "match-cards";
    dayMatches.forEach(m => grid.appendChild(renderMatchCard(m)));
    section.appendChild(grid);
    container.appendChild(section);
  });
}

function setupFilters() {
  document.querySelectorAll(".filter-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderMatches();
    });
  });
}

async function initPartidas() {
  const container = document.getElementById("matchesContainer");
  const sourceEl = document.getElementById("dataSource");

  try {
    const json = await wcLoadData();
    allMatches = json.matches || [];
    setupFilters();
    renderMatches();

    if (sourceEl) {
      sourceEl.innerHTML = `Fuente: <a class="source-link" href="https://github.com/openfootball/worldcup.json" target="_blank" rel="noopener">openfootball/worldcup.json</a>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="message error">${wcEscapeHTML(err.message)}</p>`;
    if (sourceEl) sourceEl.textContent = "Error al cargar los datos.";
  }
}

initPartidas();
