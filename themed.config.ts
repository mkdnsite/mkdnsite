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
    logo: {
      src: '/mkdnsite-logo.png',
      alt: 'mkdnsite',
      width: 32,
      height: 32
    },
    logoText: 'mkdnsite',
    colors: {
      accent: '#7c3aed',
      text: '#1c1917',
      bg: '#ffffff',
      bgAlt: '#fafaf9',
      border: '#e7e5e4'
    },
    colorsDark: {
      accent: '#a78bfa',
      text: '#f5f5f4',
      bg: '#0c0a09',
      bgAlt: '#1c1917',
      border: '#292524'
    },
    showNav: true,
    showToc: true,
    colorScheme: 'system'
  }
}

export default config
