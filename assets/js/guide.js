/* Průvodce: části kapitol jen pro členy Klubu (Supabase) + tisk / uložení kapitoly do PDF */
(async function () {
  const boxes = [...document.querySelectorAll(".ch-extra")];
  if (!boxes.length) return;
  const esc = window.PPMedia ? PPMedia.esc : (t => String(t ?? ""));
  const C = window.PP_CONFIG || {};
  let logged = false; try { logged = !!JSON.parse(localStorage.getItem("pp-member-auth") || "null"); } catch (e) {}
  const FAKE = '<p class="fake">████████ ███ ██████████ ███████ ████ ███████████</p><p class="fake">██████ █████████ ████ ██████ ███████</p><p class="fake">████████████ ███ ██████ ████████ ██</p>';

  function locked(box, row) {
    const title = row ? row.title : "Rozšíření kapitoly pro členy Klubu";
    const teaser = row && row.teaser && row.teaser.length ? row.teaser : ["Taháky a checklisty ke stažení", "Scénáře a plány krok za krokem", "Celá kapitola k vytištění"];
    box.innerHTML = `<div class="xlock">
      <div class="xlock-fake" aria-hidden="true">${FAKE}</div>
      <div class="xlock-box"><span class="tag premium">Pro členy Klubu</span><h3>${esc(title)}</h3>
        <ul class="ticks-list">${teaser.map(t => `<li>${esc(t)}</li>`).join("")}<li>Celá kapitola ke stažení a vytištění (PDF)</li></ul>
        <div class="flex"><a class="btn btn-dark btn-sm" href="klub.html#registrace">Odemknout v Klubu</a>${logged ? "" : '<a class="btn btn-ghost btn-sm" href="clen.html">Už jsem člen · Přihlásit</a>'}</div></div></div>`;
  }
  function open(box, row) {
    box.innerHTML = `<div class="xopen"><div class="xopen-h"><span class="tag premium">Klub</span><h3>${esc(row.title)}</h3></div>
      <div class="prose">${PPMedia.md(row.body || "")}</div>
      <div class="flex ch-actions"><button class="btn btn-dark btn-sm" type="button" data-print>Stáhnout / vytisknout kapitolu</button><span class="small muted">V tiskovém okně zvol „Uložit jako PDF“.</span></div></div>`;
    box.querySelector("[data-print]").onclick = () => printChapter(box.closest(".chapter"));
  }
  function printChapter(sec) {
    document.body.classList.add("printing"); sec.classList.add("print-target");
    const done = () => { document.body.classList.remove("printing"); sec.classList.remove("print-target"); removeEventListener("afterprint", done); };
    addEventListener("afterprint", done); window.print(); setTimeout(done, 1500);
  }

  let rows = [];
  try {
    if (C.supabaseUrl && window.supabase) {
      const sb = supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: false, storageKey: "pp-member-auth" } });
      const r = await sb.rpc("guide_extras_list"); if (!r.error) rows = r.data || [];
    }
  } catch (e) {}
  boxes.forEach(b => { const row = rows.find(r => r.slug === b.dataset.extra); row && !row.locked && row.body ? open(b, row) : locked(b, row); });
})();
