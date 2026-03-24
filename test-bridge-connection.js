/**
 * Simple test script for WhatsApp bridge connection
 * Run with: node test-bridge-connection.js
 */

const BRIDGE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test-user-' + Date.now();
let TEST_API_KEY = null; // Will be set after registration

console.log('🧪 WhatsApp Bridge Connection Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Test User ID: ${TEST_USER_ID}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  console.log('1️⃣ Testing health check...');
  const response = await fetch(`${BRIDGE_URL}/health`);
  const data = await response.json();
  console.log('✅ Health check:', data);
  return data;
}

async function testRegister() {
  console.log('\n2️⃣ Registering user...');
  const response = await fetch(`${BRIDGE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: TEST_USER_ID })
  });
  const data = await response.json();
  console.log('✅ Registration:', data);
  
  // Store the API key for subsequent requests
  TEST_API_KEY = data.apiKey;
  console.log(`🔑 API Key received: ${TEST_API_KEY.substring(0, 20)}...`);
  
  return data;
}

async function testConnect() {
  console.log('\n3️⃣ Starting WhatsApp connection...');
  const response = await fetch(`${BRIDGE_URL}/users/${TEST_USER_ID}/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': TEST_USER_ID,
      'X-API-Key': TEST_API_KEY
    }
  });
  const data = await response.json();
  console.log('✅ Connection started:', data);
  return data;
}

async function testGetStatus() {
  console.log('\n4️⃣ Checking connection status...');
  const response = await fetch(`${BRIDGE_URL}/users/${TEST_USER_ID}/status`, {
    headers: {
      'X-User-ID': TEST_USER_ID,
      'X-API-Key': TEST_API_KEY
    }
  });
  const data = await response.json();
  
  if (data.qr) {
    console.log('📱 QR Code available! Length:', data.qr.length);
    console.log('🔄 Status:', data.message);
  } else {
    console.log('⏳ Status:', data.message);
  }
  
  return data;
}

async function pollForQR(maxAttempts = 20, interval = 3000) {
  console.log(`\n🔄 Polling for QR code (${maxAttempts} attempts, ${interval}ms interval)...\n`);
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`   Attempt ${i + 1}/${maxAttempts}...`);
    const status = await testGetStatus();
    
    if (status.qr) {
      console.log('\n✅ QR CODE RECEIVED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`QR Code (first 50 chars): ${status.qr.substring(0, 50)}...`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return status;
    }
    
    if (status.error) {
      console.log(`\n❌ Error: ${status.error}`);
      return status;
    }
    
    await sleep(interval);
  }
  
  console.log('\n⚠️ Timeout: No QR code received after all attempts');
  return null;
}

async function runTest() {
  try {
    // Step 1: Health check
    await testHealthCheck();
    await sleep(1000);
    
    // Step 2: Register
    await testRegister();
    await sleep(1000);
    
    // Step 3: Connect
    await testConnect();
    await sleep(2000);
    
    // Step 4: Poll for QR
    const result = await pollForQR();
    
    if (result && result.qr) {
      console.log('\n🎉 SUCCESS! WhatsApp connection is working!');
      console.log('💡 You can now scan the QR code with WhatsApp mobile app');
    } else {
      console.log('\n❌ FAILED: Could not get QR code');
      console.log('💡 Check the bridge logs with: pm2 logs whatsapp-bridge-multi');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('💡 Make sure the bridge is running: pm2 status');
  }
}

// Run the test
runTest();
