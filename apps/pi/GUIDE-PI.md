# Guide Complet — Planetary Interaction (PI) EVE Online

> Rédigé à partir des données EVE University Wiki, des recettes in-game vérifiées et des mécaniques
> réelles du jeu. Destiné aux débutants qui veulent faire de la PI sérieusement.

---

## Table des matières

1. [Qu'est-ce que la PI ?](#1-quest-ce-que-la-pi-)
2. [Les compétences essentielles](#2-les-compétences-essentielles)
3. [Types de planètes et ressources P0](#3-types-de-planètes-et-ressources-p0)
4. [La chaîne de production : P0 → P4](#4-la-chaîne-de-production--p0--p4)
5. [Les structures et leurs coûts réels](#5-les-structures-et-leurs-coûts-réels)
6. [CPU et Power Grid — la contrainte centrale](#6-cpu-et-power-grid--la-contrainte-centrale)
7. [Les liens (Links)](#7-les-liens-links)
8. [Setups de référence](#8-setups-de-référence)
9. [Stratégie par niveau de compétence](#9-stratégie-par-niveau-de-compétence)
10. [Produits recommandés](#10-produits-recommandés)
11. [Recettes complètes P2, P3, P4](#11-recettes-complètes-p2-p3-p4)
12. [Optimisation avancée](#12-optimisation-avancée)
13. [Utiliser NETK PI Tool](#13-utiliser-netk-pi-tool)

---

## 1. Qu'est-ce que la PI ?

La **Planetary Interaction** est un système de production passif dans EVE Online. Tu installes des
structures sur des planètes, elles extraient ou transforment des ressources automatiquement, et tu
reviens vider les launchpads à intervalles réguliers.

### Pourquoi faire de la PI ?

- **Revenu passif** : la PI tourne pendant que tu joues (ou dors). Une chaîne bien montée génère
  des ISK sans intervention constante.
- **Utilisée partout** : les produits PI (P2, P3, P4) entrent dans la fabrication des modules T2,
  des structures citadelles, des composants de vaisseaux capitaux. La demande est constante.
- **Scalable** : avec plus de compétences, plus de planètes, les revenus se multiplient linéairement.
- **Low-barrier** : zéro capital de départ nécessaire — les Command Centers s'achètent en marché
  pour quelques millions d'ISK.

### Le principe général

```
Planète → Extraction (P0) → Transformation (P1 → P2 → P3 → P4) → Launchpad → Toi
```

Chaque planète a un **CPU** et un **Power Grid** limités par ton niveau de compétence
*Command Center Upgrades*. Toutes les structures que tu poses consomment du CPU et du Power Grid.
C'est la contrainte fondamentale de la PI.

---

## 2. Les compétences essentielles

### Vue d'ensemble

| Compétence | Rang | Effet |
|------------|------|-------|
| **Command Center Upgrades** (CCU) | 3 | CPU et Power Grid de ta Command Center |
| **Interplanetary Consolidation** (IPC) | 4 | Nombre de planètes exploitables simultanément |
| **Planetology** | 3 | Précision du scan de ressources |
| **Advanced Planetology** | 5 | Précision de scan encore améliorée |
| **Remote Sensing** | 3 | Scanner les planètes à distance sans s'y téléporter |

### Command Center Upgrades — la compétence #1

C'est la compétence la plus importante. Elle détermine combien de structures tu peux poser sur
chaque planète.

| Niveau CCU | CPU (tf) | Power Grid (MW) |
|------------|----------|-----------------|
| 0 | 1 675 | 6 000 |
| 1 | 7 057 | 9 000 |
| 2 | 12 136 | 12 000 |
| 3 | 17 215 | 15 000 |
| 4 | 21 315 | 17 000 |
| **5** | **25 415** | **19 000** |

**Conclusion** : CCU 0 permet à peine de poser un extracteur. CCU 5 est l'objectif à long terme.

### Interplanetary Consolidation — la compétence #2

| Niveau IPC | Planètes max |
|------------|-------------|
| 0 | 1 |
| 1 | 2 |
| 2 | 3 |
| 3 | 4 |
| 4 | 5 |
| **5** | **6** |

Chaque planète supplémentaire = plus de production. Montez IPC en parallèle de CCU.

### Planetology et Advanced Planetology

Ces compétences améliorent la **résolution du scan** de ressources sur une planète. Un meilleur
scan te permet de placer les têtes d'extracteur sur des zones plus riches.

- Planetology : amélioration modérée (suffisant pour débuter)
- Advanced Planetology : amélioration supplémentaire (important pour optimiser en late-game)

### Remote Sensing

Permet de scanner des planètes à distance depuis l'espace, sans devoir s'y téléporter. Pratique
pour repérer les meilleures planètes dans un système avant de s'y engager.

### Plan de compétences recommandé (débutant)

```
Priorité 1 (obligatoire pour commencer)
  Command Center Upgrades I → II → III

Priorité 2 (débloquer plusieurs planètes)
  Interplanetary Consolidation I → II → III

Priorité 3 (optimiser les scans)
  Planetology I → II → III
  Remote Sensing I → II → III

Long terme (objectif PI sérieux)
  Command Center Upgrades IV → V
  Interplanetary Consolidation IV → V
  Advanced Planetology I → II → III → IV → V
```

> **Ordre de priorité** : CCU d'abord (plus de structures par planète), IPC ensuite (plus de
> planètes). Planetology et Remote Sensing sont utiles mais pas critiques au début.

---

## 3. Types de planètes et ressources P0

Il existe **8 types de planètes**, chacun avec ses propres ressources extractibles (P0).

### Tableau complet

| Type | Ressources P0 disponibles |
|------|--------------------------|
| **Barren** | Aqueous Liquids, Base Metals, Carbon Compounds, Felsic Magma, Heavy Metals, Ionic Solutions, Micro Organisms, Noble Metals, Non-CS Crystals, Suspended Plasma |
| **Gas** | Aqueous Liquids, Base Metals, Carbon Compounds, Heavy Metals, Ionic Solutions, Micro Organisms, Noble Gas, Planktic Colonies, Reactive Gas, Suspended Plasma |
| **Ice** | Aqueous Liquids, Carbon Compounds, Heavy Metals, Ionic Solutions, Micro Organisms, Noble Gas, Planktic Colonies, Suspended Plasma |
| **Lava** | Base Metals, Carbon Compounds, Felsic Magma, Heavy Metals, Non-CS Crystals, Ionic Solutions, Suspended Plasma |
| **Oceanic** | Aqueous Liquids, Carbon Compounds, Complex Organisms, Micro Organisms, Planktic Colonies, Suspended Plasma |
| **Plasma** | Base Metals, Heavy Metals, Ionic Solutions, Noble Metals, Non-CS Crystals, Suspended Plasma |
| **Storm** | Aqueous Liquids, Base Metals, Complex Organisms, Heavy Metals, Ionic Solutions, Noble Gas, Reactive Gas, Suspended Plasma |
| **Temperate** | Aqueous Liquids, Carbon Compounds, Complex Organisms, Micro Organisms, Noble Metals, Planktic Colonies, Suspended Plasma |

### Ressources rares — à retenir

| Ressource P0 | Planètes disponibles |
|--------------|---------------------|
| **Reactive Gas** | Gas, Storm seulement |
| **Noble Gas** | Gas, Ice, Storm seulement |
| **Felsic Magma** | Barren, Lava seulement |
| **Noble Metals** | Barren, Plasma seulement |
| **Complex Organisms** | Oceanic, Storm, Temperate seulement |
| **Planktic Colonies** | Gas, Ice, Oceanic, Temperate seulement |

> Ces ressources rares entrent dans des chaînes P2/P3 recherchées. Leur disponibilité limitée
> rend certains produits finis plus précieux.

### Comment choisir une planète ?

1. **Scanner** : lance un scan de surface (bouton "Survey" sur la planète). La carte thermique
   montre où les ressources sont concentrées. Cherche des zones chaudes (rouge/orange).
2. **Richesse relative** : dans un même système, certaines planètes du même type peuvent être
   2× à 3× plus riches qu'une autre. Scannez toutes les planètes avant de choisir.
3. **Planetology** : plus ton niveau est élevé, plus la carte est précise et utile.
4. **Highsec vs Nullsec** : les planètes en highsec sont systématiquement moins riches qu'en
   lowsec ou nullsec. Pour une PI sérieuse, les zones 0.0 offrent des extractions 3× à 5×
   supérieures.

---

## 4. La chaîne de production : P0 → P4

### Vue d'ensemble des tiers

```
P0 (brut) → [BIF] → P1 → [AIF] → P2 → [AIF] → P3 → [HTPP] → P4
```

| Tier | Nom | Produit par | Valeur relative | Volume (m³/u) |
|------|-----|-------------|----------------|---------------|
| **P0** | Raw Resources | Extracteur (ECU) | ~1 | ~0.01 |
| **P1** | Basic Commodities | Basic Industry Facility | ~10× | ~0.38 |
| **P2** | Refined Commodities | Advanced Industry Facility | ~50× | ~1.5 |
| **P3** | Specialized Commodities | Advanced Industry Facility | ~200× | ~6 |
| **P4** | Advanced Commodities | High-Tech Production Plant | ~1 000× | ~70–100 |

### Ratios de production

| Transformation | Inputs | Output | Structure |
|----------------|--------|--------|-----------|
| P0 → P1 | 3 000 unités P0 | 20 unités P1 | BIF (cycle 30 min) |
| P1 + P1 → P2 | 40 + 40 unités P1 | 5 unités P2 | AIF (cycle 1h) |
| P2 + P2 → P3 | 10 + 10 unités P2 | 3 unités P3 | AIF (cycle 1h) |
| P3 + P3 + P3 → P4 | 6 + 6 + 6 unités P3 | 3 unités P4 | HTPP (cycle 1h) |

> **Important** : le HTPP (P4) ne peut être construit que sur des planètes **Barren** ou
> **Temperate**. C'est pour ça que ces deux types sont précieux pour les chaînes P4.

### Exemple : produire du Coolant (P2)

```
Aqueous Liquids (P0) → [BIF] → Water (P1) ─────┐
                                                   ├── [AIF] → Coolant (P2)
Ionic Solutions (P0) → [BIF] → Electrolytes (P1) ─┘
```

Pour produire du Coolant, il faut deux types de planètes :
- Une planète avec **Aqueous Liquids** (barren, gas, ice, oceanic, storm, temperate)
- Une planète avec **Ionic Solutions** (barren, gas, ice, storm)

Planète **Barren** ou **Storm** : possède les deux → setup P2 autonome possible sur une seule planète.

---

## 5. Les structures et leurs coûts réels

Chaque structure consomme du CPU (en **tf**, teraflops) et du Power Grid (en **MW**).

### Tableau des structures

| Structure | CPU (tf) | Power Grid (MW) | Rôle |
|-----------|----------|-----------------|------|
| **Command Center** | — | — | Poste de commandement, requis. Pas de coût propre. |
| **Extractor Control Unit** (ECU) | 400 | 2 600 | Contrôle l'extraction. Max 1 par ressource P0. |
| **Extractor Head** | 110 | 550 | Tête d'extraction (max 10 par ECU). |
| **Basic Industry Facility** (BIF) | 200 | 800 | Transforme P0 → P1. |
| **Advanced Industry Facility** (AIF) | 500 | 700 | Transforme P1→P2 ou P2→P3. |
| **High-Tech Production Plant** (HTPP) | 1 100 | 400 | Transforme P3→P4. Barren/Temperate seulement. |
| **Storage Facility** | 500 | 700 | Stockage intermédiaire (12 000 m³). |
| **Launchpad** | 3 600 | 700 | Stockage principal (500 000 m³) + accès orbital. |
| **Lien (Link)** | variable | variable | Connecte les structures. Coût selon la distance. |

### Capacités de stockage

| Structure | Capacité |
|-----------|----------|
| Command Center | ~500 m³ (anecdotique) |
| Storage Facility | 12 000 m³ |
| **Launchpad** | **500 000 m³** (ton principal dépôt) |

Le Launchpad est à la fois le **stockage principal** et le seul point où tu peux envoyer les
produits en orbite pour les récupérer depuis ton vaisseau. Chaque colonie bien montée en a au
moins un.

### Règles importantes

- Chaque ECU ne peut extraire qu'**une seule ressource P0** à la fois.
- Chaque ECU peut avoir jusqu'à **10 têtes** (extractor heads), placées sur la carte de surface.
- Plus tu places de têtes, plus tu extrais — mais chaque tête consomme CPU et Power Grid.
- Un BIF/AIF/HTPP traite **une seule recette** à la fois (tu choisis laquelle).
- Les liens ne peuvent pas traverser l'atmosphère : les structures doivent être **connectées en
  réseau** pour s'échanger des matériaux.

---

## 6. CPU et Power Grid — la contrainte centrale

### Comprendre la grille

Chaque planète a une grille (CPU + Power Grid) définie par ton niveau de **Command Center
Upgrades**. Toutes tes structures additionnées ne doivent pas dépasser cette grille.

**Exemple pratique à CCU III** (17 215 tf CPU / 15 000 MW Power Grid) :

```
Setup : 1 ECU + 5 têtes + 2 BIF + 1 AIF + 1 Launchpad

CPU :    400 + (5×110) + (2×200) + 500 + 3 600 = 5 250 tf     ✓
Power :  2 600 + (5×550) + (2×800) + 700 + 700 = 8 350 MW      ✓
```
→ Ce setup tient largement à CCU III.

### Calcul rapide d'un setup

Additionne simplement les coûts :

```
Total CPU   = Σ (structure.cpu × nombre)  +  Σ (liens)
Total Power = Σ (structure.power × nombre) +  Σ (liens)
```

Si `Total CPU ≤ CCU_CPU` et `Total Power ≤ CCU_Power` → le setup est valide.

### Ce qui limite en pratique

- **Débutant (CCU 0–1)** : le CPU est si bas que tu peux à peine poser 1 ECU + quelques têtes.
  → Extraction P0 brute seulement, sans transformation.
- **CCU 2** : peut commencer à transformer en P1. Setup minimal BIF possible.
- **CCU 3** : setup P2 autonome possible sur une planète (si les ressources sont présentes).
- **CCU 4–5** : usines P3 et P4 deviennent possibles.

> **Règle d'or** : le Power Grid est souvent la vraie contrainte. Un ECU seul consomme 2 600 MW,
> soit presque la moitié du Power Grid à CCU 0. Upgrade CCU en priorité.

---

## 7. Les liens (Links)

Les liens connectent les structures entre elles et permettent le transfert de matériaux. Ils
consomment également du CPU et du Power Grid, **en fonction de la distance**.

### Formule de coût d'un lien

```
CPU Link   = 400 × distance_km / distance_max × upgrade_factor
Power Link = 2 600 × distance_km / distance_max × upgrade_factor
```

En pratique : un lien court coûte peu, un lien traversant la moitié de la planète peut coûter
autant qu'un ECU supplémentaire.

### Conseils de placement

1. **Regroupe les structures** : place le Launchpad au centre, les BIF/AIF/HTPP à proximité.
2. **ECU plus loin** : les ECU doivent être près des zones riches, pas forcément du Launchpad.
3. **Évite les liens longue distance** : un lien de 1 500 km vs 200 km peut représenter 10× le
   coût en CPU/Power.
4. **Upgrade les liens** : tu peux upgrader un lien pour augmenter son débit (quantité
   transférée par cycle). Utile si tu as beaucoup de matériaux à transporter.

---

## 8. Setups de référence

Ces configurations sont des points de départ éprouvés. Ajuste selon tes ressources disponibles.

### Setup 1 — Extraction P1 (CCU I minimum requis)

**Objectif** : extraire du P0 et le transformer en P1 sur place.

```
Structures :
  1× ECU + 5 têtes
  1× BIF
  1× Launchpad

Coût total :
  CPU :   400 + (5×110) + 200 + 3 600 = 4 750 tf   (req. CCU I : 7 057 tf ✓)
  Power : 2 600 + (5×550) + 800 + 700  = 6 850 MW   (req. CCU I : 9 000 MW ✓)
```

Ce setup produit du P1 que tu stockes dans le Launchpad. Simple, robuste, idéal pour commencer.

---

### Setup 2 — P2 autonome (CCU II minimum requis)

**Objectif** : extraire 2 ressources P0 et les transformer jusqu'en P2 sur une seule planète.
Nécessite une planète avec les **deux ressources P0** requises par ton P2 cible.

```
Structures :
  2× ECU + 3 têtes chacun (6 têtes au total)
  2× BIF  (une par ressource P0)
  1× AIF  (produit le P2)
  1× Launchpad

Coût total :
  CPU :   (2×400) + (6×110) + (2×200) + 500 + 3 600 = 5 960 tf   (req. CCU II : 12 136 tf ✓)
  Power : (2×2 600) + (6×550) + (2×800) + 700 + 700 = 11 500 MW  (req. CCU II : 12 000 MW ✓)
```

> Le Power Grid est juste à CCU II (11 500 sur 12 000). Évite les liens trop longs sur ce setup.

---

### Setup 3 — Usine P3 (planète d'usine, CCU III recommandé)

**Objectif** : planète dédiée à la transformation P2→P3. Elle **importe** du P2 depuis d'autres
planètes et **exporte** du P3.

```
Structures :
  8× AIF  (chacun produit une recette P3)
  1× Launchpad (reçoit les imports P2, stocke le P3)

Coût total :
  CPU :   (8×500) + 3 600 = 7 600 tf    (req. CCU II : 12 136 tf ✓, CCU I insuffisant)
  Power : (8×700) + 700   = 6 300 MW    (req. CCU I : 9 000 MW ✓)
```

Ce setup transforme 8 recettes P3 différentes (ou plusieurs fois la même). Organisation type :
- 3–4 planètes d'extraction P2 → alimentent la planète d'usine
- 1 planète d'usine P3 → produit et stocke le P3

---

### Setup 4 — Usine P4 (Barren ou Temperate uniquement, CCU IV recommandé)

**Objectif** : transformer P3→P4. Nécessite **Barren** ou **Temperate** exclusivement.

```
Structures :
  6× HTPP (High-Tech Production Plant)
  1× Launchpad

Coût total :
  CPU :   (6×1 100) + 3 600 = 10 200 tf   (req. CCU III : 17 215 tf ✓)
  Power : (6×400) + 700     = 3 100 MW    (req. CCU 0 : 6 000 MW ✓)
```

> Le HTPP est très gourmand en CPU mais léger en Power Grid. À CCU IV tu peux en poser 8+.

---

### Setup 5 — Chaîne P3 complète sur une planète (CCU IV–V, avancé)

**Objectif** : extraction P0, transformation P1 et P2, production P3 — tout sur une planète.

```
Structures :
  2× ECU + 3 têtes chacun
  2× BIF
  6× AIF
  2× Launchpad (séparation entrée/sortie conseillée)

Coût total :
  CPU :   (2×400) + (6×110) + (2×200) + (6×500) + (2×3 600) = 13 260 tf
  Power : (2×2 600) + (6×550) + (2×800) + (6×700) + (2×700) = 14 300 MW
```

Requis : **CCU IV** (21 315 tf / 17 000 MW). Le Power Grid est le facteur limitant.

---

## 9. Stratégie par niveau de compétence

### Débutant — CCU I / IPC I–II (2 planètes)

**Revenus estimés** : 50–150M ISK/mois
**Stratégie** : extraction P1 pure sur 2 planètes, vente directe.

- Planète 1 : extraction + BIF → P1 type A
- Planète 2 : extraction + BIF → P1 type B
- Vente des P1 en Jita ou Amarr

P1 les plus rentables à surveiller : **Water, Oxygen, Bacteria, Biofuels**

---

### Intermédiaire — CCU II–III / IPC II–III (3–4 planètes)

**Revenus estimés** : 300–600M ISK/mois
**Stratégie** : production P2 autonome sur chaque planète, ou planètes d'extraction qui
alimentent une planète de raffinage.

Exemples de P2 rentables :
- **Coolant** (Water + Electrolytes) → sur Storm ou Barren
- **Consumer Electronics** (Toxic Metals + Chiral Structures) → sur Plasma
- **Construction Blocks** (Reactive Metals + Toxic Metals) → sur Barren ou Gas

Organisation :
```
Planète 1 (Barren)  : P2 Coolant autonome (Aqueous Liquids + Ionic Solutions)
Planète 2 (Barren)  : P2 Construction Blocks autonome
Planète 3 (Storm)   : extraction Reactive Gas → P1 Oxidizing Compound → export
```

---

### Avancé — CCU III–IV / IPC III–IV (4–5 planètes)

**Revenus estimés** : 800M–2B ISK/mois
**Stratégie** : chaînes P3. Sépare extraction et usinage.

Exemple — **Robotics** (2 types de planètes requis) :
```
P2 requis : Consumer Electronics + Mechanical Parts

Planète 1 (Plasma) :   Toxic Metals → P1 + Chiral Structures → P1 → Consumer Electronics (P2)
Planète 2 (Barren) :   Reactive Metals → P1 + Noble Metals → P1 → Mechanical Parts (P2)
Planète 3 (Barren) :   Usine P3 — importe P2, produit Robotics
```

Avec IPC 4 (5 planètes), tu peux faire 2 chaînes P3 différentes, ou doubler une.

---

### Expert — CCU V / IPC V (6 planètes)

**Revenus estimés** : 3–6B ISK/mois (nullsec), 1–2B (highsec)
**Stratégie** : chaîne P4 complète. Wetware Mainframe ou Organic Mortar Applicators.

Exemple — **Wetware Mainframe** (requiert beaucoup de planètes variées) :
```
P3 requis : Supercomputers + Biotech Research Reports + Cryoprotectant Solution

Planète 1 (Ice/Oceanic) : extraction → Biomass + Bacteria + Planktic Colonies → P2
Planète 2 (Gas)         : extraction → P2 divers
Planète 3 (Storm)       : extraction → P2 divers
Planète 4 (Temperate)   : usine P3 (Supercomputers, Biotech, Cryoprotectant)
Planète 5 (Barren)      : usine P4 (Wetware Mainframe)
Planète 6               : extraction/buffer
```

---

## 10. Produits recommandés

### P2 — Raffinage simple (CCU II+, 1 planète)

| Produit | Inputs P1 | Types de planètes | Notes |
|---------|-----------|-------------------|-------|
| **Coolant** | Water + Electrolytes | Storm, Barren (les deux sur place) | Très demandé T2 |
| **Consumer Electronics** | Toxic Metals + Chiral Structures | Plasma (les deux sur place) | Top P2 ISK |
| **Construction Blocks** | Reactive Metals + Toxic Metals | Barren, Gas | Utilisé partout |
| **Mechanical Parts** | Reactive Metals + Precious Metals | Barren | Industrie navale |
| **Superconductors** | Plasmoids + Water | Gas + Barren | Entrée chaîne P3 |

---

### P3 — Spécialisés (CCU III+, 2–3 planètes)

| Produit | Inputs P2 | Planètes requises | Notes |
|---------|-----------|-------------------|-------|
| **Robotics** | Consumer Electronics + Mechanical Parts | 2 types | Meilleur ratio valeur/complexité |
| **Condensates** | Oxides + Coolant | 2 types | Bonne marge, demande constante |
| **Data Chips** | Microfiber Shielding + Superconductors | 3 types | Valeur stable |
| **Supercomputers** | Water-Cooled CPU + Coolant | 2 types | Entrée Wetware Mainframe |
| **Planetary Vehicles** | Mechanical Parts + Construction Blocks | 2 types | Demande citadelles |
| **Nanite Compound** | Nanites + Supertensile Plastics | 3 types | Composants T2 |

---

### P4 — Avancés (CCU IV–V+, 5–6 planètes)

| Produit | Inputs P3 | Notes |
|---------|-----------|-------|
| **Wetware Mainframe** | Supercomputers + Biotech Research Reports + Cryoprotectant Solution | Top ISK/h absolu |
| **Organic Mortar Applicators** | Condensates + Robotics + Smartfab Units | Bon compromis |
| **Self-Harmonizing Power Core** | Camera Drones + Nuclear Reactors + Hermetic Membranes | Demande constante |
| **Recursive Computing Module** | Synthetic Synapses + Transcranial Microcontrollers + Guidance Systems | Composant Broadcast Node |
| **Broadcast Node** | Integrity Response Drones + Nano-Factory + Recursive Computing Module | Citadelles |

---

## 11. Recettes complètes P2, P3, P4

### Toutes les recettes P2

| P2 | Input 1 (P1) | Input 2 (P1) |
|----|--------------|--------------|
| Biocells | Biofuels | Precious Metals |
| Construction Blocks | Reactive Metals | Toxic Metals |
| Consumer Electronics | Toxic Metals | Chiral Structures |
| Coolant | Water | Electrolytes |
| Enriched Uranium | Precious Metals | Toxic Metals |
| Fertilizer | Bacteria | Proteins |
| Genetically Enhanced Livestock | Proteins | Biomass |
| Livestock | Biofuels | Proteins |
| Mechanical Parts | Reactive Metals | Precious Metals |
| Microfiber Shielding | Silicon | Biomass |
| Nanites | Bacteria | Reactive Metals |
| Oxides | Oxygen | Oxidizing Compound |
| Polyaramids | Oxidizing Compound | Biomass |
| Polytextiles | Biofuels | Silicon |
| Rocket Fuel | Plasmoids | Electrolytes |
| Silicate Glass | Silicon | Oxidizing Compound |
| Superconductors | Plasmoids | Water |
| Supertensile Plastics | Oxygen | Biomass |
| Synthetic Oil | Electrolytes | Oxygen |
| Test Cultures | Bacteria | Biomass |
| Transmitter | Chiral Structures | Plasmoids |
| Viral Agent | Bacteria | Biomass |
| Water-Cooled CPU | Water | Reactive Metals |

### Toutes les recettes P3

| P3 | Input 1 (P2) | Input 2 (P2) |
|----|--------------|--------------|
| Biotech Research Reports | Nanites | Livestock |
| Camera Drones | Silicate Glass | Rocket Fuel |
| Condensates | Oxides | Coolant |
| Cryoprotectant Solution | Test Cultures | Synthetic Oil |
| Data Chips | Microfiber Shielding | Superconductors |
| Gel-Matrix Biopaste | Oxides | Biocells |
| Guidance Systems | Water-Cooled CPU | Transmitter |
| Hazmat Detection Systems | Polytextiles | Viral Agent |
| Hermetic Membranes | Genetically Enhanced Livestock | Polyaramids |
| High-Tech Transmitters | Transmitter | Supertensile Plastics |
| Industrial Explosives | Fertilizer | Polytextiles |
| Integrity Response Drones | Genetically Enhanced Livestock | Mechanical Parts |
| Miniature Electronics | Silicate Glass | Consumer Electronics |
| Nanite Compound | Nanites | Supertensile Plastics |
| Neocoms | Biocells | Silicate Glass |
| Nuclear Reactors | Enriched Uranium | Microfiber Shielding |
| Planetary Vehicles | Mechanical Parts | Construction Blocks |
| **Robotics** | Consumer Electronics | Mechanical Parts |
| Smartfab Units | Construction Blocks | Nanites |
| **Supercomputers** | Water-Cooled CPU | Coolant |
| Synthetic Synapses | Supertensile Plastics | Test Cultures |
| Transcranial Microcontrollers | Biocells | Nanites |
| Ukomi Superconductors | Superconductors | Synthetic Oil |
| Vaccines | Livestock | Viral Agent |

### Toutes les recettes P4

| P4 | Input 1 (P3) | Input 2 (P3) | Input 3 (P3) |
|----|--------------|--------------|--------------|
| Broadcast Node | Integrity Response Drones | Nano-Factory | Recursive Computing Module |
| Nano-Factory | Industrial Explosives | Ukomi Superconductors | — |
| **Organic Mortar Applicators** | Condensates | Robotics | Smartfab Units |
| Recursive Computing Module | Synthetic Synapses | Transcranial Microcontrollers | Guidance Systems |
| **Self-Harmonizing Power Core** | Camera Drones | Nuclear Reactors | Hermetic Membranes |
| Sterile Conduits | Smartfab Units | Vaccines | Viral Agent |
| **Wetware Mainframe** | Supercomputers | Biotech Research Reports | Cryoprotectant Solution |

---

## 12. Optimisation avancée

### Durée de cycle de l'extracteur

L'ECU extrait en cycles. Tu choisis la durée du cycle (de 15 minutes à 23h).

- **Cycle court (15–30 min)** : haute fréquence, bonnes quantités, mais tu dois revenir souvent
  relancer. Utile pour maximiser une session de jeu.
- **Cycle long (1h–3h)** : bon compromis. Rendement légèrement inférieur par unité de temps,
  mais tu relances toutes les quelques heures.
- **Cycle très long (12–23h)** : rendement par unité de temps plus faible, mais parfait si tu
  joues une fois par jour. On préfère souvent 23h pour dormir tranquille.

> **Règle pratique** : programme tes extracteurs pour finir quand tu seras disponible. Un
> extracteur arrêté perd du temps. La ponctualité > l'optimisation théorique.

### La décroissance d'extraction

Les ressources s'épuisent localement au fil du temps. Toutes les 3–4 semaines, repositionne tes
têtes d'extracteur sur des zones encore riches (rescan de la planète). C'est le principal entretien
actif de la PI.

### Stratégie multi-personnages

Chaque compte EVE peut gérer plusieurs personnages. Beaucoup de joueurs PI créent 2 personnages
supplémentaires sur leur compte principal et les spécialisent en PI :

```
Main      : joue normalement
Alt PI 1  : 6 planètes CCU V / IPC V
Alt PI 2  : 6 planètes CCU V / IPC V
→ 18 planètes total sur un seul compte = revenus × 3
```

Avec un Omega actif sur le compte, les 3 personnages peuvent tous avoir des compétences actives.

### Séparation extraction / usinage

Pour maximiser l'efficacité, sépare les rôles :
- **Planètes d'extraction** : extraient P0, produisent P1 ou P2, exportent vers l'usine
- **Planètes d'usine (factory planets)** : importent P2, produisent P3 ou P4, aucun extracteur

Les planètes d'usine sont souvent des Barren ou Temperate car elles peuvent accueillir des HTPP (P4).

### Gestion des launchpads et imports/exports

- **Launchpad → vaisseau** : tu lances un "Launch for Pickup" ou "Transfer to Customs Office"
- **Orbital Customs Office** : point d'accès orbital au-dessus de chaque planète. Des taxes s'y
  appliquent (configurable par le propriétaire en nullsec, fixe en highsec à 10%).
- **Lowsec/Nullsec** : les Customs Offices appartiennent aux joueurs ou alliances. Les taxes sont
  souvent plus basses qu'en highsec.
- **Import** : tu peux aussi importer des matériaux depuis ton vaisseau vers le launchpad pour
  alimenter une planète d'usine.

### Taxes et rentabilité

| Zone | Taxe NPC Customs Office | Taxe POCO |
|------|------------------------|-----------|
| Highsec | 10% fixe (+ industrie) | N/A |
| Lowsec | N/A | 0–20% (propriétaire) |
| Nullsec / W-Space | N/A | 0–20% (propriétaire) |

En **nullsec allié**, les taxes POCO sont souvent 0–2%. C'est une raison majeure pour laquelle la
PI en nullsec est 3–5× plus rentable qu'en highsec.

---

## 13. Utiliser NETK PI Tool

NETK PI Tool est un ensemble d'outils web conçus pour optimiser ta PI sans quitter le navigateur.

### Calculateur (page principale `/`)

- **Sélectionne un produit final** (P1 à P4) et une quantité cible
- Calcule automatiquement la **chaîne de production complète** : quels P0, combien de structures
  BIF/AIF/HTPP, quels types de planètes sont requis
- Indique combien de personnages / planètes il te faut
- Génère un **template colonie** que tu peux importer directement in-game

### Finder (`/finder`)

- **Cherche des systèmes** optimaux pour ta production : entre les types de planètes dont tu as
  besoin, et l'outil liste les systèmes qui les ont tous à proximité
- Affiche combien de chaque type de planète est disponible dans chaque système (ex : Barren ×4)
- Prend en compte la distance par rapport à un **système de référence** (ta station de base)
- Résultats triés par score de couverture

### Skills (`/skills`)

- Calcule tes **contraintes réelles** (CPU/Power Grid disponibles) en fonction de tes niveaux CCU
- Affiche ce que tu peux ou ne peux pas faire à ton niveau actuel
- Génère un **plan de compétences** trié par coût SP croissant
- Recommande le meilleur type de production pour ton profil (P1/P2/P3/P4)
- Les recommandations se mettent à jour dynamiquement quand tu changes tes niveaux

### Timers (`/timers`)

- **Mode Manuel** : ajoute manuellement des timers pour chaque planète avec une durée et une note
- **Mode Auto** (si ESI connecté) : lit directement l'expiry time des extracteurs via l'API EVE
  → zéro saisie, timers exacts en temps réel
- Countdown en direct, alerte visuelle quand un extracteur arrive à expiration

### Craft (`/craft`)

- **Visualisateur de chaînes de production** : graphe interactif montrant toutes les dépendances
  entre planètes, ressources P0 et produits P1→P4
- Clique sur un produit → l'arbre d'ingrédients complet est surligné
- Clique sur un type de planète → toute la chaîne de production possible est mise en évidence
- Idéal pour planifier une nouvelle chaîne ou comprendre ce que produit un type de planète

---

## Glossaire

| Terme | Définition |
|-------|-----------|
| **CCU** | Command Center Upgrades — compétence qui contrôle CPU/Power Grid |
| **IPC** | Interplanetary Consolidation — compétence qui contrôle le nombre de planètes |
| **ECU** | Extractor Control Unit — l'extracteur principal |
| **BIF** | Basic Industry Facility — transforme P0 → P1 |
| **AIF** | Advanced Industry Facility — transforme P1→P2 ou P2→P3 |
| **HTPP** | High-Tech Production Plant — transforme P3→P4 (Barren/Temperate only) |
| **POCO** | Player-Owned Customs Office — douane orbitale appartenant aux joueurs |
| **P0–P4** | Tiers de produits (P0 = brut, P4 = avancé) |
| **tf** | Teraflops — unité de CPU consommé par les structures |
| **MW** | Mégawatts — unité de Power Grid consommé par les structures |
| **Factory planet** | Planète dédiée à la transformation, sans extracteurs |
| **Extraction planet** | Planète dédiée à l'extraction et la première transformation |

---

*Sources : EVE University Wiki, EVE Online en jeu, données extraites de l'ESI officiel.*
*Outil : [NETK PI Tool](https://pi.netk.app)*
