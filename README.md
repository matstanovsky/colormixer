# Mix It!

A small web app that mixes two colors like paint rather than like light, so blue and yellow
make green instead of grey. Pick two colors, set the balance with the slider, and it shows the
blend along with its color name.

**Live demo:** https://matstanovsky.github.io/colormixer/

On a phone, open that link and choose "Add to Home Screen" to install it as an app that works
offline, no app store needed.

I vibe-coded it for my kids, so it's made to be tapped through on a phone: big targets and almost no
text to read.

## What's interesting under the hood

- It blends pigments, not RGB numbers. Plain averaging gives mud, so mixing runs through a
  spectral (Kubelka–Munk) pigment model via [Spectral.js](https://github.com/rvanwijnen/spectral.js),
  which follows the same physics as real paint.
- No framework and no build step: just HTML, CSS and vanilla JS, small enough to read end to end.
- An installable, offline-first PWA, built with a web manifest and a service-worker cache.

## Run it locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

A real server is needed because service workers don't run over `file://`.
