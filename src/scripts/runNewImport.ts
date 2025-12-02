import { importReqDataNew } from './importReqDataNew';

console.log('🚀 Starting requirement data import with new table structure...');
console.log('This will import data into the new requerimientos table');
console.log('---');

importReqDataNew()
  .then(() => {
    console.log('\n✅ Import completed successfully!');
    console.log('You can now check the Requerimientos page to see the imported data.');
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    console.error('Please check the error details above and try again.');
  });
