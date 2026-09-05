# Markout — document d’acceptance MVP
# Accents : café, déjà, français, œuf, naïve

Ceci est le jeu de fixtures pour les tests T1–T6.

## 1. Introduction

Un livrable propre doit contenir des **titres**, des *listes*, des [liens](https://example.com), des citations et des tableaux — sans jamais laisser le source Mermaid dans le PDF ou le Word.

> La fiabilité de l’export est le critère de succès.

## 2. Listes

- Café stratégique
- Dossier partenaire
- Compte-rendu d’atelier

1. Rédiger
2. Vérifier l’aperçu
3. Exporter

## 3. Tableau GFM

| Étape | Responsable | Statut |
| --- | --- | --- |
| Rédaction | Fondateur | Fait |
| Schémas | Consultant | En cours |
| Export | Markout | Prêt |

## 4. Flowchart

```mermaid
flowchart TD
  A[Markdown] --> B{Mermaid valide ?}
  B -->|Oui| C[Rendu SVG]
  B -->|Non| D[Export bloqué]
  C --> E[PDF]
  C --> F[DOCX]
```

## 5. State diagram

```mermaid
stateDiagram-v2
  [*] --> Brouillon
  Brouillon --> Relu : export
  Relu --> Envoyé
  Envoyé --> [*]
```

## 6. Mindmap

```mermaid
mindmap
  root((Markout))
    Écrire
      Markdown
      Autosave
    Voir
      Aperçu
      Mermaid
    Envoyer
      PDF
      Word
```

## 7. Camembert

```mermaid
pie title Répartition des livrables
  "PDF" : 45
  "Word" : 40
  "Notes internes" : 15
```

## 8. Gantt

```mermaid
gantt
  title Planning MVP
  dateFormat YYYY-MM-DD
  axisFormat %d/%m
  section Spike
  Preuve export :a1, 2026-09-01, 5d
  section UI
  Éditeur et aperçu :a2, after a1, 10d
  section Packaging
  Installateur Windows :a3, after a2, 7d
```

## 9. Timeline

```mermaid
timeline
  title Histoire du document
  2026-09 : Cahier des charges
         : Spike Tauri
  2026-10 : MVP
  2026-11 : Feedback utilisateurs
```

## 10. Conclusion

Les diagrammes ci-dessus doivent apparaître comme des **images**, jamais comme du texte `flowchart` / `stateDiagram` brut.
