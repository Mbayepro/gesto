# GESTO — Maquette fonctionnelle de gestion commerciale

Application mobile-first en français (FCFA), données de démonstration sénégalaises, état local persistant (localStorage) structuré pour brancher Lovable Cloud plus tard.

## Identité
- Couleurs imposées : bleu #0B2A6F, jaune #F5B400, fond #F7F9FC, texte #172033 / #667085, vert/orange/rouge pour les statuts.
- Typographie : Plus Jakarta Sans (titres) + Manrope (texte). Cartes arrondies, ombres légères.
- Logo texte "GESTO" avec symbole ticket de caisse, sous-titre "Gestion simple de votre commerce".

## Structure
- Ordinateur : barre latérale gauche + contenu.
- Mobile : en-tête compact + barre du bas (Accueil, Ventes, Produits, Factures, Plus) avec bouton central jaune "Nouvelle vente".
- "Plus" ouvre un panneau : Clients, Paiements, SAV, Stock, Rapports, Paramètres.

## Pages
1. **Tableau de bord** — salutation, 4 indicateurs, ventes récentes (tableau / cartes), graphique 7 jours, produits bientôt en rupture.
2. **Nouvelle vente** (prioritaire) — 3 étapes : client (recherche + création rapide), produits (recherche, quantité, prix, remise, ligne libre "Installation"), paiement (6 modes, partiel avec reste à payer). Boutons : Enregistrer / + générer facture / + WhatsApp.
3. **Ventes** — historique filtrable.
4. **Factures** — liste + page facture imprimable (en-tête commerce, client, lignes, totaux, paiement, garantie avec n° série, "Merci pour votre confiance"). Boutons PDF (impression navigateur), Imprimer, Partager, WhatsApp (lien wa.me).
5. **Produits** — filtres (recherche, catégorie, marque, stock), tableau/cartes, ajout/modification, fiche détaillée (infos, stock, ventes, mouvements, garanties).
6. **Stock** — mouvements (entrée, sortie, retour, ajustement) + historique, alertes de seuil.
7. **Clients** — liste, création, fiche (total achats, commandes, payé, reste, badge "Client à jour"/"Paiement en attente", historique factures).
8. **Paiements** — 3 totaux, tableau, "Enregistrer un paiement" qui met à jour le solde de la facture.
9. **SAV & Garanties** — recherche par facture / série / téléphone, garanties avec expiration et statut, dossiers SAV (création, changement de statut).
10. **Rapports** — filtres période, 6 indicateurs, graphiques : CA, top produits, clients actifs, ventes par catégorie.
11. **Paramètres** — profil commerce, logo, facture (préfixe, conditions, message), devise, notifications, sauvegarde (export/réinitialisation des données démo).

## Comportements liés
Enregistrer une vente : crée vente + facture + paiement + mouvement de sortie, diminue le stock, notifie "Vente enregistrée", "Facture générée", et "Stock faible" si seuil atteint.

## Données de démo
12 produits, 8 clients, ~18 ventes/factures, paiements variés (Wave, Orange Money, espèces…), mouvements de stock, 3 dossiers SAV. Noms fictifs.

## Détails techniques
- Routes TanStack séparées par module (`/ventes/nouvelle`, `/factures/$id`, `/produits/$id`, `/clients/$id`…), chacune avec ses métadonnées.
- Store Zustand persistant + couche `repository` (interfaces par entité) pour remplacer par Lovable Cloud ensuite.
- Types TS calqués sur les tables : businesses, products, categories, customers, sales, sale_items, invoices, payments, stock_movements, warranties, service_tickets ; schéma SQL documenté dans un fichier pour la future base.
- shadcn/ui, Recharts, sonner pour les notifications, CSS d'impression pour la facture.
- Authentification : prévue à l'étape suivante avec Lovable Cloud (non incluse dans cette maquette).
