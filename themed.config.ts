import type { MkdnSiteConfig } from './src/config/schema.ts'

const config: Partial<MkdnSiteConfig> = {
  site: {
    title: 'mkdnsite',
    description: 'Markdown for the web — HTML for humans, Markdown for agents.',
    url: 'https://mkdn.site'
  },
  staticDir: './static',
  theme: {
    mode: 'prose',
    builtinCss: true,
    logo: {
      src: '/mkdnsite-logo.png',
      alt: 'mkdnsite',
      width: 32,
      height: 32
    },
    logoText: 'mkdnsite',
    // Light mode: warm parchment with gold/amber accent
    colors: {
      accent: '#b5851a',
      text: '#2c1f0f',
      textMuted: '#8a7055',
      bg: '#faf6ee',
      bgAlt: '#f0e8d5',
      border: '#d8c8a0',
      link: '#b5851a',
      linkHover: '#8b4a08',
      codeBg: 'rgba(181, 133, 26, 0.10)',
      preBg: '#1e1710'
    },
    // Dark mode: deep charcoal with burnished gold
    colorsDark: {
      accent: '#d4a82a',
      text: '#ede0c8',
      textMuted: '#9e8868',
      bg: '#17120b',
      bgAlt: '#100d07',
      border: '#3a2e1c',
      link: '#d4a82a',
      linkHover: '#f0c84a',
      codeBg: 'rgba(212, 168, 42, 0.12)',
      preBg: '#0c0904'
    },
    fonts: {
      body: "'Source Sans 3', Georgia, serif",
      heading: "'Playfair Display', Georgia, serif",
      mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace"
    },
    customCssUrl: '/zen-theme.css',
    showNav: true,
    showToc: true,
    colorScheme: 'system'
  }
}

export default config
