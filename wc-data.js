// Shared World Cup 2026 data utilities
// Used by grupos.js and partidas.js

const WC_ENDPOINT =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// English team names as used by openfootball → ISO flag codes
const WC_TEAM_FLAGS = {
  // Group A (confirmed)
  "Mexico": "mx", "South Africa": "za", "South Korea": "kr", "Czech Republic": "cz",
  // Group B (confirmed)
  "Canada": "ca", "Bosnia-Herzegovina": "ba", "Bosnia and Herzegovina": "ba", "Bosnia & Herzegovina": "ba", "Bosnia": "ba", "USA": "us", "Paraguay": "py",
  // Group C (Qatar + Switzerland confirmed; others inferred)
  "Qatar": "qa", "Switzerland": "ch", "Belgium": "be", "New Zealand": "nz",
  // Group D (England + Ecuador confirmed)
  "England": "gb-eng", "Ecuador": "ec", "Uzbekistan": "uz", "DR Congo": "cd",
  "Democratic Republic of the Congo": "cd",
  // Group E
  "France": "fr", "Sweden": "se", "Haiti": "ht", "Saudi Arabia": "sa",
  // Group F
  "Spain": "es", "Croatia": "hr", "Bolivia": "bo", "Slovenia": "si",
  // Group G
  "Germany": "de", "Turkey": "tr", "Algeria": "dz", "Iraq": "iq",
  // Group H
  "Brazil": "br", "Japan": "jp", "Morocco": "ma", "Colombia": "co",
  // Group I
  "Netherlands": "nl", "Austria": "at", "Scotland": "gb-sct", "Ghana": "gh",
  // Group J
  "Argentina": "ar", "Uruguay": "uy", "Egypt": "eg", "Iran": "ir",
  // Group K
  "Portugal": "pt", "Norway": "no", "Ivory Coast": "ci", "Curaçao": "cw",
  "Curacao": "cw", "Curazao": "cw",
  // Group L
  "Australia": "au", "Jordan": "jo", "Tunisia": "tn", "Cabo Verde": "cv",
  // Additional / alternate names
  "Senegal": "sn",
  "Côte d'Ivoire": "ci",
  "Cape Verde": "cv",
  "United States": "us",
  "Panama": "pa",
  "Honduras": "hn",
  "Costa Rica": "cr",
  "Jamaica": "jm",
  "Venezuela": "ve",
  "Chile": "cl",
  "Peru": "pe",
  "Nigeria": "ng",
  "Cameroon": "cm",
  "Mali": "ml",
  "Serbia": "rs",
  "Romania": "ro",
  "Poland": "pl",
  "Denmark": "dk",
  "Slovakia": "sk",
  "Iceland": "is",
  "Wales": "gb-wls",
  "Ukraine": "ua",
  "Greece": "gr",
  "Hungary": "hu",
  "Indonesia": "id",
  "China PR": "cn",
  "China": "cn",
  "Bahrain": "bh",
  "United Arab Emirates": "ae",
  "Kuwait": "kw",
  "Vietnam": "vn",
  "Angola": "ao",
  "Uganda": "ug",
  "Zambia": "zm",
  "Comoros": "km",
  "Guinea": "gn",
  "Fiji": "fj",
  "Solomon Islands": "sb",
  "New Caledonia": "nc",
};

const WC_TEAM_FLAG_NAME_ALIASES = {
  democraticrepublicofthecongo: "DR Congo",
  republicademocraticadelcongo: "DR Congo",
  drcongo: "DR Congo",
  curacao: "Curaçao",
  curazao: "Curaçao",
};

const WC_TEAM_DISPLAY_NAME_ALIASES = {
  "Democratic Republic of the Congo": "DR Congo",
  "República Democrática del Congo": "DR Congo",
};

function wcEscapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wcNormalizeTeamName(team) {
  const raw = String(team || "").trim();
  const base = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
  return WC_TEAM_FLAG_NAME_ALIASES[base] || raw;
}

function wcGetDisplayTeamName(team) {
  const normalized = wcNormalizeTeamName(team);
  return WC_TEAM_DISPLAY_NAME_ALIASES[normalized] || normalized;
}

