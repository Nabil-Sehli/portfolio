# Portfolio — Nabil Sehli

Personal site: <https://nabil-sehli.github.io/portfolio/>

Plain HTML, one stylesheet and one script. No build step; GitHub Pages serves
the repository as it is.

```
index.html      home: hero, project tiles, experience
work.html       the five projects in full
about.html      background and stack
studies.html    education and experience
contact.html
assets/
  style.css     every style, light and dark themes
  main.js       theme toggle, clock, smooth scroll, reveals, carousels, lightbox
  img/          screenshots (16:10) and home-page thumbnails (thumb-*.webp)
  og-image.png  link preview for LinkedIn and others (1200×630)
tools/
  partials/     the <head> tags, nav and footer shared by every page
  sync.mjs      copies the partials into the pages
```

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Editing the nav, footer or shared head tags

Edit the file in `tools/partials/`, never the copy inside a page, then run:

```sh
node tools/sync.mjs           # rewrite every page
node tools/sync.mjs --check   # exit 1 if any page is out of date
```

Each page marks the shared blocks with `<!-- @head -->`, `<!-- @header -->`
and `<!-- @footer -->`. The script also sets `aria-current="page"` on the
page's own nav link and fills in its canonical URL. A new page needs the
three markers; copy them from `contact.html`.

## Adding a project

1. `work.html`: a new `<article class="proj" id="...">` (copy an existing one),
   and a matching link in the `.pindex` list at the top.
2. `index.html`: a tile in `.ptiles`, with a 960×600 `assets/img/thumb-*.webp`.
3. Update the count in `work.html` (the `<h1>`, the intro and the meta
   description) — it is written out as a word.
4. If it is the newest project, point the home badge at it.

Screenshots go in `assets/img/` as 16:10 WebP. Give every `<img>` its real
`width` and `height` so the page doesn't jump while it loads.
