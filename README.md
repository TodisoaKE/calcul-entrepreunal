# Cap Pilotage

Calculateur entrepreneurial responsive en ariary (MGA), construit avec Angular 21. Les membres autorisés se connectent avec leur compte individuel et partagent la même liste de simulations Supabase.

## Démarrage local

```bash
npm install
npm run start
```

Ouvre `http://localhost:4200/`. Le simulateur reste fermé tant que le projet Supabase n’est pas configuré.

## Créer l’espace familial Supabase

1. Crée un projet sur [supabase.com](https://supabase.com/).
2. Dans **SQL Editor**, exécute le contenu de [`supabase/schema.sql`](supabase/schema.sql). Ce script crée les tables et les règles Row Level Security (RLS).
3. Dans **Authentication > Sign In / Providers > Email**, active Email. Dans les réglages Auth, désactive **Allow new users to sign up**. Ne permets pas les utilisateurs anonymes.
4. Dans **Authentication > Users**, ajoute manuellement un compte par membre avec **Add user**. Utilise un mot de passe différent pour chaque compte et transmets-le en privé.
5. Dans la liste Users, copie l’UUID de chaque compte familial. Dans le SQL Editor, autorise uniquement ces comptes en remplaçant les valeurs d’exemple:

```sql
insert into public.family_members (user_id)
values
  ('UUID_DU_COMPTE_ADMIN'),
  ('UUID_D_UN_MEMBRE_DE_LA_FAMILLE')
on conflict (user_id) do nothing;
```

Les personnes inscrites dans `family_members` peuvent lire, enregistrer et supprimer toutes les simulations communes. Un compte Auth non inscrit dans cette table ne voit aucune donnée.

6. Dans **Project Settings > API**, copie **Project URL** et la clé **Publishable** (ou `anon` legacy). Remplace les placeholders de [`src/app/supabase.config.ts`](src/app/supabase.config.ts).

La clé publishable/anon est prévue pour le navigateur; les règles RLS protègent la base. Ne copie jamais la clé secrète ou `service_role` dans Angular, GitHub ou Netlify.

## Publication Netlify

1. Pousse le projet sur GitHub. Pour garder le code privé, crée un dépôt privé.
2. Dans Netlify, choisis **Add new site > Import an existing project** et connecte le dépôt GitHub.
3. Le [`netlify.toml`](netlify.toml) configure déjà `npm run build` et le dossier `dist/calcul-entrepreunal/browser`.
4. Déploie le site. Copie son URL Netlify.
5. Dans Supabase **Authentication > URL Configuration**, définis l’URL Netlify comme **Site URL** et ajoute-la aux **Redirect URLs**. Enregistre.
6. Ouvre le site Netlify et teste une connexion avec un compte autorisé.

L’URL et la clé publishable sont intégrées au bundle public du site. C’est normal pour Supabase; la protection repose sur les sessions Auth et RLS, jamais sur le secret de la clé.

## Vérifications

```bash
npm.cmd test -- --watch=false
npm.cmd run build
```

Dans PowerShell, `npm.cmd` évite le blocage possible du script `npm.ps1` par la politique d’exécution.

## Accès et limites

- Les inscriptions sont manuelles; il n’y a aucun bouton d’inscription publique.
- La table partagée exige une session Auth et une entrée correspondante dans `family_members`.
- Tous les membres autorisés ont les mêmes droits: chacun peut ajouter et supprimer toute simulation de la famille.
- L’administrateur ajoute ou retire un accès en insérant ou supprimant l’UUID correspondant dans `family_members`.
- Les taux sont indicatifs; TVA, impôt et particularités de statut ne sont pas calculés.
