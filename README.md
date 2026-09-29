# Cap Pilotage

Mini-calculateur de pilotage entrepreneurial en ariary (MGA), construit avec Angular 21. Le tableau de bord est responsive et propose une simulation par objectif de revenu ou par chiffre d’affaires prévu.

## Démarrage

```bash
npm install
npm run dev
```

L’application Angular est disponible sur `http://localhost:4200/` et JSON Server sur `http://localhost:3000/`. `npm run start` lance seulement Angular; `npm run api` lance seulement l’API de sauvegarde.

Sous Windows PowerShell, si la politique d’exécution bloque `npm.ps1`, utilisez `npm.cmd run dev`.

Les simulations sont enregistrées dans `db.json`, dans la collection `simulations`. Depuis l’interface, il est possible de créer un instantané, de le recharger après actualisation et de le supprimer.

## Calculs

- En mode objectif, le chiffre d’affaires cible est calculé à partir du revenu net souhaité, des frais fixes et des taux estimés de frais variables et de cotisations.
- En mode prévision, le revenu net estimé est le chiffre d’affaires diminué des frais variables, des cotisations estimées et des frais fixes.
- Le tableau affiche aussi le seuil de rentabilité, la projection annualisée et une réserve de trésorerie indicative.
- L’export CSV utilise le séparateur `;` et la devise MGA.

Les taux sont modifiables et servent uniquement à la simulation. La TVA, l’impôt sur le revenu et les règles propres à chaque statut ne sont pas modélisés; validez les paramètres avec un professionnel.

## Développement et tests

```bash
npm run build
npm test -- --watch=false
```

JSON Server est une API de développement sans authentification. `db.json` convient à un prototype local, pas à un déploiement multi-utilisateur ou à des données sensibles.
