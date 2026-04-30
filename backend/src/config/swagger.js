const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GoalConnect Backend API',
      version: '1.0.0',
      description: 'API documentation for GoalConnect backend',
    },
  },
  // Canonical OpenAPI source file
  apis: [path.join(__dirname, '../docs/openapi.yaml')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
