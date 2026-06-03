/** Fire extinguisher CRUD. */
const { query, ApiError, asyncHandler, validateBody, notifyActorAndAdmins } = require('@fems/shared');

const TYPES = ['water', 'co2', 'foam', 'dry_chemical'];
const SIZES = ['2.5lb', '5lb', '9lb', '12lb'];
const STATUSES = ['active', 'maintenance', 'expired', 'decommissioned'];

/** Date-only comparison helpers (ignore time / timezone). */
const dayOnly = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00Z`).getTime();
const today = () => dayOnly(new Date().toISOString());

const toDto = (r) => ({
  id: r.id,
  serialNumber: r.serial_number,
  location: r.location,
  type: r.type,
  size: r.size,
  installationDate: r.installation_date,
  expiryDate: r.expiry_date,
  status: r.status,
  lastInspectedAt: r.last_inspected_at,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Shared date rules for create/update. */
function validateDates({ installationDate, expiryDate }) {
  if (installationDate && dayOnly(installationDate) > today()) {
    throw ApiError.badRequest('Installation date cannot be in the future.');
  }
  if (installationDate && expiryDate && dayOnly(expiryDate) <= dayOnly(installationDate)) {
    throw ApiError.badRequest('Expiry date must be after the installation date.');
  }
}

// POST /extinguishers
const create = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    serialNumber: { required: true },
    location: { required: true },
    type: { required: true, enum: TYPES },
    size: { required: true, enum: SIZES },
    installationDate: { required: true, type: 'date' },
    expiryDate: { required: true, type: 'date' },
    status: { enum: STATUSES },
  });
  validateDates(data);

  const { rows } = await query(
    `INSERT INTO fire_extinguishers
       (serial_number, location, type, size, installation_date, expiry_date, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'active')::extinguisher_status,$8) RETURNING *`,
    [data.serialNumber, data.location, data.type, data.size,
     data.installationDate, data.expiryDate, data.status || null, req.user.id]
  );
  const ext = rows[0];

  await notifyActorAndAdmins(req.user, {
    type: 'extinguisher',
    title: 'Extinguisher created',
    message: `Extinguisher ${ext.serial_number} (${ext.location}) was created.`,
    relatedEntity: 'extinguisher',
    relatedId: ext.id,
  });

  res.status(201).json({ extinguisher: toDto(ext) });
});

// GET /extinguishers   ?status= &type= &q= &expiringInDays=
const list = asyncHandler(async (req, res) => {
  const { status, type, q, expiringInDays } = req.query;
  const where = [];
  const params = [];
  if (status) { params.push(status); where.push(`status = $${params.length}`); }
  if (type) { params.push(type); where.push(`type = $${params.length}`); }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(serial_number ILIKE $${params.length} OR location ILIKE $${params.length})`);
  }
  if (expiringInDays) {
    params.push(Number(expiringInDays));
    where.push(`expiry_date <= (CURRENT_DATE + ($${params.length} || ' days')::interval) AND expiry_date >= CURRENT_DATE`);
  }
  const sql = `SELECT * FROM fire_extinguishers
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  res.json({ count: rows.length, extinguishers: rows.map(toDto) });
});

// GET /extinguishers/:id
const getById = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!rows.length) throw ApiError.notFound('Extinguisher not found');
  res.json({ extinguisher: toDto(rows[0]) });
});

// PATCH /extinguishers/:id
const update = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    serialNumber: {},
    location: {},
    type: { enum: TYPES },
    size: { enum: SIZES },
    installationDate: { type: 'date' },
    expiryDate: { type: 'date' },
    status: { enum: STATUSES },
  });
  if (!Object.keys(data).length) throw ApiError.badRequest('No fields to update');

  // Validate against the merged (existing + incoming) dates.
  const existing = await query('SELECT installation_date, expiry_date FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!existing.rowCount) throw ApiError.notFound('Extinguisher not found');
  validateDates({
    installationDate: data.installationDate ?? existing.rows[0].installation_date,
    expiryDate: data.expiryDate ?? existing.rows[0].expiry_date,
  });

  const { rows } = await query(
    `UPDATE fire_extinguishers SET
        serial_number     = COALESCE($1, serial_number),
        location          = COALESCE($2, location),
        type              = COALESCE($3, type),
        size              = COALESCE($4, size),
        installation_date = COALESCE($5, installation_date),
        expiry_date       = COALESCE($6, expiry_date),
        status            = COALESCE($7, status)
     WHERE id = $8 RETURNING *`,
    [data.serialNumber ?? null, data.location ?? null, data.type ?? null, data.size ?? null,
     data.installationDate ?? null, data.expiryDate ?? null, data.status ?? null, req.params.id]
  );
  const ext = rows[0];

  await notifyActorAndAdmins(req.user, {
    type: 'extinguisher',
    title: 'Extinguisher updated',
    message: `Extinguisher ${ext.serial_number} was updated.`,
    relatedEntity: 'extinguisher',
    relatedId: ext.id,
  });

  res.json({ extinguisher: toDto(ext) });
});

// DELETE /extinguishers/:id
const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM fire_extinguishers WHERE id = $1 RETURNING serial_number', [req.params.id]);
  if (!rows.length) throw ApiError.notFound('Extinguisher not found');

  await notifyActorAndAdmins(req.user, {
    type: 'extinguisher',
    title: 'Extinguisher deleted',
    message: `Extinguisher ${rows[0].serial_number} was deleted.`,
    relatedEntity: 'extinguisher',
  });

  res.status(204).send();
});

// POST /extinguishers/:id/request  — any user asks admins/inspectors for an
// action (e.g. update location, purchase a similar unit, schedule inspection).
const requestAction = asyncHandler(async (req, res) => {
  const data = validateBody(req.body, {
    kind: { required: true, enum: ['update_details', 'purchase', 'inspection', 'other'] },
    message: {},
  });
  const ext = await query('SELECT serial_number, location FROM fire_extinguishers WHERE id = $1', [req.params.id]);
  if (!ext.rowCount) throw ApiError.notFound('Extinguisher not found');

  const labels = {
    update_details: 'requested an update to the details/location of',
    purchase: 'requested the purchase of a unit like',
    inspection: 'requested an inspection of',
    other: 'sent a request about',
  };
  const { notifyRoles } = require('@fems/shared');
  await notifyRoles(['admin', 'inspector'], {
    type: 'request',
    title: 'User request',
    message: `${req.user.email} ${labels[data.kind]} ${ext.rows[0].serial_number} (${ext.rows[0].location}).` +
      (data.message ? ` Note: ${data.message}` : ''),
    relatedEntity: 'extinguisher',
    relatedId: req.params.id,
  });
  res.status(201).json({ message: 'Your request has been sent to the team.' });
});

module.exports = { create, list, getById, update, remove, requestAction };
