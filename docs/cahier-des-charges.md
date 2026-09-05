# Cahier des charges — Markout v0.2 (MVP)

**Nom :** Markout  
**Version :** 0.2 — MVP  
**Date :** 5 septembre 2026  
**Statut :** Implémenté (spike M0 + MVP UI dans ce dépôt)

---

## 1. Contexte et problème

Rédiger en Markdown est simple. Produire un **PDF** ou un **Word** propre, avec **diagrammes Mermaid réellement rendus**, table des matières et mise en page lisible, reste fragile :

- les éditeurs laissent souvent les blocs Mermaid en texte brut à l’export ;
- la chaîne technique (navigateurs headless, Pandoc, encodage) est opaque pour un non-expert ;
- le résultat PDF / DOCX est **imprévisible** d’un outil à l’autre.

**Besoin :** une application desktop où l’on écrit en Markdown et où l’export PDF / Word est un **geste fiable**, en un clic, avec schémas correctement rendus — **sans dépendre d’installations externes** visibles pour l’utilisateur.

## 2. Objectif produit

Permettre à un utilisateur de :

1. **Rédiger** un document en Markdown (titres, listes, tableaux, emphase, citations, séparateurs).
2. **Insérer et prévisualiser** des diagrammes Mermaid.
3. **Exporter** en **PDF** et **DOCX** avec :
   - diagrammes convertis en images (jamais en code source) ;
   - table des matières ;
   - typographie et structure correctes (titres, tableaux).

**Promesse :** *« Tu écris. Tu cliques. Tu envoies. »*

## 3. Cible utilisateurs

| Persona | Besoin principal |
| --- | --- |
| **Porteur de projet / fondateur** | Cadres stratégiques, notes de pitch, dossiers partenaires |
| **Consultant / freelance** | Livrables clients propres sans Word comme outil d’écriture |
| **Équipe / organisation** | Documents partagés PDF + Word pour relecture institutionnelle |

**Non-cible MVP :** collab temps réel type Google Docs, blogs, sites marketing.

## 4. Périmètre MVP

| ID | Fonctionnalité | Priorité | Statut |
| --- | --- | --- | --- |
| F1 | Éditeur Markdown avec coloration syntaxique | P0 | Fait (CodeMirror 6) |
| F2 | Aperçu rendu côte à côte ou onglet | P0 | Fait |
| F3 | Support Mermaid éditeur + aperçu | P0 | Fait |
| F4 | Export PDF (TOC, diagrammes, A4) | P0 | Fait (pdfmake embarqué) |
| F5 | Export DOCX (TOC Word, diagrammes, styles) | P0 | Fait (librairie `docx`) |
| F6 | Ouvrir / enregistrer un fichier `.md` local | P0 | Fait |
| F7 | Erreurs Mermaid claires ; export bloqué | P0 | Fait |
| F8 | Interface en français | P1 | Fait |
| F9 | UI sobre | P1 | Fait |
| F10 | Application autonome, dépendances embarquées | P0 | Fait (Tauri 2) |

Hors scope v2+ : collab temps réel, cloud, templates marketing, Excalidraw/PlantUML, mobile, WYSIWYG, branding PDF avancé.

## 5. Parcours utilisateur principal

```text
1. Ouvrir l’app
2. Écrire / coller du Markdown (ou ouvrir un .md)
3. Ajouter un bloc ```mermaid ... ```
4. Voir le schéma dans l’aperçu
5. Cliquer « Exporter PDF » ou « Exporter Word »
6. Choisir l’emplacement du fichier
7. Ouvrir le fichier : schémas visibles + TOC présente
```

## 6–8. Exigences et architecture

Voir le document source v0.2 validé pour le détail des exigences PDF/DOCX, NFR et principes d’embarquement.

**Décisions tranchées dans ce dépôt :**

| # | Sujet | Décision |
| --- | --- | --- |
| 1 | Shell | **Tauri 2** |
| 2 | Frontend | **React + CodeMirror 6** |
| 3 | Preview / Mermaid | Parser GFM unique (`marked`) + **Mermaid.js** lazy-load |
| 4 | PDF | **pdfmake** (A4, marges 1,5 cm, TOC cliquable, Roboto embarquée) — pas de Chromium |
| 5 | DOCX | Lib JS **`docx`** — pas de Pandoc |
| 6 | Mermaid en erreur | **Export bloqué** |
| 7 | Nom | **Markout** |

## 10. Jeu de tests d’acceptance

Fixtures dans [`fixtures/`](../fixtures/).

| # | Test | Résultat attendu |
| --- | --- | --- |
| T1 | Ouvrir un `.md` fixture | Contenu + preview OK |
| T2 | Aperçu Mermaid (flowchart, state, mindmap, pie, gantt) | Schémas visibles |
| T3 | Export PDF | Images ; TOC ; accents OK |
| T4 | Export DOCX | Images ; champ TOC Word ; styles titres |
| T5 | Mermaid invalide | Erreur claire ; export bloqué |
| T6 | Tableau Markdown | Conservé PDF + DOCX |
| T7 | Document sans Mermaid | Export rapide |
| T8 | App offline | Édition + exports OK |
| T9 | Footprint | Voir [bundle-et-dependances.md](bundle-et-dependances.md) |

## 11. Livrables

1. Application desktop Tauri 2 (NSIS « current user / all users » + MSI ; cibles macOS/Linux en plus pour le build)
2. README utilisateur (FR)
3. Fixtures d’acceptance
4. Note technique taille & dépendances
5. Ce cahier + [écarts](ecarts-mvp.md)

## 16. Synthèse

| | |
| --- | --- |
| **Produit** | **Markout** — éditeur Markdown local → aperçu Mermaid → export PDF & Word fiables |
| **Shell** | **Tauri 2** — léger, WebView système |
| **Différenciation** | Export Mermaid fiable + TOC + app autonome |
| **MVP** | Windows d’abord, offline, open/save `.md`, PDF/DOCX embarqués |
| **Qualité** | Fixtures ; zéro Mermaid brut dans les livrables |
