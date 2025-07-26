// Test mandiri API /api/member-qr
const fetch = global.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)));

(async () => {
  const res = await fetch('http://localhost:3000/api/member-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 'test-member-456',
      name: 'Test Member Server',
      phone: '081234567891'
    })
  });
  const data = await res.json();
  console.log(data);
})(); 