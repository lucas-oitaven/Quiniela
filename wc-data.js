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

function wcEscapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wcGetFlag(team, size) {
  const code = WC_TEAM_FLAGS[team];
  if (!code) {
    return '<span class="flag-fallback">?</span>';
  }

  const w = size === "sm" ? 22 : 30;
  const h = size === "sm" ? 15 : 21;
  const src = `https://flagcdn.com/${code}.svg`;
  const alt = `Bandera de ${wcEscapeHTML(team)}`;
  return `<img class="flag-svg" src="${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
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

async function wcLoadData() {
  const response = await fetch(WC_ENDPOINT);

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al obtener datos.`);
  }

  return response.json();
}