/**
 * Frontend validation helpers.
 *
 * Provides reusable, consistent validators for common Indian business
 * data patterns (GSTIN, PAN, phone, email, HSN/SAC, etc.).
 * Use these in form `onSubmit` handlers before calling the API.
 */

/** Valid GSTIN format: 2-digit state + 10-char PAN + 1 entity + Z + 1 check */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** Valid PAN: 5 letters + 4 digits + 1 letter */
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/** Indian phone: 10 digits, optionally prefixed with +91 or 0 */
const PHONE_RE = /^(?:\+91|0)?[6-9]\d{9}$/;

/** Basic email check */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** HSN: 2, 4, 6 or 8 digits; SAC: 6 digits starting with 99 */
const HSN_RE = /^\d{2}(\d{2})?(\d{2})?(\d{2})?$/;

/**
 * Validate a single field value.
 * @param {'gstin'|'pan'|'email'|'phone'|'required'|'hsn'|'number'|'minLength'} rule
 * @param {*} value
 * @param {object} [opts] - Extra options like { min, max, minLength }
 * @returns {string|null} Error message or null if valid.
 */
export function validateField(rule, value, opts = {}) {
  const v = typeof value === 'string' ? value.trim() : value;

  switch (rule) {
    case 'required':
      if (!v && v !== 0) return opts.label ? `${opts.label} is required` : 'This field is required';
      return null;

    case 'email':
      if (!v) return null; // optional unless combined with 'required'
      return EMAIL_RE.test(v) ? null : 'Please enter a valid email address';

    case 'phone':
      if (!v) return null;
      return PHONE_RE.test(v.replace(/[\s-]/g, '')) ? null : 'Please enter a valid 10-digit phone number';

    case 'gstin':
      if (!v) return null;
      return GSTIN_RE.test(v.toUpperCase()) ? null : 'Invalid GSTIN format (e.g. 27ABCDE1234F1Z5)';

    case 'pan':
      if (!v) return null;
      return PAN_RE.test(v.toUpperCase()) ? null : 'Invalid PAN format (e.g. ABCDE1234F)';

    case 'hsn':
      if (!v) return null;
      return HSN_RE.test(v) ? null : 'Invalid HSN/SAC code';

    case 'number':
      if (v === '' || v === null || v === undefined) return null;
      if (isNaN(Number(v))) return 'Must be a valid number';
      if (opts.min !== undefined && Number(v) < opts.min) return `Minimum value is ${opts.min}`;
      if (opts.max !== undefined && Number(v) > opts.max) return `Maximum value is ${opts.max}`;
      return null;

    case 'minLength':
      if (!v) return null;
      if (v.length < (opts.minLength || 1)) return `Must be at least ${opts.minLength} characters`;
      return null;

    default:
      return null;
  }
}

/**
 * Validate an entire form object against a rules map.
 *
 * @example
 *   const errors = validateForm(
 *     { name: '', email: 'bad', gstin: '123' },
 *     {
 *       name: [['required', { label: 'Name' }]],
 *       email: [['required'], ['email']],
 *       gstin: [['gstin']],
 *     }
 *   );
 *   // => { name: 'Name is required', email: 'Please enter a valid email', gstin: 'Invalid GSTIN format...' }
 *
 * @param {object} formData - Key/value pairs of form fields.
 * @param {object} rulesMap - { fieldName: [[ruleName, opts], ...], ... }
 * @returns {object} An object of field → error message (only fields with errors).
 */
export function validateForm(formData, rulesMap) {
  const errors = {};
  for (const [field, rules] of Object.entries(rulesMap)) {
    for (const [rule, opts] of rules) {
      const err = validateField(rule, formData[field], opts);
      if (err) {
        errors[field] = err;
        break; // stop at first error for each field
      }
    }
  }
  return errors;
}

/**
 * Returns true if the errors object is empty (no validation errors).
 */
export function isFormValid(errors) {
  return Object.keys(errors).length === 0;
}

/**
 * Validate file before upload.
 * @param {File} file
 * @param {object} [opts]
 * @param {number} [opts.maxSizeMB=10]
 * @param {string[]} [opts.allowedTypes] - e.g. ['application/pdf', 'image/jpeg']
 * @param {string[]} [opts.allowedExtensions] - e.g. ['pdf', 'jpg', 'png']
 * @returns {string|null} Error message or null.
 */
export function validateFile(file, opts = {}) {
  if (!file) return 'Please select a file';

  const maxSize = (opts.maxSizeMB || 10) * 1024 * 1024;
  if (file.size > maxSize) {
    return `File size must not exceed ${opts.maxSizeMB || 10} MB`;
  }

  if (opts.allowedExtensions) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!opts.allowedExtensions.includes(ext)) {
      return `Allowed file types: ${opts.allowedExtensions.join(', ')}`;
    }
  }

  if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
    return `This file type (${file.type || 'unknown'}) is not allowed`;
  }

  return null;
}
