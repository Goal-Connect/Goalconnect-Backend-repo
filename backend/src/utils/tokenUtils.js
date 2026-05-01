const crypto = require('crypto');

/**
 * Generate a cryptographically secure random token (64 hex chars).
 * This is the RAW token — sent inside email links.
 * Never store the raw token in the database.
 * @returns {string} 64-character hex string
 */
const generateRawToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a raw token using SHA-256.
 * Store ONLY the hash in the database.
 * @param {string} rawToken
 * @returns {string} SHA-256 hex digest
 */
const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

module.exports = { generateRawToken, hashToken };
