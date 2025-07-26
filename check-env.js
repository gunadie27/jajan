// Check environment variables
console.log('🔍 Checking environment variables...');

// Check if we're in browser or server
if (typeof window !== 'undefined') {
  console.log('🌐 Running in browser');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set');
} else {
  console.log('🖥️ Running in server');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');
}

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    console.log('🔗 Testing Supabase connection...');
    
    // Test basic API call
    const response = await fetch('/api/member-qr?memberId=test');
    console.log('API Response status:', response.status);
    
    if (response.status === 400) {
      console.log('✅ API is working (expected 400 for invalid memberId)');
    } else {
      console.log('❌ Unexpected API response:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing Supabase connection:', error);
  }
};

// Run test if in browser
if (typeof window !== 'undefined') {
  testSupabaseConnection();
} 