/**
 * Factory that builds a baseline Express app with the cross-cutting middleware
 * every FEMS service shares: security headers, CORS, JSON parsing, request
 * logging, a health endpoint, optional Swagger UI, and the 404 + error tail.
 *
 * Each service supplies its name, routes and (optionally) an OpenAPI spec.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { notFoundHandler, errorHandler } = require('./http');

/**
 * @param {object} opts
 * @param {string} opts.serviceName
 * @param {(app: import('express').Express) => void} opts.mountRoutes
 * @param {object} [opts.openapi]  OpenAPI spec object to serve at /docs
 */
function createApp({ serviceName, mountRoutes, openapi }) {
  const app = express();

  // These services return JSON + file downloads (and serve Swagger UI at /docs),
  // not a security-sensitive HTML app. Helmet's default strict CSP and
  // `same-origin` resource policy block legitimate cross-origin downloads and
  // the Swagger assets, so disable those two while keeping the rest.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    exposedHeaders: ['Content-Disposition'], // let cross-origin callers read the filename
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Health / readiness probe used by docker-compose + the gateway.
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: serviceName, time: new Date().toISOString() })
  );

  if (openapi) {
    app.get('/openapi.json', (_req, res) => res.json(openapi));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: `${serviceName} API` }));
  }

  mountRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
