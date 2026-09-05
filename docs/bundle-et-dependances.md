# Taille et dépendances embarquées — Markout 0.2

Mesure à prendre sur le binaire de release (`npm run tauri -- build`) de la machine de packaging Windows. Les chiffres ci-dessous sont l’**inventaire** et les cibles ; les tailles réelles d’installateur Windows se renseignent après le build NSIS/MSI.

## Cibles MVP (§7.1)

| Métrique | Cible | Commentaire |
| --- | --- | --- |
| Installateur Windows | ≤ 25 Mo souhaité, ≤ 40 Mo max | WebView2 **non** embarqué (runtime OS / bootstrapper) |
| RAM au repos | ≤ 150 Mo | WebView système + éditeur léger |
| Démarrage à froid | ≤ 2 s | Pas de Chromium dans le binaire |
| Preview Mermaid | Incrémental | Lazy-load + cache par hash du source |
| Cache export | Réutilisation | PNG/SVG gardés tant que le bloc n’a pas changé |

## Pourquoi pas Electron / Pandoc / Chrome

| Alternative écartée | Motif |
| --- | --- |
| Electron | Chromium complet, hors cible footprint |
| Pandoc | Binaire lourd, TOC/Mermaid non natifs, install utilisateur |
| Chrome / Puppeteer headless | Téléchargement ou runtime externe, interdit par le cahier |

## Inventaire du bundle applicatif

### Rust / Tauri (binaire)

- `tauri` 2 + `tauri-plugin-dialog` + `tauri-plugin-opener`
- Commandes locales : lecture/écriture UTF-8 et binaire, ouverture OS du fichier exporté
- Profil release : `lto`, `opt-level = "s"`, `strip`, `panic = abort`

### Frontend (embarqué dans le WebView)

| Dépendance | Rôle | Embarquement |
| --- | --- | --- |
| React 19 | UI | Bundle Vite |
| CodeMirror 6 + lang-markdown | Éditeur | Bundle |
| `marked` | Parser GFM unique preview/export | Bundle, léger |
| `mermaid` | Rendu diagrammes | **Code-split / import dynamique** dès qu’un fence `mermaid` existe |
| `pdfmake` + vfs Roboto | PDF A4 + TOC | Bundle export |
| `docx` | DOCX + champ TOC + styles Heading | Bundle export |

Mermaid est la plus grosse JS (cœur produit) : justifiée, chargée à la demande, tree-shaking limité côté lib elle-même.

### Fourni par l’OS (non embarqué)

- **Windows :** WebView2 (Evergreen). Prérequis documenté ; bootstrapper NSIS si absent.
- **macOS :** WKWebView.
- **Linux :** WebKitGTK 4.1.

### Polices

- PDF : **Roboto** via vfs pdfmake (accents latin / français).
- DOCX : Calibri (police Word par défaut) — pas d’embed de police dans le .docx MVP.
- UI / aperçu : polices système.

## Pipeline d’export (une source de vérité)

```text
Markdown
  → parseDocument (marked, GFM)
  → blocs (titres, listes, tableaux, mermaid, code, citations)
  → validation Mermaid (parse) → blocage si erreur
  → mermaid.render → SVG → PNG (canvas, cache par hash)
  → pdfmake  |  docx
```

Le source Mermaid n’est jamais réinjecté dans le livrable : seuls SVG/PNG le sont.

## Commandes de mesure

```bash
npm run build                 # dist/ frontend
npm run tauri -- build        # installateurs natifs
du -sh src-tauri/target/release/bundle
```

Sur Linux de CI, un binaire `deb` ou AppImage peut servir de proxy de taille ; l’installateur Windows reste la métrique T9 officielle.

## Justification si dépassement

Si l’installateur dépasse 25 Mo, la cause probable est **Mermaid + pdfmake + Roboto**, pas un navigateur embarqué. Rester sous 40 Mo est l’objectif « max acceptable ». Une réduction v1.1 possible : extraire les diagrammes Mermaid non utilisés (flowchart-only) si l’upstream le permet.
