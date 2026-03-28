# Changelog

## [1.4.1](https://github.com/mkdnsite/mkdnsite/compare/v1.4.0...v1.4.1) (2026-03-28)


### Bug Fixes

* Cache nav tree in handler and expand favicon logo fallback ([#96](https://github.com/mkdnsite/mkdnsite/issues/96)) ([b480286](https://github.com/mkdnsite/mkdnsite/commit/b480286b480da4574167ddca7f460d66df092620))

## [1.4.0](https://github.com/mkdnsite/mkdnsite/compare/v1.3.0...v1.4.0) (2026-03-28)


### Features

* Display frontmatter tags on rendered pages ([#94](https://github.com/mkdnsite/mkdnsite/issues/94)) ([90ed084](https://github.com/mkdnsite/mkdnsite/commit/90ed084d8d7d7363771db2ef91ec40cefa0b1674))
* Support hero image from frontmatter with og_image fallback ([#93](https://github.com/mkdnsite/mkdnsite/issues/93)) ([6b9c4b0](https://github.com/mkdnsite/mkdnsite/commit/6b9c4b06d88fa63bec386d1660862cf2782746f3))
* Support layout frontmatter field for page layout control ([#95](https://github.com/mkdnsite/mkdnsite/issues/95)) ([1e516d3](https://github.com/mkdnsite/mkdnsite/commit/1e516d3406e20cf2fd33537a4ad02892d38ee860))


### Bug Fixes

* Coerce esc() input to String to handle non-string frontmatter values ([#90](https://github.com/mkdnsite/mkdnsite/issues/90)) ([17950d8](https://github.com/mkdnsite/mkdnsite/commit/17950d8b45889925201a310bd81ae2219e730215))

## [1.3.0](https://github.com/mkdnsite/mkdnsite/compare/v1.2.0...v1.3.0) (2026-03-28)


### Features

* Add syntaxHighlight config with client-side Prism.js support ([#87](https://github.com/mkdnsite/mkdnsite/issues/87)) ([61e7cef](https://github.com/mkdnsite/mkdnsite/commit/61e7cef49ac03085fc72c5d61a82317b84f4ef78))

## [1.2.0](https://github.com/mkdnsite/mkdnsite/compare/v1.1.4...v1.2.0) (2026-03-27)


### Features

* Add showFooter config option and custom 404.md support ([#85](https://github.com/mkdnsite/mkdnsite/issues/85)) ([e78f0df](https://github.com/mkdnsite/mkdnsite/commit/e78f0dfd9d2213286e6e600e12c201eccea7db6c))
* Always show home link in nav menu ([#84](https://github.com/mkdnsite/mkdnsite/issues/84)) ([0edd5ec](https://github.com/mkdnsite/mkdnsite/commit/0edd5ec7287154f048ec722b5b946994d41003ce))


### Bug Fixes

* Coerce frontmatter title to string in nav tree builders ([#66](https://github.com/mkdnsite/mkdnsite/issues/66)) ([a482a83](https://github.com/mkdnsite/mkdnsite/commit/a482a830da4b98e5bcec63d8f6a24d25efa3e4c2))
* Decode HTML entities in ToC heading text to prevent double-escaping ([#81](https://github.com/mkdnsite/mkdnsite/issues/81)) ([370f9fe](https://github.com/mkdnsite/mkdnsite/commit/370f9feffcb3a3e1056a3c0d4a02e8c8d2d136c1))
* Handle URI schemes and mixed-case index files in link stripping ([#86](https://github.com/mkdnsite/mkdnsite/issues/86)) ([4c2517f](https://github.com/mkdnsite/mkdnsite/commit/4c2517f3d141a794c89946e78b44b8bb8953404d))
* Resolve static dir prefix in request paths for GitHub compatibility ([#82](https://github.com/mkdnsite/mkdnsite/issues/82)) ([3a84d01](https://github.com/mkdnsite/mkdnsite/commit/3a84d011e5c78d4eff531505fbdfab49dac7cfec))
* Strip .md extension from relative links in rendered HTML ([#80](https://github.com/mkdnsite/mkdnsite/issues/80)) ([b411fc0](https://github.com/mkdnsite/mkdnsite/commit/b411fc06a32b1175b761ef81820bb1be96dbef78))

## [1.1.4](https://github.com/mkdnsite/mkdnsite/compare/v1.1.3...v1.1.4) (2026-03-24)


### Bug Fixes

* Prevent caching empty search index ([#64](https://github.com/mkdnsite/mkdnsite/issues/64)) ([b3da0cc](https://github.com/mkdnsite/mkdnsite/commit/b3da0cc5a9d2d7e41913e741a1694d680d21ddc6))
* prevent caching empty search index (mkdnio Issue [#100](https://github.com/mkdnsite/mkdnsite/issues/100)) ([b3da0cc](https://github.com/mkdnsite/mkdnsite/commit/b3da0cc5a9d2d7e41913e741a1694d680d21ddc6))

## [1.1.3](https://github.com/mkdnsite/mkdnsite/compare/v1.1.2...v1.1.3) (2026-03-21)


### Bug Fixes

* Add required User-Agent header to GitHub API requests ([#61](https://github.com/mkdnsite/mkdnsite/issues/61)) ([a6f940c](https://github.com/mkdnsite/mkdnsite/commit/a6f940c60e45dfa6ee46f50dbc3fe2854f8f07d8))
* Ensure version.ts is generated in all release and CI pipelines ([#63](https://github.com/mkdnsite/mkdnsite/issues/63)) ([cbfa7a2](https://github.com/mkdnsite/mkdnsite/commit/cbfa7a2c1f7fe833bbc63f1461d8bbe7f312b3f1))

## [1.1.2](https://github.com/mkdnsite/mkdnsite/compare/v1.1.1...v1.1.2) (2026-03-21)


### Bug Fixes

* Add error logging and retry to GitHubSource tree fetch ([#59](https://github.com/mkdnsite/mkdnsite/issues/59)) ([cd418a0](https://github.com/mkdnsite/mkdnsite/commit/cd418a03ba2fd55024dea4b021eb593b562871fa))

## [1.1.1](https://github.com/mkdnsite/mkdnsite/compare/v1.1.0...v1.1.1) (2026-03-21)


### Bug Fixes

* Move @types/picomatch to dependencies for downstream tsc ([#57](https://github.com/mkdnsite/mkdnsite/issues/57)) ([ab8a04c](https://github.com/mkdnsite/mkdnsite/commit/ab8a04cae6239e59e875533846f559b97af5ac95))

## [1.1.0](https://github.com/mkdnsite/mkdnsite/compare/v1.0.1...v1.1.0) (2026-03-21)


### Features

* Make serveStatic pluggable for non-filesystem deployments ([#53](https://github.com/mkdnsite/mkdnsite/issues/53)) ([7277223](https://github.com/mkdnsite/mkdnsite/commit/72772232c4022186bc6366780ee31044c41f61a4))
* Support include/exclude glob patterns for content filtering ([#54](https://github.com/mkdnsite/mkdnsite/issues/54)) ([f9e9dbf](https://github.com/mkdnsite/mkdnsite/commit/f9e9dbf12d64e8ba88389c4b4ed4f28189b0e37d))


### Bug Fixes

* Improve responsive layout for mobile nav and content ([#52](https://github.com/mkdnsite/mkdnsite/issues/52)) ([af3febe](https://github.com/mkdnsite/mkdnsite/commit/af3febe1c3435c88dbb807819854a897cd8c0966))

## [1.0.1](https://github.com/mkdnsite/mkdnsite/compare/v1.0.0...v1.0.1) (2026-03-16)


### Bug Fixes

* Must use npm 11+ for trusted publishing ([#46](https://github.com/mkdnsite/mkdnsite/issues/46)) ([f482a7c](https://github.com/mkdnsite/mkdnsite/commit/f482a7cd9ee3080a76b26a10858e838371064681))

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
