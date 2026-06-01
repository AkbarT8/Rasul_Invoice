import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const adminPass  = process.env.ADMIN_PASSWORD || 'admin12345';

  const passwordHash = await bcrypt.hash(adminPass, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Administrator',
      role: 'ADMIN',
      passwordHash
    }
  });
  // Always (re)set password if env provided — useful for resets in dev.
  if (process.env.ADMIN_PASSWORD) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash }
    });
  }

  // Seed one sample client + proforma only if DB is empty.
  const clientCount = await prisma.client.count();
  if (clientCount === 0) {
    const c = await prisma.client.create({
      data: {
        name: 'Sample Trading LLC',
        companyName: 'Sample Trading LLC',
        email: 'orders@sample.example',
        phone: '+1 555 000 1234',
        country: 'USA',
        notes: 'Это пример клиента. Можно удалить.',
        createdById: admin.id
      }
    });

    const cols = ['Article', 'Quantity', 'Price', 'Weight', 'Delivery'];
    const proforma = await prisma.proforma.create({
      data: {
        clientId: c.id,
        number: 'INV-1001',
        status: 'PENDING',
        currency: 'USD',
        notes: 'Demo proforma',
        createdById: admin.id,
        columns: { create: cols.map((name, i) => ({ name, order: i, type: i === 1 || i === 2 || i === 3 ? 'number' : 'text', width: i === 0 ? 220 : 130 })) }
      },
      include: { columns: { orderBy: { order: 'asc' } } }
    });

    const rowsData = [
      ['Steel pipe 50mm', '120', '12.5', '0.85', 'Sea, 14d'],
      ['Steel pipe 75mm', '60',  '18.9', '1.40', 'Sea, 14d'],
      ['Aluminum sheet 2mm', '300', '8.75', '0.40', 'Air, 5d']
    ];
    for (let i = 0; i < rowsData.length; i++) {
      const row = await prisma.proformaRow.create({ data: { proformaId: proforma.id, order: i } });
      for (let j = 0; j < proforma.columns.length; j++) {
        await prisma.proformaCell.create({
          data: {
            rowId: row.id,
            columnId: proforma.columns[j]!.id,
            value: rowsData[i]![j] || ''
          }
        });
      }
    }
  }

  console.log(`Seed complete. Admin: ${adminEmail} / ${adminPass}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
