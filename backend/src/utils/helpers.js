/**
 * Utility helper functions for GoalConnect
 */

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth 
 * @returns {number} Age in years
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Format date to readable string
 * @param {Date} date 
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Paginate results helper
 * @param {number} page 
 * @param {number} limit 
 * @param {number} total 
 * @returns {object} Pagination metadata
 */
const getPaginationMeta = (page, limit, total) => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
};

/**
 * Sanitize object by removing undefined/null values
 * @param {object} obj 
 * @returns {object} Cleaned object
 */
const sanitizeObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  );
};

/**
 * Generate a random string (useful for tokens)
 * @param {number} length 
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  calculateAge,
  formatDate,
  getPaginationMeta,
  sanitizeObject,
  generateRandomString,
};

