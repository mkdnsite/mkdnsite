import type { ClientConfig } from '../config/schema.ts'

/**
 * Generate client-side JavaScript for progressive enhancements.
 * Returns a <script> tag string or empty string if all features are disabled.
 */
export function CLIENT_SCRIPTS (client: ClientConfig): string {
  if (!client.enabled) return ''

  const scripts: string[] = []

  if (client.themeToggle) {
    scripts.push(THEME_TOGGLE_SCRIPT)
  }

  if (client.copyButton) {
    scripts.push(COPY_BUTTON_SCRIPT)
  }

  if (client.mermaid) {
    scripts.push(MERMAID_SCRIPT)
  }

  if (client.search) {
    scripts.push(SEARCH_SCRIPT)
    scripts.push(HIGHLIGHT_SCRIPT)
  }

  if (client.charts) {
    scripts.push(CHART_SCRIPT)
  }

  if (scripts.length === 0) return ''

  return `<script>${scripts.join('\n')}</script>`
}

const THEME_TOGGLE_SCRIPT = `
(function(){
  var btn = document.querySelector('.mkdn-theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function(e){
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var next = isDark ? 'light' : 'dark';
    var rect = btn.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    document.documentElement.style.setProperty('--mkdn-toggle-x', x + 'px');
    document.documentElement.style.setProperty('--mkdn-toggle-y', y + 'px');
    function apply(){
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mkdn-theme', next);
    }
    if (document.startViewTransition) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  });
})();
`.trim()

const COPY_BUTTON_SCRIPT = `
(function(){
  document.querySelectorAll('.mkdn-code-block, .mkdn-prose pre').forEach(function(block){
    var code = block.querySelector('code');
    if(!code) return;
    if(code.classList.contains('language-mermaid')) return;
    var btn = document.createElement('button');
    btn.className = 'mkdn-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function(){
      navigator.clipboard.writeText(code.textContent||'').then(function(){
        btn.textContent = 'Copied!';
        setTimeout(function(){ btn.textContent = 'Copy'; }, 2000);
      });
    });
    block.style.position = 'relative';
    block.appendChild(btn);
  });
})();
`.trim()

const MERMAID_SCRIPT = `
(function(){
  var mermaidBlocks = document.querySelectorAll('code.language-mermaid');
  if(mermaidBlocks.length === 0) return;
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  s.onload = function(){
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    mermaidBlocks.forEach(function(block){
      var pre = block.parentElement;
      var container = document.createElement('div');
      container.className = 'mkdn-mermaid';
      var id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
      mermaid.render(id, block.textContent||'').then(function(result){
        container.innerHTML = result.svg;
        pre.parentElement.replaceChild(container, pre);
      });
    });
  };
  document.head.appendChild(s);
})();
`.trim()

