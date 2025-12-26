const { Keys } = require('casper-js-sdk');
const fs = require('fs');

// Your public key
const publicKeyHex = '02025059223bfa5cff04756a9c60cda4d024e43660d63421291074d39dd4d2fe2655';

console.log('🔑 Your public key:', publicKeyHex);
console.log('📋 Account hash: account-hash-6cdfb8ef7421098d150d888f5429d47fd24cd3c3edec1e1f66105dc3c25eebd5');

// For demo purposes, we'll create a new key pair and show you how to use your real one
const keyPair = Keys.Ed25519.new();

console.log('\n🔧 Generated demo keys:');
console.log('Public key:', keyPair.publicKey.toHex());
console.log('Private key PEM saved to keys/secret_key.pem');

// Save the private key in PEM format
const privateKeyPem = keyPair.exportPrivateKeyInPem();
fs.writeFileSync('./keys/secret_key.pem', privateKeyPem);

console.log('\n⚠️  IMPORTANT: To use your real 5,000 CSPR tokens:');
console.log('1. Replace the generated private key with your real private key');
console.log('2. Make sure it corresponds to public key:', publicKeyHex);
console.log('3. The private key should be in PEM format in keys/secret_key.pem');