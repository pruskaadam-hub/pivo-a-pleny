/* Honest Cage: zeď (pořadí se míchá jednou za návštěvu), reakce, ukládání myšlenek (Klub), odeslání příspěvku */
(async function () {
  const C = window.PP_CONFIG || {};
  const LABEL = { porod: "Porod", myslenky: "Moje myšlenky", vztahy: "Vztahy", otcovstvi: "Otcovství" };
  const RX = ["Mám to stejně", "Držím palce", "Díky, žes to napsal"];
  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const wall = document.getElementById("wall");
  const pop = document.getElementById("save-pop");

  /* Pořadí: náhodné, ale stejné po celou návštěvu (sessionStorage = do zavření okna/karty) */
  let seed; try { seed = +sessionStorage.getItem("pp-cage-seed"); } catch (e) {}
  if (!seed) { seed = Math.floor(Math.random() * 2 ** 31) + 1; try { sessionStorage.setItem("pp-cage-seed", seed); } catch (e) {} }
  const rnd = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(seed);
  const shuffle = arr => { const r = arr.slice().sort((x, y) => x.id - y.id); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  let reacts = {}; try { reacts = JSON.parse(localStorage.getItem("pp-cage-reacts") || "{}"); } catch (e) {}
  let sb = null, saved = new Set(), klub = false, logged = false;
  try { logged = !!JSON.parse(localStorage.getItem("pp-member-auth") || "null"); } catch (e) {}
  if (logged && window.supabase && C.supabaseUrl) {
    sb = supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: false, storageKey: "pp-member-auth" } });
    try { const r = await sb.rpc("cage_my_saves"); if (!r.error && r.data) { klub = !!r.data.klub; saved = new Set(r.data.ids || []); } } catch (e) {}
  }

  const card = c => {
    const key = "db" + c.id, on = saved.has(c.id);
    return `<article class="confession c-${esc(c.category)}" data-cat="${esc(c.category)}" data-id="${c.id}">
      <div class="meta"><span class="chip">${LABEL[c.category] || ""}</span>${c.phase ? `<span>${esc(c.phase)}</span>` : ""}</div>
      <p>„${esc(c.body)}“</p>
      <div class="c-foot"><div class="reactions">${RX.map((r, j) => `<button type="button" data-k="${key}-${j}" class="${reacts[key + "-" + j] ? "on" : ""}">${r} <b data-n>${(c.reacts || [])[j] || ""}</b></button>`).join("")}</div>
        <button type="button" class="save${on ? " on" : ""}" data-save="${c.id}" aria-pressed="${on}" title="${on ? "Uloženo v profilu" : "Uložit myšlenku"}">${on ? "★ Uloženo" : "☆ Uložit"}</button></div>
    </article>`;
  };

  try {
    const rows = PP.live ? await PP.rpc("cage_wall", { p_limit: 300 }) : [];
    wall.innerHTML = rows && rows.length ? shuffle(rows).map(card).join("") : '<p class="muted">Zeď se právě plní. Buď první, kdo napíše.</p>';
  } catch (e) { wall.innerHTML = '<p class="muted">Zeď se nepodařilo načíst. Zkus to prosím za chvíli.</p>'; }

  const showPop = (btn, text, loginLink) => {
    document.getElementById("save-pop-t").textContent = text;
    document.getElementById("save-pop-login").classList.toggle("hidden", !loginLink);
    pop.classList.remove("hidden");
    const r = btn.getBoundingClientRect(), host = pop.parentElement.getBoundingClientRect();
    pop.style.top = (r.bottom - host.top + 10) + "px";
    pop.style.left = Math.max(0, Math.min(r.right - host.left - pop.offsetWidth, host.width - pop.offsetWidth)) + "px";
  };
  pop.querySelector("[data-close]").onclick = () => pop.classList.add("hidden");
  document.addEventListener("click", e => { if (!pop.classList.contains("hidden") && !e.target.closest("#save-pop, [data-save]")) pop.classList.add("hidden"); });

  wall.addEventListener("click", async e => {
    const sv = e.target.closest("[data-save]");
    if (sv) {
      if (!sb) return showPop(sv, "Ulož si, co tě chytlo, a vracej se k tomu ve svém profilu. Stačí být členem Klubu.", true);
      if (!klub) return showPop(sv, "Tvůj účet je zdarma. Ukládání myšlenek odemkne členství v Klubu.", false);
      const id = +sv.dataset.save, on = !saved.has(id);
      sv.disabled = true;
      const { error } = await sb.rpc("cage_save", { p_id: id, p_on: on });
      sv.disabled = false;
      if (error) return showPop(sv, error.message.includes("klub_only") ? "Ukládání myšlenek je jen pro členy Klubu." : "Uložení se nepovedlo, zkus to prosím znovu.", false);
      on ? saved.add(id) : saved.delete(id);
      sv.classList.toggle("on", on); sv.setAttribute("aria-pressed", on); sv.textContent = on ? "★ Uloženo" : "☆ Uložit"; sv.title = on ? "Uloženo v profilu" : "Uložit myšlenku";
      return;
    }
    const b = e.target.closest(".reactions button"); if (!b) return;
    b.classList.toggle("on"); const on = b.classList.contains("on"); reacts[b.dataset.k] = on;
    try { localStorage.setItem("pp-cage-reacts", JSON.stringify(reacts)); } catch (x) {}
    const m = b.dataset.k.match(/^db(\d+)-(\d)$/);
    if (m && PP.live) {
      const n = b.querySelector("[data-n]"); if (n) n.textContent = Math.max((+n.textContent || 0) + (on ? 1 : -1), 0) || "";
      PP.rpc("cage_react", { p_id: +m[1], p_kind: +m[2], p_delta: on ? 1 : -1 }).catch(() => {});
    }
  });

  /* Odeslání příspěvku */
  const ta = document.getElementById("c-text"), cnt = document.getElementById("c-count");
  ta.addEventListener("input", () => cnt.textContent = ta.value.length);
  document.getElementById("cage-form").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target, btn = form.querySelector("button[type=submit]");
    if (ta.value.trim().length < 20) { ta.setCustomValidity("Napiš prosím aspoň pár vět (min. 20 znaků)."); ta.reportValidity(); ta.setCustomValidity(""); return; }
    btn.disabled = true;
    try {
      if (PP.live) await PP.rpc("submit_confession", { p_category: document.getElementById("c-cat").value, p_phase: document.getElementById("c-phase").value, p_body: ta.value.trim() });
      [...form.querySelectorAll(":scope > :not(#cage-msg)")].forEach(el => el.style.display = "none");
      document.getElementById("cage-msg").classList.add("show");
    } catch (x) {
      btn.disabled = false;
      let er = form.querySelector(".form-err");
      if (!er) { er = document.createElement("p"); er.className = "form-err small"; er.setAttribute("role", "alert"); er.style.color = "var(--red)"; btn.after(er); }
      er.textContent = "Odeslání se nepovedlo. Zkus to prosím za chvíli znovu – text máš pořád v políčku.";
    }
  });
})();
