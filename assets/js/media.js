/* Pivo & Pleny – přehrávače (YouTube, Spotify, Apple Podcasts, audio) a jednoduchý Markdown */
window.PPMedia = (function () {
  const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function embedUrl(kind, url) {
    if (!url) return null;
    let u; try { u = new URL(url); } catch (e) { return null; }
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be" || h.endsWith("youtube.com")) {
      const id = h === "youtu.be" ? u.pathname.slice(1) : (u.searchParams.get("v") || (u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/) || [])[1]);
      return id && /^[\w-]{6,}$/.test(id) ? { src: `https://www.youtube-nocookie.com/embed/${id}`, h: 0, ratio: true } : null;
    }
    if (h === "open.spotify.com") {
      const m = u.pathname.match(/\/(episode|show|track|playlist|album)\/([A-Za-z0-9]+)/);
      return m ? { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, h: m[1] === "episode" || m[1] === "track" ? 152 : 352 } : null;
    }
    if (h === "podcasts.apple.com") return { src: `https://embed.podcasts.apple.com${u.pathname}${u.search}`, h: u.searchParams.get("i") ? 175 : 450 };
    if (h === "player.vimeo.com" || h === "vimeo.com") {
      const id = (u.pathname.match(/(\d{6,})/) || [])[1];
      return id ? { src: `https://player.vimeo.com/video/${id}`, h: 0, ratio: true } : null;
    }
    return null;
  }

  /* item: {kind, url, title}, src = podepsaná adresa audia */
  function player(item, src) {
    if (item.kind === "audio") return src ? `<div class="embed"><audio controls preload="none" src="${esc(src)}"></audio></div>` : "";
    const e = embedUrl(item.kind, item.url);
    if (e) {
      const style = e.ratio ? "aspect-ratio:16/9;height:auto" : `height:${e.h}px`;
      return `<div class="embed"><iframe src="${esc(e.src)}" style="${style}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" title="${esc(item.title)}"></iframe></div>`;
    }
    return item.url ? `<a class="btn btn-ghost btn-sm" href="${esc(item.url)}" target="_blank" rel="noopener">Otevřít ↗</a>` : "";
  }

  /* Markdown → HTML (bezpečně: nejdřív escapovat) */
  function md(text, vars) {
    let t = esc(text || "");
    if (vars) t = t.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] != null ? esc(vars[k]) : m);
    const inline = s => s
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[\w.\-\/#]+\.html[^)\s]*)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])_(.+?)_(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
    return t.replace(/\r/g, "").trim().split(/\n\s*\n/).map(block => {
      const lines = block.split("\n").filter(l => l.trim() !== "");
      if (/^#{1,3} /.test(block)) { const n = Math.min(block.match(/^#+/)[0].length + 1, 4); return `<h${n}>${inline(block.replace(/^#+ /, ""))}</h${n}>`; }
      if (lines.every(l => /^\s*[-*] /.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("")}</ul>`;
      if (lines.every(l => /^\s*\d+\. /.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\s*\d+\. /, ""))}</li>`).join("")}</ol>`;
      return `<p>${inline(lines.join("<br>"))}</p>`;
    }).join("");
  }

  return { esc, embedUrl, player, md };
})();
