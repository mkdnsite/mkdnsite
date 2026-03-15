import type { MkdnSiteConfig, CspConfig } from '../config/schema.ts'

/**
 * Sanitize a CSP source value to prevent directive injection.
 * Strips semicolons which act as directive separators.
 */
function sanitizeCspValue (val: string): string {
  return val.replace(/;/g, '').trim()
}

/**
 * Build a Content-Security-Policy header value string from the current config.
 * Only includes external sources for features that are actually enabled.
 */
export function buildCsp (config: MkdnSiteConfig): string {
  const { client, analytics, csp, theme } = config
  const gaEnabled = (analytics?.googleAnalytics?.measurementId ?? '') !== ''
  const useCdn = client.mermaid || client.charts
  const extra: CspConfig = csp ?? { enabled: true }

  // script-src
  const scriptSrc = ["'self'", "'unsafe-inline'"]
  if (useCdn) scriptSrc.push('https://cdn.jsdelivr.net')
  if (gaEnabled) {
    scriptSrc.push('https://www.googletagmanager.com')
    scriptSrc.push('https://www.google-analytics.com')
  }
  if (extra.extraScriptSrc != null) {
    scriptSrc.push(...extra.extraScriptSrc.map(sanitizeCspValue))
  }

  // style-src
  const styleSrc = ["'self'", "'unsafe-inline'"]
  if (client.math) styleSrc.push('https://cdn.jsdelivr.net')
  if (theme.customCssUrl != null) {
    try {
      const u = new URL(theme.customCssUrl)
      if (u.protocol === 'https:' || u.protocol === 'http:') {
        styleSrc.push(u.origin)
      }
    } catch {
      // relative URL — 'self' covers it
    }
  }
  if (extra.extraStyleSrc != null) {
    styleSrc.push(...extra.extraStyleSrc.map(sanitizeCspValue))
  }

  // img-src
  const imgSrc = ["'self'", 'data:', 'https:']
  if (client.mermaid) imgSrc.push('blob:')
  if (extra.extraImgSrc != null) {
    imgSrc.push(...extra.extraImgSrc.map(sanitizeCspValue))
  }

  // font-src
  const fontSrc = ["'self'", 'https://fonts.gstatic.com']
  if (client.math) fontSrc.push('https://cdn.jsdelivr.net')
  if (extra.extraFontSrc != null) {
    fontSrc.push(...extra.extraFontSrc.map(sanitizeCspValue))
  }

  // connect-src
  const connectSrc = ["'self'"]
  if (gaEnabled) {
    connectSrc.push('https://www.google-analytics.com')
    connectSrc.push('https://analytics.google.com')
    connectSrc.push('https://region1.google-analytics.com')
  }
  if (extra.extraConnectSrc != null) {
    connectSrc.push(...extra.extraConnectSrc.map(sanitizeCspValue))
  }

  const directives: string[] = [
    "default-src 'self'",
    'script-src ' + scriptSrc.join(' '),
    'style-src ' + styleSrc.join(' '),
    'img-src ' + imgSrc.join(' '),
    'font-src ' + fontSrc.join(' '),
    'connect-src ' + connectSrc.join(' '),
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]

  if (extra.reportUri != null && extra.reportUri !== '') {
    directives.push('report-uri ' + sanitizeCspValue(extra.reportUri))
  }

  return directives.join('; ')
}
