# Critical Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 CRITICAL vulnerabilities (4.3.2, 4.3.6, 4.3.7, 4.3.8a, 4.3.8b, 4.3.9, 4.3.10) identified in the 2026-05-14 security audit on the `develop_H388463` branch.

**Architecture:** Three independent fix areas: (1) dependency cleanup in package.json + lockfile hygiene, (2) configuration hardening via env var injection and manifest URL alignment, (3) one code-level guard in deploy.ts for workchain validation.

**Tech Stack:** React 18, TypeScript, Vite 4, yarn 1 (classic), ton-core, @tonconnect/ui-react

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Remove `add`, `yarn`; upgrade `@tonconnect/ui-react` |
| `.gitignore` | Modify | Ignore `package-lock.json` |
| `docker-compose.yml` | Modify | Remove stale `package-lock.json` volume mount |
| `package-lock.json` | Delete | Eliminate dual-lockfile conflict |
| `yarn.lock` | Regenerate | Clean lockfile after package.json changes |
| `public/tonconnect-manifest.json` | Modify | Align manifest URL to production domain |
| `.env.production` | Create | Canonical `VITE_BASE_URL` value |
| `vite.config.ts` | Modify | Read base path from env var |
| `src/consts.ts` | Modify | `BASE_URL` and `MANIFAST_URL` from env var |
| `src/router.tsx` | Modify | `basename` from env var |
| `src/helpers/deploy.ts` | Modify | Workchain validation before deployment |

---

## Task 1: Remove unused production dependencies (4.3.8a / 4.3.8b)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify the problem**

```bash
grep -n '"add"\|"yarn"' package.json
```

Expected output:
```
18:    "add": "^2.0.6",
37:    "yarn": "^1.22.19",
```

- [ ] **Step 2: Remove `add` and `yarn` from dependencies**

Edit `package.json`. Remove these two lines from the `"dependencies"` block:
```json
"add": "^2.0.6",
```
```json
"yarn": "^1.22.19",
```

The `"dependencies"` block should no longer contain either entry.

- [ ] **Step 3: Verify removal**

```bash
grep '"add"\|"yarn"' package.json
```

Expected: no output (both entries gone).

---

## Task 2: Upgrade @tonconnect/ui-react to stable release (4.3.10)

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Verify current beta version**

```bash
grep '@tonconnect/ui-react' package.json
```

Expected:
```
"@tonconnect/ui-react": "^2.0.0-beta.2",
```

- [ ] **Step 2: Update the version in package.json**

In `package.json`, change:
```json
"@tonconnect/ui-react": "^2.0.0-beta.2",
```
to:
```json
"@tonconnect/ui-react": "2.4.4",
```

No `^` — pin the exact version to prevent unintended upgrades to pre-release builds.

- [ ] **Step 3: Verify the change**

```bash
grep '@tonconnect/ui-react' package.json
```

Expected:
```
"@tonconnect/ui-react": "2.4.4",
```

---

## Task 3: Eliminate dual lockfile (4.3.9)

**Files:**
- Delete: `package-lock.json`
- Modify: `.gitignore`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Verify both lockfiles exist**

```bash
ls -la package-lock.json yarn.lock
```

Expected: both files present.

- [ ] **Step 2: Delete package-lock.json**

```bash
rm package-lock.json
```

- [ ] **Step 3: Add package-lock.json to .gitignore**

In `.gitignore`, append after the existing entries:
```
package-lock.json
```

- [ ] **Step 4: Remove package-lock.json volume mount from docker-compose.yml**

In `docker-compose.yml`, remove this line from the `volumes:` block:
```yaml
      - ${PWD}/package-lock.json:/root/single-nominator-client/package-lock.json:rw
```

- [ ] **Step 5: Verify**

```bash
ls package-lock.json 2>&1
grep 'package-lock' .gitignore
grep 'package-lock' docker-compose.yml
```

Expected:
```
ls: package-lock.json: No such file or directory
package-lock.json
(no output from docker-compose grep)
```

---

## Task 4: Regenerate yarn.lock and verify build

**Files:**
- Regenerate: `yarn.lock`

- [ ] **Step 1: Install with updated package.json**

```bash
yarn install
```

Expected: exits 0, no errors. `yarn.lock` updated.

- [ ] **Step 2: Confirm @tonconnect/ui-react 2.4.4 is in the new lockfile**

```bash
grep -A2 '"@tonconnect/ui-react@2.4.4"' yarn.lock | head -5
```

Expected: entry for `2.4.4` present. No `beta` entries for this package.

- [ ] **Step 3: Confirm add and yarn packages are gone**

```bash
grep '^"add@\|^add@\|^"yarn@\|^yarn@' yarn.lock
```

Expected: no output.

- [ ] **Step 4: Run TypeScript + build check**

```bash
yarn build
```

