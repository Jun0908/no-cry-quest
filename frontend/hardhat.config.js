require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config({ path: '.env.local' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [{ version: '0.8.19' }],
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      accounts: process.env.ORACLE_PRIVATE_KEY ? [process.env.ORACLE_PRIVATE_KEY] : [],
    },
  },
};
