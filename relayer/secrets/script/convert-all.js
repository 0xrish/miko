import fs from 'fs';
import path from 'path';
import bs58 from 'bs58';

const SECRETS_DIR = '../';

function convertKeypairToPrivateKey(filePath) {
    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const keyData = JSON.parse(rawData);

        let keyArray;
        
        // Handle different keypair formats
        if (Array.isArray(keyData)) {
            // Format: [1, 2, 3, ...] (direct array)
            keyArray = keyData;
        } else if (keyData.secretKey && Array.isArray(keyData.secretKey)) {
            // Format: { secretKey: [1, 2, 3, ...], publicKey: "...", ... }
            keyArray = keyData.secretKey;
        } else {
            throw new Error('Invalid keypair format. Expected an array of 64 numbers or an object with secretKey property.');
        }

        if (keyArray.length !== 64) {
            throw new Error(`Invalid keypair format. Expected 64 numbers, got ${keyArray.length}.`);
        }

        const secretKey = Uint8Array.from(keyArray);
        const encoded = bs58.encode(secretKey);

        return {
            success: true,
            privateKey: encoded,
            publicKey: keyData.publicKey || 'Unknown'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function convertAllKeypairs() {
    try {
        const files = fs.readdirSync(SECRETS_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        console.log(`Found ${jsonFiles.length} JSON files in secrets directory\n`);
        
        jsonFiles.forEach((file, index) => {
            const filePath = path.join(SECRETS_DIR, file);
            const result = convertKeypairToPrivateKey(filePath);
            
            console.log(`${index + 1}. ${file}`);
            if (result.success) {
                console.log(`   Public Key:  ${result.publicKey}`);
                console.log(`   Private Key: ${result.privateKey}`);
            } else {
                console.log(`   Error: ${result.error}`);
            }
            console.log('');
        });
    } catch (error) {
        console.error('Error reading secrets directory:', error.message);
    }
}

convertAllKeypairs(); 