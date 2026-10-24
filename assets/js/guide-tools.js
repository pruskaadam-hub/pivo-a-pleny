/* Papalu – nástroje pro členy Klubu v průvodci (kalkulačka, týden po týdnu, checklisty, směny, check-in)
   Data se ukládají k účtu (Supabase: member_tool_save). Texty a obsah týdnů jsou jen v databázi. */
window.PPTools = (function () {
  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kc = n => (Math.round(n) || 0).toLocaleString("cs-CZ") + " Kč";
  const num = v => { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
  let ctx = { sb: null, home: null, weeks: null, data: {} };
  const timers = {};
  function save(key, data) {
    ctx.data[key] = data;
    clearTimeout(timers[key]);
    timers[key] = setTimeout(async () => {
      if (!ctx.sb) return;
      const r = await ctx.sb.rpc("member_tool_save", { p_key: key, p_data: data });
      document.querySelectorAll(`[data-saved-for="${key}"]`).forEach(el => { el.textContent = r.error ? "Neuloženo – zkus to znovu" : "Uloženo"; el.classList.toggle("err", !!r.error); });
    }, 600);
  }
  const savedTag = key => `<span class="tl-saved small" data-saved-for="${key}"></span>`;

  /* ---------- Výpočty 2026 (orientační) ---------- */
  const RH = [1633, 2449, 4897]; // redukční hranice 2026 (Kč/den)
  const reduce = d => Math.min(d, RH[0]) + Math.max(Math.min(d, RH[1]) - RH[0], 0) * .6 + Math.max(Math.min(d, RH[2]) - RH[1], 0) * .3;
  const dailyBenefit = gross => Math.ceil(reduce(Math.ceil(gross * 12 / 365)) * .7);
  const RP_TOTAL = 350000, RP_CAP = 60000, RP_LOW = 15000;
  function calc(d) {
    const me = num(d.me), her = num(d.her), ppm = d.ppm !== false;
    const ot = dailyBenefit(me), pm = dailyBenefit(her);
    const maxRp = Math.max(RP_LOW, Math.min(RP_CAP, Math.floor(.7 * Math.max(me, her))));
    const startM = ppm && her ? 5 : 0, months = 36 - startM, minRp = Math.ceil(RP_TOTAL / months);
    let rp = num(d.rp) || Math.min(maxRp, Math.max(minRp, 15000)); rp = Math.min(rp, maxRp);
    const dur = Math.ceil(RP_TOTAL / rp);
    return { ot, otTotal: ot * 14, pm, pmTotal: pm * 196, maxRp, minRp, rp, dur, endAge: startM + dur, startM, lost: dur > months };
  }

  /* ---------- Nástroje ---------- */
  const T = {};

  T.kalkulacka = {
    render(el) {
      const d = ctx.data.kalkulacka || { me: "", her: "", ppm: true, rp: "" };
      el.innerHTML = `<div class="tool-box">
        <div class="tool-grid">
          <label>Tvůj hrubý měsíční příjem<input inputmode="numeric" data-k="me" value="${esc(d.me)}" placeholder="např. 45 000"></label>
          <label>Její hrubý měsíční příjem<input inputmode="numeric" data-k="her" value="${esc(d.her)}" placeholder="např. 38 000"></label>
          <label class="tool-check"><input type="checkbox" data-k="ppm" ${d.ppm !== false ? "checked" : ""}> Partnerka bude čerpat mateřskou (PPM)</label>
        </div>
        <div class="tool-out" data-out></div>
        <p class="small muted mb-0">Orientační výpočet podle pravidel 2026 (redukční hranice 1 633 / 2 449 / 4 897 Kč, dávka 70 %). U OSVČ a nepravidelných příjmů se částky liší. ${savedTag("kalkulacka")}</p>
      </div>`;
      const out = el.querySelector("[data-out]");
      const draw = () => {
        const c = calc(d);
        out.innerHTML = `<div class="tool-kpis">
            <div><span>Tvoje otcovská (14 dní)</span><b>${num(d.me) ? kc(c.otTotal) : "–"}</b><small>${num(d.me) ? kc(c.ot) + " denně" : "zadej příjem"}</small></div>
            <div><span>Její mateřská (28 týdnů)</span><b>${num(d.her) && d.ppm !== false ? kc(c.pmTotal) : "–"}</b><small>${num(d.her) && d.ppm !== false ? "asi " + kc(c.pm * 30) + " měsíčně" : "bez mateřské"}</small></div>
            <div><span>Rodičovský příspěvek – max. měsíčně</span><b>${kc(c.maxRp)}</b><small>celkem 350 000 Kč</small></div>
          </div>
          <label class="tool-range">Kolik si chcete brát měsíčně z rodičovského: <b data-rpv>${kc(c.rp)}</b>
            <input type="range" min="${Math.min(c.minRp, c.maxRp)}" max="${c.maxRp}" step="500" value="${c.rp}" data-k="rp"></label>
          <p class="mb-0">Při ${kc(c.rp)} měsíčně vydrží příspěvek <b>${c.dur} měsíců</b>${c.startM ? " (navazuje na mateřskou, zhruba od 5. měsíce)" : ""} – skončí, až bude miminku asi <b>${c.endAge} měsíců</b>.
          ${c.lost ? '<br><span class="tool-warn">Pozor: do 3 let miminka byste celou částku nevyčerpali – zvyšte měsíční výši.</span>' : ""} Výši jde měnit jednou za 3 měsíce.</p>`;
      };
      draw();
      el.addEventListener("input", e => {
        const k = e.target.dataset.k; if (!k) return;
        d[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        if (k !== "rp") { draw(); } else { el.querySelector("[data-rpv]").textContent = kc(num(d.rp)); clearTimeout(this._t); this._t = setTimeout(draw, 250); }
        save("kalkulacka", d);
      });
    },
    print() {
      const d = ctx.data.kalkulacka; if (!d || !(num(d.me) || num(d.her))) return `<p class="pd-note">Kalkulačku najdeš na webu v kapitole Otcovská a peníze – výsledky se sem po vyplnění propíšou.</p>`;
      const c = calc(d);
      return `<table class="pd-fill"><tbody><tr><td>Tvoje otcovská (14 dní)</td><td>${kc(c.otTotal)}</td></tr><tr><td>Její mateřská (28 týdnů)</td><td>${d.ppm !== false && num(d.her) ? kc(c.pmTotal) : "–"}</td></tr>
        <tr><td>Rodičovský příspěvek – zvolená měsíční výše</td><td>${kc(c.rp)} · ${c.dur} měsíců</td></tr><tr><td>Rodičovský skončí, až bude miminku</td><td>asi ${c.endAge} měsíců</td></tr></tbody></table><p class="pd-note">Orientační výpočet podle pravidel 2026.</p>`;
    },
  };

  T.rozpocet = {
    F: [["income", "Čisté příjmy domácnosti měsíčně (během rodičovské)", ""], ["fixed", "Pevné výdaje měsíčně (bydlení, energie, splátky, jídlo…)", ""], ["baby", "Nové výdaje za miminko měsíčně (odhad)", "4000"], ["gear", "Výbava jednorázově (odhad)", "25000"], ["pocket", "Tvoje kapesné měsíčně", "1000"]],
    calc(d) { const bal = num(d.income) - num(d.fixed) - num(d.baby) - num(d.pocket); return { bal, reserve: 3 * (num(d.fixed) + num(d.baby)) + num(d.gear) }; },
    render(el) {
      const d = ctx.data.rozpocet || Object.fromEntries(this.F.map(([k, , v]) => [k, v]));
      el.innerHTML = `<div class="tool-box"><div class="tool-grid">${this.F.map(([k, l]) => `<label>${l}<input inputmode="numeric" data-k="${k}" value="${esc(d[k])}"></label>`).join("")}</div><div class="tool-out" data-out></div><p class="small muted mb-0">${savedTag("rozpocet")}</p></div>`;
      const draw = () => { const c = this.calc(d), ok = num(d.income) && num(d.fixed); el.querySelector("[data-out]").innerHTML = `<div class="tool-kpis"><div><span>Měsíčně vám zbývá</span><b class="${ok && c.bal < 0 ? "neg" : ""}">${ok ? kc(c.bal) : "–"}</b><small>${!ok ? "doplň příjmy a pevné výdaje" : c.bal < 0 ? "chybí – hledejte, co omezit" : "do rezervy nebo na radosti"}</small></div><div><span>Cílová rezerva</span><b>${kc(c.reserve)}</b><small>3 měsíce výdajů + výbava</small></div></div>`; };
      draw();
      el.addEventListener("input", e => { const k = e.target.dataset.k; if (!k) return; d[k] = e.target.value; draw(); save("rozpocet", d); });
    },
    print() { const d = ctx.data.rozpocet; if (!d) return ""; const c = this.calc(d); return `<table class="pd-fill"><tbody>${this.F.map(([k, l]) => `<tr><td>${l}</td><td>${kc(num(d[k]))}</td></tr>`).join("")}<tr class="pd-sum"><td>Měsíčně zbývá</td><td>${kc(c.bal)}</td></tr><tr><td>Cílová rezerva</td><td>${kc(c.reserve)}</td></tr></tbody></table>`; },
  };

  T.tyden = {
    current() { const h = ctx.home || {}; if (h.due_date) return Math.max(4, Math.min(42, 40 - Math.ceil((new Date(h.due_date) - Date.now()) / 864e5 / 7))); return null; },
    card(w) { const r = (ctx.weeks || []).find(x => x.week === w); return r ? `<div class="wk-card"><div class="wk-n">${w}<small>. týden</small></div><dl><dt>Miminko</dt><dd>${esc(r.baby)}</dd><dt>Co udělat</dt><dd>${esc(r.dad)}</dd><dt>Pro tebe</dt><dd>${esc(r.for_you)}</dd></dl></div>` : `<p class="muted">Pro tento týden zatím nic nemáme.</p>`; },
    render(el) {
      const cur = this.current(), h = ctx.home || {};
      let w = cur || 12;
      const note = h.phase === "po-porodu" ? `Miminko už je na světě – mrkni do kapitoly <a href="#po-porodu">Po porodu</a>. Týdny si můžeš i tak projít.`
        : cur ? `Podle termínu porodu ${new Date(h.due_date).toLocaleDateString("cs-CZ")} jste teď v <b>${cur}. týdnu</b>.` : `Doplň termín porodu v <a href="clen.html">profilu</a> a ukážeme ti rovnou tvůj týden.`;
      el.innerHTML = `<div class="tool-box"><p class="small mb-0">${note}</p><div class="wk-nav"><button type="button" class="btn btn-ghost btn-sm" data-d="-1">Předchozí</button><select data-w>${(ctx.weeks || []).map(r => `<option value="${r.week}">${r.week}. týden${r.week === cur ? " (teď)" : ""}</option>`).join("")}</select><button type="button" class="btn btn-ghost btn-sm" data-d="1">Další</button></div><div data-card></div></div>`;
      const sel = el.querySelector("[data-w]"), box = el.querySelector("[data-card]");
      const show = () => { sel.value = w; box.innerHTML = this.card(w); };
      show();
      sel.onchange = () => { w = +sel.value; show(); };
      el.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { w = Math.max(4, Math.min(42, w + +b.dataset.d)); show(); });
    },
    print() { const c = this.current(); return c ? this.card(c) + (c < 42 ? this.card(c + 1) : "") : `<p class="pd-note">Doplň termín porodu v profilu a tady se objeví tvůj aktuální týden.</p>`; },
  };

  T.otazky = {
    DEF: ["Kdy máme jet do porodnice a kdy volat?", "Jak to u vás chodí s otcem u porodu a u císaře?", "Můžu mít miminko kůže na kůži, když ona nemůže?", "Co když porod nepůjde podle plánu – kdo nám co vysvětlí?", "Kde si u porodu můžu najíst, odpočinout a kam si můžu odejít vydýchat?"],
    get() { return ctx.data.otazky || { items: this.DEF.map(t => ({ t, done: false, note: "" })) }; },
    render(el) {
      const d = this.get();
      const draw = () => {
        el.innerHTML = `<div class="tool-box"><ul class="q-list">${d.items.map((q, i) => `<li class="${q.done ? "done" : ""}"><label class="tool-check"><input type="checkbox" data-i="${i}" ${q.done ? "checked" : ""}> <span>${esc(q.t)}</span></label>
          <input class="q-note" data-n="${i}" value="${esc(q.note)}" placeholder="Odpověď / poznámka">${q.own ? `<button type="button" class="linkbtn small" data-x="${i}">Smazat</button>` : ""}</li>`).join("")}</ul>
          <form class="q-add"><input name="q" maxlength="200" placeholder="Přidat vlastní otázku…"><button class="btn btn-dark btn-sm" type="submit">Přidat</button></form><p class="small muted mb-0">${savedTag("otazky")}</p></div>`;
        el.querySelector(".q-add").onsubmit = e => { e.preventDefault(); const v = e.target.q.value.trim(); if (!v) return; d.items.push({ t: v, done: false, note: "", own: true }); save("otazky", d); draw(); };
      };
      draw();
      el.addEventListener("change", e => { const i = e.target.dataset.i; if (i != null) { d.items[i].done = e.target.checked; e.target.closest("li").classList.toggle("done", e.target.checked); save("otazky", d); } });
      el.addEventListener("input", e => { const n = e.target.dataset.n; if (n != null) { d.items[n].note = e.target.value; save("otazky", d); } });
      el.addEventListener("click", e => { const x = e.target.dataset.x; if (x != null) { d.items.splice(+x, 1); save("otazky", d); draw(); } });
    },
    print() { const d = this.get(); return `<table class="pd-fill"><thead><tr><th style="width:24px"></th><th>Otázka</th><th>Odpověď</th></tr></thead><tbody>${d.items.map(q => `<tr><td>${q.done ? "☑" : "☐"}</td><td>${esc(q.t)}</td><td>${esc(q.note)}</td></tr>`).join("")}<tr><td>☐</td><td style="height:26px"></td><td></td></tr></tbody></table>`; },
  };

  T.smeny = {
    plan(d) {
      const bed = +(d.bed || 22), feed = d.feed || "kojeni", work = d.work || "ty";
      const H = h => (h % 24) + ":00";
      if (feed === "kojeni") {
        const rows = [[bed - 2, bed + 1, "Ty", "Ona jde spát hned po večerním kojení. Ty nosíš, přebaluješ, uspáváš."], [bed + 1, 30, "Ona", "Noční kojení. Ty přebalíš a odříháš, když se probudíš – a jdeš zase spát."], [30, 32, work === "ty" ? "Ona" : "Ty", work === "ty" ? "Ráno vstáváš do práce – ranní směnu má ona, o víkendu ji bereš ty." : "Ranní směna je tvoje: miminko po ranním kojení k tobě, ona dospává."]];
        return { rows, tips: ["Kojení je její, všechno okolo tvoje: voda, svačina, polštář, přebalení.", "Spi aspoň jeden blok 4–5 hodin v kuse – klidně ve vedlejším pokoji se špunty.", work === "nikdo" ? "Když nikdo nechodí do práce, střídejte se v ranní směně ob den." : "O víkendu si vyměňte: kdo spal v týdnu míň, dospává."] };
      }
      const split = 2 + 24, first = work === "ona" ? "Ona" : "Ty", second = first === "Ty" ? "Ona" : "Ty";
      const rows = [[bed - 2, bed, "Oba", "Večerní rituál spolu: koupání, krmení, uspání."], [bed, split, first, `${first === "Ty" ? "Tvoje" : "Její"} první noční směna – krmení z lahve, přebalení. Druhý spí se špunty.`], [split, 31, second, `${second === "Ty" ? "Tvoje" : "Její"} druhá směna do rána.`]];
      return { rows, tips: [work === "nikdo" ? "Když nikdo nechodí do práce, prohazujte směny ob noc." : `Kdo ráno vstává do práce, bere první směnu – pak spí vcelku do rána.`, "Lahve a sušené mléko si připravte večer, ať je to ve tři ráno na pár minut.", "Každý má aspoň jeden blok 4–5 hodin spánku v kuse."] };
    },
    table(p) { const H = h => (h % 24) + ":00"; return `<table class="pd-fill sm-t"><thead><tr><th>Čas</th><th>Kdo</th><th>Co</th></tr></thead><tbody>${p.rows.map(([a, b, who, what]) => `<tr><td>${H(a)}–${H(b)}</td><td><b>${who}</b></td><td>${what}</td></tr>`).join("")}</tbody></table><ul>${p.tips.map(t => `<li>${t}</li>`).join("")}</ul>`; },
    render(el) {
      const d = ctx.data.smeny || { feed: "kojeni", work: "ty", bed: "22" };
      const opt = (k, arr) => `<div class="seg-mini">${arr.map(([v, l]) => `<label><input type="radio" name="sm-${k}" data-k="${k}" value="${v}" ${String(d[k]) === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
      el.innerHTML = `<div class="tool-box"><div class="tool-grid sm-opts"><div><b>Krmení</b>${opt("feed", [["kojeni", "Kojení"], ["lahev", "Lahev"], ["kombinace", "Kombinace"]])}</div>
        <div><b>Kdo ráno do práce</b>${opt("work", [["ty", "Já"], ["ona", "Ona"], ["nikdo", "Nikdo"]])}</div>
        <div><b>Spát chodíte kolem</b>${opt("bed", [["21", "21:00"], ["22", "22:00"], ["23", "23:00"]])}</div></div><div data-out></div><p class="small muted mb-0">${savedTag("smeny")}</p></div>`;
      const draw = () => el.querySelector("[data-out]").innerHTML = this.table(this.plan(d));
      draw();
      el.addEventListener("change", e => { const k = e.target.dataset.k; if (!k) return; d[k] = e.target.value; draw(); save("smeny", d); });
    },
    print() { return this.table(this.plan(ctx.data.smeny || { feed: "kojeni", work: "ty", bed: "22" })); },
  };

  T.checkin = {
    Q: [["spanek", "Jak spíš, když můžeš spát?"], ["nalada", "Jaká je tvoje nálada?"], ["energie", "Kolik máš energie?"], ["klid", "Jak často vybuchuješ nebo jsi podrážděný? (5 = skoro vůbec)"], ["mluvit", "Máš s kým mluvit o tom, jak se máš?"]],
    weekKey(dt = new Date()) { const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate())); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return d.getUTCFullYear() + "-" + String(Math.ceil(((d - y) / 864e5 + 1) / 7)).padStart(2, "0"); },
    render(el) {
      const d = ctx.data.checkin || { entries: [] }, wk = this.weekKey();
      const cur = d.entries.find(e => e.w === wk) || { w: wk, s: {} };
      const draw = () => {
        const hist = d.entries.filter(e => this.Q.every(([k]) => +e.s[k])).slice(-12), sum = e => this.Q.reduce((a, [k]) => a + (+e.s[k] || 0), 0);
        const full = e => this.Q.every(([k]) => +e.s[k]); const done = d.entries.filter(full), last2 = done.slice(-2), low = done.length && (sum(done[done.length - 1]) <= 12 || (last2.length === 2 && last2.every(e => +e.s.nalada <= 2)));
        el.innerHTML = `<div class="tool-box"><div class="ci-q">${this.Q.map(([k, l]) => `<div class="ci-row"><span>${l}</span><div class="ci-scale">${[1, 2, 3, 4, 5].map(n => `<label><input type="radio" name="ci-${k}" data-k="${k}" value="${n}" ${+cur.s[k] === n ? "checked" : ""}><span>${n}</span></label>`).join("")}</div></div>`).join("")}</div>
          <p class="small muted">1 = špatně, 5 = skvěle. Odpovídáš za tento týden – kdykoli během týdne to můžeš změnit. ${savedTag("checkin")}</p>
          ${hist.length ? `<div class="ci-hist">${hist.map(e => { const s = sum(e); return `<div class="ci-bar" title="${e.w}: ${s}/25"><i style="height:${s / 25 * 100}%" class="${s <= 12 ? "low" : ""}"></i><small>${e.w.slice(5)}.</small></div>`; }).join("")}</div><p class="small muted">Tvoje skóre po týdnech (max. 25).</p>` : ""}
          ${low ? `<div class="callout warn"><h4>Vypadá to, že je toho teď hodně</h4><p class="mb-0">Není to slabost. Promluv si s někým – s partnerkou, kamarádem, praktickým lékařem nebo na <b>Lince první psychické pomoci 116 123</b> (nonstop, zdarma). <a href="pomoc.html">Další kontakty →</a></p></div>` : ""}
          <p class="small mb-0">Když máš myšlenky, že bys sobě nebo někomu ublížil, volej hned <b>116 123</b> nebo <b>155</b>.</p></div>`;
      };
      draw();
      el.addEventListener("change", e => {
        const k = e.target.dataset.k; if (!k) return;
        cur.s[k] = +e.target.value; cur.d = new Date().toISOString().slice(0, 10);
        if (!d.entries.includes(cur)) { d.entries = d.entries.filter(x => x.w !== wk).concat(cur).slice(-60); }
        save("checkin", d); draw();
      });
    },
    print() { const d = ctx.data.checkin; if (!d || !d.entries.length) return ""; return `<table class="pd-fill"><thead><tr><th>Týden</th>${this.Q.map(([, l]) => `<th>${l.split("?")[0]}</th>`).join("")}</tr></thead><tbody>${d.entries.slice(-8).map(e => `<tr><td>${e.w}</td>${this.Q.map(([k]) => `<td>${e.s[k] || ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`; },
  };

  /* Synchronizovaný checklist: [[checklist:klic]] + seznam pod ním */
  function syncList(ul, key) {
    const d = ctx.data["cl-" + key] || { done: [] };
    ul.classList.add("checklist", "interactive", "synced");
    [...ul.children].forEach((li, i) => {
      li.classList.toggle("done", d.done.includes(i));
      li.onclick = e => { if (e.target.closest("a")) return; li.classList.toggle("done"); d.done = [...ul.children].map((x, j) => x.classList.contains("done") ? j : -1).filter(j => j >= 0); save("cl-" + key, d); };
    });
    ul.insertAdjacentHTML("afterend", `<p class="small muted">${savedTag("cl-" + key)}</p>`);
  }

  /* Rozbalení markerů v HTML z Markdownu */
  function expand(html, mode) {
    html = html.replace(/<p>\[\[checklist:([a-z0-9-]+)\]\]<\/p>\s*<ul>([\s\S]*?)<\/ul>/g, (m, k, items) => {
      if (mode !== "print") return `<ul data-checklist="${k}">${items}</ul>`;
      const d = ctx.data["cl-" + k] || { done: [] }; let j = 0;
      return `<ul class="checklist">${items.replace(/<li>/g, () => `<li class="${d.done.includes(j++) ? "done" : ""}">`)}</ul>`;
    });
    html = html.replace(/<p>\[\[nastroj:([a-z0-9-]+)\]\]<\/p>/g, (m, k) => mode === "print" ? (T[k] && T[k].print ? `<div class="pd-tool">${T[k].print()}</div>` : "") : `<div class="tool" data-tool="${k}"><p class="muted small">Načítám…</p></div>`);
    html = html.replace(/<p>\[\[pripravujeme:([^|\]]+)\|?([^\]]*)\]\]<\/p>/g, (m, t, d) => mode === "print" ? "" : `<div class="soon-card"><span class="tag">Připravujeme</span><b>${t}</b>${d ? `<span>${d}</span>` : ""}</div>`);
    return html;
  }
  async function init(o) {
    ctx = Object.assign(ctx, o);
    if (!ctx.sb) return;
    const keys = ["kalkulacka", "rozpocet", "otazky", "smeny", "checkin", "cl-doklady", "cl-taska-ty"];
    try { const r = await ctx.sb.rpc("member_tool_get", { p_keys: keys }); if (!r.error && r.data) ctx.data = r.data; } catch (e) {}
    try { const w = await ctx.sb.rpc("guide_weeks_list"); if (!w.error) ctx.weeks = w.data || []; } catch (e) {}
  }
  function mount(root) {
    root.querySelectorAll("[data-tool]").forEach(el => { const t = T[el.dataset.tool]; if (t && !el.dataset.on) { el.dataset.on = 1; t.render(el); } });
    root.querySelectorAll("ul[data-checklist]").forEach(ul => { if (!ul.dataset.on) { ul.dataset.on = 1; syncList(ul, ul.dataset.checklist); } });
  }
  return { init, expand, mount, calc, dailyBenefit };
})();
