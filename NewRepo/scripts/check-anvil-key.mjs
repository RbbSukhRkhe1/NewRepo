import { HDNodeWallet } from 'ethers';
const w = HDNodeWallet.fromPhrase(
  'test test test test test test test test test test test junk',
  undefined,
  "m/44'/60'/0'/0/0"
);
console.log('Index 0:', w.address);
