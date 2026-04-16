const validator = require('validator');

/**
 * Validate record data
 */
const validateRecord = (data) => {
  const errors = {};

  // Validate name
  if (!data.name || !data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  }

  // Validate DOB
  if (!data.dob || !data.dob.trim()) {
    errors.dob = 'Date of Birth is required';
  } else if (!validator.isISO8601(data.dob)) {
    errors.dob = 'Date of Birth must be a valid date (YYYY-MM-DD)';
  }

  // Validate address
  if (!data.address || !data.address.trim()) {
    errors.address = 'Address is required';
  } else if (data.address.length < 5) {
    errors.address = 'Address must be at least 5 characters';
  } else if (data.address.length > 500) {
    errors.address = 'Address must be less than 500 characters';
  }

  // Validate email (optional but if provided, must be valid)
  if (data.email && data.email.trim()) {
    if (!validator.isEmail(data.email)) {
      errors.email = 'Email must be a valid email address';
    }
  }

  // Validate phone (optional but if provided, must be valid)
  if (data.phone && data.phone.trim()) {
    if (!validator.isMobilePhone(data.phone, 'any', { strictMode: false })) {
      errors.phone = 'Phone must be a valid phone number';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Validate login credentials
 */
const validateLogin = (data) => {
  const errors = {};

  if (!data.username || !data.username.trim()) {
    errors.username = 'Username is required';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Validate search query
 */
const validateSearchQuery = (query) => {
  if (query && query.length > 200) {
    return 'Search query must be less than 200 characters';
  }
  return null;
};

/**
 * Sanitize record data
 */
const sanitizeRecord = (data) => {
  return {
    name: data.name ? data.name.trim() : '',
    dob: data.dob ? data.dob.trim() : '',
    address: data.address ? data.address.trim() : '',
    email: data.email ? data.email.trim().toLowerCase() : '',
    phone: data.phone ? data.phone.trim() : ''
  };
};

module.exports = {
  validateRecord,
  validateLogin,
  validateSearchQuery,
  sanitizeRecord
};
