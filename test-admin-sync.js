// Test script to verify admin interface properly controls content
const baseUrl = 'http://localhost:5000';

async function testAdminSync() {
  console.log('Testing Admin Content Sync...\n');
  
  // Check chapters in admin interface
  console.log('1. Checking chapters via admin endpoint:');
  const adminResponse = await fetch(`${baseUrl}/api/admin/all-chapters`);
  if (adminResponse.status === 401) {
    console.log('   - Need authentication for admin endpoint');
  } else {
    const adminChapters = await adminResponse.json();
    console.log(`   - Found ${adminChapters.length} chapters in admin interface`);
    if (adminChapters.length > 0) {
      adminChapters.forEach(ch => {
        console.log(`     * ${ch.title} (ID: ${ch.id.substring(0, 8)}..., Audio: ${ch.audioUrl})`);
      });
    }
  }
  
  // Check chapters in frontend
  console.log('\n2. Checking chapters via frontend endpoint:');
  const assignmentId = '4f53a908-4427-44fa-a77e-156b5fc5b427';
  const frontendResponse = await fetch(`${baseUrl}/api/assignments/${assignmentId}/chapters`);
  if (frontendResponse.status === 401) {
    console.log('   - Need authentication for frontend endpoint');
  } else {
    const frontendChapters = await frontendResponse.json();
    console.log(`   - Found ${frontendChapters.length} chapters in frontend`);
    if (frontendChapters.length > 0) {
      frontendChapters.forEach(ch => {
        console.log(`     * ${ch.title} (ID: ${ch.id.substring(0, 8)}..., Audio: ${ch.audioUrl})`);
      });
    }
  }
  
  console.log('\n3. Summary:');
  console.log('   - Both admin and frontend should show the same chapters');
  console.log('   - Deleting in admin should remove from both views');
  console.log('   - The 2 chapters with "uploading..." status are placeholders that failed upload');
}

testAdminSync().catch(console.error);