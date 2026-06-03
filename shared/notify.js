/**
 * Notification helpers shared across services.
 *
 * Services write rows into the `notifications` table; the notification-service
 * is the read/manage surface. These helpers keep the write shape consistent.
 */
const { pool } = require('./db');

/** Insert a single notification. Accepts an optional pg client (for txns). */
async function insertNotification(n, client) {
  const db = client || pool;
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [n.userId || null, n.type || 'info', n.title, n.message, n.relatedEntity || null, n.relatedId || null]
  );
}

/** Notify every user holding one of the given roles. */
async function notifyRoles(roles, n, client) {
  const db = client || pool;
  const { rows } = await db.query('SELECT id FROM users WHERE role = ANY($1) AND is_active', [roles]);
  for (const r of rows) {
    await insertNotification({ ...n, userId: r.id }, db);
  }
}

/**
 * Notify the acting user plus all admins (deduplicated). Use for CRUD events so
 * both the person who did it and admins see an audit trail.
 */
async function notifyActorAndAdmins(actor, n, client) {
  const db = client || pool;
  const { rows } = await db.query("SELECT id FROM users WHERE role = 'admin' AND is_active");
  const ids = new Set(rows.map((r) => r.id));
  if (actor?.id) ids.add(actor.id);
  for (const id of ids) {
    await insertNotification({ ...n, userId: id }, db);
  }
}

module.exports = { insertNotification, notifyRoles, notifyActorAndAdmins };
