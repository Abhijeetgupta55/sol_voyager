# Sol Voyager - Urban Ground Instability Dashboard

## Overview

Sol Voyager is a Next.js web application for monitoring urban ground instability and visualizing sinkhole susceptibility. It features a real-time dashboard with alerts, monitoring zones, and an interactive map powered by Leaflet and simulated InSAR deformation data.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS, Font Awesome
- **Mapping:** Leaflet + react-leaflet
- **API:** Next.js Route Handlers

## Project Structure

```
sol_voyager/
├── src/
│   ├── app/
│   │   ├── layout.jsx              # Root layout
│   │   ├── page.jsx                # Dashboard page
│   │   ├── globals.css             # Global styles + Tailwind
│   │   ├── map/
│   │   │   └── page.jsx            # Sinkhole mapper page
│   │   └── api/
│   │       └── susceptibility/
│   │           └── route.js        # Susceptibility API route
│   └── components/
│       ├── Navbar.jsx              # Navigation + sidebar + theme toggle
│       ├── Footer.jsx              # Site footer
│       ├── StatCard.jsx            # Dashboard stat cards
│       ├── AlertItem.jsx           # Alert list items
│       ├── ZoneItem.jsx            # Monitoring zone items
│       ├── InfoPanel.jsx           # Map info panel
│       └── SinkholeMap.jsx         # Leaflet map component
├── public/                         # Static assets
├── package.json
├── next.config.mjs
├── tailwind.config.js
├── postcss.config.js
└── jsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the dashboard.

### Production Build

```bash
npm run build
npm start
```

## Pages

| Route | Description |
| ----- | ----------- |
| `/` | Dashboard with stats, alerts, and monitoring zones |
| `/map` | Interactive sinkhole susceptibility mapper |
| `/api/susceptibility?city=karapinar` | JSON API for susceptibility data |

## Supported Cities

The API currently supports: `karapinar`, `konya`, `ankara`, `istanbul`.

## License

MIT