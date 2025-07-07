// This script generates a cryptographically secure 32-byte key
// and displays it in the format needed for the .env.local file.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
    const secret = crypto.randomBytes(32).toString('hex');

    console.log('\n✅ Encryption secret generated successfully!');
    console.log('\n📋 Copy the following line and add it to your .env.local file:');
    console.log('\n----------------------------------------------------');
    console.log(`ENCRYPTION_SECRET=${secret}`);
    console.log('----------------------------------------------------\n');
    console.log('🔒 This key is crucial for securing your application\'s data. Keep it safe!');
    console.log('   Do not commit the .env.local file to version control.\n');

    const envFilePath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envFilePath)) {
        console.log(`ℹ️  Note: .env.local file already exists. You may need to replace the existing ENCRYPTION_SECRET value.`);
    }

} catch (e) {
    console.error('\n❌ Failed to generate encryption secret.');
    console.error(e);
    process.exit(1);
}
