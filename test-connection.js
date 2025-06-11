// Test Supabase connection
const testUrl = 'https://yutlcpluuhjxwudfathv.supabase.co/rest/v1/';

fetch(testUrl)
  .then(response => {
    console.log('✅ Supabase is reachable!', response.status);
  })
  .catch(error => {
    console.error('❌ Cannot reach Supabase:', error.message);
    console.log('Try these fixes:');
    console.log('1. Restart your router');
    console.log('2. Flush DNS: ipconfig /flushdns');
    console.log('3. Try a different DNS server');
  });
