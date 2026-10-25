# Mon espace

Un mini Notion/Coda personnel, 100 % HTML/CSS/JS, sans serveur ni dépendance.
Pour gérer ses tâches, projets, courses, papiers administratifs et paiements récurrents.

## Fonctionnalités

- **Bases** (comme les databases Notion) avec des **propriétés** typées : texte, nombre (€, %), sélection, multi-sélection, date, case à cocher, lien, **relation** vers une autre base, **récurrence**.
- **Pages** : chaque élément s'ouvre dans un panneau avec ses propriétés et des notes riches (titres, listes, cases à cocher, citations, liens).
  Raccourcis en début de ligne : `# ` titre, `- ` liste, `1. ` liste numérotée, `[] ` case à cocher, `> ` citation.
- **Vues** multiples par base : **Tableau** (édition en ligne, tri par colonne, totaux €), **Kanban** (regroupé par n'importe quelle propriété Sélection ou Case à cocher, glisser-déposer), **Liste** (idéale pour les courses), **Calendrier** (glisser-déposer pour changer la date).
  Chaque vue a ses filtres, son tri, ses propriétés visibles et l'option « Masquer terminés ».
- **Accueil** : en retard / aujourd'hui / cette semaine / 30 jours, montant à payer, ajout rapide.
- **Paiements récurrents** : cocher « Payé » reprogramme automatiquement l'échéance suivante (semaine, mois, trimestre, année) et garde un historique dans la page.
- **Rappels** : notifications du navigateur (quand l'app est ouverte) et **export .ics** vers votre agenda (Google, Apple, Outlook) avec alarme la veille et le jour même.
- **9 thèmes** : Neige, Sable, Menthe, Lavande, Pêche, Ciel, Papier, Nuit, Encre.
- Recherche globale `Ctrl+K`, mobile, installable comme une app (PWA), fonctionne hors ligne.

Modèles fournis : Tâches, Projets, Courses, Papiers admin, Paiements & rappels (avec des exemples à supprimer).

## Données

Tout est stocké **dans le navigateur** (localStorage), rien n'est envoyé nulle part.
Conséquences :
- chaque navigateur/appareil a ses propres données ;
- pensez à **Sauvegarder (.json)** régulièrement (barre latérale) — **Restaurer** permet de recharger une sauvegarde ou de transférer vers un autre appareil.

## Utiliser en local

Ouvrir `index.html` directement fonctionne. Pour avoir le mode hors ligne et les notifications, servez le dossier :

```bash
python -m http.server 8000
```

puis ouvrez http://localhost:8000.

## Publier sur GitHub Pages

```bash
git init && git add . && git commit -m "Mon espace"
```

```bash
gh repo create mon-espace --public --source . --push
```

Puis sur GitHub : **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**.
L'app sera disponible sur `https://<votre-pseudo>.github.io/mon-espace/`.

> Le dépôt public ne contient que le code : vos données restent dans votre navigateur.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Squelette de la page |
| `styles.css` | Thèmes et mise en page |
| `app.js` | Toute la logique (modèle, vues, éditeur, rappels) |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Mode hors ligne et installation |
