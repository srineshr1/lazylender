#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * Run this to verify Supabase credentials work:
 * 
 * node scripts/test-supabase.js
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🧪 Testing Supabase Connection...\n')
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING'}\n`)

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.log('Please add to your .env file:')
  console.log('  VITE_SUPABASE_URL=your_supabase_url')
  console.log('  VITE_SUPABASE_ANON_KEY=your_anon_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('📡 Testing authentication endpoint...')
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Auth test failed:', error.message)
    } else {
      console.log('✅ Auth endpoint responding')
      console.log(`   Session: ${data.session ? 'Active' : 'None'}`)
      if (data.session) {
        console.log(`   User: ${data.session.user.email}`)
      }
    }

    console.log('\n📡 Testing database connection...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profileError) {
      console.warn('⚠️  Profiles table query failed:', profileError.message)
      console.log('   This is expected if you haven\'t executed the schema SQL yet.')
      console.log('   Run supabase/schema.sql in your Supabase SQL Editor.')
    } else {
      console.log('✅ Database connected')
      console.log(`   Found ${profileData?.length || 0} profiles`)
    }

    console.log('\n🎉 Connection test complete!')
    console.log('\nNext steps:')
    console.log('1. Execute supabase/schema.sql in Supabase SQL Editor')
    console.log('2. Restart your dev server (npm run dev)')
    console.log('3. Try signing up a new user!')
    
  } catch (err) {
    console.error('❌ Connection test failed:', err.message)
    process.exit(1)
  }
}

testConnection()
