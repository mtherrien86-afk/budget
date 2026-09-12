# Le grand livre — Budget annuel

Application de planification budgétaire : paiements récurrents (hebdomadaire, mensuel,
date précise), génération automatique d'une année complète, suivi payé/confirmé,
plusieurs budgets, import CSV/XLSX. Authentification par courriel/mot de passe,
données stockées dans Firestore.

## 1. Créer le projet Firebase

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) et crée un
   nouveau projet (gratuit, plan Spark suffit largement pour un usage personnel).
2. Dans **Authentication > Sign-in method**, active le fournisseur **Courriel/Mot de passe**.
3. Dans **Firestore Database**, clique **Créer une base de données** (mode production).
4. Dans **Paramètres du projet > Vos applications**, ajoute une application **Web**
   (icône `</>`). Copie la config qui s'affiche (`apiKey`, `authDomain`, etc.).

## 2. Configurer le projet localement

```bash
npm install
cp .env.example .env
```

Remplis `.env` avec les valeurs copiées à l'étape précédente.

```bash
npm run dev
```

L'app tourne sur `http://localhost:5173`. Crée-toi un compte depuis l'écran de connexion
(courriel + mot de passe) — c'est ton compte personnel.

> **Protéger l'accès** : par défaut, n'importe qui avec le lien peut créer un compte.
> Pour un usage strictement personnel, une fois ton compte créé, va dans
> **Authentication > Sign-in method** et décoche « Autoriser la création de nouveaux
> comptes » n'est pas une option native de Firebase — la façon simple de verrouiller
> l'accès est de retirer le bouton « Créer un compte » dans `src/components/Login.jsx`
> après avoir créé ton propre compte, ou de configurer une App Check / une Cloud
> Function qui limite les inscriptions à une liste d'adresses autorisées.

## 3. Déployer les règles de sécurité Firestore

Les règles (`firestore.rules`) garantissent que chaque budget n'est visible et
modifiable que par son propriétaire (`ownerUid`).

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # choisis le projet créé à l'étape 1, garde les fichiers existants
firebase deploy --only firestore:rules
```

## 4. Mettre le projet sur GitHub

```bash
git init
git add .
git commit -m "Premier envoi"
git branch -M main
git remote add origin https://github.com/<ton-nom>/<ton-repo>.git
git push -u origin main
```

Le fichier `.env` est ignoré par git (`.gitignore`) — tes clés ne partent jamais sur GitHub.

## 5. Déployer le site (Firebase Hosting)

Manuellement :

```bash
npm run build
firebase init hosting     # choisis "dist" comme dossier public, configure en SPA (oui)
firebase deploy --only hosting
```

**Déploiement automatique via GitHub Actions** (déjà inclus dans
`.github/workflows/deploy.yml`) : à chaque push sur `main`, le site est rebâti et
déployé automatiquement. Pour l'activer :

1. Dans GitHub, va dans **Settings > Secrets and variables > Actions**.
2. Ajoute les 6 secrets `VITE_FIREBASE_*` (mêmes valeurs que ton `.env`).
3. Génère un compte de service : `firebase init hosting:github` (l'outil Firebase CLI
   te guide et crée automatiquement le secret `FIREBASE_SERVICE_ACCOUNT` sur GitHub).

## Fonctionnement des données

- `budgets/{budgetId}` — un document par budget (nom, propriétaire).
- `budgets/{budgetId}/planItems/{id}` — les paiements récurrents planifiés.
- `budgets/{budgetId}/entries/{id}` — les entrées générées ou importées pour une année
  (date, montant, payé, confirmé, numéro de confirmation, note).

Modifier le montant d'un item planifié met à jour en cascade toutes les entrées
générées à partir de cet item qui ont encore l'ancien montant et qui ne sont **ni
payées ni confirmées**. Les entrées payées ou confirmées ne bougent jamais
automatiquement.

## Import d'un fichier Google Sheet

Depuis Google Sheets : **Fichier > Télécharger > Valeurs séparées par des virgules
(.csv)** (ou format Excel .xlsx). Dans l'onglet Planification, clique **Importer un
fichier**, choisis-le, associe les colonnes détectées (Date et Montant sont
obligatoires) et confirme. Les lignes importées deviennent des entrées indépendantes
(non liées à un paiement planifié) que tu peux ensuite éditer normalement.

## Structure du projet

```
src/
  firebase.js          init Firebase (auth + Firestore)
  App.jsx               écran principal, orchestration des onglets
  hooks/
    useAuth.js           connexion / inscription / déconnexion
    useBudgets.js         liste, création, renommage, suppression des budgets
    useBudgetData.js      items planifiés + entrées d'un budget (CRUD, génération d'année, import)
  components/
    Login.jsx
    BudgetSwitcher.jsx
    PlanTab.jsx
    YearTab.jsx
    EntryEditor.jsx
    ImportSheet.jsx
  utils/helpers.js        dates, formatage monétaire, génération des dates d'une année
```