Expected: exits 0. If there are TypeScript errors from the @tonconnect upgrade, fix them before proceeding (typically a prop rename; check error message and update the affected file in `src/`).

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock .gitignore docker-compose.yml
git commit -m "fix: remove unused deps, upgrade tonconnect to 2.4.4, drop package-lock.json

- Remove add@2.0.6 and yarn@1.22.19 from production deps (4.3.8a/4.3.8b)
- Upgrade @tonconnect/ui-react from beta.2 to 2.4.4 stable (4.3.10)
- Delete package-lock.json, add to .gitignore (4.3.9)
- Remove package-lock.json volume mount from docker-compose.yml

Co-Authored-By: Claude (aws-claude-sonnet-4.6) <noreply@anthropic.com>"
```

---

## Task 5: Fix TonConnect manifest domain (4.3.2)

**Files:**
- Modify: `public/tonconnect-manifest.json`

- [ ] **Step 1: Verify current (wrong) content**

```bash
cat public/tonconnect-manifest.json
```

Expected: `url` pointing to `netlify.app`, `iconUrl` pointing to `netlify.app`.

- [ ] **Step 2: Update the manifest**

Replace the entire contents of `public/tonconnect-manifest.json` with:
```json
{
  "url": "https://YOUR_DOMAIN/single-nominator-client/",
  "name": "TON single-nominator",
  "iconUrl": "https://YOUR_DOMAIN/single-nominator-client/logo.png"
}
```

- [ ] **Step 3: Verify**

```bash
cat public/tonconnect-manifest.json
```

Expected: `url` and `iconUrl` both reference `YOUR_DOMAIN`.

- [ ] **Step 4: Commit**

```bash
git add public/tonconnect-manifest.json
git commit -m "fix: align tonconnect manifest URL to production domain (4.3.2)

Replace netlify.app URLs with https://YOUR_DOMAIN/single-nominator-client/

Co-Authored-By: Claude (aws-claude-sonnet-4.6) <noreply@anthropic.com>"
```

---

## Task 6: Inject VITE_BASE_URL — build config (4.3.7, part 1)

**Files:**
- Create: `.env.production`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create `.env.production`**

Create a new file `.env.production` at the project root with this exact content:
```
VITE_BASE_URL=/single-nominator-client
```

This matches the nginx.conf deployment path so the existing Docker deployment is unaffected.

- [ ] **Step 2: Verify current vite.config.ts has hardcoded base**

```bash
grep 'base:' vite.config.ts
```

Expected:
```
  base: "/single-nominator-client",
```

- [ ] **Step 3: Update `vite.config.ts`**

Replace the entire file with:
```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tsconfigPaths()],
    assetsInclude: ["**/*.fif", "**/*.sh"],
    base: env.VITE_BASE_URL ?? '/single-nominator-client',
    server: {
      port: 3000,
    },
  };
})
```

Key changes:
- Import `loadEnv` from `vite`
- Switch from object form to factory function form `defineConfig(({ mode }) => {...})`
- Use `loadEnv` to read `.env.*` files, then `env.VITE_BASE_URL` for `base`

- [ ] **Step 4: Build to verify**

```bash
yarn build
```

Expected: exits 0. Check that `dist/index.html` script src paths start with `/single-nominator-client/`.

```bash
grep 'src="/single-nominator-client/' dist/index.html | head -3
```

Expected: at least one match.

---

## Task 7: Inject VITE_BASE_URL — source code (4.3.7, part 2)

**Files:**
- Modify: `src/consts.ts`
- Modify: `src/router.tsx`

- [ ] **Step 1: Verify hardcoded values in consts.ts**

```bash
grep 'BASE_URL\|MANIFAST_URL' src/consts.ts
```

Expected: `BASE_URL = '/single-nominator-client'` and `MANIFAST_URL` with hardcoded path string.

- [ ] **Step 2: Update `src/consts.ts`**

Replace the entire file with:
```typescript
export const BASE_URL = import.meta.env.VITE_BASE_URL ?? '/single-nominator-client';
export const MANIFAST_URL = window.location.origin + BASE_URL + "/tonconnect-manifest.json";
export const GITHUB_URL = "https://github.com/orbs-network/single-nominator";
export const ZERO_ADDR = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
export const TELERGAM_SUPPORT = "https://t.me/single_nominator";
export const DEPLOY_VALUE = 5
```

Key changes:
- `BASE_URL` reads from `import.meta.env.VITE_BASE_URL` with fallback
- `MANIFAST_URL` is derived from `BASE_URL` (eliminates second hardcoded path)
- Order matters: `BASE_URL` declared before `MANIFAST_URL`

- [ ] **Step 3: Verify hardcoded basename in router.tsx**

```bash
grep 'basename' src/router.tsx
```

Expected:
```
  basename: '/single-nominator-client'
