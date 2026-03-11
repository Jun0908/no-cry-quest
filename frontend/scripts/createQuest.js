// scripts/createQuest.js
// Usage: npx hardhat run scripts/createQuest.js --network sepolia
require('dotenv').config({ path: '.env.local' });
const { ethers } = require('hardhat');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
const QUEST_ID = process.env.NEXT_PUBLIC_DEMO_QUEST_ID ||
  '0x0900000000000000000000000000000000000000000000000000000000000009';

// 賞金額 (ETH)
const PRIZE_ETH = '0.001'; // 0 ならfundをスキップ

// クエストの締め切り (現在から7日後)
const DEADLINE = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!VAULT_ADDRESS) throw new Error('NEXT_PUBLIC_VAULT_ADDRESS が .env.local に設定されていません');

  const [signer] = await ethers.getSigners();
  const prize = ethers.parseEther(PRIZE_ETH);

  console.log('実行者 (oracle):', signer.address);
  console.log('Vault アドレス:', VAULT_ADDRESS);
  console.log('Quest ID:', QUEST_ID);
  console.log('賞金:', PRIZE_ETH, 'ETH');
  console.log('締め切り:', new Date(DEADLINE * 1000).toISOString());

  const vault = await ethers.getContractAt('Vault', VAULT_ADDRESS, signer);

  const exists = await vault.questExists(QUEST_ID);
  if (!exists) {
    console.log('\ncreateQuest を実行中...');
    const tx = await vault.createQuest(QUEST_ID, DEADLINE);
    console.log('createQuest tx hash:', tx.hash);
    await tx.wait();
    console.log('✅ createQuest 完了');
    console.log(`Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
  } else {
    console.log('\nquest は既に存在します（createQuestをスキップ）');
  }

  if (prize > 0n) {
    console.log('\nfund を実行中...');
    const fundTx = await vault.fund(QUEST_ID, { value: prize });
    console.log('fund tx hash:', fundTx.hash);
    await fundTx.wait();
    console.log('✅ fund 完了');
    console.log(`Etherscan: https://sepolia.etherscan.io/tx/${fundTx.hash}`);
  } else {
    console.log('\nPRIZE_ETH が 0 のため fund をスキップ');
  }
  console.log('\n賞金受取人は、最後の鍵（4枚目のShard）を提出したプレイヤーに自動設定されます。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
