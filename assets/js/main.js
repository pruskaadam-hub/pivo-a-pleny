/* PIVO & PLENY — sdílená hlavička, patička a drobné interakce */
(function () {
  const LOGO = `
<svg viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="60" cy="60" r="56" fill="none" stroke="#b8743d" stroke-width="3"/>
  <circle cx="60" cy="60" r="48" fill="none" stroke="#b8743d" stroke-width="1" stroke-dasharray="2 4"/>
  <!-- půllitr -->
  <path d="M38 44h28v36a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z" fill="none" stroke="#f3ece0" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M66 52h6a7 7 0 0 1 0 14h-6" fill="none" stroke="#f3ece0" stroke-width="3.2"/>
  <path d="M36 44c0-6 5-9 9-8 2-5 10-6 13-2 4-3 11-1 11 5" fill="none" stroke="#d39255" stroke-width="3.2" stroke-linecap="round"/>
  <line x1="46" y1="54" x2="46" y2="76" stroke="#f3ece0" stroke-width="2" opacity=".5"/>
  <line x1="58" y1="54" x2="58" y2="76" stroke="#f3ece0" stroke-width="2" opacity=".5"/>
  <!-- spínací špendlík -->
  <path d="M74 84l14-14" stroke="#d39255" stroke-width="3" stroke-linecap="round"/>
  <circle cx="72" cy="86" r="4" fill="none" stroke="#d39255" stroke-width="2.5"/>
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
  const navHtml = NAV.map(item => {
    if (item.sub) {
      const active = item.sub.some(s => s.href === here);
      return `<div class="has-sub"><button type="button" ${active ? 'style="color:#d39255"' : ""}>${item.label}</button><div class="sub">${
        item.sub.map(s => `<a href="${s.href}" ${s.href === here ? 'aria-current="page"' : ""}>${s.label}</a>`).join("")
      }</div></div>`;
    }
    return `<a href="${item.href}" ${item.href === here ? 'aria-current="page"' : ""}>${item.label}</a>`;
  }).join("");

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="wrap">
        <a class="brand" href="index.html" aria-label="Pivo &amp; Pleny – domů">${LOGO}
          <span class="brand-name">Pivo &amp; Pleny<small>Táta. Parťák. Člověk.</small></span></a>
        <button class="menu-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
        <nav class="nav" id="nav" aria-label="Hlavní navigace">${navHtml}
          <a class="btn btn-copper btn-sm btn-nav" href="klub.html" style="color:#141414">Klub ★ 99 Kč</a>
        </nav>
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
            <a class="brand" href="index.html" style="color:#f3ece0;margin-bottom:16px">${LOGO}<span class="brand-name">Pivo &amp; Pleny</span></a>
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
          <span>V krizi volej <strong style="color:#f3ece0">116 123</strong> (nonstop, zdarma) nebo <strong style="color:#f3ece0">112</strong>.</span>
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
