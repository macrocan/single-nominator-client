export const BASE_URL = import.meta.env.VITE_BASE_URL ?? '/single-nominator-client';
export const MANIFAST_URL = import.meta.env.VITE_MANIFEST_URL ?? (window.location.origin + BASE_URL + "/tonconnect-manifest.json");
export const GITHUB_URL = "https://github.com/orbs-network/single-nominator";
export const ZERO_ADDR = "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
export const TELERGAM_SUPPORT = "https://t.me/single_nominator";
export const DEPLOY_VALUE = 5
export const TX_VALID_UNTIL_MS = 15 * 60 * 1000; // 15 min: allows for mobile wallet interruptions