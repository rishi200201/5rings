/**
 * Standardised 500 response helper.
 * In production only a generic message is returned — never the raw error,
 * which could leak DB schema details or internal stack info.
 */
const serverError = (res, error) => {
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : error.message;

  res.status(500).json({ success: false, message });
};

module.exports = serverError;
