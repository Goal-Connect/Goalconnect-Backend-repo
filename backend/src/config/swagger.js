const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GoalConnect API',
      version: '1.0.0',
      description: 'API documentation for GoalConnect backend',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local development server',
      },
    ],
  },
  // Files containing annotations for the OpenAPI specification
  apis: ['src/routes/*.js', 'src/controllers/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
