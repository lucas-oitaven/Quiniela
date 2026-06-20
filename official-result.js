const OFFICIAL_DRAW = [
  {
    participant: "Jorge",
    teams: ["Croacia", "República Checa", "Panamá", "Jordania"]
  },
  {
    participant: "Silvia",
    teams: ["Portugal", "Corea del Sur", "Australia", "Curazao"]
  },
  {
    participant: "Sylvia",
    teams: ["Argentina", "Senegal", "Colombia", "Austria"]
  },
  {
    participant: "Lily",
    teams: ["Francia", "Suecia", "Haiti", "Arabia Saudita"]
  },
  {
    participant: "Romi",
    teams: ["España", "Estados Unidos", "Bosnia", "Costa de Marfil"]
  },
  {
    participant: "Estefi",
    teams: ["Bélgica", "México", "Nueva Zelanda", "Canadá"]
  },
  {
    participant: "Lucas",
    teams: ["Países Bajos / Holanda", "Marruecos", "Escocia", "Ghana"]
  },
  {
    participant: "Luis",
    teams: ["Alemania", "Turquía", "Argelia", "Irak"]
  },
  {
    participant: "Julian",
    teams: ["Brasil", "Japón", "Catar", "Noruega"]
  },
  {
    participant: "Allegra",
    teams: ["Uruguay", "Suiza", "Egipto", "Irán"]
  },
  {
    participant: "Jorgito",
    teams: ["Inglaterra", "Ecuador", "Uzbekistan", "República Democrática del Congo"]
  }
];

const TEAM_FLAG_CODES = {
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
  "República Checa": "cz",
  "México": "mx",
  "Estados Unidos": "us",
  "Japón": "jp",
  "Suiza": "ch",
  "Ecuador": "ec",
  "Turquía": "tr",
  "Canadá": "ca",
  "Bosnia": "ba",
  "Curazao": "cw",
  "Escocia": "gb-sct",
  "Paraguay": "py",
  "Australia": "au",
  "Costa de Marfil": "ci",
  "Suecia": "se",
  "Haiti": "ht",
  "Túnez": "tn",
  "Egipto": "eg",
  "Nueva Zelanda": "nz",
  "Cabo Verde": "cv",
  "Arabia Saudita": "sa",
  "Irak": "iq",
  "Argelia": "dz",
  "Jordania": "jo",
  "Uzbekistán": "uz",
  "Uzbekistan": "uz",
  "Ghana": "gh",
  "Panamá": "pa",
  "Austria": "at",
  "Corea del Sur": "kr",
  "Irán": "ir",
  "Catar": "qa",
  "Noruega": "no",
  "República Democrática del Congo": "cd"
};

const TEAM_NAME_ALIASES = {
  usa: "usa",
  estadosunidos: "usa",

  bosnia: "bosniaandherzegovina",
  bosniaandherzegovina: "bosniaandherzegovina",

  czechrepublic: "czechrepublic",
  republicacheca: "czechrepublic",

  southkorea: "southkorea",
  coreadelsur: "southkorea",

  netherlands: "netherlands",
  paisesbajosholanda: "netherlands",

  ivorycoast: "ivorycoast",
  costademarfil: "ivorycoast",

  drcongo: "drcongo",
  republicademocraticadelcongo: "drcongo",

  capeverde: "capeverde",
  caboverde: "capeverde",

  saudiarabia: "saudiarabia",
  arabiasaudita: "saudiarabia",

  newzealand: "newzealand",
  nuevazelanda: "newzealand",

  croacia: "croatia",
  croatia: "croatia",
  panama: "panama",
  jordania: "jordan",
  jordan: "jordan",
  australia: "australia",
  portugal: "portugal",
  argentina: "argentina",
  senegal: "senegal",
  colombia: "colombia",
  austria: "austria",
  francia: "france",
  france: "france",
  suecia: "sweden",
  sweden: "sweden",
  haiti: "haiti",
  espana: "spain",
  spain: "spain",
  belgica: "belgium",
  belgium: "belgium",
  mexico: "mexico",
  canada: "canada",
  marruecos: "morocco",
  morocco: "morocco",
  escocia: "scotland",
  scotland: "scotland",
  ghana: "ghana",
  alemania: "germany",
  germany: "germany",
  turquia: "turkey",
  turkey: "turkey",
  argelia: "algeria",
  algeria: "algeria",
  irak: "iraq",
  iraq: "iraq",
  brasil: "brazil",
  brazil: "brazil",
  japon: "japan",
  japan: "japan",
  catar: "qatar",
  qatar: "qatar",
  noruega: "norway",
  norway: "norway",
  uruguay: "uruguay",
  suiza: "switzerland",
  switzerland: "switzerland",
  egipto: "egypt",
  egypt: "egypt",
  iran: "iran",
  inglaterra: "england",
  england: "england",
  ecuador: "ecuador",
  uzbekistan: "uzbekistan"
};

