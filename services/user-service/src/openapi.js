/** OpenAPI 3.0 spec for the User Management & Authentication service. */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'FEMS — User Management & Authentication Service',
    version: '1.0.0',
    description:
      'Registration, JWT authentication, role-based access control, profile management and password recovery for the Fire Extinguisher Management System.',
  },
  servers: [
    { url: 'http://localhost:8080/api/users', description: 'Via API gateway' },
    { url: 'http://localhost:4001', description: 'Direct' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'inspector', 'user'] },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'object', properties: { message: { type: 'string' } } } },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a new account (role = user)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['firstName', 'lastName', 'email', 'password'],
            properties: {
              firstName: { type: 'string' }, lastName: { type: 'string' },
              email: { type: 'string', format: 'email' },
              password: { type: 'string', example: 'Password123!' },
            },
          } } },
        },
        responses: { 201: { description: 'Created' }, 409: { description: 'Email exists' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Log in and receive access + refresh tokens',
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['email', 'password'],
          properties: { email: { type: 'string' }, password: { type: 'string' } },
        } } } },
        responses: { 200: { description: 'Tokens + user' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Exchange a refresh token for a new access token',
        responses: { 200: { description: 'New access token' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoke a refresh token', responses: { 200: { description: 'OK' } } },
    },
    '/auth/forgot-password': {
      post: { tags: ['Auth'], summary: 'Request a password reset token', responses: { 200: { description: 'OK' } } },
    },
    '/auth/reset-password': {
      post: { tags: ['Auth'], summary: 'Reset password using a token', responses: { 200: { description: 'OK' } } },
    },
    '/users/me': {
      get: { tags: ['Profile'], summary: 'Get my profile', security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User' } } },
      patch: { tags: ['Profile'], summary: 'Update my profile', security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'User' } } },
    },
    '/users/me/change-password': {
      post: { tags: ['Profile'], summary: 'Change my password', security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'OK' } } },
    },
    '/users': {
      get: { tags: ['Admin'], summary: 'List users (admin)', security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'inspector', 'user'] } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Users' }, 403: { description: 'Forbidden' } } },
      post: { tags: ['Admin'], summary: 'Create a user with a role (admin)', security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Created' } } },
    },
    '/users/{id}': {
      get: { tags: ['Admin'], summary: 'Get a user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User' } } },
      patch: { tags: ['Admin'], summary: 'Update a user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User' } } },
      delete: { tags: ['Admin'], summary: 'Delete a user (admin)', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Deleted' } } },
    },
  },
};
