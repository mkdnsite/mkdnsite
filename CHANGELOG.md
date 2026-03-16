# Changelog

## 1.0.0 (2026-03-16)


### Features

* Add built-in MCP server with search index ([#25](https://github.com/mkdnsite/mkdnsite/issues/25)) ([51efa0d](https://github.com/mkdnsite/mkdnsite/commit/51efa0d96b6c3d4d2b4efcef18a09161fb0aae6c))
* Add Chart.js chart rendering for embedded chart data ([#32](https://github.com/mkdnsite/mkdnsite/issues/32)) ([c2d40b8](https://github.com/mkdnsite/mkdnsite/commit/c2d40b88667d3b22cbb471f14d90a425ca56969a))
* Add custom theming support (colors, fonts, logo, custom CSS) ([#2](https://github.com/mkdnsite/mkdnsite/issues/2)) ([56e0d43](https://github.com/mkdnsite/mkdnsite/commit/56e0d43a083ff483bd5fc926e7ad78e494754416))
* Add Dockerfile and Docker Hub publish to release workflow ([#31](https://github.com/mkdnsite/mkdnsite/issues/31)) ([e616ffb](https://github.com/mkdnsite/mkdnsite/commit/e616ffb5313f86181ff7b18f77fd3a1d9e0b23e4))
* Add dynamic Content Security Policy (CSP) header for HTML responses ([#40](https://github.com/mkdnsite/mkdnsite/issues/40)) ([6d2a700](https://github.com/mkdnsite/mkdnsite/commit/6d2a700d2f7af1f73c28821ec0fd768da9d4d34d))
* Add favicon support with format detection and logo fallback ([#38](https://github.com/mkdnsite/mkdnsite/issues/38)) ([0495696](https://github.com/mkdnsite/mkdnsite/commit/04956963806350ebc09db4a81ecfd50fa357898f))
* Add GitHub repository source with --github CLI flag ([#24](https://github.com/mkdnsite/mkdnsite/issues/24)) ([a9070fa](https://github.com/mkdnsite/mkdnsite/commit/a9070fa5409c94c95f5d17e6758ebbaf7cf953c2))
* Add Human UI improvements with docs/blog presets ([#21](https://github.com/mkdnsite/mkdnsite/issues/21)) ([670b60c](https://github.com/mkdnsite/mkdnsite/commit/670b60c5ade494a92b032e52ae415b318455e80d))
* Add math/KaTeX support ([b9ae10b](https://github.com/mkdnsite/mkdnsite/commit/b9ae10b8e92fa579e2cbe0be65029ec0b840ebcc))
* Add OpenGraph and Twitter Card meta tags ([#20](https://github.com/mkdnsite/mkdnsite/issues/20)) ([dc052bf](https://github.com/mkdnsite/mkdnsite/commit/dc052bf768611dede92c4d283b4375efdc6feda3))
* Add optional Google Analytics (GA4) support ([#39](https://github.com/mkdnsite/mkdnsite/issues/39)) ([136d552](https://github.com/mkdnsite/mkdnsite/commit/136d552977e83227d42865bf246c51ed4629e816))
* Add site search with ⌘K modal and result highlighting ([#27](https://github.com/mkdnsite/mkdnsite/issues/27)) ([5c67b36](https://github.com/mkdnsite/mkdnsite/commit/5c67b367500b0ec6189379c9aa01d140aa29e9ac))
* Add stdio transport for MCP server via mkdnsite mcp subcommand ([#30](https://github.com/mkdnsite/mkdnsite/issues/30)) ([b551d04](https://github.com/mkdnsite/mkdnsite/commit/b551d04f2c152b6d7f4ff9fa41d69838fc4562f4))
* Better header links via Lucide ([7b796d8](https://github.com/mkdnsite/mkdnsite/commit/7b796d81a0c87361ec63c3321759cc80bf7cdbc2))
* Expanded support for GFM ([568581f](https://github.com/mkdnsite/mkdnsite/commit/568581f1f012cea54ac391f51039256b2b27a0c2))
* Implement CloudflareAdapter with R2ContentSource ([#41](https://github.com/mkdnsite/mkdnsite/issues/41)) ([41121de](https://github.com/mkdnsite/mkdnsite/commit/41121de21502c75ea8abde27e9e3f1e33d5d0343))
* Improved styling for typography, links, tables ([8341bec](https://github.com/mkdnsite/mkdnsite/commit/8341becd10e83783f8f54620ae736a7e0c83f2b2))
* Initial project scaffolding ([0e58e49](https://github.com/mkdnsite/mkdnsite/commit/0e58e49f0c37f1eff140132e6eeb95309f198a7c))
* Initial support for syntax highlighting ([13d771e](https://github.com/mkdnsite/mkdnsite/commit/13d771e0b0f45a64d2f12d5f7843f4e7c26c453d))
* Pluggable response caching with CDN headers and ETag support ([#45](https://github.com/mkdnsite/mkdnsite/issues/45)) ([5a0c44c](https://github.com/mkdnsite/mkdnsite/commit/5a0c44c6d569eae3a74e11e8ec789a9146e2f868))
* Pluggable traffic analytics with human/AI classification ([#43](https://github.com/mkdnsite/mkdnsite/issues/43)) ([034c72b](https://github.com/mkdnsite/mkdnsite/commit/034c72b37c9991dddede8bed5bc78f3a8f5a9073))
* Polish startup banner and CLI help with ASCII art and ANSI colors ([#34](https://github.com/mkdnsite/mkdnsite/issues/34)) ([dbd7324](https://github.com/mkdnsite/mkdnsite/commit/dbd73240d4c9b30f2bb83a3e31c64727b6b7dfc0))
* Serialize/deserialize SearchIndex for cross-isolate caching ([#44](https://github.com/mkdnsite/mkdnsite/issues/44)) ([02dca0e](https://github.com/mkdnsite/mkdnsite/commit/02dca0e2d359d84b3d143924959bb066e8a6ffb9))
* Support system/light/dark mode ([c6b9d24](https://github.com/mkdnsite/mkdnsite/commit/c6b9d24a9e2cecb79a00c1be5fd128bdccf8427c))
* Treat README.md as index fallback ([321d429](https://github.com/mkdnsite/mkdnsite/commit/321d429e677465fb01951a317c5976df10cc5706))


### Bug Fixes

* Remove unnecessary language label for code blocks and diagrams ([86a2229](https://github.com/mkdnsite/mkdnsite/commit/86a2229b0652da620d17f457358be9e50ef7c007))
* Scrolling to heading anchors was broken ([6ea2651](https://github.com/mkdnsite/mkdnsite/commit/6ea26519daea79a4c39f95cbdff9c342b478c33a))
* Support Node 22+, Deno, and Bun ([78ffd7b](https://github.com/mkdnsite/mkdnsite/commit/78ffd7b774fcc975eecf946b879b7e1471a56668))
* Use full GFM by default on Bun ([c59813e](https://github.com/mkdnsite/mkdnsite/commit/c59813e0bdc376ee1a9f2a2c9e25daa49b78229a))
