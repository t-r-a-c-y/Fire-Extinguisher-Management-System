/**
 * Tiny dependency-free validation helpers + a request-body validator.
 * Throws ApiError(400) with field-level details on failure.
 */
const { ApiError } = require('./http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v);
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const isUuid = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Password policy: min 8 chars, at least one letter and one digit. */
const isStrongPassword = (v) =>
  typeof v === 'string' && v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

/**
 * Validate `body` against a schema map: { field: { required, type, enum, custom } }.
 * Returns the cleaned object or throws ApiError(400) with a `details` map.
 */
function validateBody(body, schema) {
  const errors = {};
  const cleaned = {};
  for (const [field, rule] of Object.entries(schema)) {
    const value = body ? body[field] : undefined;
    const present = value !== undefined && value !== null && value !== '';

    if (rule.required && !present) {
      errors[field] = 'is required';
      continue;
    }
    if (!present) continue;

    if (rule.enum && !rule.enum.includes(value)) {
      errors[field] = `must be one of: ${rule.enum.join(', ')}`;
      continue;
    }
    if (rule.type === 'email' && !isEmail(value)) errors[field] = 'must be a valid email';
    else if (rule.type === 'date' && !isDate(value)) errors[field] = 'must be a valid date';
    else if (rule.type === 'uuid' && !isUuid(value)) errors[field] = 'must be a valid UUID';
    else if (rule.type === 'password' && !isStrongPassword(value))
      errors[field] = 'must be at least 8 characters and include a letter and a number';
    else if (rule.custom && !rule.custom(value)) errors[field] = rule.message || 'is invalid';

    if (!errors[field]) cleaned[field] = typeof value === 'string' ? value.trim() : value;
  }
  if (Object.keys(errors).length) {
    throw ApiError.badRequest('Validation failed', errors);
  }
  return cleaned;
}

module.exports = { isEmail, isNonEmpty, isUuid, isDate, isStrongPassword, validateBody };
