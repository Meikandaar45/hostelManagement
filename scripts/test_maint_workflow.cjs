const http = require('http');

async function run() {
  // 1. Login as maint_p3
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'maint_p3', password: 'password123' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  console.log('MAINT LOGIN:', loginRes.status === 200 ? 'SUCCESS' : 'FAILED');

  // 2. Fetch tasks
  const tasksRes = await fetch('http://localhost:5000/api/my-tasks', { headers: { cookie } });
  const tasksData = await tasksRes.json();
  console.log('MY TASKS COUNT:', tasksData.data.items.length);
  const task = tasksData.data.items[0];
  console.log('TASK ID:', task.id, 'TICKET:', task.ticket_id, 'STATUS:', task.status);

  // 3. Start Work (status -> IN_PROGRESS)
  const startRes = await fetch('http://localhost:5000/api/complaints/' + task.id + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ status: 'IN_PROGRESS' })
  });
  console.log('START WORK RES:', await startRes.json());

  // 4. Mark Resolved with work notes
  const resolveRes = await fetch('http://localhost:5000/api/complaints/' + task.id + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      status: 'RESOLVED',
      work_notes: 'Replaced faulty electrical plug and verified voltage. Tested safe.'
    })
  });
  console.log('RESOLVE RES:', await resolveRes.json());

  // 5. Verify task is resolved and history recorded
  const histRes = await fetch('http://localhost:5000/api/complaints/' + task.id + '/history', { headers: { cookie } });
  const histData = await histRes.json();
  console.log('HISTORY TRANSITIONS:', histData.data.history.map(h => ({
    from: h.from_status,
    to: h.to_status,
    notes: h.work_notes
  })));
}

run().catch(console.error);