const SEARCH_SCRIPT = `
(function(){
  // ── Search modal ──────────────────────────────────────────────────────────
  var overlay, input, resultsEl, activeIdx = -1, debounceTimer, lastQuery = '';

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function boldTerms(excerpt, terms) {
    var safe = escHtml(excerpt);
    var sorted = terms.slice().sort(function(a,b){ return b.length - a.length; });
    sorted.forEach(function(t){
      if (t.length < 2) return;
      var escaped = t.replace(new RegExp('[.*+?^' + '$' + '{}()|[\\]\\\\]','g'),'\\$&');
      var re = new RegExp('(' + escaped + ')', 'gi');
      safe = safe.replace(re, '<mark>$1</mark>');
    });
    return safe;
  }

  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'mkdn-search-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','Search');
    overlay.innerHTML =
      '<div class="mkdn-search-modal">' +
        '<div class="mkdn-search-input-wrap">' +
          '<svg class="mkdn-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="text" class="mkdn-search-input" placeholder="Search documentation..." autocomplete="off" spellcheck="false">' +
          '<kbd class="mkdn-search-kbd">Esc</kbd>' +
        '</div>' +
        '<div class="mkdn-search-results"><p class="mkdn-search-hint">Type to search\u2026</p></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('.mkdn-search-input');
    resultsEl = overlay.querySelector('.mkdn-search-results');

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeModal(); });
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
  }

  function openModal() {
    if (!overlay) buildModal();
    overlay.classList.add('mkdn-search-overlay--open');
    input.value = '';
    lastQuery = '';
    activeIdx = -1;
    resultsEl.innerHTML = '<p class="mkdn-search-hint">Type to search\u2026</p>';
    requestAnimationFrame(function(){ input.focus(); });
  }

  function closeModal() {
    if (overlay) overlay.classList.remove('mkdn-search-overlay--open');
    clearTimeout(debounceTimer);
  }

  function onInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 250);
  }

  function doSearch() {
    var q = input.value.trim();
    if (q === lastQuery) return;
    lastQuery = q;
    activeIdx = -1;
    if (!q) { resultsEl.innerHTML = '<p class="mkdn-search-hint">Type to search\u2026</p>'; return; }
    resultsEl.innerHTML = '<p class="mkdn-search-hint mkdn-search-hint--loading">Searching\u2026</p>';
    var url = '/api/search?q=' + encodeURIComponent(q) + '&limit=10';
    fetch(url).then(function(r){ return r.json(); }).then(function(results){
      renderResults(results, q);
    }).catch(function(){
      resultsEl.innerHTML = '<p class="mkdn-search-hint">Search unavailable</p>';
    });
  }

  function renderResults(results, q) {
    if (!results.length) {
      resultsEl.innerHTML = '<p class="mkdn-search-hint">No results found</p>';
      return;
    }
    var terms = q.toLowerCase().split(/\\s+/).filter(function(t){ return t.length >= 2; });
    var html = results.map(function(r, i){
      var href = r.slug + '?q=' + encodeURIComponent(q);
      return '<a href="' + href + '" class="mkdn-search-result' + (i === 0 ? ' mkdn-search-result--active' : '') + '" data-idx="' + i + '">' +
        '<div class="mkdn-search-result-title">' + escHtml(r.title || r.slug) + '</div>' +
        '<div class="mkdn-search-result-excerpt">' + boldTerms(r.excerpt || '', terms) + '</div>' +
        '<div class="mkdn-search-result-slug">' + escHtml(r.slug) + '</div>' +
      '</a>';
    }).join('');
    resultsEl.innerHTML = html;
    activeIdx = 0;
    resultsEl.querySelectorAll('.mkdn-search-result').forEach(function(el){
      el.addEventListener('mouseenter', function(){
        setActive(parseInt(el.getAttribute('data-idx')));
      });
    });
  }

  function setActive(idx) {
    var items = resultsEl.querySelectorAll('.mkdn-search-result');
    if (!items.length) return;
    idx = Math.max(0, Math.min(idx, items.length - 1));
    items.forEach(function(el, i){
      el.classList.toggle('mkdn-search-result--active', i === idx);
    });
    items[idx].scrollIntoView({ block: 'nearest' });
    activeIdx = idx;
  }

  function onKeydown(e) {
    var items = resultsEl.querySelectorAll('.mkdn-search-result');
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); return; }
    if (e.key === 'Enter' && items.length) {
      e.preventDefault();
      var target = items[Math.max(0, activeIdx)];
      if (target) { closeModal(); window.location.href = target.getAttribute('href'); }
    }
  }

  // Keyboard shortcut: Cmd+K / Ctrl+K
  document.addEventListener('keydown', function(e){
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openModal(); }
    if (e.key === 'Escape' && overlay && overlay.classList.contains('mkdn-search-overlay--open')) closeModal();
  });

  // Search trigger button
  document.addEventListener('click', function(e){
    if (e.target && e.target.closest && e.target.closest('.mkdn-search-trigger')) openModal();
  });
})();
`.trim()

