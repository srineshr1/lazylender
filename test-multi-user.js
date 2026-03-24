/**
 * Multi-user isolation test for WhatsApp bridge
 * Run with: node test-multi-user.js
 */

const BRIDGE_URL = 'http://localhost:3001';
const USER_1_ID = 'test-multi-user-1-' + Date.now();
const USER_2_ID = 'test-multi-user-2-' + Date.now();

console.log('🧪 WhatsApp Bridge Multi-User Isolation Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`👤 User 1: ${USER_1_ID}`);
console.log(`👤 User 2: ${USER_2_ID}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerUser(userId) {
  console.log(`\n📝 Registering ${userId}...`);
  const response = await fetch(`${BRIDGE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const data = await response.json();
  console.log(`✅ ${userId} registered with API key: ${data.apiKey.substring(0, 20)}...`);
  return data;
}

async function connectUser(userId, apiKey) {
  console.log(`\n🔌 Connecting ${userId}...`);
  const response = await fetch(`${BRIDGE_URL}/users/${userId}/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId,
      'X-API-Key': apiKey
    }
  });
  const data = await response.json();
  console.log(`✅ ${userId} connection initiated`);
  return data;
}

async function getStatus(userId, apiKey) {
  const response = await fetch(`${BRIDGE_URL}/users/${userId}/status`, {
    headers: {
      'X-User-ID': userId,
      'X-API-Key': apiKey
    }
  });
  return await response.json();
}

async function tryAccessOtherUser(userId, apiKey, targetUserId) {
  console.log(`\n🔍 ${userId} attempting to access ${targetUserId}'s data...`);
  const response = await fetch(`${BRIDGE_URL}/users/${targetUserId}/status`, {
    headers: {
      'X-User-ID': userId,
      'X-API-Key': apiKey
    }
  });
  const data = await response.json();
  return data;
}

async function runTest() {
  try {
    // Step 1: Register both users
    console.log('\n1️⃣ Registering users...');
    const user1 = await registerUser(USER_1_ID);
    await sleep(500);
    const user2 = await registerUser(USER_2_ID);
    
    // Step 2: Connect both users
    console.log('\n2️⃣ Connecting users...');
    await connectUser(USER_1_ID, user1.apiKey);
    await sleep(1000);
    await connectUser(USER_2_ID, user2.apiKey);
    
    // Wait for QR codes to generate
    await sleep(3000);
    
    // Step 3: Check both users have QR codes
    console.log('\n3️⃣ Checking QR codes...');
    const user1Status = await getStatus(USER_1_ID, user1.apiKey);
    const user2Status = await getStatus(USER_2_ID, user2.apiKey);
    
    console.log(`📱 ${USER_1_ID} status: ${user1Status.message}`);
    console.log(`   QR available: ${user1Status.qr ? 'YES (' + user1Status.qr.length + ' chars)' : 'NO'}`);
    
    console.log(`📱 ${USER_2_ID} status: ${user2Status.message}`);
    console.log(`   QR available: ${user2Status.qr ? 'YES (' + user2Status.qr.length + ' chars)' : 'NO'}`);
    
    // Step 4: Verify isolation - user1 cannot access user2
    console.log('\n4️⃣ Testing data isolation...');
    const user1AccessingUser2 = await tryAccessOtherUser(USER_1_ID, user1.apiKey, USER_2_ID);
    const user2AccessingUser1 = await tryAccessOtherUser(USER_2_ID, user2.apiKey, USER_1_ID);
    
    if (user1AccessingUser2.error || user2AccessingUser1.error) {
      console.log('✅ User isolation working (cross-user access blocked)');
    } else {
      console.log('❌ User isolation FAILED (users can access each other!)');
      console.log(`   User1 accessing User2:`, user1AccessingUser2);
      console.log(`   User2 accessing User1:`, user2AccessingUser1);
    }
    
    // Step 5: Check session directories
    console.log('\n5️⃣ Checking session isolation...');
    const fs = require('fs').promises;
    try {
      const sessions = await fs.readdir('whatsapp-bridge/sessions');
      console.log(`📂 Sessions directory: ${sessions.length} users`);
      
      const hasUser1 = sessions.some(s => s.includes(USER_1_ID));
      const hasUser2 = sessions.some(s => s.includes(USER_2_ID));
      
      console.log(`   ${USER_1_ID} dir exists: ${hasUser1 ? '✅' : '❌'}`);
      console.log(`   ${USER_2_ID} dir exists: ${hasUser2 ? '✅' : '❌'}`);
    } catch (err) {
      console.log('   Could not check session directories');
    }
    
    console.log('\n🎉 Multi-user test completed!');
    console.log('💡 Both users should have separate QR codes and isolated sessions');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

runTest();
