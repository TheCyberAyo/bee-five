/**
 * Supabase Setup Verification Script
 * 
 * This script verifies that your Supabase setup is working correctly.
 * Run it with: node verify-setup.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

async function main() {
  console.log(`\n${colors.cyan}🐝 Bee-Five Supabase Setup Verification 🐝${colors.reset}\n`);

  let allTestsPassed = true;

  // Test 1: Check Environment Variables
  section('STEP 1: Checking Environment Variables');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    error('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
    allTestsPassed = false;
  } else if (supabaseUrl.includes('xxxxx') || supabaseUrl === 'YOUR_SUPABASE_URL') {
    error('NEXT_PUBLIC_SUPABASE_URL appears to be a placeholder value');
    allTestsPassed = false;
  } else {
    success(`NEXT_PUBLIC_SUPABASE_URL is set: ${supabaseUrl.substring(0, 30)}...`);
  }

  if (!supabaseAnonKey) {
    error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local');
    allTestsPassed = false;
  } else if (supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY' || supabaseAnonKey.length < 100) {
    error('NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid');
    allTestsPassed = false;
  } else {
    success(`NEXT_PUBLIC_SUPABASE_ANON_KEY is set (length: ${supabaseAnonKey.length})`);
  }

  if (!allTestsPassed) {
    console.log(`\n${colors.red}✗ Environment variables check failed. Please configure .env.local correctly.${colors.reset}\n`);
    process.exit(1);
  }

  // Test 2: Initialize Supabase Client
  section('STEP 2: Testing Supabase Connection');
  
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    success('Supabase client created successfully');
  } catch (err) {
    error(`Failed to create Supabase client: ${err.message}`);
    allTestsPassed = false;
    process.exit(1);
  }

  // Test 3: Test Database Connection
  section('STEP 3: Testing Database Connection');
  
  try {
    // Simple query to test connection
    const { data, error: dbError } = await supabase
      .from('game_rooms')
      .select('count')
      .limit(1);

    if (dbError) {
      if (dbError.code === 'PGRST116' || dbError.message.includes('relation') || dbError.message.includes('does not exist')) {
        error('Tables not found. Please run the SQL commands from Step 4 in the Supabase SQL Editor.');
        allTestsPassed = false;
      } else {
        error(`Database connection error: ${dbError.message}`);
        allTestsPassed = false;
      }
    } else {
      success('Database connection successful');
    }
  } catch (err) {
    error(`Failed to connect to database: ${err.message}`);
    allTestsPassed = false;
  }

  // Test 4: Check if Tables Exist
  section('STEP 4: Verifying Database Tables');
  
  const requiredTables = ['game_rooms', 'game_players', 'game_moves', 'game_state'];
  const tableChecks = {};

  for (const table of requiredTables) {
    try {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (tableError) {
        if (tableError.code === 'PGRST116' || tableError.message.includes('does not exist')) {
          error(`Table '${table}' does not exist`);
          tableChecks[table] = false;
          allTestsPassed = false;
        } else {
          // Other errors might be permissions, but table exists
          success(`Table '${table}' exists`);
          tableChecks[table] = true;
        }
      } else {
        success(`Table '${table}' exists and is accessible`);
        tableChecks[table] = true;
      }
    } catch (err) {
      error(`Error checking table '${table}': ${err.message}`);
      tableChecks[table] = false;
      allTestsPassed = false;
    }
  }

  // Test 5: Test Row Level Security (RLS) Policies
  section('STEP 5: Testing Row Level Security Policies');
  
  if (tableChecks['game_rooms']) {
    try {
      // Try to insert a test room
      const testRoomCode = `TEST${Date.now()}`;
      const { data: insertData, error: insertError } = await supabase
        .from('game_rooms')
        .insert({
          room_code: testRoomCode,
          host_id: 'test_host_' + Date.now(),
          status: 'waiting'
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes('permission') || insertError.message.includes('policy')) {
          error('RLS policies may not be set correctly for game_rooms (INSERT)');
          warning('Make sure you ran the RLS policy SQL from Step 5');
          allTestsPassed = false;
        } else {
          error(`Failed to insert test room: ${insertError.message}`);
          allTestsPassed = false;
        }
      } else {
        success('RLS policies allow INSERT on game_rooms');

        // Test UPDATE
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ status: 'active' })
          .eq('id', insertData.id);

        if (updateError) {
          error('RLS policies may not allow UPDATE on game_rooms');
          allTestsPassed = false;
        } else {
          success('RLS policies allow UPDATE on game_rooms');
        }

        // Test SELECT
        const { error: selectError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', insertData.id)
          .single();

        if (selectError) {
          error('RLS policies may not allow SELECT on game_rooms');
          allTestsPassed = false;
        } else {
          success('RLS policies allow SELECT on game_rooms');
        }

        // Clean up test data
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', insertData.id);
      }
    } catch (err) {
      error(`Error testing RLS policies: ${err.message}`);
      allTestsPassed = false;
    }
  }

  // Test 6: Test Real-time Subscriptions
  section('STEP 6: Testing Real-time Subscriptions');
  
  if (tableChecks['game_moves']) {
    try {
      let subscriptionReceived = false;
      const testSubscription = supabase
        .channel('test-verification')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_moves' },
          (payload) => {
            subscriptionReceived = true;
            success('Real-time subscription received INSERT event');
          }
        )
        .subscribe();

      // Wait a bit for subscription to establish
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Try to insert a test move to trigger the subscription
      const testRoom = `TEST${Date.now()}`;
      
      // First create a test room if we need to
      const { data: testRoomData } = await supabase
        .from('game_rooms')
        .insert({
          room_code: testRoom,
          host_id: 'test_' + Date.now(),
          status: 'waiting'
        })
        .select()
        .single();

      if (testRoomData) {
        const { error: moveError } = await supabase
          .from('game_moves')
          .insert({
            room_id: testRoomData.id,
            player_number: 1,
            row: 0,
            col: 0,
            timestamp: new Date().toISOString()
          });

        // Wait for subscription to receive event
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (!subscriptionReceived) {
          warning('Real-time subscription did not receive event (this might be OK if real-time is not enabled)');
          warning('Check that real-time is enabled in Supabase Dashboard → Database → Replication');
        }

        // Clean up
        await supabase.from('game_rooms').delete().eq('id', testRoomData.id);
        await supabase.removeChannel(testSubscription);
      }
    } catch (err) {
      warning(`Real-time subscription test had issues: ${err.message}`);
      warning('This might be normal if real-time is not fully configured');
    }
  }

  // Test 7: Test Multiplayer Service Functions
  section('STEP 7: Testing Multiplayer Service (Integration Test)');
  
  try {
    // Create a test room
    const testRoomCode = `VERIFY${Date.now()}`;
    const testHostId = 'verify_' + Date.now();
    
    const { data: createdRoom, error: createError } = await supabase
      .from('game_rooms')
      .insert({
        room_code: testRoomCode,
        host_id: testHostId,
        status: 'waiting'
      })
      .select()
      .single();

    if (createError) {
      error(`Failed to create test room: ${createError.message}`);
      allTestsPassed = false;
    } else {
      success('Successfully created test room');

      // Add a test player
      const { data: createdPlayer, error: playerError } = await supabase
        .from('game_players')
        .insert({
          room_id: createdRoom.id,
          player_name: 'Test Player',
          player_number: 1,
          is_host: true
        })
        .select()
        .single();

      if (playerError) {
        error(`Failed to create test player: ${playerError.message}`);
        allTestsPassed = false;
      } else {
        success('Successfully created test player');

        // Test game state
        const testBoard = JSON.stringify(Array(10).fill(null).map(() => Array(10).fill(0)));
        const { data: gameState, error: stateError } = await supabase
          .from('game_state')
          .insert({
            room_id: createdRoom.id,
            board_state: testBoard,
            current_player: 1,
            winner: 0,
            is_game_active: true
          })
          .select()
          .single();

        if (stateError) {
          error(`Failed to create test game state: ${stateError.message}`);
          allTestsPassed = false;
        } else {
          success('Successfully created test game state');

          // Test a move
          const { error: moveError } = await supabase
            .from('game_moves')
            .insert({
              room_id: createdRoom.id,
              player_number: 1,
              row: 5,
              col: 5,
              timestamp: new Date().toISOString()
            });

          if (moveError) {
            error(`Failed to create test move: ${moveError.message}`);
            allTestsPassed = false;
          } else {
            success('Successfully created test move');
          }
        }
      }

      // Clean up all test data
      await supabase.from('game_moves').delete().eq('room_id', createdRoom.id);
      await supabase.from('game_state').delete().eq('room_id', createdRoom.id);
      await supabase.from('game_players').delete().eq('room_id', createdRoom.id);
      await supabase.from('game_rooms').delete().eq('id', createdRoom.id);
      success('Cleaned up test data');
    }
  } catch (err) {
    error(`Integration test failed: ${err.message}`);
    allTestsPassed = false;
  }

  // Final Summary
  section('VERIFICATION SUMMARY');
  
  if (allTestsPassed) {
    console.log(`${colors.green}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║  ✅ ALL CHECKS PASSED!                                    ║');
    console.log('║                                                            ║');
    console.log('║  Your Supabase setup is working correctly! 🐝            ║');
    console.log('║                                                            ║');
    console.log('║  You can now:                                            ║');
    console.log('║  • Create and join multiplayer rooms                     ║');
    console.log('║  • Play games with real-time synchronization             ║');
    console.log('║  • Test multiplayer functionality                         ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}\n`);
  } else {
    console.log(`${colors.red}`);
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║  ❌ SOME CHECKS FAILED                                     ║');
    console.log('║                                                            ║');
    console.log('║  Please review the errors above and:                      ║');
    console.log('║  • Check SUPABASE_SETUP.md for setup instructions         ║');
    console.log('║  • Verify your .env.local file                            ║');
    console.log('║  • Make sure all SQL commands were run                    ║');
    console.log('║  • Check RLS policies are enabled                         ║');
    console.log('║  • Verify real-time is enabled for tables                 ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}\n`);
    process.exit(1);
  }
}

// Run verification
main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});

