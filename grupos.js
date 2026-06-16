// grupos.js — group standings only
// depends on wc-data.js being loaded first

function computeStandings(matches) {
  const teamMap = new Map();

  // Register all teams from all matches (including scheduled ones, so 0-0-0 shows)
  matches.forEach(m => {
    if (!m.group) return;
    [m.team1, m.team2].forEach(t => {
      if (!teamMap.has(t)) {
        teamMap.set(t, { pj: 0, pts: 0, gf: 0, gc: 0, group: m.group });
      }
    });
  });

  // Accumulate stats from completed matches
  matches.forEach(m => {
    if (!m.group || !m.score || !m.score.ft) return;
    const [g1, g2] = m.score.ft;
    const s1 = teamMap.get(m.team1);
    const s2 = teamMap.get(m.team2);
    s1.pj++; s2.pj++;
    s1.gf += g1; s1.gc += g2;
    s2.gf += g2; s2.gc += g1;
    if (g1 > g2)      { s1.pts += 3; }
    else if (g2 > g1) { s2.pts += 3; }
    else              { s1.pts++; s2.pts++; }
  });

  // Aggregate by group
  const byGroup = new Map();
  teamMap.forEach((s, team) => {
    if (!byGroup.has(s.group)) byGroup.set(s.group, []);
    byGroup.get(s.group).push({
      team,
      pj: s.pj,
      pts: s.pts,
      sg: s.gf - s.gc,
      gf: s.gf,
    });
  });

  return Array.from(byGroup.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, standings]) => ({
      name: name.replace(/^Group\s+/, "Grupo "),
      standings: standings.sort((a, b) =>
        b.pts - a.pts || b.sg - a.sg || b.gf - a.gf
      ),
    }));
}

function renderGroupCard(group) {
  const card = document.createElement("article");
  card.className = "result-card";

  const rows = group.standings
    .map((t, i) => {
      const isQ = i < 2;
      return `
        <div class="standings-row${isQ ? " standings-qualified" : ""}">
          <span class="standings-pos">${i + 1}</span>
          <span class="standings-team-cell">
            <span class="flag" aria-hidden="true">${wcGetFlag(t.team, "sm")}</span>
            <span class="standings-team-name">${wcEscapeHTML(t.team)}</span>
          </span>
          <span class="standings-num">${t.pj}</span>
          <span class="standings-num">${t.sg >= 0 ? "+" : ""}${t.sg}</span>
          <span class="standings-pts">${t.pts}</span>
        </div>
      `;
    })
    .join("");

  card.innerHTML = `
    <h3>${wcEscapeHTML(group.name)}</h3>
    <div class="standings-body">
      <div class="standings-row standings-head">
        <span></span>
        <span>Selección</span>
        <span class="standings-num">PJ</span>
        <span class="standings-num">SG</span>
        <span class="standings-pts">PTS</span>
      </div>
      ${rows}
    </div>
  `;

  return card;
}

async function initGroups() {
  const container = document.getElementById("groupsContainer");
  const sourceEl = document.getElementById("dataSource");

  try {
    const json = await wcLoadData();
    const groups = computeStandings(json.matches || []);

    container.innerHTML = "";
    groups.forEach(g => container.appendChild(renderGroupCard(g)));

    if (sourceEl) {
      sourceEl.innerHTML = `Fuente: <a class="source-link" href="https://github.com/openfootball/worldcup.json" target="_blank" rel="noopener">openfootball/worldcup.json</a>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="message error">${wcEscapeHTML(err.message)}</p>`;
    if (sourceEl) sourceEl.textContent = "Error al cargar los datos.";
  }
}

initGroups();
