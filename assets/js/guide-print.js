/* Pivo & Pleny – kapitola průvodce na hlavičkovém papíře s přílohou (schémata, grafy, tabulky k vyplnění) */
window.PPPrint = (function () {
  const INK = "#000814", NAVY = "#001D3D", GOLD = "#FFC300", GOLD2 = "#FFD60A", MUTED = "#5C6470", LIGHT = "#F1F2F3", LINE = "#D7D9DD";
  const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.w || 400}" fill="${o.fill || INK}" text-anchor="${o.a || "start"}" font-family="Inter Tight, Arial, sans-serif">${s}</text>`;
  const fill = (rows, cols, h = 26) => `<table class="pd-fill"><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: rows }, () => `<tr>${cols.map(() => `<td style="height:${h}px"></td>`).join("")}</tr>`).join("")}</tbody></table>`;

  /* 1 · Těhotenství – mapa 40 týdnů */
  function weeks40() {
    const X = w => 70 + (w - 1) / 39 * 600, rows = [["Těhotenství", 70], ["Tvoje úkoly", 130], ["Pro tebe", 190]];
    const tri = [[1, 13, "1. trimestr"], [14, 27, "2. trimestr"], [28, 40, "3. trimestr"]];
    const her = [[12, "screening 1. trimestru"], [21, "velký ultrazvuk"], [26, "glukózový test"], [36, "porodnice, monitor"], [40, "termín"]];
    const you = [[12, "1. ultrazvuk spolu"], [17, "rozpočet"], [22, "porodnice"], [26, "kurz, šéf"], [30, "autosedačka"], [34, "taška, trasa"], [38, "nádrž, telefon"]];
    const me = [[12, "kamarád"], [18, "preventivka"], [24, "věc jen pro sebe"], [30, "dřív spát"], [35, "zásoby pro sebe"], [39, "dodělat restíky"]];
    const pins = (arr, y, c, up) => arr.map(([w, l], i) => { const dy = (i % 2 ? 16 : 0); return `<circle cx="${X(w)}" cy="${y}" r="5" fill="${c}" stroke="${INK}" stroke-width="1.5"/>${T(X(w), y + (up ? -10 - dy : 18 + dy), l, { size: 10.5, a: "middle" })}`; }).join("");
    return `<svg viewBox="0 0 700 250" width="100%">
      ${tri.map(([a, b, l], i) => `<rect x="${X(a)}" y="22" width="${X(b) - X(a)}" height="196" fill="${i % 2 ? "#FAFAF7" : LIGHT}"/>${T((X(a) + X(b)) / 2, 16, l, { size: 10, w: 700, a: "middle" })}`).join("")}
      ${rows.map(([l, y]) => `<line x1="70" x2="670" y1="${y}" y2="${y}" stroke="${LINE}" stroke-width="2"/>${T(0, y + 4, l, { size: 10, w: 700 })}`).join("")}
      ${pins(her, 70, "#fff", false)}${pins(you, 130, GOLD, false)}${pins(me, 190, INK, false)}
      ${[1, 5, 10, 15, 20, 25, 30, 35, 40].map(w => T(X(w), 240, w + ".", { size: 9, fill: MUTED, a: "middle" })).join("")}
      ${T(670, 228, "týden", { size: 9, fill: MUTED, a: "end" })}
    </svg><p class="pd-note">Termíny vyšetření jsou orientační – přesné vám řekne lékař nebo porodní asistentka.</p>`;
  }
  function pregnancyAppendix() {
    return `<h2>Mapa 40 týdnů pro tátu</h2>${weeks40()}
      <h2>Moje tři strachy a co s nimi udělám</h2>${fill(3, ["Strach", "Komu to řeknu", "Co pro to udělám"], 34)}
      <h2>Moje ventily</h2><p>Pohyb, lidé, koníček – napiš si, co tě nabíjí a kdy na to bude čas.</p>${fill(4, ["Co mě nabíjí", "Jak často", "Kdy (den, čas)"])}`;
  }

  /* 2 · Otcovská a peníze – časová osa volna + rozpočet */
  function leaveTimeline() {
    const W = w => 120 + w / 8 * 560, M = m => 120 + m / 36 * 560;
    return `<svg viewBox="0 0 700 270" width="100%">
      ${T(0, 16, "Prvních 8 týdnů po porodu", { size: 13, w: 700 })}
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(w => `<line x1="${W(w)}" x2="${W(w)}" y1="28" y2="118" stroke="${LINE}"/>${T(W(w), 134, w ? w + ". t." : "porod", { size: 11, fill: MUTED, a: "middle" })}`).join("")}
      ${T(0, 54, "Otcovská", { size: 12, w: 700 })}
      <rect x="${W(0)}" y="38" width="${W(6) - W(0)}" height="26" fill="none" stroke="${INK}" stroke-dasharray="4 4"/>
      <rect x="${W(0)}" y="38" width="${W(2) - W(0)}" height="26" fill="${GOLD}" stroke="${INK}"/>${T(W(1), 56, "14 dní", { size: 11, w: 700, a: "middle" })}
      ${T(W(4), 56, "nastoupit nejpozději do 6. týdne", { size: 11, a: "middle", fill: MUTED })}
      ${T(0, 98, "Dovolená", { size: 12, w: 700 })}
      <rect x="${W(2)}" y="82" width="${W(4) - W(2)}" height="26" fill="${GOLD2}" fill-opacity=".45" stroke="${INK}"/>${T(W(3), 100, "navázat", { size: 11, a: "middle" })}
      ${T(W(6), 100, "= první měsíc doma spolu", { size: 11, w: 700, a: "middle" })}
      ${T(0, 170, "Do 3 let dítěte", { size: 13, w: 700 })}
      ${[0, 6, 12, 18, 24, 30, 36].map(m => `<line x1="${M(m)}" x2="${M(m)}" y1="180" y2="232" stroke="${LINE}"/>${T(M(m), 250, m ? m + ". měs." : "porod", { size: 11, fill: MUTED, a: "middle" })}`).join("")}
      ${T(0, 210, "Rodičovská", { size: 12, w: 700 })}
      <rect x="${M(0)}" y="192" width="${M(36) - M(0)}" height="28" fill="${LIGHT}" stroke="${INK}"/>${T(M(18), 211, "dovolená i příspěvek (až 350 000 Kč) – můžete se vystřídat po měsících", { size: 11, a: "middle" })}
    </svg><p class="pd-note">Rodičovský příspěvek 350 000 Kč platí pro děti narozené od 1. 1. 2024. Podmínky a částky se mění – ověř si je na cssz.cz a mpsv.gov.cz.</p>`;
  }
  function budget() {
    const sec = (h, items) => `<tr class="pd-sec"><td colspan="3">${h}</td></tr>` + items.map(i => `<tr><td>${i}</td><td></td><td></td></tr>`).join("");
    return `<table class="pd-fill"><thead><tr><th>Položka</th><th>Teď (Kč/měs.)</th><th>Po porodu (Kč/měs.)</th></tr></thead><tbody>
      ${sec("Příjmy", ["Moje mzda", "Její mzda / mateřská", "Rodičovský příspěvek", "Ostatní"])}
      ${sec("Pevné výdaje", ["Bydlení a energie", "Splátky", "Pojištění", "Auto, doprava", "Telefony, internet"])}
      ${sec("Nové výdaje", ["Pleny a drogerie", "Oblečení a výbava", "Lékárna"])}
      ${sec("Pro tebe", ["Moje kapesné (bez pocitu viny)"])}
      <tr class="pd-sum"><td>Zbývá / chybí</td><td></td><td></td></tr></tbody></table>
      <p class="pd-note">Cíl: rezerva aspoň na 3 měsíce pevných výdajů = 3 × pevné výdaje.</p>`;
  }
  function moneyAppendix() {
    return `<h2>Jak na sebe navazuje volno</h2>${leaveTimeline()}<h2>Rozpočet prvního roku</h2>${budget()}
      <h2>Rozhovor se šéfem – příprava</h2>${fill(4, ["Co potřebuju", "Co nabídnu (předání, zástup)", "Domluveno (datum)"], 30)}`;
  }

  /* 3 · Taška a logistika – rozhodovací schéma + kartička do peněženky */
  function goFlow() {
    const box = (x, y, w, h, t, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${o.fill || "#fff"}" stroke="${INK}" stroke-width="${o.sw || 1.5}"/>${t.map((l, i) => T(x + w / 2, y + h / 2 + 4 + (i - (t.length - 1) / 2) * 14, l, { size: 10.5, w: i === 0 ? 700 : 400, a: "middle", fill: o.tf || INK })).join("")}`;
    const ar = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="1.5" marker-end="url(#pa)"/>`;
    return `<svg viewBox="0 0 700 300" width="100%"><defs><marker id="pa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker></defs>
      ${box(20, 20, 200, 56, ["Něco se děje", "kontrakce, voda, bolest"], { fill: LIGHT })}
      ${ar(220, 48, 268, 48)}
      ${box(270, 14, 410, 68, ["HNED JEĎTE / VOLEJTE 155", "zelená nebo krvavá voda · krvácení", "silná bolest bez pauzy · necítí pohyby"], { fill: "#C8102E", tf: "#fff", sw: 2 })}
      ${ar(120, 76, 120, 118)}${T(128, 102, "nic z toho", { size: 9, fill: MUTED })}
      ${box(20, 120, 200, 56, ["Kontrakce", "měř délku a odstupy"], { fill: "#fff" })}
      ${ar(220, 148, 268, 148)}
      ${box(270, 120, 200, 56, ["Sílí a jsou pravidelné?", "podle domluvy s porodnicí"], { fill: GOLD2 })}
      ${ar(470, 148, 518, 148)}${T(476, 140, "ano", { size: 9, fill: MUTED })}
      ${box(520, 120, 160, 56, ["Zavolat porodnici", "a vyrazit"], { fill: GOLD })}
      ${ar(370, 176, 370, 218)}${T(378, 202, "zatím ne", { size: 9, fill: MUTED })}
      ${box(270, 220, 200, 56, ["Zůstaňte doma", "voda, jídlo, sprcha, klid"], { fill: "#fff" })}
      ${ar(270, 248, 222, 248)}${box(20, 220, 200, 56, ["Ty: taška k autu,", "nádrž, telefon nabitý"], { fill: LIGHT })}
    </svg><p class="pd-note">Řiďte se vždy doporučením vaší porodnice a porodní asistentky.</p>`;
  }
  function pocketCard() {
    return `<div class="pd-cards"><div class="pd-card"><div class="pd-card-h">p&amp;p. · TAHÁK NA SÁL</div>
      <ol><li>Ptej se, než se jí dotkneš.</li><li>Voda, světlo, klid.</li><li>Připomeň porodní plán.</li><li>Jez a pij každé 3–4 h.</li><li>Zlatá hodinka, kůže na kůži.</li></ol>
      <div class="pd-card-f">Tíseň 155 · 112</div></div>
      <div class="pd-card"><div class="pd-card-h">p&amp;p. · DŮLEŽITÁ ČÍSLA</div>
      <div class="pd-line">Porodnice: </div><div class="pd-line">Porodní asistentka: </div><div class="pd-line">Záložní odvoz: </div><div class="pd-line">Taxi: </div><div class="pd-line">Pes / děti hlídá: </div>
      <div class="pd-card-f">Vystřihni, slož, dej do peněženky</div></div></div>`;
  }
  function bagAppendix() {
    return `<h2>Kdy jet do porodnice – schéma</h2>${goFlow()}<h2>Kartičky do peněženky</h2>${pocketCard()}
      <h2>Plán cesty</h2>${fill(3, ["Trasa", "Čas (noc / špička)", "Parkování a vstup na příjem"], 34)}`;
  }

  /* 4 · Porod – jak měřit kontrakce + záznam */
  function contractions() {
    const y0 = 120, pts = [];
    const wave = (x, w, h) => `M${x} ${y0} C${x + w * .35} ${y0}, ${x + w * .35} ${y0 - h}, ${x + w / 2} ${y0 - h} S${x + w * .65} ${y0}, ${x + w} ${y0}`;
    const xs = [60, 300, 540];
    return `<svg viewBox="0 0 700 190" width="100%"><defs><marker id="pb" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker></defs>
      <line x1="20" x2="690" y1="${y0}" y2="${y0}" stroke="${LINE}" stroke-width="2"/>
      ${xs.map(x => `<path d="${wave(x, 110, 80)}" fill="${GOLD}" fill-opacity=".55" stroke="${INK}" stroke-width="2"/>`).join("")}
      <line x1="${xs[0]}" x2="${xs[0] + 110}" y1="140" y2="140" stroke="${INK}" stroke-width="1.5" marker-start="url(#pb)" marker-end="url(#pb)"/>${T(xs[0] + 55, 158, "DÉLKA – od začátku do konce", { size: 9.5, w: 700, a: "middle" })}
      <line x1="${xs[0]}" x2="${xs[1]}" y1="175" y2="175" stroke="${INK}" stroke-width="1.5" marker-start="url(#pb)" marker-end="url(#pb)"/>${T((xs[0] + xs[1]) / 2, 170, "ODSTUP – od začátku jedné do začátku další", { size: 9.5, w: 700, a: "middle" })}
      ${T(xs[1] + 55, 30, "vrchol", { size: 9, fill: MUTED, a: "middle" })}${T(20, 20, "síla", { size: 9, fill: MUTED })}${T(690, 112, "čas", { size: 9, fill: MUTED, a: "end" })}
    </svg><p class="pd-note">Kdy jet podle délky a odstupů vám řekne vaše porodnice – zapiš si to sem: ________________________________</p>`;
  }
  function birthAppendix() {
    return `<h2>Jak měřit kontrakce</h2>${contractions()}<h2>Záznam kontrakcí</h2>${fill(14, ["Začátek (čas)", "Délka (s)", "Odstup (min)", "Poznámka"], 22)}
      <h2>Tvůj dech na 1 minutu</h2><p>4 s nádech nosem · 6 s výdech pusou · 6× za sebou. Ve stresu ho dělej ty první – ona se chytí.</p>`;
  }

  /* 5 · Po porodu – 24 hodin ve dvou + kontrola tátovy kondice */
  function shifts() {
    const X = h => 90 + ((h - 18 + 24) % 24) / 24 * 580;
    const bar = (y, a, b, c, l) => { const x1 = X(a), x2 = b === 18 ? 670 : X(b); return `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="22" fill="${c}" stroke="${INK}"/>${l ? T((x1 + x2) / 2, y + 15, l, { size: 9, a: "middle", fill: c === INK ? "#fff" : INK }) : ""}`; };
    return `<svg viewBox="0 0 700 170" width="100%">
      ${[18, 21, 0, 3, 6, 9, 12, 15].map(h => `<line x1="${X(h)}" x2="${X(h)}" y1="18" y2="130" stroke="${LINE}"/>${T(X(h), 148, h + ":00", { size: 9, fill: MUTED, a: "middle" })}`).join("")}
      ${T(0, 38, "Ty", { size: 10.5, w: 700 })}${bar(24, 21, 1, GOLD, "služba")}${bar(24, 1, 7, INK, "spíš")}
      ${T(0, 78, "Ona", { size: 10.5, w: 700 })}${bar(64, 22, 1, INK, "spí")}${bar(64, 1, 5, GOLD, "služba")}${bar(64, 5, 9, INK, "spí")}
      ${T(0, 118, "Pro tebe", { size: 10.5, w: 700 })}${bar(104, 15, 16, GOLD2, "")}${T(X(15) - 8, 120, "30–60 min jen pro sebe – procházka, sprcha, kafe", { size: 10.5, a: "end" })}
      ${T(90, 166, "Varianta A: každý má aspoň jeden blok 4–5 hodin spánku v kuse.", { size: 9.5, w: 700 })}
    </svg>`;
  }
  function selfCheck() {
    const days = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
    return `<table class="pd-fill pd-check"><thead><tr><th></th>${days.map(d => `<th>${d}</th>`).join("")}</tr></thead><tbody>
      ${["Spánek (hodin)", "Nálada 1–5", "Pohyb (min)", "Čas pro sebe", "Mluvil jsem s kámošem", "Alkohol (ano/ne)"].map(r => `<tr><td>${r}</td>${days.map(() => "<td></td>").join("")}</tr>`).join("")}</tbody></table>
      <p class="pd-note">Když je nálada dva týdny pod 3 nebo spíš špatně, i když můžeš – ozvi se. Je to signál, ne selhání. Linka 116 123 (nonstop, zdarma).</p>`;
  }
  function postAppendix() {
    return `<h2>24 hodin ve dvou – noční směny</h2>${shifts()}<h2>Tátův týdenní check-in</h2>${selfCheck()}
      <h2>Karta na lednici</h2><div class="pd-cards"><div class="pd-card pd-card-red"><div class="pd-card-h">KDY VOLAT LÉKAŘE HNED</div>
      <p><b>Miminko:</b> do 3 měsíců 38 °C a víc · nejde vzbudit · nepije · málo mokrých plen · divně dýchá</p>
      <p><b>Ona:</b> silné krvácení · horečka · bolest na hrudi · silná bolest hlavy · myšlenky ublížit sobě nebo miminku</p>
      <div class="pd-card-f">Ohrožení života: 155 · 112</div></div>
      <div class="pd-card"><div class="pd-card-h">NAŠE ČÍSLA</div><div class="pd-line">Dětská lékařka: </div><div class="pd-line">Porodní asistentka: </div><div class="pd-line">Laktační poradkyně: </div><div class="pd-line">Babička / pomoc: </div></div></div>`;
  }

  const APPX = { tehotenstvi: pregnancyAppendix, otcovska: moneyAppendix, taska: bagAppendix, porod: birthAppendix, "po-porodu": postAppendix };

  function build({ section, row, name, num, total }) {
    const title = section.querySelector("h2").textContent.trim();
    const lead = section.querySelector(".ch-head .lead");
    const free = section.querySelector(".ch-body").cloneNode(true);
    free.querySelectorAll(".for-you").forEach(e => e.classList.add("pd-foryou"));
    const today = new Date().toLocaleDateString("cs-CZ");
    const memberHtml = PPMedia.md(row.body || "").replace(/<strong>Pro tebe:<\/strong>/g, '<br><span class="pt-pill">Pro tebe</span>');
    const doc = document.createElement("div");
    doc.id = "print-doc";
    doc.innerHTML = `
      <div class="pd-head"><div class="pd-logo"><span class="pd-mark">p<b>&amp;</b>p.</span><span><strong>Pivo &amp; Pleny</strong><small>Průvodce pro tátu · Klub</small></span></div>
        <div class="pd-meta"><strong>Kapitola ${num} z ${total} · ${title}</strong><small>${name ? "Pro: " + PPMedia.esc(name) + " · " : ""}${today}</small></div></div>
      <div class="pd-foot"><span>pivoapleny.cz · Obsah je informativní a nenahrazuje lékaře, porodní asistentku ani psychologa.</span><span>V krizi: 116 123 · tíseň 155 / 112</span></div>
      <table class="pd-frame"><thead><tr><td><div class="pd-space-h"></div></td></tr></thead><tfoot><tr><td><div class="pd-space-f"></div></td></tr></tfoot><tbody><tr><td>
        <div class="pd-title"><span class="pd-num">0${num}</span><div><h1>${title}</h1>${lead ? `<p>${lead.textContent}</p>` : ""}</div></div>
        <div class="pd-body">${free.innerHTML}</div>
        <div class="pd-klub"><div class="pd-klub-h">Pro členy Klubu · ${PPMedia.esc(row.title)}</div>${memberHtml}</div>
        <div class="pd-appx"><div class="pd-appx-h">Příloha · schémata a tabulky k vyplnění</div>${APPX[row.slug] ? APPX[row.slug]() : ""}</div>
      </td></tr></tbody></table>`;
    return doc;
  }

  function print(opts) {
    document.getElementById("print-doc")?.remove();
    const doc = build(opts);
    document.body.appendChild(doc);
    document.body.classList.add("print-doc-on");
    const done = () => { document.body.classList.remove("print-doc-on"); doc.remove(); removeEventListener("afterprint", done); };
    addEventListener("afterprint", done);
    setTimeout(() => window.print(), 50);
  }
  return { print, build };
})();
