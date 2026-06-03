/**
 * Report data builders.
 *
 * Each builder accepts a `scope`:
 *   - `{}`               → whole system (admins & inspectors)
 *   - `{ userId }`       → only data owned by that user (role "user")
 *
 * For a plain user: extinguishers they created, inspections they scheduled,
 * maintenance they performed. A brand-new user therefore sees all-zero figures
 * until they add data.
 */
const { query } = require('@fems/shared');

async function markOverdue() {
  await query(
    `UPDATE inspections SET status = 'overdue'
     WHERE status = 'pending' AND scheduled_date < CURRENT_DATE`
  );
}

/** Build "WHERE col = $1" (+ params) when scoped, else empty. */
function scoped(scope, column, extra = '') {
  if (scope && scope.userId) {
    return { where: `WHERE ${column} = $1${extra ? ` AND ${extra}` : ''}`, params: [scope.userId], next: 2 };
  }
  return { where: extra ? `WHERE ${extra}` : '', params: [], next: 1 };
}

// ---- Inventory -------------------------------------------------------------
async function inventoryReport(scope = {}) {
  const s = scoped(scope, 'created_by');
  const w = s.where;
  const p = s.params;

  const total = await query(`SELECT COUNT(*)::int AS c FROM fire_extinguishers ${w}`, p);
  const byStatus = await query(`SELECT status, COUNT(*)::int AS count FROM fire_extinguishers ${w} GROUP BY status ORDER BY status`, p);
  const byType = await query(`SELECT type, COUNT(*)::int AS count FROM fire_extinguishers ${w} GROUP BY type ORDER BY type`, p);
  const bySize = await query(`SELECT size, COUNT(*)::int AS count FROM fire_extinguishers ${w} GROUP BY size ORDER BY size`, p);
  const daily = await query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS period, COUNT(*)::int AS count
     FROM fire_extinguishers ${w} GROUP BY 1 ORDER BY 1 DESC LIMIT 30`, p);
  const monthly = await query(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS period, COUNT(*)::int AS count
     FROM fire_extinguishers ${w} GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, p);
  const yearly = await query(
    `SELECT to_char(date_trunc('year', created_at), 'YYYY') AS period, COUNT(*)::int AS count
     FROM fire_extinguishers ${w} GROUP BY 1 ORDER BY 1 DESC`, p);

  return {
    total: total.rows[0].c,
    byStatus: byStatus.rows,
    byType: byType.rows,
    bySize: bySize.rows,
    summaries: { daily: daily.rows, monthly: monthly.rows, yearly: yearly.rows },
  };
}

// ---- Inspections -----------------------------------------------------------
async function inspectionReport(scope = {}) {
  await markOverdue();
  const s = scoped(scope, 'scheduled_by');

  const counts = await query(`SELECT status, COUNT(*)::int AS count FROM inspections ${s.where} GROUP BY status`, s.params);
  const map = Object.fromEntries(counts.rows.map((r) => [r.status, r.count]));

  // Re-scope for the joined query (qualify the column with the alias i).
  const js = scope && scope.userId
    ? { where: 'WHERE i.scheduled_by = $1', params: [scope.userId] }
    : { where: '', params: [] };
  const rows = await query(
    `SELECT i.id, e.serial_number, e.location, i.scheduled_date, i.scheduled_time,
            i.status, i.result, i.notes, i.completed_at
     FROM inspections i JOIN fire_extinguishers e ON e.id = i.extinguisher_id
     ${js.where}
     ORDER BY i.scheduled_date DESC`, js.params);

  return {
    counts: {
      pending: map.pending || 0,
      completed: map.completed || 0,
      overdue: map.overdue || 0,
      cancelled: map.cancelled || 0,
    },
    inspections: rows.rows,
  };
}

// ---- Compliance ------------------------------------------------------------
async function complianceReport(scope = {}, upcomingDays = 30) {
  const userId = scope && scope.userId ? scope.userId : null;
  const expired = await query(
    `SELECT id, serial_number, location, type, expiry_date, status
     FROM fire_extinguishers
     WHERE expiry_date < CURRENT_DATE ${userId ? 'AND created_by = $1' : ''}
     ORDER BY expiry_date`, userId ? [userId] : []);
  const upcoming = await query(
    `SELECT id, serial_number, location, type, expiry_date
     FROM fire_extinguishers
     WHERE expiry_date >= CURRENT_DATE
       AND expiry_date <= CURRENT_DATE + ($${userId ? 2 : 1} || ' days')::interval
       ${userId ? 'AND created_by = $1' : ''}
     ORDER BY expiry_date`, userId ? [userId, upcomingDays] : [upcomingDays]);
  const total = await query(
    `SELECT COUNT(*)::int AS c FROM fire_extinguishers ${userId ? 'WHERE created_by = $1' : ''}`,
    userId ? [userId] : []);

  const t = total.rows[0].c;
  const compliantCount = t - expired.rowCount;
  const compliancePct = t ? Math.round((compliantCount / t) * 100) : 100;
  return {
    expiredCount: expired.rowCount,
    upcomingCount: upcoming.rowCount,
    compliantCount,
    compliancePercentage: compliancePct,
    expired: expired.rows,
    upcomingExpirations: upcoming.rows,
  };
}

// ---- Maintenance -----------------------------------------------------------
async function maintenanceReport(scope = {}) {
  const w = scope && scope.userId ? 'WHERE m.performed_by = $1' : '';
  const p = scope && scope.userId ? [scope.userId] : [];

  const history = await query(
    `SELECT m.id, e.serial_number, m.action_taken, m.maintenance_date,
            m.issues_identified, m.recommendations
     FROM maintenance_logs m JOIN fire_extinguishers e ON e.id = m.extinguisher_id
     ${w} ORDER BY m.maintenance_date DESC`, p);
  const frequency = await query(
    `SELECT e.serial_number, COUNT(*)::int AS maintenance_count
     FROM maintenance_logs m JOIN fire_extinguishers e ON e.id = m.extinguisher_id
     ${w} GROUP BY e.serial_number ORDER BY maintenance_count DESC`, p);
  const recent = await query(
    `SELECT m.id, e.serial_number, m.action_taken, m.maintenance_date
     FROM maintenance_logs m JOIN fire_extinguishers e ON e.id = m.extinguisher_id
     ${w} ORDER BY m.maintenance_date DESC LIMIT 10`, p);
  return { totalRecords: history.rowCount, frequency: frequency.rows, recent: recent.rows, history: history.rows };
}

// ---- Dashboard summary -----------------------------------------------------
async function dashboardSummary(scope = {}) {
  const [inv, insp, comp, maint] = await Promise.all([
    inventoryReport(scope),
    inspectionReport(scope),
    complianceReport(scope),
    maintenanceReport(scope),
  ]);
  return {
    scope: scope && scope.userId ? 'personal' : 'system',
    totalExtinguishers: inv.total,
    extinguishersByStatus: inv.byStatus,
    extinguishersByType: inv.byType,
    inspections: insp.counts,
    compliance: {
      expiredCount: comp.expiredCount,
      upcomingCount: comp.upcomingCount,
      compliancePercentage: comp.compliancePercentage,
    },
    maintenance: { totalRecords: maint.totalRecords, recent: maint.recent },
  };
}

module.exports = {
  inventoryReport,
  inspectionReport,
  complianceReport,
  maintenanceReport,
  dashboardSummary,
};
