# Drakko — Frontend (`02-front`)

Application de suivi de chantier pour entreprises de paysagisme. React 18, TypeScript strict, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, react-i18next, PWA (vite-plugin-pwa).
Mobile first, PWA, responsive, interface simple pour utilisation terrain. Le produit s'appelle **Drakko** (« Landscape » est l'ancien nom).

Ce fichier est la source de vérité des consignes pour Claude Code, Cursor et Codex. `CLAUDE.md` se contente de l'importer : ne rien dupliquer dedans.

## Commandes
- Node 22 (`.nvmrc`, lu aussi par la CI) : `nvm use` dans le dossier, `nvm install` si la version manque. Le back est sur Node 24, ne pas confondre les deux terminaux
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
- Sections de clés : `common`, `nav`, `dashboard`, `projects`, `project`, `create_project`, `edit_project`, `clients`, `client_detail`, `create_client`, `users`, `report`, `photos`, `status`, `settings`, `tutorials`, `login`, `services`, `sign`, `express_project`, `install`, `not_found`, `route_error`, `platform`, `quotes`, `quote_public`, `invoices`.
- Dates et montants : `i18n.language`, jamais `"fr-FR"` en dur. Labels statiques (`ROLE_LABELS`…) définis **dans** le composant ; hors composant (hook, utilitaire) : `i18n.t(...)` importé de `i18next`.
- Ne jamais afficher le message d'une erreur de l'API : `apiErrorMessage(err, t, 'section.clé_de_repli')` (`src/lib/api-error.ts`) traduit le `code` renvoyé par le serveur.
- Un `<option>` garde une `value` explicite : seul son libellé est traduit.
- Les tests `src/i18n/*.test.ts` échouent si une clé manque dans une langue, si un `t('…')` pointe vers une clé inexistante ou si un texte est écrit en dur (JSX, `aria-label`, `placeholder`, `title`, `alt`…). Un texte non traduisible (marque, sigle, exemple de format) s'ajoute à `ALLOWED` dans `no-hardcoded-text.test.ts`.

