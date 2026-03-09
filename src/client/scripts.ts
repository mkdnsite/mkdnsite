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
/* Search: placeholder for client-side search functionality.
   Will be implemented with a pre-built content index served at /search-index.json.
   For MVP, this is a no-op that can be activated once the index endpoint exists. */
`.trim()
