const productIds = Array.from({ length: 20 }, (_, i) => `PROD-${String(i + 1).padStart(4, '0')}`);
const dairyIds = ['PROD-0001', 'PROD-0011'];
const baseTs = Math.floor(new Date('2025-08-26T00:00:00Z').getTime() / 1000);
const endTs = Math.floor(new Date('2026-02-26T23:59:00Z').getTime() / 1000);
const range = endTs - baseTs;

function randomTs() { return baseTs + Math.floor(Math.random() * range); }
function randomItem() {
  return productIds[Math.floor(Math.random() * productIds.length)];
}

const rows = [];
const header = 'USER_ID,ITEM_ID,TIMESTAMP';

// USER_001: 22 rows, frequently PROD-0001 and PROD-0002
for (let i = 0; i < 9; i++) rows.push(['USER_001', 'PROD-0001', randomTs()]);
for (let i = 0; i < 9; i++) rows.push(['USER_001', 'PROD-0002', randomTs()]);
for (let i = 0; i < 4; i++) rows.push(['USER_001', randomItem(), randomTs()]);

// USER_002: 23 rows, frequently dairy
for (let i = 0; i < 12; i++) rows.push(['USER_002', dairyIds[Math.floor(Math.random() * 2)], randomTs()]);
for (let i = 0; i < 11; i++) rows.push(['USER_002', randomItem(), randomTs()]);

// USER_003 to USER_010: 155 rows total (15-25 each, sum 200)
const counts = [20, 19, 20, 19, 19, 19, 19, 20];
for (let u = 3; u <= 10; u++) {
  const n = counts[u - 3];
  for (let i = 0; i < n; i++) {
    rows.push([`USER_${String(u).padStart(3, '0')}`, randomItem(), randomTs()]);
  }
}

rows.sort((a, b) => a[2] - b[2]);
const lines = [header, ...rows.map(r => r.join(','))];
require('fs').writeFileSync(require('path').join(__dirname, 'orders.csv'), lines.join('\n'), 'utf8');
console.log('Wrote orders.csv, rows:', lines.length - 1);
