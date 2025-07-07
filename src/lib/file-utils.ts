
'use server';

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

// --- Encryption Key Management ---
let encryptionKey: Buffer;

function getKey(): Buffer {
  if (encryptionKey) return encryptionKey;

  const keyHex = process.env.ENCRYPTION_SECRET;
  if (!keyHex) {
    throw new Error(
      'FATAL: ENCRYPTION_SECRET is not set in environment variables.\n' +
      'Please generate a key by running "npm run setup:encrypt" and add it to your .env.local file.'
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      'FATAL: ENCRYPTION_SECRET must be a 64-character hex string (32 bytes).\n' +
      'Please generate a new, valid key by running "npm run setup:encrypt".'
    );
  }
  encryptionKey = Buffer.from(keyHex, 'hex');
  return encryptionKey;
}


// --- Encryption & Decryption Core ---

function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}::${authTag.toString('hex')}::${encrypted.toString('hex')}`;
}

function decrypt(text: string): string {
  try {
    const key = getKey();
    const parts = text.split('::');
    if (parts.length !== 3) {
      // This indicates it's likely old plaintext data, so return it as is.
      return text;
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
    console.error('Decryption failed. Data may be corrupt or key may be incorrect. Returning raw value.', error);
    return text; // Return original text on failure
  }
}

// --- Data Traversal Logic ---

const SENSITIVE_FIELDS = ['password', 'token'];
const isSensitiveField = (key: string) => SENSITIVE_FIELDS.includes(key);

function traverse(data: any, transform: (key: string, value: any) => any): any {
  if (Array.isArray(data)) {
    return data.map(item => traverse(item, transform));
  }
  if (typeof data === 'object' && data !== null) {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
         if (isSensitiveField(key) && typeof data[key] === 'string') {
            newData[key] = transform(key, data[key]);
        } else if (key === 'smtpSettings' && data.smtpSettings?.pass) {
            newData[key] = {
                ...data[key],
                pass: transform('password', data[key].pass)
            };
        } else {
           newData[key] = traverse(data[key], transform);
        }
      }
    }
    return newData;
  }
  return data;
}

// --- File I/O Functions ---

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readDataFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  let fileContent;
  try {
    fileContent = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.warn(`Warning: Could not read ${filename}. Initializing with default. Error: ${(error as Error).message}`);
    await writeDataFile(filename, defaultValue);
    return defaultValue;
  }
  
  try {
    const parsedData = JSON.parse(fileContent);

    // Automatic migration logic
    let needsMigration = false;
    const checkMigration = (key: string, value: any) => {
        if(isSensitiveField(key) && typeof value === 'string' && value && !value.includes('::')) {
            needsMigration = true;
        }
        if (key === 'smtpSettings' && value?.pass && typeof value.pass === 'string' && !value.pass.includes('::')) {
            needsMigration = true;
        }
        return value; // Don't transform, just check
    }
    traverse(parsedData, checkMigration);

    if (needsMigration) {
      console.log(`Migrating ${filename} to encrypted format...`);
      const encryptedDataForSave = traverse(parsedData, (key, value) => encrypt(value));
      await fs.writeFile(filePath, JSON.stringify(encryptedDataForSave, null, 2), 'utf-8');
      console.log(`Migration of ${filename} complete.`);
      // The data is now encrypted on disk, we can proceed to decrypt it for the app.
    }
    
    // Decrypt data for use in the application
    return traverse(parsedData, (key, value) => decrypt(value)) as T;

  } catch (error) {
    console.warn(`Warning: Could not parse or process ${filename}. Initializing with default. Error: ${(error as Error).message}`);
    await writeDataFile(filename, defaultValue);
    return defaultValue;
  }
}

export async function writeDataFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    // Encrypt data before writing
    const encryptedData = traverse(data, (key, value) => encrypt(value));
    await fs.writeFile(filePath, JSON.stringify(encryptedData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filename}:`, error);
    throw error;
  }
}
