# lazarus-coder.github.io

Personal site of **Ao Jiang (Ilya)** — [lazarus-coder.github.io](https://lazarus-coder.github.io)

Writing about language, models, and the occasional essay in between.

## Stack

Plain Jekyll, built by GitHub Pages from `master`. No theme gem, no npm, no external
assets. The design is a paper-light editorial layout with terminal accents, plus an
interactive "dandelion sea" canvas on the homepage.

```
_posts/        essays and notes (markdown; filename = date + slug)
_layouts/      default / post / page
_includes/     meta, sea (homepage canvas)
assets/js/     dandelion.js — the canvas engine (vanilla, no deps)
style.scss     all styling (design tokens, light/dark)
```

## Writing a new post

Create `_posts/YYYY-MM-DD-slug.md`:

```markdown
---
layout: post
title: "..."
tags: [life, coding]
---

正文…
```

The URL becomes `/slug/`. Push to `master` and Pages rebuilds automatically.

## Local preview

```sh
gem install jekyll jekyll-sitemap jekyll-feed
jekyll serve
```

## The dandelion sea

`assets/js/dandelion.js` paints the site's full-viewport background (homepage and 404):
layered seeds drift over the page — far dust, mid pappus, glowing near seeds, and a few
huge soft foreground seeds for depth of field. The cursor acts as a wind gust, and
click / tap releases a puff of new seeds. It respects `prefers-reduced-motion`, pauses
in hidden tabs, caps device pixel ratio on large screens, and re-reads its palette when
the theme changes (`t` or the ◐ button).

## License

MIT — see `LICENSE`. Originally seeded from
[Jekyll Now](https://github.com/barryclark/jekyll-now); the theme has since been fully
rewritten.