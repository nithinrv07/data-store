const validator = require('validator');

/**
 * Validate record data
 */
const validateRecord = (data) => {
  const errors = {};

  // Validate Proc. No.
  if (!data.procNo || !data.procNo.toString().trim()) {
    errors.procNo = 'Proc. No. is required';
  }

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

  // Validate gender if provided
  if (data.gender && !['Male', 'Female', 'Other', ''].includes(data.gender)) {
    errors.gender = 'Gender must be Male, Female, or Other';
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
    procNo: data.procNo ? data.procNo.toString().trim() : '',
    hosUpdatedPer: data.hosUpdatedPer ? parseInt(data.hosUpdatedPer) : null,
    hosUpdatedTerm: data.hosUpdatedTerm ? parseInt(data.hosUpdatedTerm) : null,
    hosUpdatedTotal: data.hosUpdatedTotal ? parseInt(data.hosUpdatedTotal) : null,
    sanctionedPostPer: data.sanctionedPostPer ? parseInt(data.sanctionedPostPer) : null,
    sanctionedPostTerm: data.sanctionedPostTerm ? parseInt(data.sanctionedPostTerm) : null,
    sanctionedPostTotal: data.sanctionedPostTotal ? parseInt(data.sanctionedPostTotal) : null,
    filled: data.filled ? parseInt(data.filled) : null,
    vacant: data.vacant ? parseInt(data.vacant) : null,
    name: data.name ? data.name.trim() : '',
    dob: data.dob ? data.dob.trim() : '',
    option: data.option ? data.option.trim() : '',
    modeOfAppointment: data.modeOfAppointment ? data.modeOfAppointment.trim() : '',
    year: data.year ? parseInt(data.year) : null,
    rank: data.rank ? data.rank.trim() : '',
    designation: data.designation ? data.designation.trim() : '',
    nativeDistrict: data.nativeDistrict ? data.nativeDistrict.trim() : '',
    nativeTaluk: data.nativeTaluk ? data.nativeTaluk.trim() : '',
    gender: data.gender ? data.gender.trim() : '',
    section: data.section ? data.section.trim() : '',
    dateOfJoining: data.dateOfJoining ? data.dateOfJoining.trim() : '',
    subDivision: data.subDivision ? data.subDivision.trim() : '',
    division: data.division ? data.division.trim() : '',
    circle: data.circle ? data.circle.trim() : '',
    region: data.region ? data.region.trim() : '',
    remarks: data.remarks ? data.remarks.trim() : '',
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
