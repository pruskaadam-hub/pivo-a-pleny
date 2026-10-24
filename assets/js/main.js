/* PAPALOO — sdílená hlavička, menu, plovoucí lišta, patička a interakce */
/* Backend (Supabase): PP.rpc() volá veřejné databázové funkce, PP.fn() Edge Functions */
window.PP = (function () {
  const C = window.PP_CONFIG || {};
  const live = !!(C.supabaseUrl && C.supabaseKey);
  const headers = () => {
    const h = { apikey: C.supabaseKey, "Content-Type": "application/json" };
    if (/^eyJ/.test(C.supabaseKey || "")) h.Authorization = "Bearer " + C.supabaseKey;
    return h;
  };
  async function call(url, body) {
    const r = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body || {}) });
    const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
    if (!r.ok) { const e = new Error((d && (d.message || d.error)) || r.statusText); e.code = d && (d.message || d.error); throw e; }
    return d;
  }
  return {
    live, payments: live && !!C.payments,
    rpc: (fn, args) => call(`${C.supabaseUrl}/rest/v1/rpc/${fn}`, args),
    fn: (name, body) => call(`${C.supabaseUrl}/functions/v1/${name}`, body),
  };
})();

(function () {
  const here = location.pathname.split("/").pop() || "index.html";
  const cur = h => (h === here ? ' aria-current="page"' : "");
  const MARK = '<span class="mark">pa<b>.</b></span>';

  const BIG = [
    ["index.html", "Úvod"], ["pruvodce.html", "Průvodce"], ["blog.html", "Blog"], ["myty.html", "Bořiči mýtů"],
    ["cage.html", "Honest Cage"], ["dotaznik.html", "Jaký jsem táta?"], ["klub.html", "Klub ★"],
  ];
  const GUIDE = [
    ["pruvodce.html", "Praktické návody"], ["zvyky.html", "10 zvyků"], ["spanek.html", "Spánkový deficit"],
    ["stres.html", "Stres a vztek"], ["pomoc.html", "Pomoc sobě i okolí"],
  ];
  const MORE = [["faq.html", "Časté otázky"], ["o-nas.html", "O nás"]];
  const links = arr => arr.map(([h, l]) => `<a href="${h}"${cur(h)}>${l}</a>`).join("");

  /* Přihlášení: tlačítko v záhlaví podle stavu (Přihlásit se / Můj profil); odhlášení je v menu a na profilu */
  const AUTH_KEY = "pp-member-auth";
  const session = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } };
  function renderAcct() {
    const slot = document.getElementById("acct-slot"); if (!slot) return;
    const s = session();
    slot.innerHTML = s
      ? `<a class="acct-btn" href="clen.html"${cur("clen.html")}>Můj profil</a>`
      : `<a class="acct-btn" href="clen.html"${cur("clen.html")}>Přihlásit se</a>`;
    const ma = document.getElementById("menu-acct");
    if (ma) ma.innerHTML = s
      ? `<a href="clen.html"${cur("clen.html")}>Můj profil</a><a href="#" data-logout>Odhlásit se</a>`
      : `<a href="clen.html"${cur("clen.html")}>Přihlásit / registrovat</a>`;
    document.querySelectorAll("[data-logout]").forEach(b => b.onclick = async e => { e.preventDefault(); await logout(); });
  }
  async function logout() {
    const C = window.PP_CONFIG || {}, ses = session();
    try { if (ses && ses.access_token && C.supabaseUrl) await fetch(`${C.supabaseUrl}/auth/v1/logout?scope=local`, { method: "POST", headers: { apikey: C.supabaseKey, Authorization: "Bearer " + ses.access_token } }); } catch (e) {}
    try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
    location.href = here === "clen.html" ? "clen.html" : location.href.split("#")[0];
  }
  window.PPAuth = { refresh: () => renderAcct() };
  addEventListener("storage", e => { if (e.key === AUTH_KEY) renderAcct(); });
  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="wrap bar">
        <a class="brand" href="index.html" aria-label="Papaloo – domů">${MARK}
          <span class="brand-name">Papaloo<small>Táta. Parťák. Člověk.</small></span></a>
        <div class="head-actions">
          <nav class="quick" aria-label="Hlavní části webu">
            <a href="pruvodce.html"${cur("pruvodce.html")}>Průvodce</a>
            <a href="myty.html"${cur("myty.html")}>Mýty</a>
            <a href="cage.html"${cur("cage.html")}>Honest Cage</a>
            <a href="dotaznik.html"${cur("dotaznik.html")}>Jaký jsem táta?</a>
          </nav>
          <a class="btn btn-copper btn-sm btn-nav" href="klub.html">Připoj se do Klubu</a>
          <span class="acct-slot" id="acct-slot"></span>
          <button class="menu-btn" aria-expanded="false" aria-controls="overlay" aria-label="Menu"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></button>
        </div>
      </div>`;
    const ov = document.createElement("div");
    ov.className = "overlay"; ov.id = "overlay";
    ov.innerHTML = `
      <div class="wrap cols">
        <nav class="big" aria-label="Hlavní navigace">${links(BIG)}</nav>
        <div class="list"><h4>V průvodci</h4>${links(GUIDE)}</div>
        <div class="list"><h4>Účet a info</h4><div id="menu-acct"></div>${links(MORE)}<a href="mailto:ahoj@pivoapleny.cz">Napsat nám</a>
          <div class="sos-mini">Když je toho moc<strong>116 123</strong>Linka první psychické pomoci, nonstop a zdarma.</div>
        </div>
      </div>`;
    header.after(ov);
    renderAcct();
    const btn = header.querySelector(".menu-btn");
    const toggle = open => {
      document.documentElement.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    btn.addEventListener("click", () => toggle(!document.documentElement.classList.contains("menu-open")));
    document.addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });
    addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY > 10), { passive: true });
  }

  /* Plovoucí lišta po odscrollování */
  if (!document.body.hasAttribute("data-no-float")) {
    const fb = document.createElement("div");
    fb.className = "floatbar";
    fb.innerHTML = `${MARK}<span class="txt">Nemusíš na to být <b>sám.</b></span><a class="btn btn-dark btn-sm" href="klub.html">Klub od 225 Kč</a>`;
    document.body.appendChild(fb);
    const onS = () => fb.classList.toggle("show", scrollY > innerHeight * .8 && innerHeight + scrollY < document.body.scrollHeight - 260);
    addEventListener("scroll", onS, { passive: true }); onS();
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="wrap">
        <div class="footer-big">Táta. Parťák. Člověk.<br><span style="color:#A87F00">A v tom všem nejsi sám.</span></div>
        <div class="cols">
          <div>
            <a class="brand" href="index.html" style="margin-bottom:18px">${MARK}<span class="brand-name">Papaloo</span></a>
            <p>Web pro chlapy, kteří čekají dítě, právě se jim narodilo – nebo to celé zpracovávají. Prakticky, s fakty a s respektem k ženám.</p>
            <p class="small muted">Obsah je informativní a nenahrazuje lékaře, porodní asistentku ani psychologa.</p>
          </div>
          <div><h4>Průvodce a blog</h4><ul>${GUIDE.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}<li><a href="blog.html">Blog</a></li></ul></div>
          <div><h4>Komunita</h4><ul>
            <li><a href="cage.html">Honest Cage – anonymní sdílení</a></li><li><a href="myty.html">Bořiči mýtů</a></li>
            <li><a href="dotaznik.html">Jaký jsem táta?</a></li><li><a href="klub.html">Klub ★</a></li><li><a href="klub.html#konzultace">Konzultace</a></li>
          </ul></div>
          <div><h4>Účet a info</h4><ul>
            <li><a href="clen.html">Můj profil</a></li><li><a href="faq.html">Časté otázky</a></li><li><a href="o-nas.html">O nás</a></li><li><a href="mailto:ahoj@pivoapleny.cz">ahoj@pivoapleny.cz</a></li>
          </ul></div>
        </div>
        <div class="bottom">
          <span>© ${new Date().getFullYear()} Papaloo · Fotografie: <a href="https://unsplash.com/license">Unsplash</a></span>
          <span>V krizi volej <strong style="color:#000814">116 123</strong> (nonstop, zdarma) nebo <strong style="color:#000814">112</strong>.</span>
        </div>
      </div>`;
  }

  /* Newsletter → Supabase (tabulka newsletter) */
  document.querySelectorAll("form[data-newsletter]").forEach(f => {
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const msg = f.parentElement.querySelector(".form-msg");
      const email = f.querySelector('input[type="email"]');
      const btn = f.querySelector("button");
      if (email && !email.checkValidity()) { email.reportValidity(); return; }
      if (btn) btn.disabled = true;
      try {
        if (PP.live && email) await PP.rpc("subscribe_newsletter", { p_email: email.value.trim(), p_source: here.replace(".html", "") });
        f.style.display = "none";
        if (msg) msg.classList.add("show");
      } catch (err) {
        if (btn) btn.disabled = false;
        alertBox(f, "Přihlášení se nepovedlo. Zkontroluj e-mail a zkus to prosím znovu.");
      }
    });
  });
  function alertBox(form, text) {
    let el = form.querySelector(".form-err");
    if (!el) { el = document.createElement("p"); el.className = "form-err small"; el.setAttribute("role", "alert"); el.style.cssText = "color:var(--red);margin:8px 0 0;flex-basis:100%"; form.appendChild(el); }
    el.textContent = text;
  }

  /* Klikací checklisty – ukládá se jen v prohlížeči */
  document.querySelectorAll(".checklist.interactive").forEach((ul, i) => {
    const key = "pp-check-" + here + "-" + i;
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) {}
    [...ul.children].forEach((li, j) => {
      if (saved.includes(j)) li.classList.add("done");
      li.addEventListener("click", e => {
        if (e.target.closest("a")) return;
        li.classList.toggle("done");
        const s = [...ul.children].map((x, k) => x.classList.contains("done") ? k : -1).filter(k => k >= 0);
        try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {}
      });
    });
  });

  /* Bořiči mýtů – klik odhalí pravdu */
  document.querySelectorAll(".myth").forEach(m => {
    m.setAttribute("tabindex", "0");
    m.setAttribute("role", "button");
    const t = () => m.classList.toggle("open");
    m.addEventListener("click", e => { if (!e.target.closest("a")) t(); });
    m.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });

  /* Filtry (mýty, blog, Honest Cage) */
  document.querySelectorAll("[data-filters]").forEach(bar => {
    const target = document.querySelector(bar.dataset.filters);
    bar.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      bar.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      const f = b.dataset.f;
      target.querySelectorAll("[data-cat]").forEach(el => {
        el.style.display = (f === "all" || el.dataset.cat.split(" ").includes(f)) ? "" : "none";
      });
    });
  });
})();
