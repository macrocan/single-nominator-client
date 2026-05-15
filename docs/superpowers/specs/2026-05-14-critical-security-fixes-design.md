# Critical Security Fixes Design
**Date:** 2026-05-14
**Branch:** develop_H388463
**Scope:** 7 CRITICAL vulnerabilities from security audit report (2026-05-14)

---

## Background

Security audit identified 11 CRITICAL vulnerabilities. 4 were fixed in a prior session (4.3.1, 4.3.3, 4.3.4, 4.3.5). This spec covers the remaining 7.

---

## Vulnerabilities In Scope

| ID | Title | Risk |
|----|-------|------|
| 4.3.2 | TonConnect manifest domain inconsistency | CRITICAL |
| 4.3.6 | No owner/validator workchain validation on deploy | CRITICAL |
| 4.3.7 | Hardcoded BASE_URL / vite base / router basename | CRITICAL |
| 4.3.8a | Unused `add@2.0.6` in production dependencies | CRITICAL |
| 4.3.8b | Unused `yarn@1.22.19` in production dependencies | CRITICAL |
| 4.3.9 | package-lock.json and yarn.lock severe inconsistency | CRITICAL |
| 4.3.10 | `@tonconnect/ui-react` on pre-release beta version | CRITICAL |

---

## Section 1: Dependency Cleanup (4.3.8a / 4.3.8b / 4.3.9 / 4.3.10)

### Changes

**package.json**
- Remove `"add": "^2.0.6"` from dependencies
- Remove `"yarn": "^1.22.19"` from dependencies
- Change `"@tonconnect/ui-react": "^2.0.0-beta.2"` to `"@tonconnect/ui-react": "2.4.4"` (stable, pinned, no `^`)

**package-lock.json**
- Delete the file entirely
- Add `package-lock.json` to `.gitignore`

**docker-compose.yml**
- Remove the volume mount line: `- ${PWD}/package-lock.json:/root/single-nominator-client/package-lock.json:rw`

**yarn.lock**
- Regenerate via `yarn install` after package.json changes

### Rationale
- `add` and `yarn` have zero import references in source; they are supply-chain risks
- `@tonconnect/ui-react` 2.4.4 is the latest stable 2.x release; core APIs (`useTonAddress`, `useTonConnectUI`, `TonConnectUIProvider`) are unchanged in the 2.x series
- Dual lockfiles allow `npm install` users to get a different, unaudited dependency tree; yarn.lock is the canonical source for this project
- Pinning `@tonconnect/ui-react` without `^` prevents unintended future upgrades to pre-release versions

---

## Section 2: Configuration Fixes (4.3.2 / 4.3.7)

### 4.3.2 — TonConnect Manifest Domain

**Production domain:** `https://YOUR_DOMAIN/`
**Served path:** `/single-nominator-client/` (confirmed via nginx.conf)

**File:** `public/tonconnect-manifest.json`
```json
{
  "url": "https://YOUR_DOMAIN/single-nominator-client/",
  "name": "TON single-nominator",
  "iconUrl": "https://YOUR_DOMAIN/single-nominator-client/logo.png"
}
```

**File:** `src/consts.ts` — `MANIFAST_URL` already uses `window.location.origin` dynamic construction; update it to use `BASE_URL` constant for consistency:
```typescript
export const MANIFAST_URL = window.location.origin + BASE_URL + "/tonconnect-manifest.json";
```
(Move this line after `BASE_URL` is declared.)

### 4.3.7 — BASE_URL / vite base / router basename

Replace hardcoded `/single-nominator-client` strings with env var injection. Default value matches current nginx.conf deployment path so existing Docker deployment is unaffected.

**New file:** `.env.production`
```
VITE_BASE_URL=/single-nominator-client
```

**`vite.config.ts`**
```typescript
base: process.env.VITE_BASE_URL ?? '/single-nominator-client',
```

**`src/consts.ts`**
```typescript
export const BASE_URL = import.meta.env.VITE_BASE_URL ?? '/single-nominator-client';
```

**`src/router.tsx`**
```typescript
basename: import.meta.env.VITE_BASE_URL ?? '/single-nominator-client'
```

---

## Section 3: Code Fix (4.3.6)

### 4.3.6 — Workchain Validation on Deploy

**File:** `src/helpers/deploy.ts`

In the `deploy()` function, after parsing owner and validator addresses, add validation before `getDeployCodeAndData()` is called:

```typescript
const ownerAddr = Address.parse(owner);
const validatorAddr = Address.parse(validator);

if (ownerAddr.workChain !== 0) {
  throw new Error("Owner address must be on workchain 0 (basechain)");
}
if (validatorAddr.workChain !== -1) {
  throw new Error("Validator address must be on workchain -1 (masterchain)");
}
```

This prevents a user from deploying with a wrong-workchain validator address, which would lock 8M TON (NEW_STAKE unreachable) while the 5 TON deployment fee is already spent.

---

## Execution Order

1. Dependency cleanup — remove `add`, `yarn`; upgrade `@tonconnect/ui-react`; delete `package-lock.json`; update `.gitignore` and `docker-compose.yml`
2. Configuration fixes — update `tonconnect-manifest.json`; inject `VITE_BASE_URL`
3. Code fix — add workchain validation in `deploy.ts`
4. `yarn install` — regenerate clean `yarn.lock`
5. `tsc && vite build` — verify compilation succeeds

---

## Out of Scope

HIGH-severity issues (4.3.11–4.3.21) are not addressed in this plan. They should be tracked separately.
