# Megha Mittal — Fold Portfolio 💗

> I don’t watch anime, I code anime.

My portfolio, presented on a foldable phone. It starts closed on the cover; open it to reveal who I am, what I build, and a recorded walkthrough of the work. Drag to look around, scroll to zoom.

**Megha Mittal** · Frontend developer building responsive, anime‑inspired web experiences with HTML, CSS, JavaScript, TypeScript, React and Three.js.

[GitHub](https://github.com/Meghamittal0920) · [Instagram](https://www.instagram.com/codergirl.megha/) · [YouTube](https://www.youtube.com/@codergirlmegha) · [Email](mailto:meghamittal563@gmail.com)

## Run locally

No build step. The device model and textures are already in `assets/`, so just serve the folder:

```sh
python -m http.server 3013 --bind 127.0.0.1
```

Open http://localhost:3013. (If `assets/` is ever missing, run `pip install -r requirements-assets.txt` and `python scripts/prepare-assets.py`.)

## Make it yours

| File | What it is | Size |
| --- | --- | --- |
| `previews/outer.png` | Closed cover | ~390 × 567 ratio |
| `previews/inner.png` | Open layout (25% identity · 25% context · 50% work) | ~1440 × 1012 ratio |
| `previews/navigation.mp4` | Walkthrough that plays when fully open | same as inner |

Page copy lives in `index.html`, styling in `style.css`. The "Try your design" panel lets visitors preview their own images locally (nothing is uploaded).

## Controls

**Play** runs the fold cycle · **Closed / Open** jump to an end · the slider scrubs the angle · the ♥ button opens the about panel with projects and **Reset view**.

## Deploy

Plain static files, so it works on GitHub Pages, Vercel or Netlify with no build command. Publish the folder root.

## Credits

Fold renderer adapted from [iPhone Duo by jadon7](https://github.com/chuspeeism/iphone-duo) (MIT, see [LICENSE](LICENSE)). Three.js and the Apple reference model are covered in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); the Apple device model is not MIT‑licensed. Not affiliated with Apple.
