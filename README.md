# Saffron & Sage — Staff App (HMS-App)

A React Native / Expo restaurant management app for waiters and kitchen staff.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81 |
| Navigation | Expo Router (file-based) |
| State Management | Zustand |
| API Client | Axios |
| Real-time | Socket.io |
| Push Notifications | Expo Notifications |
| Language | TypeScript |

---

## Running the App

```bash
cd HMS-app
npx expo start          # Starts on web + QR code for phone
npx expo start --web    # Web only (http://localhost:8081)
```

> **Phone requirement:** The backend API must be running and reachable on your LAN. See [Backend Setup](#backend-setup) below.

---

## ✅ What's Implemented & Working

### Authentication
- [x] Phone + PIN login screen (`/phone-login`)
- [x] JWT token saved to `AsyncStorage`
- [x] Auto-redirect on app load — if logged in, goes to correct tab
- [x] Role-based redirect: `waiter` → Tables, `cook` → Kitchen
- [x] Logout clears token and redirects to login

### Waiter Flow
- [x] **Floor Plan / Tables view** — shows all tables with status (Free / Occupied / Billing / Ready)
- [x] Tap an available table → Create Order screen
- [x] Tap an occupied table → Order Details screen
- [x] Tap a billing table → Generate Bill screen
- [x] **Create Order** — browse menu by category, search items, add to cart
- [x] Item customization modal (spice level, diet preference, notes, quantity)
- [x] **Order Summary** — review cart, edit quantities, submit to kitchen
- [x] **Order Details** (`/order/[orderId]`) — view items, edit order, add notes
- [x] Move order to billing (calls API + updates store + navigates to bill)
- [x] **Orders tab** — lists all Active and Closed orders
- [x] **Generate Bill** — shows itemised bill with 5% GST, discount input, total
- [x] Mark order as paid, update table status to Available
- [x] Settings screen — shows profile initials, restaurant info, stats, logout

### Kitchen Flow
- [x] **Kitchen Display** — shows all `in-kitchen` and `ready` orders in a queue
- [x] Filter by Dine-In / Parcel
- [x] Tap order card → full **Order Prep screen** with per-item tick-off
- [x] **Mark All Ready** → navigates to Ready Confirmation screen
- [x] **Ready Confirmation** — 5-second countdown then auto-returns to kitchen
- [x] Undo Ready — reverts order status to `in-kitchen`

### Data / State
- [x] Zustand store with mock data fallback (app works offline with demo data)
- [x] `loadInitialData` syncs from backend when available; falls back to mock data if API returns empty or fails
- [x] Real-time Socket.io connection (for role: waiter / cook) — gracefully skips if backend offline
- [x] Table status auto-updates when order status changes

---

## ⚠️ Partially Working / Known Issues

| Area | Status | Notes |
|---|---|---|
| **Login (backend offline)** | ⚠️ Fails | Needs backend running. App shows mock data without login when navigated directly |
| **Order creation API** | ⚠️ Partial | Submits to backend if online; falls back to local mock if error |
| **Order status API sync** | ⚠️ Partial | Local state updates immediately; API call may fail silently if backend is down |
| **Bill API** | ⚠️ Partial | Updates table status and order status via API; falls back gracefully |
| **Push Notifications** | ⚠️ Dev only | Requires a development build (not Expo Go). No native build configured yet |
| **Socket.io real-time** | ⚠️ Dev only | Only connects if backend socket server is running. Retries 3× then stops |
| **`/profile-select` & `/pin`** | ⚠️ Stub | These were old offline-login screens; they now redirect to `/phone-login`. Not part of active flow |

---

## ❌ Not Yet Implemented

| Feature | Details |
|---|---|
| **Manager role** | No manager screens exist. `cashier` role also has no dedicated UI |
| **Menu management** | No screen to add/edit/delete menu items from the app |
| **Table management** | No screen to add/edit/delete tables |
| **Staff management** | No screen for a manager to create/manage staff accounts |
| **Order history / reporting** | Closed orders show in the Orders tab but no detailed reports/exports |
| **Parcel/Takeaway orders** | Partially handled in kitchen display (type badge), but no dedicated creation flow |
| **Discount types** | Only a flat % discount on the bill. No fixed-amount, per-item, or promo-code discounts |
| **Payment methods** | Bill marked as "paid" but no UPI / card / cash split tracking |
| **Print receipt** | Print button exists in UI but has no implementation |
| **Share bill** | Share button exists in UI but has no implementation |
| **Dark mode** | Not implemented |
| **Multi-language / i18n** | Not implemented |
| **Offline-first sync** | Currently runs on mocks when offline; no queue/retry for actions taken offline |

---

## Backend Setup

The app expects a REST API + Socket.io server at port `5000`.

### Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:5000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://<your-lan-ip>:5000
```

> For local web dev the app auto-uses `localhost:5000`. For **physical phones**, you must set these to your machine's LAN IP (e.g. `192.168.1.10`).

### Required API Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/staff/login` | Login with phone + PIN |
| `POST` | `/auth/staff/logout` | Logout |
| `POST` | `/auth/staff/register-push-token` | Register device for push |
| `GET` | `/menu/items` | Fetch all menu items |
| `GET` | `/tables` | Fetch all tables |
| `PATCH` | `/tables/:id/status` | Update table status |
| `GET` | `/orders` | Fetch all orders |
| `POST` | `/orders` | Create new order |
| `PUT/PATCH` | `/orders/:id` | Update order status |

### Running on Physical Phone (without backend)

If you just want to run the app on your phone **with mock data** (no backend):

1. The app will show mock tables, menu items, and orders automatically
2. **Login will fail** — workaround: set `.env` to point to a running backend, or modify `AuthProvider.tsx` to auto-set a mock user for demo purposes

---

## Project Structure

```
HMS-app/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Main tab screens
│   │   ├── tables.tsx      # Floor plan / table grid
│   │   ├── orders.tsx      # All orders list
│   │   ├── kitchen.tsx     # Kitchen display queue
│   │   └── settings.tsx    # Settings & logout
│   ├── kitchen/
│   │   ├── order/[orderId].tsx   # Per-item prep screen
│   │   └── ready/[orderId].tsx   # Order ready confirmation
│   ├── order/[orderId].tsx       # Order details (waiter view)
│   ├── order-summary/[orderId].tsx
│   ├── create-order.tsx          # Menu browser + cart
│   ├── generate-bill.tsx         # Bill generation
│   └── phone-login.tsx           # Login screen
├── store/
│   └── useRestaurantStore.ts     # Zustand store (tables, orders, menu, cart)
├── providers/
│   └── AuthProvider.tsx          # Auth context + navigation guard
├── src/
│   ├── services/                 # API service classes
│   │   ├── api.ts                # Axios instance + interceptors
│   │   ├── auth.service.ts
│   │   ├── menu.service.ts
│   │   ├── table.service.ts
│   │   ├── order.service.ts
│   │   ├── socket.service.ts
│   │   └── notification.service.ts
│   └── config/
│       └── api.config.ts         # Endpoint URLs (env-aware)
├── mocks/
│   └── restaurant-data.ts        # Demo tables, menu, orders
├── types/
│   └── restaurant.ts             # TypeScript types
├── utils/
│   └── helpers.ts                # formatCurrency, formatTimeAgo, etc.
└── constants/
    └── colors.ts                 # Color palette
```

---

## Bug Fixes Applied (This Session)

| Bug | Fix |
|---|---|
| Kitchen "Mark Ready" navigated to non-existent route | Fixed to `/kitchen/ready/[orderId]` |
| Undo Ready set invalid status `'preparing'` | Fixed to `'in-kitchen'` |
| "Complete Order" sent `status: 'ready'` to API instead of `'billing'` | Fixed to `'billing'` |
| `orderStatus` was stale `useState` snapshot | Kept as `useState` with cancel-edit sync |
| `loadInitialData` wiped tables with empty API response | Fixed: only apply API data if non-empty |
| `tables.tsx` called `loadInitialData` on every mount (race condition) | Removed redundant call |
| Socket.io WebSocket-only transport crashed with no backend | Changed to `polling + websocket` fallback |
| `src/components/menu/` had wrong import paths | Fixed relative paths |
| `AuthProvider.tsx` had duplicated socket+notification init code | Cleaned up |
| `settings.tsx` used non-existent `user.initials` | Now derived from `user.name` |
| Dead `pin.tsx` and `profile-select.tsx` called missing AuthContext methods | Replaced with redirect stubs |
| TypeScript compilation had 17+ errors | Now **0 errors** |
