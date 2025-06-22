import fs from 'fs';
import bs58 from 'bs58';

// Replace this with the path to your keypair.json file
const KEYPAIR_PATH = '../B92TJxyFGgK9tMtyzzQXDDxWNxSnwhbs1uvfnCVVdaS1.json';

function convertKeypairToPrivateKey(path) {
    try {
        const rawData = fs.readFileSync(path, 'utf8');
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

        console.log('Base58 Private Key:');
        console.log(encoded);
        
        if (keyData.publicKey) {
            console.log('Public Key:', keyData.publicKey);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

convertKeypairToPrivateKey(KEYPAIR_PATH);
