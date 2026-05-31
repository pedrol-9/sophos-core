const fs = require('fs');
const path = require('path');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in the environment.');
  console.error('Run this script using Node\'s native env-file support:');
  console.error('  node --env-file=.env.local scratch/db/generate-db-docs.js\n');
  process.exit(1);
}

const restUrl = `${url.replace(/\/$/, '')}/rest/v1/`;

async function main() {
  try {
    console.log('Fetching OpenAPI schema from Supabase...');
    const response = await fetch(restUrl, {
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
    }

    const schema = await response.json();
    
    // Save raw OpenAPI JSON in same folder as script
    const openApiFile = path.join(__dirname, 'openapi_schema.json');
    fs.writeFileSync(openApiFile, JSON.stringify(schema, null, 2));
    console.log(`Raw OpenAPI schema saved to ${openApiFile}`);

    // Parse and generate Markdown & SQL
    const definitions = schema.definitions || {};
    let markdown = '# Sophos Core - Database Schema Documentation\n\n';
    let sql = '-- Sophos Core Database DDL Schema (Auto-generated from Live PostgREST)\n\n';

    markdown += `Generated dynamically from the live database schema on ${new Date().toLocaleString()}.\n\n`;

    const tables = Object.keys(definitions).sort();

    for (const tableName of tables) {
      const tableDef = definitions[tableName];
      const properties = tableDef.properties || {};
      const required = tableDef.required || [];

      markdown += `## Table: \`${tableName}\`\n\n`;
      if (tableDef.description) {
        markdown += `*Description:* ${tableDef.description}\n\n`;
      }

      markdown += '| Column | Type | Required | Format / Details |\n';
      markdown += '| --- | --- | --- | --- |\n';

      let tableSqlColumns = [];

      for (const propName of Object.keys(properties)) {
        const prop = properties[propName];
        const isRequired = required.includes(propName) ? 'Yes' : 'No';
        let typeStr = prop.type || 'unknown';
        let formatOrDetails = '';

        if (prop.format) {
          formatOrDetails += `Format: \`${prop.format}\`. `;
        }
        if (prop.description) {
          formatOrDetails += prop.description;
        }

        markdown += `| \`${propName}\` | \`${typeStr}\` | ${isRequired} | ${formatOrDetails || '-'} |\n`;

        // Build SQL column definition
        let sqlColType = 'TEXT';
        if (typeStr === 'integer') sqlColType = 'INTEGER';
        else if (typeStr === 'number') sqlColType = 'NUMERIC';
        else if (typeStr === 'boolean') sqlColType = 'BOOLEAN';

        if (prop.format === 'uuid') {
          sqlColType = 'UUID';
        }

        let sqlColLine = `  ${propName} ${sqlColType}`;
        if (isRequired === 'Yes') {
          sqlColLine += ' NOT NULL';
        }
        if (propName === `id_${tableName.replace(/_matriculados$/, '').replace(/s_suscripcion$/, '_suscripcion')}`) {
          sqlColLine += ' PRIMARY KEY';
        }
        tableSqlColumns.push(sqlColLine);
      }

      markdown += '\n';

      // Build SQL block
      sql += `CREATE TABLE ${tableName} (\n`;
      sql += tableSqlColumns.join(',\n');
      sql += '\n);\n\n';
    }

    const mdFile = path.join(__dirname, 'database_schema.md');
    const sqlFile = path.join(__dirname, 'schema.sql');
    fs.writeFileSync(mdFile, markdown);
    fs.writeFileSync(sqlFile, sql);
    
    console.log(`Markdown documentation generated at ${mdFile}`);
    console.log(`SQL DDL script generated at ${sqlFile}`);
    console.log('\nAll database representation files generated successfully!');

  } catch (error) {
    console.error('Error generating database documentation:', error);
  }
}

main();
