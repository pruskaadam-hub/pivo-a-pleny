/* Průvodce: každá kapitola = veřejná část + část pro členy Klubu (rozostřená / rozkliknutelná) + PDF ke stažení (jen pro členy) */
(async function () {
  const boxes = [...document.querySelectorAll(".ch-extra")];
  if (!boxes.length) return;
  const esc = window.PPMedia ? PPMedia.esc : (t => String(t ?? ""));
  const C = window.PP_CONFIG || {};
  let logged = false; try { logged = !!JSON.parse(localStorage.getItem("pp-member-auth") || "null"); } catch (e) {}
  const FAKE = '<p class="fake">████████ ███ ██████████ ███████ ████ ███████████</p><p class="fake">██████ █████████ ████ ██████ ███████</p><p class="fake">████████████ ███ ██████ ████████ ██</p><p class="fake">█████ ██████████ ████ ███████</p>';
  const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const memberHtml = body => PPTools.expand(PPMedia.md(body || ""), "live")
    .replace(/<strong>Pro tebe:<\/strong>/g, '<br><span class="pt-pill">Pro tebe</span>')
    .replace(/<h3>Co to znamená pro tebe<\/h3>/g, '<h3 class="pt-h">Co to znamená pro tebe</h3>');

  let rows = [], HOME = null, sb = null;
  try {
    if (C.supabaseUrl && window.supabase) {
      sb = supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: false, storageKey: "pp-member-auth" } });
      const r = await sb.rpc("guide_extras_list"); if (!r.error) rows = r.data || [];
      if (logged) { try { const h = await sb.rpc("member_home"); if (!h.error && h.data) HOME = h.data; } catch (e) {} }
    }
  } catch (e) {}
  const isMember = rows.some(x => !x.locked && x.body);
  if (isMember && window.PPTools) await PPTools.init({ sb, home: HOME });

  /* Okno „PDF je pro členy“ */
  const modal = document.createElement("div");
  modal.className = "pp-modal hidden"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `<div class="pp-modal-box"><button type="button" class="pp-modal-x" aria-label="Zavřít">×</button><span class="tag premium">Pro členy Klubu</span>
    <h3 data-mt></h3><p data-mp></p><div class="flex"><a class="btn btn-copper" href="klub.html#registrace">Připojit se do Klubu</a><a class="small" data-ml href="clen.html">Přihlásit se</a></div></div>`;
  document.body.appendChild(modal);
  const closeModal = () => modal.classList.add("hidden");
  modal.addEventListener("click", e => { if (e.target === modal || e.target.closest(".pp-modal-x")) closeModal(); });
  addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  function askJoin(title) {
    modal.querySelector("[data-mt]").textContent = `PDF „${title}“ je pro členy Klubu`;
    modal.querySelector("[data-mp]").textContent = logged
      ? "Tvůj účet je zdarma. Celou kapitolu i s částí pro členy, kalkulačkami a přílohou se schématy si stáhneš jako člen Klubu."
      : "Celou kapitolu i s částí pro členy, kalkulačkami a přílohou se schématy si stáhneš jako člen Klubu. Už jsi člen? Přihlas se.";
    modal.querySelector("[data-ml]").classList.toggle("hidden", logged);
    modal.classList.remove("hidden"); modal.querySelector(".btn").focus();
  }

  const all = [...document.querySelectorAll(".chapter")];
  boxes.forEach(box => {
    const sec = box.closest(".chapter"), row = rows.find(r => r.slug === box.dataset.extra);
    const title = box.dataset.title || sec.querySelector("h2").textContent;
    const open = !!(row && !row.locked && row.body);
    const teaser = row && row.teaser && row.teaser.length ? row.teaser : ["Nástroje a taháky na míru", "Scénáře a plány krok za krokem", "Celá kapitola jako PDF"];

    /* PDF tlačítko ve veřejné části – vidí ho každý */
    const bar = document.createElement("div");
    bar.className = "ch-pdf";
    bar.innerHTML = `<button class="btn btn-dark btn-sm" type="button">Stáhnout „${esc(title)}“ jako PDF</button>
      <span class="small muted">${open ? "Obě části kapitoly + příloha se schématy a tabulkami k vyplnění." : `${LOCK} Pro členy Klubu: obě části kapitoly + příloha se schématy a tabulkami.`}</span>`;
    sec.querySelector(".ch-body").after(bar);
    bar.querySelector("button").onclick = () => {
      if (!open) return askJoin(title);
      PPPrint.print({ section: sec, row, name: HOME && HOME.name || "", num: all.indexOf(sec) + 1, total: all.length });
    };

    /* Část pro členy */
    const head = `<div class="xpart-h"><span class="xpart-ico">${open ? "★" : LOCK}</span><div><span class="xpart-k">Část 2 · pro členy Klubu</span><h3>${esc(row ? row.title : "Rozšíření kapitoly")}</h3>
      <ul class="xpart-teaser">${teaser.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div><span class="xpart-tog" aria-hidden="true"></span></div>`;
    if (open) {
      box.innerHTML = `<div class="xpart open-able"><button type="button" class="xpart-btn" aria-expanded="false">${head}</button><div class="xpart-body prose" hidden></div></div>`;
      const btn = box.querySelector(".xpart-btn"), body = box.querySelector(".xpart-body");
      btn.onclick = () => {
        const show = body.hidden;
        if (show && !body.dataset.ready) {
          body.innerHTML = memberHtml(row.body);
          body.querySelectorAll("blockquote").forEach(q => { const b = document.createElement("button"); b.type = "button"; b.className = "linkbtn small copy-q"; b.textContent = "Zkopírovat text"; b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(q.innerText).then(() => b.textContent = "Zkopírováno"); }; q.after(b); });
          PPTools.mount(body); body.dataset.ready = 1;
        }
        body.hidden = !show; btn.setAttribute("aria-expanded", show); box.querySelector(".xpart").classList.toggle("is-open", show);
      };
      if (location.hash === "#" + sec.id + "-klub") btn.click();
    } else {
      box.innerHTML = `<div class="xpart locked"><a class="xpart-btn" href="klub.html#registrace">${head}</a>
        <div class="xpart-blur" aria-hidden="true">${FAKE}</div>
        <div class="xpart-cta"><p><b>Odemkni část 2 v Klubu.</b> ${logged ? "Tvůj účet je zdarma – členstvím odemkneš tuhle část ve všech kapitolách." : "Získáš ji ve všech kapitolách průvodce, i jako PDF."}</p>
          <div class="flex"><a class="btn btn-copper btn-sm" href="klub.html#registrace">Připojit se do Klubu</a>${logged ? "" : '<a class="small" href="clen.html">Už jsem člen · Přihlásit</a>'}</div></div></div>`;
      box.querySelector(".xpart-blur").onclick = () => location.href = "klub.html#registrace";
    }
  });
})();
