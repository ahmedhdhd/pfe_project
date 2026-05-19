const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix config cast
  content = content.replace(/const config = await prisma\.organizationConfig\.findUnique\(\{ where: \{ organizationId: (.*?)\.organizationId \} \}\);/g, 
    'const config = await prisma.organizationConfig.findUnique({ where: { organizationId: $1.organizationId } }) as any;');
  
  // Fix config cast for order.organizationId
  content = content.replace(/const config = await prisma\.organizationConfig\.findUnique\(\{ where: \{ organizationId: order\.organizationId \} \}\);/g, 
    'const config = await prisma.organizationConfig.findUnique({ where: { organizationId: order.organizationId } }) as any;');

  // Fix req.user!.username to avoid TS errors
  content = content.replace(/req\.user!\.username/g, "req.user!.email?.split('@')[0] || 'Learner'");

  fs.writeFileSync(filePath, content, 'utf8');
}

fixFile(path.join(__dirname, 'queztlearn-backend/src/controllers/batch.controller.ts'));
fixFile(path.join(__dirname, 'queztlearn-backend/src/controllers/testSeries.controller.ts'));

console.log('Fixed controllers');
