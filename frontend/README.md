This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Task10 Demo Modes

Task10 has two runtime modes on `/final`.

- `current_location`: validates using current location + heading/pitch + view score.
- `toyokuni_photo`: validates using uploaded Toyokuni photo flow (demo-friendly).

Useful commands:

```bash
npm run demo:task10:seed
npm run demo:task10:test
```

---

## Vault コントラクト セットアップガイド（Sepolia）

### 1. コントラクトのデプロイ（Remix Solidity）

1. [remix.ethereum.org](https://remix.ethereum.org) を開く
2. `contracts/Vault.sol` の内容を Remix のエディタに貼り付けてコンパイル
3. 「Deploy & Run Transactions」タブ → Environment: `Injected Provider - MetaMask`
4. `_oracle` にバックエンド用ウォレットアドレスを入力して「Deploy & Verify」
5. デプロイ後のコントラクトアドレスをコピー

### 2. 環境変数の設定（`.env.local`）

```env
NEXT_PUBLIC_VAULT_ADDRESS=0x（デプロイしたコントラクトアドレス）
ORACLE_PRIVATE_KEY=0x（_oracle に指定したウォレットの秘密鍵）
NEXT_PUBLIC_DEMO_QUEST_ID=0x0900000000000000000000000000000000000000000000000000000000000002
```

### 3. クエストの作成（Remix から実行）

Deploy&Varify 0x4DCf63CcD612bf1afC6E216EAFc20DDaf5071d40

**ステップ1: `createQuest`（ETH不要）**
- VALUE = `0`（そのままでOK）
- `questId`: `0x0900000000000000000000000000000000000000000000000000000000000002`
- `deadline`: 未来のUnixタイムスタンプ（例: `1775001600` = 2026年後半）
  - ブラウザコンソールで計算: `Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60`
- 「transact」→ 成功したら次へ

**ステップ2: `fund`（賞金ETHを預ける）**
- VALUE欄に賞金額（例: `1`、単位 `ether`）を入力
- `questId`: `0x0900000000000000000000000000000000000000000000000000000000000002`（プレフィックス `questId:` は不要。値だけ貼る）
- 「transact」→ 完了

### 4. サーバー起動

```bash
npm run dev
```

### ゲームの流れ

- プレイヤーがMetaMask接続してゲームをプレイ
- 最後の鍵（4枚目のShard）を提出したプレイヤーが自動的に賞金受取人に記録される
- `payout()` 実行で賞金ETHがそのプレイヤーに送金される
- トランザクション確認: [Sepolia Etherscan](https://sepolia.etherscan.io)

### ネットワーク情報

| 項目 | 値 |
|------|-----|
| ネットワーク | Ethereum Sepolia Testnet |
| Chain ID | 11155111 |
| RPC | https://rpc.sepolia.org |
| ブロックエクスプローラー | https://sepolia.etherscan.io |
