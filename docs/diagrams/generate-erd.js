/**
 * Generates docs/diagrams/database-erd.svg — a standalone, dependency-free
 * vector ERD for the FEMS database. Run: `node docs/diagrams/generate-erd.js`.
 * The layout matches the schema in db/migrations and docs/ERD.md.
 */
const fs = require('fs');
const path = require('path');

// --- Entities: name + key columns (PK / UK / FK marked) -----------------------
const entities = {
  refresh_tokens: { x: 40, y: 40, cols: [
    ['id', 'uuid', 'PK'], ['user_id', 'uuid', 'FK'], ['token_hash', 'varchar', ''], ['revoked', 'boolean', ''],
  ]},
  password_resets: { x: 40, y: 220, cols: [
    ['id', 'uuid', 'PK'], ['user_id', 'uuid', 'FK'], ['token_hash', 'varchar', ''], ['used', 'boolean', ''],
  ]},
  notifications: { x: 40, y: 400, cols: [
    ['id', 'uuid', 'PK'], ['user_id', 'uuid', 'FK'], ['type', 'varchar', ''], ['title', 'varchar', ''], ['is_read', 'boolean', ''],
  ]},
  users: { x: 360, y: 210, accent: true, cols: [
    ['id', 'uuid', 'PK'], ['email', 'varchar', 'UK'], ['password_hash', 'varchar', ''], ['role', 'user_role', ''], ['is_active', 'boolean', ''],
  ]},
  fire_extinguishers: { x: 680, y: 60, accent: true, cols: [
    ['id', 'uuid', 'PK'], ['serial_number', 'varchar', 'UK'], ['type', 'enum', ''], ['status', 'enum', ''], ['expiry_date', 'date', ''], ['created_by', 'uuid', 'FK'],
  ]},
  inspections: { x: 680, y: 370, cols: [
    ['id', 'uuid', 'PK'], ['extinguisher_id', 'uuid', 'FK'], ['assigned_to', 'uuid', 'FK'], ['scheduled_by', 'uuid', 'FK'], ['status', 'enum', ''], ['result', 'enum', ''],
  ]},
  maintenance_logs: { x: 1010, y: 230, cols: [
    ['id', 'uuid', 'PK'], ['extinguisher_id', 'uuid', 'FK'], ['inspection_id', 'uuid', 'FK'], ['performed_by', 'uuid', 'FK'], ['action_taken', 'varchar', ''],
  ]},
};

// --- Relationships: [from, to, label, fromSide, toSide] -----------------------
const HEAD = 30, ROW = 22, W = 250;
const rels = [
  ['users', 'refresh_tokens', 'has', 'L', 'R'],
  ['users', 'password_resets', 'has', 'L', 'R'],
  ['users', 'notifications', 'receives', 'L', 'R'],
  ['users', 'fire_extinguishers', 'created_by', 'R', 'L'],
  ['users', 'inspections', 'assigned / scheduled', 'R', 'L'],
  ['fire_extinguishers', 'inspections', 'inspected by', 'B', 'T'],
  ['fire_extinguishers', 'maintenance_logs', 'maintained by', 'R', 'T'],
  ['inspections', 'maintenance_logs', 'may trigger', 'R', 'B'],
  ['users', 'maintenance_logs', 'performed_by', 'B', 'L'],
];

const H = (e) => HEAD + e.cols.length * ROW;
const sidePoint = (e, side) => {
  const h = H(e);
  if (side === 'L') return [e.x, e.y + h / 2];
  if (side === 'R') return [e.x + W, e.y + h / 2];
  if (side === 'T') return [e.x + W / 2, e.y];
  return [e.x + W / 2, e.y + h]; // B
};

let boxes = '', lines = '';

for (const [from, to, label, fs1, ts] of rels) {
  const [x1, y1] = sidePoint(entities[from], fs1);
  const [x2, y2] = sidePoint(entities[to], ts);
  // Orthogonal-ish elbow for readability.
  const mx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  const lx = (x1 + x2) / 2, ly = (y1 + y2) / 2 - 6;
  lines += `<path d="${d}" fill="none" stroke="#94a3b8" stroke-width="1.6"/>\n`;
  // crow's-foot "many" marker at the child (to) end.
  lines += `<circle cx="${x2}" cy="${y2}" r="3.2" fill="#fff" stroke="#64748b" stroke-width="1.4"/>\n`;
  lines += `<text x="${lx}" y="${ly}" font-size="11" fill="#64748b" text-anchor="middle" font-family="ui-sans-serif,Segoe UI,Arial">${label}</text>\n`;
}

for (const [name, e] of Object.entries(entities)) {
  const h = H(e);
  const head = e.accent ? '#b91c1c' : '#334155';
  boxes += `<g>
    <rect x="${e.x}" y="${e.y}" width="${W}" height="${h}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <rect x="${e.x}" y="${e.y}" width="${W}" height="${HEAD}" rx="8" fill="${head}"/>
    <rect x="${e.x}" y="${e.y + HEAD - 8}" width="${W}" height="8" fill="${head}"/>
    <text x="${e.x + 12}" y="${e.y + 20}" font-size="14" font-weight="700" fill="#fff" font-family="ui-monospace,Consolas,monospace">${name}</text>\n`;
  e.cols.forEach(([col, type, key], i) => {
    const cy = e.y + HEAD + i * ROW + 15;
    const keyColor = key === 'PK' ? '#b91c1c' : key === 'FK' ? '#2563eb' : key === 'UK' ? '#7c3aed' : '#94a3b8';
    boxes += `<text x="${e.x + 12}" y="${cy}" font-size="12.5" fill="#0f172a" font-family="ui-monospace,Consolas,monospace">${col}</text>`;
    boxes += `<text x="${e.x + W - 12}" y="${cy}" font-size="11" fill="${keyColor}" text-anchor="end" font-family="ui-monospace,Consolas,monospace">${key || type}</text>\n`;
    if (i < e.cols.length - 1) boxes += `<line x1="${e.x + 8}" y1="${cy + 6}" x2="${e.x + W - 8}" y2="${cy + 6}" stroke="#f1f5f9" stroke-width="1"/>\n`;
  });
  boxes += `</g>\n`;
}

const VW = 1290, VH = 600;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VW}" height="${VH}" viewBox="0 0 ${VW} ${VH}" font-family="ui-sans-serif,Segoe UI,Arial">
  <rect width="${VW}" height="${VH}" fill="#f8fafc"/>
  <text x="40" y="32" font-size="22" font-weight="800" fill="#b91c1c">TZW FEMS — Database ERD</text>
  <text x="40" y="52" font-size="12.5" fill="#64748b">PostgreSQL 16 · UUID primary keys · one-to-many relationships (●&#160;= many side)</text>
  <g transform="translate(0,30)">
${lines}${boxes}
    <g transform="translate(40,${VH - 70})" font-size="11.5" font-family="ui-monospace,Consolas,monospace">
      <text x="0" y="0" fill="#b91c1c" font-weight="700">PK</text><text x="26" y="0" fill="#475569">primary key</text>
      <text x="130" y="0" fill="#2563eb" font-weight="700">FK</text><text x="156" y="0" fill="#475569">foreign key</text>
      <text x="260" y="0" fill="#7c3aed" font-weight="700">UK</text><text x="286" y="0" fill="#475569">unique key</text>
    </g>
  </g>
</svg>`;

const out = path.join(__dirname, 'database-erd.svg');
fs.writeFileSync(out, svg, 'utf8');
console.log('Wrote', out);
