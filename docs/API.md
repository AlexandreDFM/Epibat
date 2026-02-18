# EpiBat API Documentation

> **Base URL**: `http://localhost:4000`  
> **Interactive docs**: [http://localhost:4000/docs](http://localhost:4000/docs) (Swagger UI)  
> **OpenAPI JSON**: [http://localhost:4000/docs/json](http://localhost:4000/docs/json)

---

## Authentication

Most endpoints are **public**. Protected endpoints require a `Bearer` JWT token obtained from `POST /api/v1/auth/register`.

```
Authorization: Bearer <token>
```

### Auth Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as PostgreSQL

    C->>S: POST /api/v1/auth/register
    Note right of C: { email, displayName, macHash }
    S->>DB: Create / update User
    DB-->>S: User record
    S-->>C: { token, user }

    C->>S: GET /api/v1/auth/me
    Note right of C: Authorization: Bearer token
    S->>S: Verify JWT
    S->>DB: Find user by ID
    DB-->>S: User record
    S-->>C: { user }

    C->>S: POST /api/v1/auth/optout
    Note right of C: Authorization: Bearer token
    S->>DB: Set optedIn = false
    S-->>C: { success: true }
```

---

## Endpoints Overview

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health check (status, uptime) |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | — | Register a user for opt-in tracking |
| POST | `/api/v1/auth/optout` | Bearer | Opt out of tracking |
| GET | `/api/v1/auth/me` | Bearer | Get current user from JWT |

### Floors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/floors` | List all floors with rooms |
| GET | `/api/v1/floors/:id` | Get a single floor by ID |
| GET | `/api/v1/buildings` | List all buildings with their floors |

### Floor Plans

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/floors/:id/plan` | Upload a floor plan (PDF/image, multipart) |
| DELETE | `/api/v1/floors/:id/plan` | Delete a floor plan |
| GET | `/api/v1/floors/:id/plan` | Get floor plan info for a floor |
| GET | `/api/v1/floors/plans` | List all floor plans |

### Rooms

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/rooms` | List all rooms (optional `?floorId=`) |
| GET | `/api/v1/rooms/:id` | Get a room by ID |
| GET | `/api/v1/rooms/:floorId/occupancy` | Get room occupancy for a floor |
| POST | `/api/v1/rooms` | Create a room |
| PUT | `/api/v1/rooms/:id` | Update a room |
| DELETE | `/api/v1/rooms/:id` | Delete a room |

### Devices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/devices` | List active devices (optional `?floorId=`) |
| GET | `/api/v1/devices/search` | Search devices by `?q=` (hostname, MAC, vendor) |
| POST | `/api/v1/devices/link` | Link a device to a user |
| GET | `/api/v1/devices/counts` | Device count per floor |

### Routers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/routers` | List all routers / access points |
| PUT | `/api/v1/routers/:macHash` | Assign a router to a room / floor |
| DELETE | `/api/v1/routers/:macHash` | Remove a router assignment |
| POST | `/api/v1/routers/sync` | Sync detected APs to database |

### Scanner

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/scanner/status` | Scanner status |
| POST | `/api/v1/scanner/scan` | Trigger a manual network scan |
| GET | `/api/v1/scanner/devices` | List discovered devices from last scan |
| GET | `/api/v1/scanner/access-points` | List detected access points |
| GET | `/api/v1/scanner/wifi` | Current WiFi connection info |

---

## Real-time Events (Socket.io)

Connect to the Socket.io server on the same host & port for live updates.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Socket.io Server
    participant P as Presence Engine

    C->>S: connect()
    C->>S: floor:subscribe(floorId)
    S->>S: Join room floor:{floorId}

    loop Every 5s
        P->>S: Broadcast occupancy
        S-->>C: room:occupancy(RoomOccupancy[])
    end

    Note over P: Device position changes
    P->>S: Device moved
    S-->>C: devices:update(Device[])
    S-->>C: device:moved(Device)

    Note over P: Device enters room
    S-->>C: device:entered({ device, roomId })

    Note over P: Device leaves room
    S-->>C: device:left({ deviceId, roomId })

    C->>S: floor:unsubscribe(floorId)
    C->>S: disconnect()
```

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `floor:subscribe` | `floorId: string` | Subscribe to device updates for a floor |
| `floor:unsubscribe` | `floorId: string` | Unsubscribe from floor updates |
| `user:optin` | `{ token: string }` | Opt-in to personal tracking |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `devices:update` | `Device[]` | Batch device update for subscribed floor |
| `room:occupancy` | `RoomOccupancy[]` | Room occupancy changed |
| `device:moved` | `Device` | A device changed position |
| `device:entered` | `{ device, roomId }` | A device entered a room |
| `device:left` | `{ deviceId, roomId }` | A device left a room |

---

## Data Models

### Entity Relationship Diagram

```mermaid
erDiagram
    Building ||--o{ Floor : "has"
    Floor ||--o{ Room : "contains"
    Floor ||--o{ Device : "located on"
    Room ||--o{ Device : "contains"
    User ||--o{ Device : "owns"
    Room ||--o{ RouterAssignment : "assigned to"
    Floor ||--o{ RouterAssignment : "on floor"

    Building {
        string id PK
        string name
        string address
    }

    Floor {
        string id PK
        string buildingId FK
        int level
        string name
        string textureUrl
    }

    Room {
        string id PK
        string floorId FK
        string name
        json polygon
        int capacity
        string type
    }

    Device {
        string id PK
        string macHash
        string userId FK
        string floorId FK
        string roomId FK
        float x
        float y
        datetime lastSeen
        boolean isAccessPoint
        string ip
        string hostname
        string vendor
        string deviceType
    }

    User {
        string id PK
        string displayName
        string email
        string avatarUrl
        boolean optedIn
    }

    RouterAssignment {
        string id PK
        string macHash
        string mac
        string ip
        string vendor
        string hostname
        string roomId FK
        string floorId FK
        string label
        datetime createdAt
        datetime updatedAt
    }
```

### API Response Models

```mermaid
classDiagram
    class User {
        +string id
        +string displayName
        +string email
        +string? avatarUrl
        +boolean optedIn
    }

    class Floor {
        +string id
        +string buildingId
        +int level
        +string name
        +string? textureUrl
        +Room[] rooms
        +Building building
    }

    class Room {
        +string id
        +string floorId
        +string name
        +Point2D[] polygon
        +int capacity
        +string type
    }

    class RoomOccupancy {
        +string roomId
        +string roomName
        +int count
        +int capacity
        +float percentage
    }

    class Device {
        +string id
        +string macHash
        +string? userId
        +string? floorId
        +string? roomId
        +float? x
        +float? y
        +datetime lastSeen
        +boolean isAccessPoint
        +string? ip
        +string? hostname
        +string? vendor
        +string? deviceType
    }

    class RouterInfo {
        +string macHash
        +string? mac
        +string? ip
        +string? vendor
        +string? hostname
        +string? label
        +string? roomId
        +string? roomName
        +string? floorId
        +string? floorName
        +int? floorLevel
        +int clientCount
        +boolean isOnline
    }

    class Building {
        +string id
        +string name
        +string? address
        +Floor[] floors
    }

    Building --> Floor
    Floor --> Room
    Room --> RoomOccupancy
    Floor --> Device
    Device --> User
    Room --> RouterInfo
```

---

## Error Responses

All error responses follow the same shape:

```json
{
  "success": false,
  "error": "Description of the error"
}
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (POST /rooms) |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing/invalid JWT) |
| 404 | Resource not found |
| 500 | Internal server error |
