// This script decrypts a single value using the application's ENCRYPTION_SECRET.
// Usage: node scripts/decrypt-value.js "<encrypted_string>"
// Make sure to wrap the encrypted string in quotes.

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const keyHex = process.env.ENCRYPTION_SECRET;
  if (!keyHex) {
    throw new Error(
      'FATAL: ENCRYPTION_SECRET is not set in the .env.local file.\n' +
      'Please ensure the file exists and the secret is correctly set.'
    );
  }
  if (keyHex.length !== 64) {
    throw new Error('FATAL: ENCRYPTION_SECRET must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
}

function decrypt(text) {
  try {
    const key = getKey();
    const parts = text.split('::');
    if (parts.length !== 3) {
      console.error('Error: Invalid encrypted string format. Expected format: iv::authTag::encryptedData');
      process.exit(1);
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('\n❌ Decryption failed. This could be due to several reasons:');
    console.error('   1. The ENCRYPTION_SECRET in your .env.local file is incorrect.');
    console.error('   2. The encrypted string is corrupted or was encrypted with a different key.');
    console.error('   3. The encrypted string format is invalid.');
    console.error('\nDetailed Error:', error.message);
    process.exit(1);
  }
}

const encryptedValue = process.argv[2];

if (!encryptedValue) {
  console.log('Usage: npm run decrypt -- "<encrypted_string>"');
  console.log('Example: npm run decrypt -- "iv_hex::authtag_hex::encrypted_hex"');
  process.exit(1);
}

try {
  const decryptedValue = decrypt(encryptedValue);
  console.log('\n✅ Decryption Successful!');
  console.log('----------------------------------------------------');
  console.log('Decrypted Value:', decryptedValue);
  console.log('----------------------------------------------------\n');
} catch (e) {
  // Error is already logged inside the decrypt function
  process.exit(1);
}
