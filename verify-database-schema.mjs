/**
 * Database Schema Verification Script
 * Checks if required tables exist in Supabase database using REST API
 */

// Load environment variables from .env
const SUPABASE_URL = 'https://vwlnnocosqsureltloqi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3bG5ub2Nvc3FzdXJlbHRsb3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NjA5NTIsImV4cCI6MjA3NzUzNjk1Mn0.V9w1VTxlk9HN9Mh5ZcOmigAPPms62MTlsnT6Dxt7IJM';

console.log('🔍 Verifying Supabase Database Schema...\n');
console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

// Tables we expect to exist
const requiredTables = [
  'files',
  'downloads',
  'user_profiles',
  'upload_rate_limits'
];

async function checkTableExists(tableName) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?limit=0`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      return { exists: false, error: 'Table does not exist (404)' };
    }

    if (response.status === 200) {
      return { exists: true, error: null };
    }

    // Other status codes (like 401, 403) might mean table exists but RLS restricts access
    // which is actually good - means table is there
    if (response.status === 401 || response.status === 403) {
      return { exists: true, error: null };
    }

    const errorText = await response.text();
    return { exists: false, error: `HTTP ${response.status}: ${errorText}` };

  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function verifySchema() {
  const results = {};
  let allTablesExist = true;

  console.log('Checking required tables:\n');

  for (const table of requiredTables) {
    const result = await checkTableExists(table);
    results[table] = result;

    const status = result.exists ? '✅' : '❌';
    console.log(`  ${status} ${table}`);

    if (!result.exists) {
      allTablesExist = false;
      console.log(`     Error: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');

  if (allTablesExist) {
    console.log('✅ SUCCESS! All required tables exist in your database.\n');
    console.log('✨ Your database schema is properly deployed.\n');
    console.log('👉 Proceeding to Step 2: Get missing credentials\n');
    return true;
  } else {
    console.log('❌ MISSING TABLES! Your database schema needs to be deployed.\n');
    console.log('📋 To fix this:\n');
    console.log('1. Open your browser and go to:');
    console.log('   https://supabase.com/dashboard/project/vwlnnocosqsureltloqi/sql\n');
    console.log('2. Click "SQL Editor" (or you might already be there)\n');
    console.log('3. Click "+ New query" button\n');
    console.log('4. Open this file on your computer:');
    console.log('   C:\\Users\\dell\\Desktop\\Fmap\\docs\\database-schema.sql\n');
    console.log('5. Copy ALL the SQL code from that file\n');
    console.log('6. Paste it into the SQL Editor in Supabase\n');
    console.log('7. Click "Run" button (or press Ctrl+Enter)\n');
    console.log('8. Wait for green "Success" message\n');
    console.log('9. Come back here and tell me "done"\n');
    return false;
  }
}

// Run verification
verifySchema()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    console.error('\nThis might mean:');
    console.error('- Network connection issue');
    console.error('- Invalid Supabase credentials');
    console.error('- Supabase project not accessible\n');
    process.exit(1);
  });
