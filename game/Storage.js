/**
 * Storage.js — Wrapper seguro para localStorage
 *
 * Handles:
 * - Safari private-browsing (localStorage.getItem pode lançar)
 * - JSON corrompido (JSON.parse lança SyntaxError)
 * - QuotaExceededError no safeSet (degradação silenciosa)
 * - raw === null antes do JSON.parse para retornar defaultValue corretamente
 */

/**
 * Lê um valor do localStorage com fallback seguro.
 *
 * @param {string} key - Chave do localStorage
 * @param {*} defaultValue - Valor padrão se ausente, corrompido ou inacessível
 * @returns {*} Valor parseado ou defaultValue
 */
export function safeGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (_e) {
    // Cobre: Safari private-mode (getItem lança), JSON.parse de valor corrompido
    return defaultValue;
  }
}

/**
 * Grava um valor no localStorage de forma segura.
 * Erros são silenciosamente descartados — perda de save é degradação aceitável.
 *
 * @param {string} key - Chave do localStorage
 * @param {*} value - Valor a serializar e gravar
 */
export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_e) {
    // Cobre: QuotaExceededError, Safari private-mode
    // Silently swallow — não propagar
  }
}
