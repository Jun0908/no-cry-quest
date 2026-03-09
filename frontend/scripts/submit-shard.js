const fetch = require('node-fetch');
const { Wallet } = require('ethers');

async function run() {
  const wallet = Wallet.createRandom();
  const sessionId = '0xsession123';
  const questId = '0xabc123';
  const secretShard = '801e1aa160b...';
  const timestamp = Date.now();
  const message = `${sessionId}:${questId}:${secretShard}:${timestamp}`;
  const signature = await wallet.signMessage(message);

  const res = await fetch('http://localhost:3000/api/submit-shard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, questId, shard: secretShard, walletAddress: wallet.address, signature, timestamp }),
  });
  console.log(await res.json());
}

run().catch(console.error);
