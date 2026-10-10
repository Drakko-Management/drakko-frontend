# Drakko — Frontend (`02-front`)

Application de suivi de chantier pour entreprises de paysagisme. React 18, TypeScript strict, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, react-i18next, PWA (vite-plugin-pwa).
Mobile first, PWA, responsive, interface simple pour utilisation terrain. Le produit s'appelle **Drakko** (« Landscape » est l'ancien nom).

Ce fichier est la source de vérité des consignes pour Claude Code, Cursor et Codex. `CLAUDE.md` se contente de l'importer : ne rien dupliquer dedans.

## Commandes
- `npm run dev` : serveur de développement, http://localhost:5200
- `npm run check` : **à lancer avant de rendre la main** (lint + tests + build, comme la CI)
- Tests : `npx vitest run` (un fichier : `npx vitest run src/chemin/X.test.tsx`) · Types : `npx tsc -p tsconfig.app.json --noEmit` · Lint : `npm run lint`
- Navigateur réel : Playwright n'a pas ses navigateurs sur la machine de dev. Utiliser le Chrome installé avec une config temporaire (à supprimer ensuite) : `channel: 'chrome'`, `webServer: npx vite --port 5180 --strictPort` avec `env.VITE_API_URL` vers un port mort (aucun vrai back), `reporter: 'line'`, `outputDir` hors du dépôt. Simuler l'API avec `page.route` (voir `e2e/helpers.ts`). Le port 5173 est souvent pris par un autre projet.

## Documentation (`../01-docs`, dépôt `drakko-docs`)
Après toute modification significative, mettre à jour le fichier concerné de `01-docs/` (même lot de travail) :

| Type de changement | Fichier |
|---|---|
| Nouveau champ en base | `06-database-requirements.md` |
| Nouvelle dépendance | `07-technical-stack.md` |
| Décision technique | `08-decisions.md` |
| Nouvelle page ou écran | `05-screens.md` |
| Nouvelle règle métier | `02-business-rules.md` |
| Nouveau rôle ou permission | `03-user-roles.md` |
| Nouveau parcours utilisateur | `04-user-flows.md` |

Ne pas lire toute la doc : seulement ce qui concerne la tâche. Un écran → `05-screens.md` · une règle métier ou un statut → `02-business-rules.md`, `04-user-flows.md` · les permissions → `03-user-roles.md` · un choix d'architecture (cache, PWA, i18n, modales, dates, tutoriels, multi-organisation…) → l'ADR concerné dans `08-decisions.md` (`grep -n "^## " ../01-docs/08-decisions.md`) · ce qui reste à faire → `roadmap.md`.

## Traductions (i18n) — obligatoires
5 langues : `fr`, `en`, `es`, `it`, `de`, fichiers dans `src/i18n/locales/`.
- Aucun texte visible écrit en dur dans un composant : `const { t } = useTranslation()` puis `t('section.clé')`.
- Toute nouvelle clé s'ajoute dans les **5 fichiers JSON**, traduite dans chaque langue (ton actuel : vouvoiement en `fr` et `de`, tutoiement en `es` et `it`).
- Sections de clés : `common`, `nav`, `dashboard`, `projects`, `project`, `create_project`, `edit_project`, `clients`, `client_detail`, `create_client`, `users`, `report`, `photos`, `status`, `settings`, `tutorials`, `login`, `services`, `sign`, `express_project`, `install`.
- Dates et montants : `i18n.language`, jamais `"fr-FR"` en dur. Labels statiques (`ROLE_LABELS`…) définis **dans** le composant ; hors composant (hook, utilitaire) : `i18n.t(...)` importé de `i18next`.
- Ne jamais afficher le message d'une erreur de l'API : `apiErrorMessage(err, t, 'section.clé_de_repli')` (`src/lib/api-error.ts`) traduit le `code` renvoyé par le serveur.
- Un `<option>` garde une `value` explicite : seul son libellé est traduit.
- Les tests `src/i18n/*.test.ts` échouent si une clé manque dans une langue, si un `t('…')` pointe vers une clé inexistante ou si un texte est écrit en dur (JSX, `aria-label`, `placeholder`, `title`, `alt`…). Un texte non traduisible (marque, sigle, exemple de format) s'ajoute à `ALLOWED` dans `no-hardcoded-text.test.ts`.

## Conventions d'interface (détails et raisons dans `08-decisions.md`)
- **Mode gaucher** (`User.handedness`) : pour tout nouvel élément interactif principal du mobile (bouton flottant, panneau latéral, barre d'actions, swipe, drawer…), se demander s'il doit se déplacer ou s'inverser. Si oui : override CSS dans `src/index.css` sous `[data-handedness="left"]` (modèle `.bottom-fab`) ou classes Tailwind lues dans `useTheme().handedness` (modèle `AppDrawer`), puis l'ajouter au tableau « Éléments affectés » de `08-decisions.md`.
- **Fenêtres modales** : centrées, titre fixe, contenu qui défile, rendues par portail dans `<body>`. Couches : barre du bas `z-50`, fenêtre `z-[60]`, fenêtre utilisable pendant un tutoriel `z-[1100]`.
- **Champs de date** : chaque champ d'une paire garde toujours un `min` et un `max` (`dateRangeBounds`, sinon l'icône du calendrier glisse sous Chrome) ; dates reçues de l'API converties par `toDateInput`.
- **Mises à jour de l'appli** : `registerType: "autoUpdate"`, sans bouton « Recharger ». Ne pas repasser en `prompt` sans demande explicite (un test le garde).
- **Tutoriels** : ils ciblent les éléments par `data-tutorial="…"`. Ne jamais retirer ni renommer ces attributs.

## Tests
- Toute fonctionnalité a ses tests ; un bug corrigé a un test qui l'aurait attrapé. Les tests de garde (i18n, mode de mise à jour PWA, règle CSS des dates) doivent rester verts.
- Les tests tournent sous happy-dom, qui ignore les classes Tailwind responsive : les doublons desktop/mobile sont tous dans le DOM, utiliser `getAllByRole` et vérifier le nombre.

## Git et déploiement
- `develop` → préproduction (Vercel Preview, `devapp.drakko.fr`) ; `main` → production (`app.drakko.fr`). On travaille et on pousse sur `develop`.
- **Ne jamais toucher à `main` sans demande explicite de l'utilisateur** (« aligne la prod »). Promotion : `git push origin develop:main` (avance rapide, jamais de force).
- Commits : Conventional Commits en français (`feat(projets): …`, `fix(i18n): …`, `docs: …`) ; le corps explique le pourquoi.
- Plusieurs agents peuvent travailler dans les mêmes dossiers : `git status` avant de commiter, ne commiter que ses propres fichiers (chemins explicites, jamais `git add -A`), ne pas toucher aux changements des autres, `git fetch` avant de pousser. Pour un travail parallèle, `git worktree add`.
- Ne jamais commiter de fichier généré (`dist/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo`).

## Sécurité
- Ne jamais lire, afficher ni commiter `.env*` ; `.env.example` (back) donne les noms de variables.
- Aucun secret dans une commande, un fichier de configuration ou une liste d'autorisations d'outil.
- Aucune commande destructrice (`rm -rf`, `git push --force`, `git reset --hard`) sans demande explicite.
