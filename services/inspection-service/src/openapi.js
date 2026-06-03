/** OpenAPI 3.0 spec for the Inspection & Maintenance service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — Inspection & Maintenance Service',
    version: '1.0.0',
    description: 'Schedule inspections, record results, and log maintenance activities.',
  },
  servers: [
    { url: 'http://localhost:8080/api/inspections', description: 'Via API gateway' },
    { url: 'http://localhost:4003', description: 'Direct' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/inspections': {
      get: {
        tags: ['Inspections'], summary: 'List inspections (filterable)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'overdue', 'cancelled'] } },
          { name: 'extinguisherId', in: 'query', schema: { type: 'string' } },
          { name: 'assignedTo', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'List' } },
      },
      post: {
        tags: ['Inspections'], summary: 'Schedule an inspection',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['extinguisherId', 'scheduledDate'],
          properties: {
            extinguisherId: { type: 'string', format: 'uuid' },
            scheduledDate: { type: 'string', format: 'date' },
            scheduledTime: { type: 'string', example: '09:30' },
            assignedTo: { type: 'string', format: 'uuid', description: 'Inspector user id' },
            notes: { type: 'string' },
          },
        } } } },
        responses: { 201: { description: 'Scheduled' } },
      },
    },
    '/inspections/{id}': {
      get: { tags: ['Inspections'], summary: 'Get inspection',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Inspection' } } },
      patch: { tags: ['Inspections'], summary: 'Reschedule / reassign (admin/inspector)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Inspections'], summary: 'Delete inspection (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } } },
    },
    '/inspections/{id}/complete': {
      post: {
        tags: ['Inspections'], summary: 'Record inspection result (admin/inspector)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['result'],
          properties: { result: { type: 'string', enum: ['pass', 'fail', 'needs_maintenance'] }, notes: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'Completed' } },
      },
    },
    '/maintenance': {
      get: { tags: ['Maintenance'], summary: 'List maintenance logs',
        parameters: [
          { name: 'extinguisherId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'List' } } },
      post: {
        tags: ['Maintenance'], summary: 'Log maintenance activity (admin/inspector)',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['extinguisherId', 'actionTaken', 'maintenanceDate'],
          properties: {
            extinguisherId: { type: 'string', format: 'uuid' },
            inspectionId: { type: 'string', format: 'uuid' },
            actionTaken: { type: 'string', example: 'Recharged cylinder' },
            maintenanceDate: { type: 'string', format: 'date' },
            issuesIdentified: { type: 'string' },
            notes: { type: 'string' },
            recommendations: { type: 'string' },
          },
        } } } },
        responses: { 201: { description: 'Logged' } },
      },
    },
    '/maintenance/{id}': {
      get: { tags: ['Maintenance'], summary: 'Get maintenance record',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Record' } } },
    },
  },
};
