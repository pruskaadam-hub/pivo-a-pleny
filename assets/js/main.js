/* PIVO & PLENY — sdílená hlavička, menu, plovoucí lišta, patička a interakce */
(function () {
  const here = location.pathname.split("/").pop() || "index.html";
  const cur = h => (h === here ? ' aria-current="page"' : "");
  const MARK = '<span class="mark">p<b>&amp;</b>p.</span>';

  const BIG = [
    ["index.html", "Úvod"], ["pruvodce.html", "Průvodce"], ["myty.html", "Bořiči mýtů"],
    ["cage.html", "Cage"], ["dotaznik.html", "Jaký jsem táta?"], ["klub.html", "Klub ★"],
  ];
  const GUIDE = [
    ["pruvodce.html", "Praktické návody"], ["zvyky.html", "10 zvyků"], ["spanek.html", "Spánkový deficit"],
    ["stres.html", "Stres a vztek"], ["pomoc.html", "Pomoc sobě i okolí"],
  ];
  const MORE = [
    ["blog.html", "Blog"], ["zeny-o-muzich.html", "Ženy o mužích"], ["faq.html", "Časté otázky"], ["o-nas.html", "O nás"],
  ];
  const links = arr => arr.map(([h, l]) => `<a href="${h}"${cur(h)}>${l}</a>`).join("");

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="wrap bar">
        <a class="brand" href="index.html" aria-label="Pivo &amp; Pleny – domů">${MARK}
          <span class="brand-name">Pivo &amp; Pleny<small>Táta. Parťák. Člověk.</small></span></a>
        <div class="head-actions">
          <nav class="quick" aria-label="Rychlá navigace">
            <a href="pruvodce.html"${cur("pruvodce.html")}>Průvodce</a>
            <a href="myty.html"${cur("myty.html")}>Mýty</a>
            <a href="cage.html"${cur("cage.html")}>Cage</a>
            <a href="dotaznik.html"${cur("dotaznik.html")}>Dotazník</a>
          </nav>
          <a class="btn btn-copper btn-sm btn-nav" href="klub.html">Klub 99 Kč</a>
          <button class="menu-btn" aria-expanded="false" aria-controls="overlay">Menu <span>+</span></button>
        </div>
      </div>`;
    const ov = document.createElement("div");
    ov.className = "overlay"; ov.id = "overlay";
    ov.innerHTML = `
      <div class="wrap cols">
        <nav class="big" aria-label="Hlavní navigace">${links(BIG)}</nav>
        <div class="list"><h4>Průvodce</h4>${links(GUIDE)}</div>
        <div class="list"><h4>Víc</h4>${links(MORE)}
          <div class="sos-mini">Když je toho moc<strong>116 123</strong>Linka první psychické pomoci, nonstop a zdarma.</div>
        </div>
      </div>`;
    header.after(ov);
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
    fb.innerHTML = `${MARK}<span class="txt">Nemusíš na to být <b>sám.</b></span><a class="btn btn-dark btn-sm" href="klub.html">Klub 99 Kč</a>`;
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
            <a class="brand" href="index.html" style="margin-bottom:18px">${MARK}<span class="brand-name">Pivo &amp; Pleny</span></a>
            <p>Web pro chlapy, kteří čekají dítě, právě se jim narodilo – nebo to celé zpracovávají. Prakticky, s fakty a s respektem k ženám.</p>
            <p class="small muted">Obsah je informativní a nenahrazuje lékaře, porodní asistentku ani psychologa.</p>
          </div>
          <div><h4>Průvodce</h4><ul>${GUIDE.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>
          <div><h4>Komunita</h4><ul>
            <li><a href="cage.html">Cage – zpovědnice</a></li><li><a href="myty.html">Bořiči mýtů</a></li>
            <li><a href="dotaznik.html">Jaký jsem táta?</a></li><li><a href="zeny-o-muzich.html">Ženy o mužích</a></li><li><a href="blog.html">Blog</a></li>
          </ul></div>
          <div><h4>Pivo &amp; Pleny</h4><ul>
            <li><a href="klub.html">Klub ★</a></li><li><a href="klub.html#konzultace">Konzultace</a></li>
            <li><a href="faq.html">FAQ</a></li><li><a href="o-nas.html">O nás</a></li><li><a href="mailto:ahoj@pivoapleny.cz">ahoj@pivoapleny.cz</a></li>
          </ul></div>
        </div>
        <div class="bottom">
          <span>© ${new Date().getFullYear()} Pivo &amp; Pleny · Fotografie: <a href="https://unsplash.com/license">Unsplash</a></span>
          <span>V krizi volej <strong style="color:#000814">116 123</strong> (nonstop, zdarma) nebo <strong style="color:#000814">112</strong>.</span>
        </div>
      </div>`;
  }

  /* Newsletter – zatím bez backendu (napojit na Ecomail / MailerLite) */
  document.querySelectorAll("form[data-newsletter]").forEach(f => {
    f.addEventListener("submit", e => {
      e.preventDefault();
      const msg = f.parentElement.querySelector(".form-msg");
      f.style.display = "none";
      if (msg) msg.classList.add("show");
    });
  });

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

  /* Filtry (mýty, blog, Cage) */
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
