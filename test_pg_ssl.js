const { Client } = require('pg');

const connectionString = 'postgresql://ratemate_testuser:Emilia123@ratemate-dev-postgres.postgres.database.azure.com:5432/RateMate_dev_db?sslmode=require';

async function testConnection(rejectUnauthorized, testName) {
  console.log(`\nAttempting connection for test: "${testName}" (rejectUnauthorized: ${rejectUnauthorized})`);
  const clientConfig = {
    connectionString: connectionString,
  };

  if (rejectUnauthorized !== null) {
    clientConfig.ssl = {
      rejectUnauthorized: rejectUnauthorized
    };
  } else {
    // If rejectUnauthorized is null, we test with pg's default handling for the connection string
    console.log(' (using default SSL handling based on connection string)');
  }

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log(`  ✅ SUCCESS: Connected for "${testName}"`);
    const res = await client.query('SELECT NOW() AS current_time, current_user, version();');
    console.log('     Query result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error(`  ❌ ERROR for "${testName}":`, err.message);
    if (err.message.includes('self-signed certificate') || err.message.includes('certificate verify failed') || err.message.includes('unable to verify the first certificate')) {
      console.error('     This error often indicates the client (Node.js) does not trust the server\'s SSL certificate CA, or a clock sync issue.');
    }
  }
}

async function main() {
  console.log('🧪 Starting PostgreSQL SSL connection test...');
  console.log(`Target: ${connectionString.replace(/:[^:]*@/, ':****@')}\n`);

  // Test 1: Default behavior (likely how MCP is trying, should hang or fail like MCP)
  await testConnection(null, "Default SSL Handling (sslmode=require)");

  // Test 2: Explicitly reject unauthorized (strictest, should also fail if cert is untrusted)
  // await testConnection(true, "Strict SSL (rejectUnauthorized: true)"); // Usually default for sslmode=require with cert issues

  // Test 3: Relaxed SSL validation (should succeed if only CA trust is the issue)
  await testConnection(false, "Relaxed SSL (rejectUnauthorized: false)");

  console.log('\n🏁 Test complete.');
  console.log('If "Relaxed SSL" succeeded and "Default SSL Handling" failed, it points to an SSL certificate validation issue in your Node.js environment when strict validation is enforced.');
}

main(); 