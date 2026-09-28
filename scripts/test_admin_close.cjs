async function run() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin_p3', password: 'password123' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('ADMIN LOGIN:', loginRes.status === 200 ? 'SUCCESS' : 'FAILED');

  // Close ticket 102
  const closeRes = await fetch('http://localhost:5000/api/complaints/102/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ status: 'CLOSED', work_notes: 'Resolution verified by administration' })
  });
  console.log('CLOSE RES:', await closeRes.json());

  // Verify final history
  const histRes = await fetch('http://localhost:5000/api/complaints/102/history', { headers: { cookie } });
  const histData = await histRes.json();
  console.log('FINAL HISTORY:', histData.data.history.map(h => ({
    from: h.from_status,
    to: h.to_status,
    notes: h.work_notes
  })));
}

run().catch(console.error);
