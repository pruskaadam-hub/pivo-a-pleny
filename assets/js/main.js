/* PIVO & PLENY — sdílená hlavička, patička a drobné interakce */
(function () {
  const LOGO = `
<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 24h24v26a5 5 0 0 1-5 5H21a5 5 0 0 1-5-5z" stroke="#FFC300" stroke-width="3.4"/>
  <path d="M40 30h5a6 6 0 0 1 0 12h-5" stroke="#FFC300" stroke-width="3.4"/>
  <path d="M13 25c0-5 4-8 8-7 2-5 9-5 11-1 4-3 10-1 10 4" stroke="#FFD60A" stroke-width="3.4"/>
  <path d="M24 31v17M32 31v17" stroke="#FFC300" stroke-width="2" opacity=".55"/>
  <path d="M10 8l6 6M54 8l-6 6M32 4v7" stroke="#FFD60A" stroke-width="2.4"/>
</svg>`;

  const NAV = [
    { href: "index.html", label: "Úvod" },
    { label: "Průvodce", sub: [
      { href: "pruvodce.html", label: "Praktické návody: těhotenství a porod" },
      { href: "zvyky.html", label: "10 zvyků, které pomůžou" },
      { href: "spanek.html", label: "Spánkový deficit" },
      { href: "stres.html", label: "Stres, vztek a agresivita" },
      { href: "pomoc.html", label: "Jak pomoct sobě a okolí" },
    ]},
    { href: "myty.html", label: "Bořiči mýtů" },
    { href: "cage.html", label: "Cage" },
    { href: "dotaznik.html", label: "Jaký jsem táta?" },
    { label: "Víc", sub: [
      { href: "blog.html", label: "Blog" },
      { href: "zeny-o-muzich.html", label: "Ženy o mužích" },
      { href: "faq.html", label: "Časté otázky (FAQ)" },
      { href: "o-nas.html", label: "O nás" },
    ]},
  ];

  const here = location.pathname.split("/").pop() || "index.html";
  const item = it => {
    if (it.sub) {
      const active = it.sub.some(s => s.href === here);
      return `<div class="has-sub"><button type="button" ${active ? 'style="color:#FFC300"' : ""}>${it.label}</button><div class="sub">${
        it.sub.map(s => `<a href="${s.href}" ${s.href === here ? 'aria-current="page"' : ""}>${s.label}</a>`).join("")
      }</div></div>`;
    }
    return `<a href="${it.href}" ${it.href === here ? 'aria-current="page"' : ""}>${it.label}</a>`;
  };
  const left = NAV.slice(0, 3).map(item).join(""), right = NAV.slice(3).map(item).join("");

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="wrap">
        <nav class="nav" id="nav" aria-label="Hlavní navigace">
          <div class="nav-left">${left}</div>
          <div class="nav-right">${right}
            <a class="btn btn-copper btn-sm btn-nav" href="klub.html">Klub ★ 99 Kč</a></div>
        </nav>
        <a class="brand" href="index.html" aria-label="Pivo &amp; Pleny – domů">${LOGO}
          <span class="brand-name">Pivo &amp; Pleny<small>Táta. Parťák. Člověk.</small></span></a>
        <button class="menu-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
      </div>
      <div class="stripe"></div>`;
    const t = header.querySelector(".menu-toggle"), n = header.querySelector(".nav");
    t.addEventListener("click", () => {
      const o = n.classList.toggle("open");
      t.setAttribute("aria-expanded", o);
      t.textContent = o ? "Zavřít" : "Menu";
    });
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="wrap">
        <div class="cols">
          <div>
            <a class="brand" href="index.html" style="margin-bottom:16px;flex-direction:row;text-align:left">${LOGO}<span class="brand-name">Pivo &amp; Pleny</span></a>
            <p>Web pro muže, kteří čekají dítě, právě se jim narodilo – nebo to celé zpracovávají. Prakticky, bez keců a bez mýtů.</p>
            <p class="small">Obsah je informativní a nenahrazuje lékaře, porodní asistentku ani psychologa.</p>
          </div>
          <div><h4>Průvodce</h4><ul>
            <li><a href="pruvodce.html">Praktické návody</a></li>
            <li><a href="zvyky.html">10 zvyků</a></li>
            <li><a href="spanek.html">Spánkový deficit</a></li>
            <li><a href="stres.html">Stres a vztek</a></li>
            <li><a href="pomoc.html">Kde hledat pomoc</a></li>
          </ul></div>
          <div><h4>Komunita</h4><ul>
            <li><a href="cage.html">Cage – zpovědnice</a></li>
            <li><a href="myty.html">Bořiči mýtů</a></li>
            <li><a href="dotaznik.html">Jaký jsem táta?</a></li>
            <li><a href="zeny-o-muzich.html">Ženy o mužích</a></li>
            <li><a href="blog.html">Blog</a></li>
          </ul></div>
          <div><h4>Pivo &amp; Pleny</h4><ul>
            <li><a href="klub.html">Klub ★</a></li>
            <li><a href="klub.html#konzultace">Konzultace</a></li>
            <li><a href="faq.html">FAQ</a></li>
            <li><a href="o-nas.html">O nás</a></li>
            <li><a href="mailto:ahoj@pivoapleny.cz">ahoj@pivoapleny.cz</a></li>
          </ul></div>
        </div>
        <div class="bottom">
          <span>© ${new Date().getFullYear()} Pivo &amp; Pleny. Psáno chlapy pro chlapy – s respektem k ženám.</span>
          <span>V krizi volej <strong style="color:#F1F4F8">116 123</strong> (nonstop, zdarma) nebo <strong style="color:#F1F4F8">112</strong>.</span>
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
      li.addEventListener("click", () => {
        li.classList.toggle("done");
        const s = [...ul.children].map((x, k) => x.classList.contains("done") ? k : -1).filter(k => k >= 0);
        try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {}
      });
    });
  });

  /* Filtry (mýty, blog) */
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
