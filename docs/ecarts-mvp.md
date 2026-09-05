# Écarts et décisions — Markout MVP 0.2

Changelog par rapport au cahier des charges v0.2 draft.

| Sujet | Cahier | Implémentation | Motif |
| --- | --- | --- | --- |
| Export DOCX | Lib JS/Rust vs Pandoc à trancher en M0 | **`docx` (JS embarqué)** | Plus léger que Pandoc ; TOC champ Word natif ; pas de binaire externe |
| Export PDF | Print WebView2 et/ou moteur léger | **`pdfmake`** (JS) | Identique Windows / macOS / Linux ; A4 ; TOC ; UTF-8 ; pas de Chromium |
| Frontend | React **ou** Vue | **React** | Squelette Tauri 2 officiel `react-ts` |
| Diagrammes export | PNG et/ou SVG | **PNG** dans PDF et DOCX | pdfmake n’embarque pas un moteur SVG robuste ; Word accepte PNG partout |
| Distribution | `.msi` / `.exe` + portable à valider en M2 | Cibles **NSIS (installMode both)** + **MSI** ; builds `app` / `deb` aussi | Portable NSIS « current user » ; mesure taille à faire sur runner Windows |
| OS MVP | Windows d’abord | Code **cross-platform** Tauri ; packaging Windows prioritaire | Linux/macOS pour dev et tests agents |
| Mode navigateur | Non spécifié | Fallback téléchargement fichiers si l’UI Vite tourne hors Tauri | Dev / recette sans WebView |
| Tests T9 footprint | Mesure Windows réelle | Inventaire + cibles documentés ; binaire mesuré quand le build natif est disponible | Pas d’installateur Windows dans l’environnement Linux de développement |

Aucun écart sur : blocage export si Mermaid invalide, autonomie (pas de download Chrome/Pandoc), UI française, fixtures versionnées, une seule chaîne de parse Markdown.
