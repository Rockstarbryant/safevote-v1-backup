# Copilot / AI Agent Instructions — SafeVote

Overview
- The repo is a multichain voting platform with three main layers: on-chain contracts, a results/backend API, and several frontends (legacy static `frontend/`, React dashboard `election-dashboard-react/`, and `voting-ui/`). Contracts and deployment are driven by Hardhat.

Quick commands
- **Install deps (root):** `npm install`
- **Compile contracts:** `npm run compile` (runs `hardhat compile`)
- **Run tests:** `npm run test` (Hardhat tests in `test/`)
- **Deploy (example):** `npm run deploy:v1` or `npm run deploy:v2` (see `scripts/`)
- **Start key service + static frontend:** `npm run dev` (runs `start:keyservice` and `start:frontend` concurrently)
- **Backend (results API):** `cd election-backend && npm install && npm start` (requires `DATABASE_URL` env var)

Key components & boundaries
- **Contracts:** [contracts/SafeVote.sol](contracts/SafeVote.sol) and [contracts/BatchVoteSubmitter.sol](contracts/BatchVoteSubmitter.sol). Hardhat config in `hardhat.config.js` controls compilation and network targets.
- **Deployment scripts:** `scripts/*.js` (e.g., [scripts/deploy.js](scripts/deploy.js), [scripts/deployV2Multichain.js](scripts/deployV2Multichain.js), [scripts/upgradeToV2.js](scripts/upgradeToV2.js)). Use `npx hardhat run` or the npm scripts above.
- **Results backend:** [election-backend/server.js](election-backend/server.js) — Express + PostgreSQL. DB schema and initialization are in `services/schema.sql` and the backend will create tables on start.
- **Frontends:**
  - `frontend/` — legacy static UI using `js/` scripts and ABI bundles (CombinedABI.js, SafeVoteV2ABI.js).
  - `election-dashboard-react/` — React + Vite dashboard for admin/metrics.
  - `voting-ui/` — modern React app; look at `src/context` for security/voting patterns.
- **Services:** `services/` contains DB helpers, `keyService.js` (key generation/management), and `schema.sql`.

Project-specific patterns & conventions
- ABIs: exported ABIs and compiled artifacts are stored under `abis/` and some legacy bundles live in `frontend/js/` (see `frontend/js/CombinedABI.js`, `abis/SafeVote.json`). Prefer `abis/` artifacts for programmatic use.
- On-chain IDs & elections: the backend uses `uuid` for elections (see `election_chains` and `on_chain_election_id` handling in [election-backend/server.js](election-backend/server.js)). When wiring UI ➜ backend ➜ chain, ensure election UUIDs are propagated.
- Upgrades: upgrade and proxy flows are implemented via OpenZeppelin upgrade helpers and scripts in `scripts/` (look at `upgrade.js`, `upgradeToV2.js`). Tests reference V2 contracts (see `test/SafeVoteV2.test.js`).
- DB expectations: `election-backend` requires `DATABASE_URL` in env; SSL is enabled for production. The backend will create tables on first run.

Integration notes & examples
- To record a vote flow: frontend calls blockchain (SafeVote), waits for confirmation, then posts to `POST /api/votes/record` on the results API. See `frontend/js/electionConductor.js` and [election-backend/server.js](election-backend/server.js) for exact field names.
- When deploying to a network, use the npm scripts (they call `hardhat run`): `npm run deploy:v2` for multichain deployments; inspect transaction hashes written to `election_chains` via the backend sync API `POST /api/elections/sync-chain`.

Files to inspect first when debugging or extending
- Contracts: [contracts/SafeVote.sol](contracts/SafeVote.sol)
- Deploy scripts: `scripts/deploy*.js` (e.g., [scripts/deployV2Multichain.js](scripts/deployV2Multichain.js))
- Results API: [election-backend/server.js](election-backend/server.js)
- Local services: [services/keyService.js](services/keyService.js), [services/schema.sql](services/schema.sql)
- Frontend web3 wiring: [frontend/js/contract.js](frontend/js/contract.js) and [frontend/js/electionConductor.js](frontend/js/electionConductor.js)

Quick debugging tips
- Hardhat tests: run `npm run test` — inspect stack traces from `test/` (use `npx hardhat test --show-stack-traces` if needed).
- Backend: ensure `DATABASE_URL` points to a local Postgres instance; start with `npm run dev` from repo root or `cd election-backend && npm run dev`.
- ABI mismatches: if frontend fails to call a contract, re-run `npm run compile` and copy updated ABI from `abis/` or `artifacts/` into the frontend bundle.

What to ask the maintainer
- Preferred dev flow for frontends (which of `frontend/`, `election-dashboard-react/`, or `voting-ui/` is canonical?)
- Any CI/deployment specifics (secrets, chain RPC endpoints) not present in the repo that agents should be aware of.

If anything in this file looks wrong or incomplete, tell me which area to expand (deployments, backend API, frontend wiring, or contracts).