let lastResultsText = "";

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFlagMarkup(team) {
  const code = TEAM_FLAG_CODES[team];
  if (!code) {
    return '<span class="flag-fallback">?</span>';
  }

  const src = `https://flagcdn.com/${code}.svg`;
  const alt = `Bandera de ${escapeHTML(team)}`;
  return `<img class="flag-svg" src="${src}" alt="${alt}" loading="lazy" decoding="async">`;
}

function normalizeTeamKey(name) {
  const base = String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

  return TEAM_NAME_ALIASES[base] || base;
}

function computeQualifiedTeamKeys(matches) {
  const teamMap = new Map();

  matches.forEach(m => {
    if (!m.group) return;
    [m.team1, m.team2].forEach(t => {
      if (!teamMap.has(t)) {
        teamMap.set(t, { group: m.group, pts: 0, gd: 0, gf: 0 });
      }
    });
  });

  matches.forEach(m => {
    if (!m.group || !m.score || !m.score.ft) return;

    const [g1, g2] = m.score.ft;
    const s1 = teamMap.get(m.team1);
    const s2 = teamMap.get(m.team2);
    if (!s1 || !s2) return;

    s1.gf += g1;
    s2.gf += g2;
    s1.gd += g1 - g2;
    s2.gd += g2 - g1;

    if (g1 > g2) s1.pts += 3;
    else if (g2 > g1) s2.pts += 3;
    else {
      s1.pts++;
      s2.pts++;
    }
  });

  const byGroup = new Map();
  teamMap.forEach((stats, team) => {
    if (!byGroup.has(stats.group)) byGroup.set(stats.group, []);
    byGroup.get(stats.group).push({ team, ...stats });
  });

  const qualified = new Set();
  byGroup.forEach(teams => {
    teams
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .slice(0, 2)
      .forEach(t => qualified.add(normalizeTeamKey(t.team)));
  });

  return qualified;
}

function renderOfficialResults(qualifiedTeamKeys = new Set()) {
  const container = document.getElementById("officialResults");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  lastResultsText = "Resultado oficial do sorteio\n\n";

  OFFICIAL_DRAW.forEach(entry => {
    const card = document.createElement("article");
    card.className = "result-card revealed";

    const teamsMarkup = entry.teams
      .map(team => {
        const isQualified = qualifiedTeamKeys.has(normalizeTeamKey(team));
        return `
        <li${isQualified ? ' class="team-qualified"' : ""}>
          <span class="flag" aria-hidden="true">${getFlagMarkup(team)}</span>
          <span class="team-name">${escapeHTML(team)}</span>
        </li>
      `;
      })
      .join("");

    card.innerHTML = `
      <h3>${escapeHTML(entry.participant)}</h3>
      <ul class="pick-list">${teamsMarkup}</ul>
    `;

    container.appendChild(card);

    lastResultsText += `${entry.participant}\n`;
    entry.teams.forEach(team => {
      lastResultsText += `- ${team}\n`;
    });
    lastResultsText += "\n";
  });
}

async function copyResults() {
  if (!lastResultsText) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastResultsText);
  } catch {
    // Ignore clipboard failures silently.
  }
}

async function downloadResultsImage() {
  const resultsSection = document.querySelector("[data-purpose='official-results-display']");

  if (!resultsSection || typeof window.html2canvas !== "function") {
    return;
  }

  const canvas = await window.html2canvas(resultsSection, {
    backgroundColor: "#123a31",
    scale: 2,
    useCORS: true
  });

  const link = document.createElement("a");
  link.download = "resultado-oficial-quiniela.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function printResults() {
  window.print();
}

function setupActions() {
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const printBtn = document.getElementById("printBtn");

  copyBtn?.addEventListener("click", copyResults);
  downloadBtn?.addEventListener("click", () => {
    downloadResultsImage().catch(() => {
      // Ignore download errors silently.
    });
  });
  printBtn?.addEventListener("click", printResults);
}

async function initOfficialResults() {
  let qualifiedTeamKeys = new Set();

  if (typeof wcLoadData === "function") {
    try {
      const json = await wcLoadData();
      qualifiedTeamKeys = computeQualifiedTeamKeys(json.matches || []);
    } catch {
      // Keep rendering even if live data is unavailable.
    }
  }

  renderOfficialResults(qualifiedTeamKeys);

  setupActions();
}

initOfficialResults();