## Conventions d'interface (détails et raisons dans `08-decisions.md`)
- **Mode gaucher** (`User.handedness`) : pour tout nouvel élément interactif principal du mobile (bouton flottant, panneau latéral, barre d'actions, swipe, drawer…), se demander s'il doit se déplacer ou s'inverser. Si oui : override CSS dans `src/index.css` sous `[data-handedness="left"]` (modèle `.bottom-fab`) ou classes Tailwind lues dans `useTheme().handedness` (modèle `AppDrawer`), puis l'ajouter au tableau « Éléments affectés » de `08-decisions.md`.
- **Modules** : la liste des modules est dans `src/modules/registry.ts` (menus, tiroir, barre du bas, tableau de bord la lisent) : ne jamais la recopier dans un composant. Ajouter un module : procédure dans ADR-027 (back et front) ; les tests de `src/modules/registry.test.ts` signalent les oublis.
- **Module activable** (Chantiers, Devis, Facturation ; ADR-029) : `usePermissions().can` répond déjà « non » pour un module que l'organisation n'a pas (administrateur compris), `isModuleActive` sert quand il n'y a pas de droit à tester. Toute route d'un module activable est derrière `CanRoute`, et l'application doit tenir **sans** lui : rien n'y appelle ses routes ou ses emplacements sans condition. Les montants d'un devis se calculent en entiers (`src/modules/devis/totals.ts`, BigInt), jamais en flottants. Un chantier issu d'un devis accepté (ADR-032) se crée par la page « Nouveau chantier » pré-remplie (`?devis=<id>` depuis la fiche du devis, ou le choix d'un devis sur le formulaire) : les deux chemins passent par `applyQuote`, `quoteId` part avec la création, et créer ou supprimer un chantier recharge `['quotes']`. Facturation (ADR-033, `src/pages/invoices/`, `src/modules/factures/`) : la facture réutilise le formulaire des devis (`QuoteFormFields`, `kind="invoice"` : l'échéance prend la place de la validité, `vatExempt` verrouille le taux) ; un brouillon se relit et s'ajuste, une facture émise ne se modifie plus (la page de modification le dit) ; **« Créer la facture » du devis crée le brouillon d'un clic** (`useCreateInvoice({ quoteId })`) et toute écriture sur une facture recharge `['invoices']` **et** `['quotes']` ; **tableau de bord** : les blocs Devis et Factures lisent la synthèse du serveur (`useQuotesSummary`, `useInvoicesSummary`), jamais une liste (limitée) ; les listes chargent par 50 avec « Afficher plus » (`limit`) ; accepter et refuser un devis à la main se confirment, et « Annuler la décision » (`undecide`) les défait quand le serveur le permet ; **les formulaires de devis et de facture protègent la saisie** (`useUnsavedChanges` + `UnsavedChangesDialog`, comparaison avec la saisie d'ouverture par `isFormDirty`, `markSaved()` avant de quitter après un enregistrement) ; **acompte** : « Facture d'acompte » sur la fiche d'un devis accepté (`DepositDialog` : pourcentage ou montant hors taxe, `useCreateInvoice({ quoteId, deposit })`), la facture de solde qui en découle déduit chaque acompte par des lignes à `depositInvoiceId` : elles ne sont **jamais dans le formulaire** (`formFromInvoice` les écarte, `deductionsOf` les passe à `QuoteFormFields`, dont les totaux passent par `computeBalanceTotals`) ni dans la liste des lignes de la fiche (les totaux les montrent) ; une facture d'acompte n'a pas de « Modifier » et, déduite (`deductedBy`), pas d'avoir ; « Envoyer par email » (`useEmailInvoice`, `factures.update`) n'existe que pour une facture émise ou payée et un avoir : la fiche garde le dernier envoi (`emailedAt`, `emailedTo`) et passe à « Renvoyer » ; avant d'émettre, `missingIdentity` prévient de ce qui manque à l'entreprise (même règle que le back, qui reste juge), et la confirmation d'émission **avertit sans bloquer** quand les réglages n'ont aucune pénalité de retard (la loi ne les demande qu'entre professionnels) ; le formulaire d'une facture porte « Prestation réalisée le » (`serviceDate`, facultatif, vide = `null`, toujours vide pour un devis) ; `formatDay` (`@/lib/utils`) lit les jours sans heure en UTC (jamais `formatDate`) : les factures **et la validité d'un devis**. « Expiré » vient de l'API (`Quote.expired`, jamais recalculé ici) : `QuoteStatusBadge` prend `expired`, l'onglet « Expiré » de la liste envoie `expired=true` (ce n'est pas un état), et un devis expiré n'a plus « Renvoyer par email » (le serveur le refuse) ; le formulaire d'un devis prévient d'une validité passée sans la bloquer. **Plafonds de ligne** (`MAX_LINES`, `MAX_QUANTITY`, `MAX_UNIT_PRICE` de `quote-form.ts`) : ils copient ceux du back (`DocumentLineDto`, `MAX_*_LINES`), les modifier ensemble ; un envoi que `QuoteFormFields` refuse défile jusqu'à la première erreur (`data-form-error` = id du champ à focaliser : tout nouveau contrôle du formulaire qui bloque l'envoi le porte). `DepositDialog` reçoit `alreadyBilled` (somme hors taxe de `quote.deposits[].subtotal`) et refuse un acompte qui ne laisserait pas de solde. **Fiche client** : elle liste les factures du client (`useInvoices({ clientId })`, seulement avec `factures.read`) et porte « Nouveau devis » / « Nouvelle facture » (`/devis/nouveau?client=<id>`, `/factures/nouveau?client=<id>` ; absents pour un client désactivé) ; `CreateQuotePage` et `CreateInvoicePage` lisent le paramètre par `useClientFromUrl` et **n'affichent le formulaire qu'une fois la réponse connue**, pour que le client fasse partie de la saisie d'ouverture (`isFormDirty` ne le prend pas pour une saisie à perdre) ; un client introuvable ou désactivé ouvre le formulaire vide. La page publique du client (`/quote/:token`, ADR-031) est hors de la coque, sans session : elle n'utilise pas `apiRequest`, parle la langue de l'organisation renvoyée par l'API (`formatMoney` et `formatDate` prennent la langue en paramètre) et n'affiche jamais le texte d'une erreur du serveur.
- **Identifiants légaux** : SIRET, TVA, IBAN, BIC et email se contrôlent dans les réglages (`src/lib/identifiers.ts`, mêmes règles que le back) ; un champ facultatif vidé part en `null` (il s'efface), jamais en `undefined`.
- **Créer / modifier un objet** (chantier, client, membre, prestation) : une page dédiée (`…/nouveau`, `…/:id`, `…/:id/modifier`), jamais une modale ni une ligne dépliée sur place (ADR-026). Les modales ne servent qu'aux confirmations.
- **Fenêtres modales** : centrées, titre fixe, contenu qui défile, rendues par portail dans `<body>`. Couches : barre du bas `z-50`, fenêtre `z-[60]`, fenêtre utilisable pendant un tutoriel `z-[1100]`.
- **Champs de date** : chaque champ d'une paire garde toujours un `min` et un `max` (`dateRangeBounds`, sinon l'icône du calendrier glisse sous Chrome) ; dates reçues de l'API converties par `toDateInput`.
- **Mises à jour de l'appli** : `registerType: "autoUpdate"`, sans bouton « Recharger ». Ne pas repasser en `prompt` sans demande explicite (un test le garde).
- **Plateforme** (`src/platform/`, route `/plateforme/*`, ADR-028) : chargée par `React.lazy` depuis `routes.tsx` (jamais d'import statique, un test le garde), aucun lien dans les menus de l'application, sa propre session en mémoire (`usePlatformStore`, cookie de renouvellement `httpOnly`) jamais mêlée à `useAuthStore`. Tout geste qui touche un client passe par `ReasonDialog` (motif obligatoire).
- **Mode dépannage** (`useAuthStore.support`) : jeton en mémoire, **jamais** `clearAuth`, jamais de jeton de renouvellement écrit dans le navigateur ; un 401 ou la fin du temps recharge sur `/plateforme`. `SupportBanner` reste le premier élément d'`AppShell`.
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
