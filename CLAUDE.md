# Frontend

Application de suivi de chantier pour entreprise de paysagisme.

Technologies :

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

Contraintes :

- Mobile first
- PWA
- Responsive
- Interface simple pour utilisation terrain

Référence :
Lire tous les documents du dossier ../01-docs avant toute génération.
Lire ../CLAUDE.md pour les règles communes au projet (i18n, documentation).

## i18n

- Ne jamais hardcoder du texte français dans un composant.
- Toujours utiliser `useTranslation()` + `t('section.clé')`.
- Toute nouvelle clé doit être ajoutée dans les 5 fichiers : `src/i18n/locales/fr.json`, `en.json`, `es.json`, `it.json`, `de.json`.
- Pour les dates localisées, utiliser `i18n.language` (récupéré via `useTranslation`) plutôt que `"fr-FR"` hardcodé.
- Les objets de labels statiques (ex : `ROLE_LABELS`, `TRANSITION_LABELS`) doivent être définis **à l'intérieur** du composant pour accéder à `t()`.
- Hors d'un composant (hook, utilitaire), utiliser `i18n.t(...)` importé de `i18next`.
- Les tests `src/i18n/*.test.ts` échouent si une clé manque dans une langue, si une clé `t('…')` n'existe pas ou si un texte est écrit en dur (JSX, `aria-label`, `placeholder`, `title`, `alt`…). Un texte non traduisible (nom de marque, sigle, exemple de format) s'ajoute à `ALLOWED` dans `no-hardcoded-text.test.ts`.
- Ne jamais afficher le message d'une erreur de l'API : `apiErrorMessage(err, t, 'section.clé_de_repli')` (`src/lib/api-error.ts`) traduit le `code` renvoyé par le serveur.
- Un `<option>` garde une `value` explicite : seul son libellé est traduit, la valeur enregistrée en base ne l'est jamais.
