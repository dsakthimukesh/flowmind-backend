import { prisma } from '../src/prisma/prisma.js';

async function main() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent documents:');
  for (const doc of docs) {
    console.log(`ID: ${doc.id}`);
    console.log(`FileName: ${doc.fileName}`);
    console.log(`Status: ${doc.status}`);
    console.log(`Error: ${doc.errorMessage}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
