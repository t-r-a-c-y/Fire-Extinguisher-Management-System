/** OpenAPI 3.0 spec for the Fire Extinguisher Management service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — Fire Extinguisher Management Service',
    version: '1.0.0',
    description: 'CRUD for fire extinguisher records (serial, location, type, size, dates, status).',
  },
  servers: [
    { url: 'http://localhost:8080/api/extinguishers', description: 'Via API gateway' },
    { url: 'http://localhost:4002', description: 'Direct' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Extinguisher: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          serialNumber: { type: 'string' },
          location: { type: 'string' },
          type: { type: 'string', enum: ['water', 'co2', 'foam', 'dry_chemical'] },
          size: { type: 'string', enum: ['2.5lb', '5lb', '9lb', '12lb'] },
          installationDate: { type: 'string', format: 'date' },
          expiryDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['active', 'maintenance', 'expired', 'decommissioned'] },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/extinguishers': {
      get: {
        tags: ['Extinguishers'], summary: 'List extinguishers (filterable)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', description: 'Search serial/location', schema: { type: 'string' } },
          { name: 'expiringInDays', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'List' } },
      },
      post: {
        tags: ['Extinguishers'], summary: 'Register a new extinguisher (admin/inspector)',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          required: ['serialNumber', 'location', 'type', 'size', 'installationDate', 'expiryDate'],
          properties: {
            serialNumber: { type: 'string', example: 'FE-2001' },
            location: { type: 'string', example: 'Building D — Lab' },
            type: { type: 'string', enum: ['water', 'co2', 'foam', 'dry_chemical'] },
            size: { type: 'string', enum: ['2.5lb', '5lb', '9lb', '12lb'] },
            installationDate: { type: 'string', format: 'date', example: '2026-01-01' },
            expiryDate: { type: 'string', format: 'date', example: '2031-01-01' },
            status: { type: 'string', enum: ['active', 'maintenance', 'expired', 'decommissioned'] },
          },
        } } } },
        responses: { 201: { description: 'Created' }, 409: { description: 'Serial exists' } },
      },
    },
    '/extinguishers/{id}': {
      get: { tags: ['Extinguishers'], summary: 'Get extinguisher by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Extinguisher' }, 404: { description: 'Not found' } } },
      patch: { tags: ['Extinguishers'], summary: 'Update extinguisher (admin/inspector)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated' } } },
      delete: { tags: ['Extinguishers'], summary: 'Delete extinguisher (admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } } },
    },
  },
};
