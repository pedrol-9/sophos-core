import { processBulkImport } from '../../src/services/adminService';
import * as fs from 'fs';
import * as path from 'path';

// Cargar .env.local programáticamente antes de iniciar cualquier cliente
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[match[1]] = value.trim();
    }
  });
}

async function testInstitution(idInstitucion: string, name: string) {
  console.log(`\n=========================================================`);
  console.log(`PROBANDO IMPORTACIÓN PARA: ${name} (${idInstitucion})`);
  console.log(`=========================================================`);

  const filePath = path.join(__dirname, '..', '..', 'src', 'docs', 'SOPHOS_DB_UPLOADER_2.txt');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  const result = await processBulkImport(lines, idInstitucion);
  
  console.log(`Resultados:`);
  console.log(`- Exitosos: ${result.successCount}`);
  console.log(`- Errores: ${result.errorCount}`);
  
  if (result.errors && result.errors.length > 0) {
    console.log(`\nDetalles de los Errores (${result.errors.length}):`);
    result.errors.forEach(err => {
      console.log(`  * ${err}`);
    });
  }
}

async function main() {
  // IE José María Carbonell
  await testInstitution('1aff3832-7191-4a69-8d1f-8a8585d2ea4e', 'IE José María Carbonell');
  
  // Colegio Integrado Helena Santos Rosillo
  await testInstitution('3941921c-a9eb-4bcb-ae71-fc6cc2ae5bac', 'Colegio Integrado Helena Santos Rosillo');
}

main().catch(err => {
  console.error("Error en ejecución:", err);
});
