# Shared Expenses 👥

A sleek, lightweight, local-first web application for tracking shared group expenses, managing payments, and calculating balances.

**Live Demo**: [https://wbruntra.github.io/shared-expenses/](https://wbruntra.github.io/shared-expenses/)

---

## Features

- **Local-First Syncing**: Instant loads from local cache with automatic/debounced sync to the cloud (using `json-drop`).
- **Offline Mode**: Work offline; changes are saved locally and synced automatically when you reconnect.
- **Easy Member Management**: Manage group members via a modal directly from the header pill.
- **Adjustable Split Map**: Support for equal splits or customized absolute amounts per member.
- **Pure Balance Calculations**: Automatic settlement recommendations matching the largest debtors to the largest creditors.
- **JSON Import/Export**: Backup or restore all transaction and group data with one click.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (preferred) or `npm`

### Installation

Clone the repository and install the dependencies:

```bash
bun install
```

### Local Development

Run the development server locally:

```bash
bun run dev
```

The application will be available at `http://localhost:5173`.

### Production Build

Build the project for production:

```bash
bun run build
```

The compiled assets will be placed in the `dist/` directory.

### Deploying to GitHub Pages

To publish the latest build to GitHub Pages, run:

```bash
bun run deploy
```

---

## Tech Stack

- **Frontend**: [Preact](https://preactjs.com/) (Fast, lightweight alternative to React)
- **Bundler & Dev Server**: [Vite](https://vite.dev/)
- **Routing**: [wouter](https://github.com/molecula/wouter) (Hash routing)
- **Icons**: [React Icons / Feather Icons](https://react-icons.github.io/react-icons/)
- **State Store**: [json-drop](https://github.com/wbruntra/json-drop)
