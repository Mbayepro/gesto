# Écran « Nouvelle vente »

Construire l'écran de vente complet, pensé d'abord pour le téléphone, et le relier au stock et aux paiements.

## Parcours en 3 étapes
Une barre de progression en haut : Client, Produits, Paiement. Un récapitulatif reste visible : en bas de l'écran sur téléphone, sur le côté sur ordinateur.

1. **Client**
   - Recherche par nom ou par téléphone, avec la liste des clients existants.
   - Bouton « Nouveau client » : petit formulaire (nom, téléphone obligatoires) qui crée le client et le sélectionne.
   - Option « Client de passage » pour aller plus vite.

2. **Produits**
   - Recherche par nom, référence ou marque, avec des filtres par catégorie.
   - Chaque produit affiche son prix et son stock. Les produits en rupture sont grisés, et on ne peut pas dépasser le stock disponible.
   - Panier : boutons + et − pour la quantité, prix modifiable, remise par ligne, numéro de série facultatif (pour la garantie) et suppression de la ligne.
   - Ligne libre « Prestation » (par exemple Installation ou Livraison) avec un libellé et un prix.
   - Remise globale sur la vente.

3. **Paiement**
   - Totaux : sous-total, remises et total à payer.
   - 5 modes de paiement en grosses tuiles : Espèces, Wave, Orange Money, Virement, Carte.
   - Montant reçu, avec des boutons rapides « Tout payer » et « Rien payé ». Le reste à payer, ou la monnaie à rendre, est calculé automatiquement.
   - Le statut s'affiche : Payée, Partielle ou Impayée.
   - 3 boutons : **Enregistrer**, **Enregistrer et voir la facture**, **Enregistrer et envoyer sur WhatsApp** (message prérempli avec le n° de facture, le total et le reste à payer).

## À l'enregistrement
- La vente est créée avec son numéro de facture.
- Le stock de chaque produit vendu diminue, et un mouvement « Sortie – Vente FAC-… » est ajouté à l'historique du stock.
- Le paiement est enregistré si un montant a été reçu.
- Notifications : « Vente enregistrée », puis « Stock faible : … » si un produit passe sous son seuil d'alerte.
- Ensuite, l'écran revient à l'historique des ventes, ou ouvre la facture si ce choix a été fait.

## Contrôles
On ne peut pas enregistrer sans client ni sans article, avec une quantité de 0, avec des remises plus élevées que le prix, ou avec plus de produits que le stock disponible. Un message clair indique ce qui manque.

## Pages liées
Les ventes enregistrées doivent pouvoir se vérifier ailleurs dans l'application. Je mettrai donc à niveau ces pages :
- **Historique des ventes** : liste des ventes avec leur statut.
- **Fiche facture** : version simple pour l'instant (la facture imprimable complète est prévue à l'étape suivante).
- **Stock** : liste des mouvements récents.

## Détails techniques
- `src/routes/ventes.nouvelle.tsx` : un état local par étape. Les sous-composants vont dans `src/components/sale/` (CustomerStep, ProductStep, PaymentStep, SaleSummary).
- L'action `addSale` du store est réutilisée : elle gère déjà la vente, le stock, le paiement et la détection du stock faible. Elle sera étendue pour les clients de passage (un client « Client de passage » créé une seule fois) et pour plafonner les quantités au stock disponible.
- La validation passe par zod, les notifications par sonner (Toaster ajouté dans `__root.tsx` s'il manque).
- Nouvelle route `factures.$id.tsx`, en version simple. Mise à jour de `ventes.index.tsx` et de `stock.tsx`.
- Le lien WhatsApp utilise `wa.me/<221 + téléphone>?text=` avec un texte encodé.
