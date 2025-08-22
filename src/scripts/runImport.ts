import { importReqData } from './importReqData';

console.log('🚀 Starting requirement data import...');
console.log('This will import data from src/assets/reqprueb.json into Supabase');
console.log('---');

importReqData()
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    console.log('You can now check the Requerimientos page to see the imported data.');
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    console.error('Please check the error details above and try again.');
  });