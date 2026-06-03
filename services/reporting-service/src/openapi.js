/** OpenAPI 3.0 spec for the Reporting service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — Reporting Service',
    version: '1.0.0',
    description: 'Real-time inventory, inspection, compliance and maintenance reports with PDF/CSV export.',
  },
  servers: [
    { url: 'http://localhost:8080/api/reports', description: 'Via API gateway (paths below are relative to /api)' },
    { url: 'http://localhost:4004', description: 'Direct' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/reports/summary': { get: { tags: ['Reports'], summary: 'Dashboard summary (aggregate)', responses: { 200: { description: 'Summary' } } } },
    '/reports/inventory': { get: { tags: ['Reports'], summary: 'Inventory report (totals, daily/monthly/yearly)', responses: { 200: { description: 'Inventory' } } } },
    '/reports/inspections': { get: { tags: ['Reports'], summary: 'Inspection report (pending/completed/overdue)', responses: { 200: { description: 'Inspections' } } } },
    '/reports/compliance': {
      get: { tags: ['Reports'], summary: 'Compliance report (expired, upcoming, %)',
        parameters: [{ name: 'upcomingDays', in: 'query', schema: { type: 'integer', default: 30 } }],
        responses: { 200: { description: 'Compliance' } } },
    },
    '/reports/maintenance': { get: { tags: ['Reports'], summary: 'Maintenance report (history, frequency, recent)', responses: { 200: { description: 'Maintenance' } } } },
    '/reports/{type}/export': {
      get: {
        tags: ['Export'], summary: 'Export a report as PDF or CSV',
        parameters: [
          { name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['inventory', 'inspections', 'compliance', 'maintenance'] } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['pdf', 'csv'], default: 'pdf' } },
        ],
        responses: { 200: { description: 'Binary file (application/pdf or text/csv)' } },
      },
    },
  },
};
