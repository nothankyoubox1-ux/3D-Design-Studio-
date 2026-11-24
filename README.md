# 3D Design Studio

Browserbaseret 3D CAD- og smykkedesignprogram (under udvikling). Ingen installation eller build-trin: siden er ren HTML + JavaScript-moduler.

## Struktur

```
index.html          Layout og import map (Three.js hentes fra jsDelivr)
src/kernel.js       Primitiver og eksakt volumenberegning (mm)
src/document.js     Dokumentmodel, commands, undo/redo, historik, JSON-format
src/i18n.js         Dansk/engelsk tekst
src/main.js         3D-visning, værktøjslinje, objektbrowser, egenskabspanel
docs/changelog.md   Ændringslog
```

## Status (version 0.1)

Virker (ikke endnu testet i browser): Boks, cylinder, kugle, kegle og torus. Redigering af mål og position. Valg ved klik. Undo/redo (Ctrl+Z / Ctrl+Y). Historik. Volumen pr. objekt og samlet. Gem og åbn som fil. Dansk og engelsk.

Ikke implementeret endnu (knapperne er deaktiverede): Sketch, Extrude, Boolean. Heller ikke: tommer, STL/STEP-eksport, login, cloud, smykkemodul, pris, AI.

## Kendte begrænsninger

- Kernen er en midlertidig prototype uden boolean. Den skal erstattes af OpenCascade (replicad) bag samme funktioner.
- Overlappende objekter trækkes ikke fra i den samlede volumen.

## Visning online

GitHub Pages på private repositories kræver betalt GitHub-plan. Brug i stedet Cloudflare Pages (gratis) koblet til repositoriet, uden build-kommando og med output-mappe `/`.
