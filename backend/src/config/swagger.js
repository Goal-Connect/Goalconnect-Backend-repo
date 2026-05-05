const path = require('path');
const fs   = require('fs');
const yaml = require('js-yaml');

const specPath = path.join(__dirname, '../docs/openapi.yaml');
const swaggerSpec = yaml.load(fs.readFileSync(specPath, 'utf8'));

module.exports = swaggerSpec;