const HIGHLIGHT_SCRIPT = `
(function(){
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (!q) return;

  params.delete('q');
  var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
  history.replaceState(null, '', newUrl);

  var terms = q.toLowerCase().split(/ +/).filter(function(t){ return t.length >= 2; });
  terms.sort(function(a, b){ return b.length - a.length; });
  if (!terms.length) return;

  var prose = document.querySelector('.mkdn-prose');
  if (!prose) return;

  var marks = [];

  var walker = document.createTreeWalker(prose, 4, function(node){
    var p = node.parentNode;
    if (!p) return 2;
    var tag = p.nodeName.toUpperCase();
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') return 2;
    return 1;
  });

  var textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(function(node){
    var text = node.nodeValue || '';
    var lower = text.toLowerCase();
    var found = false;
    terms.forEach(function(t){ if (lower.indexOf(t) !== -1) found = true; });
    if (!found) return;

    var frag = document.createDocumentFragment();
    var remaining = text;
    var lowerRemaining = lower;

    while (remaining.length > 0) {
      var bestIdx = -1, bestLen = 0;
      terms.forEach(function(t){
        var idx = lowerRemaining.indexOf(t);
        if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) { bestIdx = idx; bestLen = t.length; }
      });

      if (bestIdx === -1) { frag.appendChild(document.createTextNode(remaining)); break; }
      if (bestIdx > 0) frag.appendChild(document.createTextNode(remaining.slice(0, bestIdx)));

      var mark = document.createElement('mark');
      mark.className = 'mkdn-search-highlight';
      mark.textContent = remaining.slice(bestIdx, bestIdx + bestLen);
      frag.appendChild(mark);
      marks.push(mark);

      remaining = remaining.slice(bestIdx + bestLen);
      lowerRemaining = lowerRemaining.slice(bestIdx + bestLen);
    }

    node.parentNode.replaceChild(frag, node);
  });

  if (marks.length > 0) marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

  function fadeHighlights() {
    marks.forEach(function(m){ m.classList.add('mkdn-search-highlight--fading'); });
    setTimeout(function(){
      marks.forEach(function(m){
        if (m.parentNode) m.parentNode.replaceChild(document.createTextNode(m.textContent || ''), m);
      });
      marks = [];
    }, 600);
  }

  var fadeTimer = setTimeout(fadeHighlights, 8000);
  document.addEventListener('click', function(){ clearTimeout(fadeTimer); fadeHighlights(); }, { once: true });
})();
`.trim()

const CHART_SCRIPT = `
(function(){
  var chartBlocks = document.querySelectorAll('code.language-chart');
  if (chartBlocks.length === 0) return;

  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
  s.onload = function(){
    var root = getComputedStyle(document.documentElement);
    var textMuted = root.getPropertyValue('--mkdn-text-muted').trim() || '#6b7280';
    var borderColor = root.getPropertyValue('--mkdn-border').trim() || '#e5e7eb';
    var accent = root.getPropertyValue('--mkdn-accent').trim() || '#6366f1';
    var fontBody = root.getPropertyValue('--mkdn-font-body').trim() || 'inherit';

    var palette = [
      accent,
      '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
      '#8b5cf6', '#ec4899', '#14b8a6'
    ];

    Chart.defaults.color = textMuted;
    Chart.defaults.borderColor = borderColor;
    Chart.defaults.font.family = fontBody;

    chartBlocks.forEach(function(block, idx){
      var pre = block.parentElement;
      var raw = block.textContent || '';
      var config;
      try {
        config = JSON.parse(raw);
      } catch(e) {
        var errEl = document.createElement('div');
        errEl.className = 'mkdn-chart-error';
        errEl.textContent = 'Chart error: invalid JSON';
        pre.parentElement.replaceChild(errEl, pre);
        return;
      }

      if (config.data && config.data.datasets) {
        config.data.datasets.forEach(function(ds, i){
          var color = palette[i % palette.length];
          if (!ds.backgroundColor) {
            if (config.type === 'pie' || config.type === 'doughnut' || config.type === 'polarArea') {
              ds.backgroundColor = palette.slice(0, (ds.data || []).length);
            } else {
              ds.backgroundColor = color + '33';
            }
          }
          if (!ds.borderColor) ds.borderColor = color;
          if (config.type === 'line' || config.type === 'radar') {
            if (ds.tension === undefined) ds.tension = 0.3;
            if (ds.fill === undefined) ds.fill = false;
          }
        });
      }

      if (!config.options) config.options = {};
      config.options.responsive = true;
      config.options.maintainAspectRatio = true;

      var container = document.createElement('div');
      container.className = 'mkdn-chart';
      var canvas = document.createElement('canvas');
      canvas.id = 'mkdn-chart-' + idx;
      container.appendChild(canvas);
      pre.parentElement.replaceChild(container, pre);

      try {
        new Chart(canvas, config);
      } catch(e) {
        container.innerHTML = '';
        var err = document.createElement('div');
        err.className = 'mkdn-chart-error';
        err.textContent = 'Chart error: ' + (e.message || 'unknown error');
        container.appendChild(err);
      }
    });
  };
  document.head.appendChild(s);
})();
`.trim()
