/**
 * Quick test for QR retry system
 * Run: node test-qr-retry.js
 */

const BRIDGE_URL = 'http://localhost:3001';
const TEST_USER = 'test-retry-' + Date.now();

console.log('🧪 Testing QR Retry System');
console.log('========================\n');

async function register() {
  console.log('1️⃣ Registering user...');
  const res = await fetch(`${BRIDGE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER })
  });
  const data = await res.json();
  console.log(`   ✅ Registered: ${data.apiKey.substring(0, 20)}...\n`);
  return data;
}

async function connect(apiKey) {
  console.log('2️⃣ Connecting (this will generate QR 1/3)...');
  const res = await fetch(`${BRIDGE_URL}/users/${TEST_USER}/connect`, {
    method: 'POST',
    headers: {
      'X-User-ID': TEST_USER,
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  console.log(`   ✅ ${data.message}\n`);
}

async function checkStatus(apiKey) {
  const res = await fetch(`${BRIDGE_URL}/users/${TEST_USER}/status`, {
    headers: {
      'X-User-ID': TEST_USER,
      'X-API-Key': apiKey
    }
  });
  return await res.json();
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  try {
    const { apiKey } = await register();
    
    // Connect and start QR generation
    await connect(apiKey);
    
    // Check status 3 times with 15 second intervals
    // (Each Baileys QR expires after ~20 seconds)
    console.log('3️⃣ Monitoring QR attempts...\n');
    
    for (let i = 1; i <= 4; i++) {
      await wait(15000); // Wait 15 seconds
      
      const status = await checkStatus(apiKey);
      console.log(`   Check ${i}:`);
      console.log(`   - Status: ${status.sessionStatus}`);
      console.log(`   - Attempts: ${status.qrAttempts}/${status.maxQrAttempts}`);
      console.log(`   - QR: ${status.qr ? 'YES (' + status.qr.length + ' chars)' : 'NO'}`);
      console.log(`   - Message: ${status.message}`);
      console.log('');
      
      if (status.sessionStatus === 'QR_EXPIRED') {
        console.log('✅ QR_RETRY_SYSTEM working correctly!');
        console.log('   Session expired after max attempts');
        break;
      }
      
      if (status.connected) {
        console.log('✅ Successfully connected!');
        break;
      }
    }
    
    console.log('\n💡 Check frontend - it should show attempt counter');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

test();
