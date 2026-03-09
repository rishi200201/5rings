const mongoose = require('mongoose');

/**
 * TokenBlacklist
 * Stores SHA-256 hashes of revoked JWT tokens.
 *
 * The TTL index on `expiresAt` means MongoDB automatically removes a document
 * when the associated token would have expired anyway, keeping the collection lean
 * without any manual clean-up job.
 *
 * We store the hash rather than the raw token string to avoid persisting sensitive
 * credential material in the database.
 */
const tokenBlacklistSchema = new mongoose.Schema({
  // SHA-256 hex digest of the raw JWT string
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // When the original JWT expires — MongoDB TTL removes the doc at this time
  expiresAt: {
    type: Date,
    required: true,
  },
  // Optional: store the user id for audit purposes
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  revokedAt: {
    type: Date,
    default: Date.now,
  },
});

// TTL index — MongoDB deletes the document automatically at expiresAt
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

module.exports = TokenBlacklist;
