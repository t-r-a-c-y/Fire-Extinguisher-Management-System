/** Authentication: register, login, refresh, logout, password recovery. */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query, ApiError, asyncHandler, validateBody } = require('@fems/shared');
const tokens = require('./tokenService');

const publicUser = (u) => ({
  id: u.id,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  role: u.role,
  isActive: u.is_active,
  createdAt: u.created_at,
});

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    firstName: { required: true },
    lastName: { required: true },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'password' },
    // Self-registration is always a plain "user". Admins assign elevated roles.
  });

  const exists = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [data.email]);
  if (exists.rowCount) throw ApiError.conflict('A user with that email already exists');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const { rows } = await query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES ($1,$2,$3,$4,'user') RETURNING *`,
    [data.firstName, data.lastName, data.email, passwordHash]
  );
  res.status(201).json({ user: publicUser(rows[0]) });
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    email: { required: true, type: 'email' },
    password: { required: true },
  });

  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [data.email]);
  const user = rows[0];
  if (!user || !user.is_active) throw ApiError.unauthorized('Invalid credentials');

  const ok = await bcrypt.compare(data.password, user.password_hash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const accessToken = tokens.signAccessToken(user);
  const refreshToken = await tokens.issueRefreshToken(user);
  res.json({ accessToken, refreshToken, user: publicUser(user) });
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw ApiError.badRequest('refreshToken is required');

  let userId;
  try {
    userId = await tokens.verifyRefreshToken(refreshToken);
  } catch (_) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user || !user.is_active) throw ApiError.unauthorized('Account unavailable');

  res.json({ accessToken: tokens.signAccessToken(user) });
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await tokens.revokeRefreshToken(refreshToken);
  res.json({ message: 'Logged out' });
});

// POST /auth/forgot-password
// Issues a 6-digit one-time passcode (OTP). The OTP is NEVER returned in the
// API response, so the requester cannot see it from the browser. Because no
// email service is wired up for the demo, the code is written to the
// user-service logs instead — read it with `docker compose logs user-service`.
// (Swap the console.log below for a real email/SMS send in production.)
const forgotPassword = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, { email: { required: true, type: 'email' } });
  const { rows } = await query('SELECT id FROM users WHERE lower(email) = lower($1)', [data.email]);

  // Same response whether or not the account exists (don't leak which emails are registered).
  const generic = { message: 'If that account exists, a one-time passcode has been sent.' };
  if (!rows.length) return res.json(generic);

  // 6-digit numeric OTP (zero-padded), valid for 10 minutes.
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [rows[0].id, tokens.sha256(otp), expiresAt]
  );

  // "Delivery" channel for the demo: the server log. Never sent to the client.
  console.log(`\n🔐 [PASSWORD RESET] OTP for ${data.email}: ${otp}  (valid 10 minutes)\n`);

  res.json(generic);
});

// POST /auth/reset-password
// Requires the email + the OTP that was issued for it. Scoping the lookup to
// the user's own id means two users can safely hold the same 6-digit code.
const resetPassword = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    email: { required: true, type: 'email' },
    otp: { required: true },
    newPassword: { required: true, type: 'password' },
  });

  const { rows: userRows } = await query(
    'SELECT id FROM users WHERE lower(email) = lower($1)',
    [data.email]
  );
  const user = userRows[0];

  // Generic error (don't reveal whether it was the email or the code that was wrong).
  const invalid = () => ApiError.badRequest('Invalid or expired passcode');
  if (!user) throw invalid();

  const { rows } = await query(
    `SELECT * FROM password_resets
     WHERE user_id = $1 AND token_hash = $2 AND used = FALSE AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id, tokens.sha256(data.otp)]
  );
  const reset = rows[0];
  if (!reset) throw invalid();

  const passwordHash = await bcrypt.hash(data.newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, reset.user_id]);
  // Invalidate every outstanding code for this user, not just the one used.
  await query('UPDATE password_resets SET used = TRUE WHERE user_id = $1', [reset.user_id]);
  await tokens.revokeAllForUser(reset.user_id); // force re-login everywhere

  res.json({ message: 'Password has been reset. Please log in.' });
});

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, publicUser };