```

- [ ] **Step 4: Update `src/router.tsx`**

In `src/router.tsx`, change:
```typescript
}, {
  basename: '/single-nominator-client'
});
```
to:
```typescript
}, {
  basename: import.meta.env.VITE_BASE_URL ?? '/single-nominator-client'
});
```

- [ ] **Step 5: Build to verify**

```bash
yarn build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add .env.production vite.config.ts src/consts.ts src/router.tsx
git commit -m "fix: replace hardcoded base path with VITE_BASE_URL env var (4.3.7)

- Add .env.production with VITE_BASE_URL=/single-nominator-client
- vite.config.ts: use loadEnv to read base path at build time
- consts.ts: BASE_URL and MANIFAST_URL derived from import.meta.env.VITE_BASE_URL
- router.tsx: basename derived from import.meta.env.VITE_BASE_URL
Default value preserves existing nginx/Docker deployment path.

Co-Authored-By: Claude (aws-claude-sonnet-4.6) <noreply@anthropic.com>"
```

---

## Task 8: Workchain validation in deploy.ts (4.3.6)

**Files:**
- Modify: `src/helpers/deploy.ts`

- [ ] **Step 1: Verify no workchain check exists**

```bash
grep -n 'workChain' src/helpers/deploy.ts
```

Expected: no output.

- [ ] **Step 2: Locate the deploy function**

Read `src/helpers/deploy.ts` lines 67-75:
```typescript
export async function deploy(sender: Sender, owner: string, validator: string) {
  const client = await getClientV2();
  const singleNominatorCodeAndData = await getDeployCodeAndData(
    Address.parse(owner),
    Address.parse(validator)
  );
```

- [ ] **Step 3: Add workchain validation**

In `src/helpers/deploy.ts`, replace:
```typescript
export async function deploy(sender: Sender, owner: string, validator: string) {
  const client = await getClientV2();
  const singleNominatorCodeAndData = await getDeployCodeAndData(
    Address.parse(owner),
    Address.parse(validator)
  );
```
with:
```typescript
export async function deploy(sender: Sender, owner: string, validator: string) {
  const ownerAddr = Address.parse(owner);
  const validatorAddr = Address.parse(validator);

  if (ownerAddr.workChain !== 0) {
    throw new Error("Owner address must be on workchain 0 (basechain)");
  }
  if (validatorAddr.workChain !== -1) {
    throw new Error("Validator address must be on workchain -1 (masterchain)");
  }

  const client = await getClientV2();
  const singleNominatorCodeAndData = await getDeployCodeAndData(
    ownerAddr,
    validatorAddr
  );
```

Note: `ownerAddr` and `validatorAddr` replace the inline `Address.parse()` calls in `getDeployCodeAndData()` to avoid parsing twice.

- [ ] **Step 4: Build to verify**

```bash
yarn build
```

Expected: exits 0. TypeScript should accept `ownerAddr` and `validatorAddr` as `Address` (same type that `Address.parse()` returns).

- [ ] **Step 5: Verify the guard is in place**

```bash
grep -n 'workChain' src/helpers/deploy.ts
```

Expected:
```
<line>:  if (ownerAddr.workChain !== 0) {
<line>:  if (validatorAddr.workChain !== -1) {
```

- [ ] **Step 6: Commit**

```bash
git add src/helpers/deploy.ts
git commit -m "fix: validate owner/validator workchain before deployment (4.3.6)

Owner must be wc=0 (basechain), validator must be wc=-1 (masterchain).
Throws immediately if wrong workchain, before any TON is spent.

Co-Authored-By: Claude (aws-claude-sonnet-4.6) <noreply@anthropic.com>"
```

---

## Task 9: Final verification

- [ ] **Step 1: Clean build from scratch**

```bash
rm -rf dist && yarn build
```

Expected: exits 0. `dist/` directory created.

- [ ] **Step 2: Confirm all 7 fixes are present**

```bash
# 4.3.2 — manifest domain
grep 'YOUR_DOMAIN' public/tonconnect-manifest.json

# 4.3.6 — workchain validation
grep 'workChain' src/helpers/deploy.ts

# 4.3.7 — env var base path
grep 'VITE_BASE_URL' src/consts.ts src/router.tsx vite.config.ts .env.production

# 4.3.8a / 4.3.8b — unused deps removed
grep '"add"\|"yarn"' package.json

# 4.3.9 — no package-lock
ls package-lock.json 2>&1 && grep 'package-lock' .gitignore

# 4.3.10 — stable tonconnect
grep '@tonconnect/ui-react' package.json
```

Expected output summary:
```
YOUR_DOMAIN  ← 4.3.2 ✓
workChain (×2)  ← 4.3.6 ✓
VITE_BASE_URL (×4 files)  ← 4.3.7 ✓
(no output)  ← 4.3.8a/b ✓
No such file / package-lock.json  ← 4.3.9 ✓
"2.4.4"  ← 4.3.10 ✓
```

- [ ] **Step 3: Verify git log shows all fix commits**

```bash
git log --oneline -6
```

Expected: 4 fix commits (tasks 4, 5, 6+7, 8) plus the design spec commit.