function wcGetFlag(team, size) {
  const normalizedTeam = wcNormalizeTeamName(team);
  const code = WC_TEAM_FLAGS[team] || WC_TEAM_FLAGS[normalizedTeam];
  if (!code) {
    return '<span class="flag-fallback">?</span>';
  }

  const w = size === "sm" ? 22 : 30;
  const h = size === "sm" ? 15 : 21;
  const src = `https://flagcdn.com/${code}.svg`;
  const alt = `Bandera de ${wcEscapeHTML(team)}`;
  return `<img class="flag-svg" src="${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
}

function wcNormalizeRoundKey(round) {
  const value = String(round || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "group") return "group";
  if (["round of 32", "round 32", "r32", "dieciseisavos", "1/16"].includes(value)) return "round32";
  if (["round of 16", "round 16", "r16", "octavos", "1/8"].includes(value)) return "round16";
  if (["quarterfinal", "quarter", "qf", "cuartos", "1/4"].includes(value)) return "quarterfinal";
  if (["semifinal", "semi", "sf"].includes(value)) return "semifinal";
  if (value === "final") return "final";
  if (["third place", "third", "3rd", "tercer lugar", "third-place"].includes(value)) return "third";
  return "";
}

function wcGetWinnerFromMatch(match) {
  if (!match?.score?.ft || !match.team1 || !match.team2) return "";

  const [ft1, ft2] = match.score.ft;
  if (ft1 > ft2) return match.team1;
  if (ft2 > ft1) return match.team2;

  if (Array.isArray(match.score.p) && match.score.p.length >= 2) {
    const [p1, p2] = match.score.p;
    if (p1 > p2) return match.team1;
    if (p2 > p1) return match.team2;
  }

  if (Array.isArray(match.score.et) && match.score.et.length >= 2) {
    const [et1, et2] = match.score.et;
    if (et1 > et2) return match.team1;
    if (et2 > et1) return match.team2;
  }

  return "";
}

function wcComputeKnockoutEliminatedTeams(matches) {
  const eliminatedTeams = new Set();

  (matches || []).forEach(match => {
    const roundKey = wcNormalizeRoundKey(match?.round);
    if (!roundKey || roundKey === "group") return;

    const winner = wcGetWinnerFromMatch(match);
    if (!winner || !match.team1 || !match.team2) return;

    const loser = winner === match.team1
      ? match.team2
      : winner === match.team2
        ? match.team1
        : "";

    if (loser) eliminatedTeams.add(loser);
  });

  return eliminatedTeams;
}

function wcFormatMexicoTime(timeValue) {
  if (!timeValue) return "";

  const match = String(timeValue).match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d+)$/i);
  if (!match) {
    return String(timeValue).split(" ")[0];
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const sourceOffset = Number(match[3]);
  const mexicoOffset = -6;

  let totalMinutes = hours * 60 + minutes + (mexicoOffset - sourceOffset) * 60;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const resultHours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const resultMinutes = String(totalMinutes % 60).padStart(2, "0");
  return `${resultHours}:${resultMinutes}`;
}


/**
 * Calculates only confirmed group-stage outcomes for display purposes.
 * - The first two places are treated as qualified in the current standings.
 * - Fourth place turns eliminated only after its entire group has finished.
 * - The current eight best third-place teams are exposed separately for display
 *   (yellow). This is a live table position, not a confirmed qualification.
 * - Third place turns qualified/eliminated only after every group match has finished,
 *   because the eight best third-place teams advance in the 2026 format.
 */
function wcComputeGroupProgress(matches) {
  const groupMatches = (matches || []).filter(match => match && match.group);
  const teamsByGroup = new Map();

  groupMatches.forEach(match => {
    const group = match.group;
    if (!teamsByGroup.has(group)) teamsByGroup.set(group, new Map());
    const table = teamsByGroup.get(group);

    [match.team1, match.team2].filter(Boolean).forEach(team => {
      if (!table.has(team)) table.set(team, { team, pts: 0, gd: 0, gf: 0 });
    });

    if (!match.score?.ft) return;
    const [g1, g2] = match.score.ft;
    const home = table.get(match.team1);
    const away = table.get(match.team2);
    if (!home || !away) return;

    home.gf += g1;
    away.gf += g2;
    home.gd += g1 - g2;
    away.gd += g2 - g1;
    if (g1 > g2) home.pts += 3;
    else if (g2 > g1) away.pts += 3;
    else { home.pts += 1; away.pts += 1; }
  });

  const rank = list => [...list].sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team)
  );
  const groupIsComplete = group => groupMatches.filter(match => match.group === group).every(match => Boolean(match.score?.ft));
  const allGroupsComplete = groupMatches.length > 0 && groupMatches.every(match => Boolean(match.score?.ft));
  const qualifiedTeams = new Set();
  const eliminatedTeams = new Set();
  const thirdPlaces = [];
  const bestThirdTeams = new Set();

  teamsByGroup.forEach((table, group) => {
    const standings = rank(table.values());
    standings.slice(0, 2).forEach(entry => qualifiedTeams.add(entry.team));
    if (standings[2]) thirdPlaces.push(standings[2]);
    if (groupIsComplete(group) && standings[3]) eliminatedTeams.add(standings[3].team);
  });

  // This ranking is intentionally calculated from the data available now.
  // It gives the current provisional top 8 third places a yellow state,
  // even when their own group still has matches pending.
  const currentBestThirds = new Set(rank(thirdPlaces).slice(0, 8).map(entry => entry.team));
  currentBestThirds.forEach(team => bestThirdTeams.add(team));

  if (allGroupsComplete) {
    thirdPlaces.forEach(entry => {
      if (currentBestThirds.has(entry.team)) qualifiedTeams.add(entry.team);
      else eliminatedTeams.add(entry.team);
    });
  }

  qualifiedTeams.forEach(team => {
    eliminatedTeams.delete(team);
    bestThirdTeams.delete(team);
  });
  eliminatedTeams.forEach(team => bestThirdTeams.delete(team));

  return { qualifiedTeams, eliminatedTeams, bestThirdTeams };
}

async function wcLoadData() {
  const response = await fetch(WC_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al obtener datos.`);
  }

  return response.json();
}