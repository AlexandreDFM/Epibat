# 🏢 EpiBat — Live Building Tracking

> Suivi en temps réel de l'occupation des salles du bâtiment Epitech Nice via **Mist AI** + **Three.js**.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Fastify](https://img.shields.io/badge/Fastify-5-white)
![Three.js](https://img.shields.io/badge/Three.js-r171-green)

## 📸 Captures d'écran

Données de démonstration (appareils et occupation fictifs).

| Dashboard 3D, rez-de-chaussée | Salle sélectionnée, 1er étage |
|---|---|
| ![Dashboard 3D avec l'occupation des salles du rez-de-chaussée](docs/screenshots/dashboard.png) | ![Salle 101 complète sélectionnée au 1er étage](docs/screenshots/dashboard-room.png) |

<p align="center"><img src="docs/screenshots/admin-rooms.png" alt="Administration des salles d'un étage" width="70%"><br><sub>Administration des salles</sub></p>

---

## 📐 Architecture

```mermaid
graph TB
    subgraph Frontend["🖥️ Frontend — Next.js 15"]
        R3F[React Three Fiber<br/>3D Scene]
        Dashboard[Dashboard<br/>Sidebar]
        SocketClient[Socket.io<br/>Client]
        Admin[Admin<br/>Panel]
    end

    subgraph Backend["⚙️ Backend — Fastify 5"]
        MistSvc[Mist Service<br/>WS Client]
        Presence[Presence<br/>Engine]
        SocketServer[Socket.io<br/>Server]
        Swagger[Swagger<br/>OpenAPI 3.0]
        Kalman[Kalman Filter<br/>+ Coord Map]
        Scanner[Network Scanner<br/>ARP + Ping + Trace]
    end

    subgraph Data["💾 Data Layer"]
        PG[(PostgreSQL 16<br/>Prisma ORM)]
        Redis[(Redis 7<br/>Cache)]
    end

    subgraph External["☁️ External"]
        Mist[Mist AI Cloud<br/>vBLE + WiFi]
    end

    SocketClient <-->|WebSocket| SocketServer
    MistSvc -->|WSS optional| Mist
    MistSvc --> Kalman
    Kalman --> Presence
    Scanner --> Presence
    Presence --> Redis
    Presence --> PG
    SocketServer --> Presence
    Swagger -.->|/docs| Backend
    Scanner -->|ARP / Ping / Traceroute| LAN[🌐 Local Network]
```

---

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS v4 |
| **3D Engine** | Three.js via React Three Fiber + Drei |
| **Backend** | Fastify 5, Socket.io 4 |
| **Base de données** | PostgreSQL 16 + Prisma ORM |
| **Cache temps réel** | Redis 7 |
| **Positioning** | Mist AI (Juniper) vBLE + WiFi |
| **Network Scanning** | ARP table + Ping sweep + Traceroute |
| **Filtrage signal** | Filtre de Kalman 2D |
| **Auth** | JWT (Fastify JWT) |
| **API Docs** | Swagger UI (OpenAPI 3.0) |
| **Conteneurisation** | Docker Compose |

---

## 📁 Structure du projet

```
EpiBat/
├── apps/
│   ├── server/               # Backend Fastify
│   │   ├── prisma/           # Schéma DB + migrations + seed
│   │   ├── Dockerfile        # Image de production
│   │   └── src/
│   │       ├── config/       # Env, Database, Redis
│   │       ├── plugins/      # Socket.io, Swagger (OpenAPI)
│   │       ├── routes/       # API REST
│   │       │   ├── auth.ts         # Register, opt-out, me
│   │       │   ├── devices.ts      # Listing, search, link, counts
│   │       │   ├── floors.ts       # Floors + buildings
│   │       │   ├── floor-plans.ts  # PDF/image upload & info
│   │       │   ├── rooms.ts        # CRUD + occupancy
│   │       │   ├── routers.ts      # AP assignment management
│   │       │   └── scanner.ts      # Network scanner control
│   │       ├── services/     # Mist, Presence, NetworkScanner
│   │       └── utils/        # Hash, Coordinates, Kalman filter
│   └── web/                  # Frontend Next.js
│       ├── Dockerfile        # Image de production
│       └── src/
│           ├── app/
│           │   ├── admin/    # Admin panel (rooms, routers, shapes)
│           │   └── dashboard/# Visualisation 3D / occupancy
│           ├── components/
│           │   ├── admin/    # RoomEditor3D, ShapePalette
│           │   ├── three/    # Scene, FloorPlan, RoomMesh, DeviceMarker
│           │   ├── ui/       # Sidebar, SearchBar, FloorSelector
│           │   └── providers/# SocketProvider
│           ├── hooks/        # useSocket, useDevicePositions, useRoomOccupancy
│           ├── lib/          # API client, Socket.io, room-shapes
│           └── types/        # TypeScript interfaces
├── packages/
│   └── shared/               # Types partagés & constantes
├── docs/
│   └── API.md                # Documentation API complète
├── docker-compose.yml        # Postgres + Redis (+ fullstack profile)
└── package.json              # Workspace root (pnpm + Turborepo)
```

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** >= 20
- **pnpm** >= 9 (`corepack enable`)
- **Docker** & **Docker Compose** (pour PostgreSQL + Redis)
- _(Optionnel)_ Un compte **Mist AI** avec token API pour le positioning vBLE

### 1. Cloner & installer

```bash
git clone https://github.com/epitech-nice/EpiBat.git
cd EpiBat
pnpm install
```

### 2. Variables d'environnement

```bash
cp .env.example apps/server/.env
```

Éditez `apps/server/.env` avec vos secrets :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/epibat"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="un-vrai-secret-de-32-caracteres-minimum"
MAC_HASH_SALT="un-sel-unique-pour-le-hachage"

# Optionnel — Mist AI (vBLE positioning)
MIST_API_TOKEN="votre-token-mist"
MIST_SITE_ID="votre-site-id"
MIST_ORG_ID="votre-org-id"

# Scanner réseau (activé par défaut)
SCAN_ENABLED=true
SCAN_INTERVAL=30
```

### 3. Démarrer les services (DB + Redis)

```bash
docker compose up -d
```

> Cela démarre uniquement PostgreSQL et Redis.
> Le serveur et le frontend tournent nativement pour que le scanner réseau ait accès au LAN.

### 4. Initialiser la base de données

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### 5. Lancer en développement

```bash
pnpm dev
```

Ou séparément :

```bash
pnpm dev:server   # Backend  → http://localhost:4000
pnpm dev:web      # Frontend → http://localhost:3000
```

| URL | Description |
|-----|-------------|
| [http://localhost:3000](http://localhost:3000) | Frontend (Dashboard 3D) |
| [http://localhost:3000/admin](http://localhost:3000/admin) | Admin panel (rooms, routers, shapes) |
| [http://localhost:4000](http://localhost:4000) | Backend API |
| [http://localhost:4000/health](http://localhost:4000/health) | Health check |
| [http://localhost:4000/docs](http://localhost:4000/docs) | **Swagger UI** (documentation interactive) |

---

## 🐳 Déploiement

### macOS / Windows (développement)

Le scanner réseau utilise `arp`, `ping` et `traceroute` qui nécessitent un accès direct au réseau local.
Sur macOS/Windows, Docker tourne dans une VM Linux → `network_mode: host` ne donne **pas** accès au vrai LAN.

```bash
docker compose up -d            # Postgres + Redis uniquement
pnpm dev:server                 # Serveur natif = accès réseau complet
pnpm dev:web                    # Frontend
```

### Linux (production)

`network_mode: host` fonctionne nativement sur Linux :

```bash
docker compose --profile fullstack up -d --build
```

### Sans scanning (CI / démo)

```bash
SCAN_ENABLED=false docker compose --profile fullstack up -d --build
```

---

## 📡 API Endpoints

> Documentation interactive complète : **[http://localhost:4000/docs](http://localhost:4000/docs)** (Swagger UI)
>
> Documentation détaillée : [`docs/API.md`](docs/API.md)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Health check |
| **Auth** | | |
| `POST` | `/api/v1/auth/register` | Inscription (opt-in RGPD) |
| `POST` | `/api/v1/auth/optout` | Désinscription |
| `GET` | `/api/v1/auth/me` | Profil utilisateur (JWT) |
| **Floors** | | |
| `GET` | `/api/v1/buildings` | Liste des bâtiments |
| `GET` | `/api/v1/floors` | Liste des étages |
| `GET` | `/api/v1/floors/:id` | Détail d'un étage |
| **Floor Plans** | | |
| `POST` | `/api/v1/floors/:id/plan` | Uploader un plan (PDF/image) |
| `DELETE` | `/api/v1/floors/:id/plan` | Supprimer un plan |
| `GET` | `/api/v1/floors/:id/plan` | Info plan d'un étage |
| `GET` | `/api/v1/floors/plans` | Tous les plans |
| **Rooms** | | |
| `GET` | `/api/v1/rooms?floorId=` | Salles (filtrable par étage) |
| `GET` | `/api/v1/rooms/:id` | Détail d'une salle |
| `GET` | `/api/v1/rooms/:floorId/occupancy` | Taux d'occupation |
| `POST` | `/api/v1/rooms` | Créer une salle |
| `PUT` | `/api/v1/rooms/:id` | Modifier une salle |
| `DELETE` | `/api/v1/rooms/:id` | Supprimer une salle |
| **Devices** | | |
| `GET` | `/api/v1/devices?floorId=` | Appareils actifs |
| `GET` | `/api/v1/devices/search?q=` | Rechercher un étudiant |
| `POST` | `/api/v1/devices/link` | Lier appareil ↔ utilisateur |
| `GET` | `/api/v1/devices/counts` | Nombre d'appareils par étage |
| **Routers** | | |
| `GET` | `/api/v1/routers` | Liste des routeurs / APs |
| `PUT` | `/api/v1/routers/:macHash` | Assigner un routeur à une salle |
| `DELETE` | `/api/v1/routers/:macHash` | Supprimer une assignation |
| `POST` | `/api/v1/routers/sync` | Synchroniser les APs détectés |
| **Scanner** | | |
| `GET` | `/api/v1/scanner/status` | État du scanner |
| `POST` | `/api/v1/scanner/scan` | Lancer un scan manuel |
| `GET` | `/api/v1/scanner/devices` | Appareils découverts |
| `GET` | `/api/v1/scanner/access-points` | Points d'accès détectés |
| `GET` | `/api/v1/scanner/wifi` | Info connexion WiFi |

---

## 🔌 Socket.io Events

### Server → Client

| Événement | Payload | Description |
|-----------|---------|-------------|
| `devices:update` | `Device[]` | Mise à jour de masse des positions |
| `device:moved` | `Device` | Un appareil a bougé |
| `device:entered` | `{ device, roomId }` | Appareil entre dans une salle |
| `device:left` | `{ deviceId, roomId }` | Appareil quitte une salle |
| `room:occupancy` | `RoomOccupancy[]` | Taux de remplissage périodique |

### Client → Server

| Événement | Payload | Description |
|-----------|---------|-------------|
| `floor:subscribe` | `floorId` | S'abonner aux updates d'un étage |
| `floor:unsubscribe` | `floorId` | Se désabonner |
| `user:optin` | `{ token }` | Envoyer le JWT pour identifier l'user |

---

## 🔒 Sécurité & RGPD

- **Anonymisation** : Toutes les adresses MAC sont hachées (SHA-256 + sel) avant stockage.
- **Opt-in** : Les noms d'utilisateurs ne sont affichés que si la personne s'est volontairement inscrite.
- **API Mist sécurisée** : Le token API ne transite jamais côté client. Toutes les requêtes passent par le backend.
- **JWT** : Authentification via tokens signés avec expiration de 7 jours.

---

## 🧮 Filtre de Kalman

Pour compenser les fluctuations du signal vBLE/WiFi, un **filtre de Kalman 2D** (un filtre 1D par axe) est appliqué sur chaque position reçue de Mist :

- **Process noise** : 0.1 (modèle de mouvement)
- **Measurement noise** : 1.0 (incertitude du signal)
- **Résultat** : Les marqueurs sur la carte bougent de façon fluide au lieu de "sauter".

```mermaid
flowchart LR
    A["📡 Signal Mist<br/>(x, y brut)"] --> B["Kalman Filter<br/>process noise: 0.1<br/>measure noise: 1.0"]
    B --> C["Calibration<br/>x_scene = x × scale.x + offset.x<br/>z_scene = y × scale.z + offset.z"]
    C --> D["🎮 Three.js<br/>(position lissée)"]
```

---

## 🗺️ Calibration Mist ↔ Three.js

Les coordonnées Mist (en mètres relatifs à la carte) sont converties vers les coordonnées Three.js via une transformation affine.
La configuration de calibration est stockée par étage dans la table `calibration_configs`.

$$x_{scene} = x_{mist} \times scale_x + offset_x$$
$$z_{scene} = y_{mist} \times scale_z + offset_z$$

---

## 🔮 Roadmap

- [x] Upload de PDF comme texture de plan d'étage
- [x] Scanner réseau (ARP + Ping + Traceroute) comme fallback sans Mist
- [x] Panel admin (gestion des salles, routeurs, formes)
- [x] Composition de salles par formes géométriques (8 templates)
- [x] Documentation Swagger / OpenAPI interactive
- [x] Assignation des routeurs aux salles
- [ ] Historique d'occupation (graphiques, heatmaps)
- [ ] Notifications push (salle disponible / pleine)
- [ ] Mode "Instanced Meshes" pour les grands bâtiments
- [ ] Portail captif pour association MAC ↔ utilisateur
- [ ] App mobile (React Native / PWA)

---

## 📄 Licence

Écrit par Alexandre DE FREITAS MARTINS pour Epitech. Distribué sous licence [MIT](LICENSE) (© 2026 Epitech).
