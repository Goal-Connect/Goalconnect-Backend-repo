const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const normalizeOrigin = (value) => {
  if (!value) return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch (error) {
    return trimmed.replace(/\/+$/, '');
  }
};

const expandOriginValues = (values) =>
  values
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

const getAllowedOrigins = () => {
  const explicitOrigins = expandOriginValues([
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
    process.env.BACKEND_URL,
    process.env.BACKEND_URLS,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RENDER_EXTERNAL_HOSTNAME
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
      : null,
  ]);

  return new Set(explicitOrigins);
};

const isAllowedOrigin = (origin, { allowLocalOrigins = false } = {}) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  if (allowLocalOrigins && LOCAL_ORIGIN_PATTERN.test(normalizedOrigin)) {
    return true;
  }

  return getAllowedOrigins().has(normalizedOrigin);
};

module.exports = {
  isAllowedOrigin,
  normalizeOrigin,
};