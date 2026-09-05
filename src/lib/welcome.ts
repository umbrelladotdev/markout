export const WELCOME_MARKDOWN = `# Markout

Écrivez en Markdown. Prévisualisez vos diagrammes. Exportez un PDF ou un Word propre — **en un clic**, hors ligne, sans installer Pandoc ni Chrome.

## Promesse

> Tu écris. Tu cliques. Tu envoies.

## Parcours

1. Rédigez (ou ouvrez un fichier \`.md\`)
2. Ajoutez un bloc de code mermaid
3. Vérifiez l’aperçu à droite
4. Cliquez **Exporter PDF** ou **Exporter Word**

## Tableau d’exemple

| Livrable | Format | Diagrammes |
| --- | --- | --- |
| Note de pitch | PDF | Oui, rendus |
| Dossier partenaire | Word | Oui, rendus |
| Compte-rendu | PDF + Word | Table des matières |

## Un premier schéma

\`\`\`mermaid
flowchart LR
  A[Markdown] --> B[Aperçu Mermaid]
  B --> C[Export PDF]
  B --> D[Export Word]
  C --> E[Livrable propre]
  D --> E
\`\`\`

Les accents français (é, è, à, ç, œ) sont conservés à l’export. Si un diagramme est invalide, l’export est **bloqué** et l’erreur s’affiche dans l’aperçu.
`;
