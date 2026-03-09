const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault", function () {
  async function setup() {
    const [deployer, creator, p1, p2, p3, p4, recipient, attacker] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(deployer.address);
    await vault.waitForDeployment();

    const network = await ethers.provider.getNetwork();
    const chainId = Number(network.chainId);
    const contractAddress = await vault.getAddress();
    const domain = {
      name: "NoCryVault",
      version: "1",
      chainId,
      verifyingContract: contractAddress,
    };

    async function signVerify(signer, questId, proofHash, nonce) {
      const types = {
        VerifyQuest: [
          { name: "questId", type: "bytes32" },
          { name: "proofHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
        ],
      };
      const value = { questId, proofHash, nonce };
      return signer.signTypedData(domain, types, value);
    }

    async function signUnlock(signer, questId, unlockProofHash, nonce) {
      const types = {
        UnlockQuest: [
          { name: "questId", type: "bytes32" },
          { name: "unlockProofHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
        ],
      };
      const value = { questId, unlockProofHash, nonce };
      return signer.signTypedData(domain, types, value);
    }

    return {
      vault,
      deployer,
      creator,
      p1,
      p2,
      p3,
      p4,
      recipient,
      attacker,
      signVerify,
      signUnlock,
    };
  }

  it("normal flow: deposit -> verify -> unlock -> payout", async function () {
    const { vault, deployer, creator, p1, p2, p3, p4, recipient, signVerify, signUnlock } = await setup();

    const questId = ethers.id("quest-1");
    const amounts = [ethers.parseEther("1")];
    const recipients = [recipient.address];
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 3600;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-1"));
    const unlockProofHash = ethers.keccak256(ethers.toUtf8Bytes("unlock-proof-1"));

    await expect(
      vault.connect(creator).createQuest(questId, recipients, amounts, deadline, { value: ethers.parseEther("1") })
    ).to.emit(vault, "Deposited");

    await expect(vault.connect(creator).submitProof(questId, proofHash)).to.emit(vault, "ProofSubmitted");

    const verifySig = await signVerify(deployer, questId, proofHash, 1);
    await expect(vault.connect(creator).verifyQuest(questId, proofHash, 1, verifySig)).to.emit(vault, "QuestVerified");

    await expect(vault.connect(p1).submitShard(questId)).to.emit(vault, "ShardSubmitted");
    await expect(vault.connect(p2).submitShard(questId)).to.emit(vault, "ShardSubmitted");
    await expect(vault.connect(p3).submitShard(questId)).to.emit(vault, "ShardSubmitted");
    await expect(vault.connect(p4).submitShard(questId)).to.emit(vault, "ShardSubmitted");

    const unlockSig = await signUnlock(deployer, questId, unlockProofHash, 2);
    await expect(vault.connect(creator).unlockQuest(questId, unlockProofHash, 2, unlockSig)).to.emit(vault, "Unlocked");

    const before = await ethers.provider.getBalance(recipient.address);
    await expect(vault.connect(creator).payout(questId)).to.emit(vault, "PayoutExecuted");
    const after = await ethers.provider.getBalance(recipient.address);
    expect(after - before).to.equal(ethers.parseEther("1"));
  });

  it("rejects invalid oracle signature", async function () {
    const { vault, creator, attacker, recipient, signVerify } = await setup();

    const questId = ethers.id("quest-bad-sig");
    const amount = ethers.parseEther("1");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 3600;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-bad"));

    await vault.connect(creator).createQuest(questId, [recipient.address], [amount], deadline, { value: amount });
    await vault.connect(creator).submitProof(questId, proofHash);
    const badSig = await signVerify(attacker, questId, proofHash, 7);

    await expect(vault.connect(creator).verifyQuest(questId, proofHash, 7, badSig)).to.be.revertedWith("invalid oracle sig");
  });

  it("rejects unlock when only 3 shards are submitted", async function () {
    const { vault, deployer, creator, p1, p2, p3, recipient, signVerify, signUnlock } = await setup();

    const questId = ethers.id("quest-insufficient-shards");
    const amount = ethers.parseEther("1");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 3600;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-insufficient"));
    const unlockHash = ethers.keccak256(ethers.toUtf8Bytes("unlock-insufficient"));

    await vault.connect(creator).createQuest(questId, [recipient.address], [amount], deadline, { value: amount });
    await vault.connect(creator).submitProof(questId, proofHash);
    await vault.connect(creator).verifyQuest(questId, proofHash, 31, await signVerify(deployer, questId, proofHash, 31));
    await vault.connect(p1).submitShard(questId);
    await vault.connect(p2).submitShard(questId);
    await vault.connect(p3).submitShard(questId);

    await expect(
      vault.connect(creator).unlockQuest(questId, unlockHash, 32, await signUnlock(deployer, questId, unlockHash, 32))
    ).to.be.revertedWith("insufficient shards");
  });

  it("rejects nonce replay", async function () {
    const { vault, deployer, creator, recipient, signVerify } = await setup();

    const questId = ethers.id("quest-replay");
    const amount = ethers.parseEther("1");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 3600;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-replay"));

    await vault.connect(creator).createQuest(questId, [recipient.address], [amount], deadline, { value: amount });
    await vault.connect(creator).submitProof(questId, proofHash);
    const sig = await signVerify(deployer, questId, proofHash, 9);
    await vault.connect(creator).verifyQuest(questId, proofHash, 9, sig);

    const unlockHash = ethers.keccak256(ethers.toUtf8Bytes("unlock-replay"));
    const badUnlockSig = await signVerify(deployer, questId, unlockHash, 9);
    await expect(vault.connect(creator).unlockQuest(questId, unlockHash, 9, badUnlockSig)).to.be.revertedWith("nonce used");
  });

  it("rejects double payout", async function () {
    const { vault, deployer, creator, p1, p2, p3, p4, recipient, signVerify, signUnlock } = await setup();
    const questId = ethers.id("quest-double-payout");
    const amount = ethers.parseEther("1");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 3600;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-double"));
    const unlockHash = ethers.keccak256(ethers.toUtf8Bytes("unlock-double"));

    await vault.connect(creator).createQuest(questId, [recipient.address], [amount], deadline, { value: amount });
    await vault.connect(creator).submitProof(questId, proofHash);
    await vault.connect(creator).verifyQuest(questId, proofHash, 11, await signVerify(deployer, questId, proofHash, 11));
    await vault.connect(p1).submitShard(questId);
    await vault.connect(p2).submitShard(questId);
    await vault.connect(p3).submitShard(questId);
    await vault.connect(p4).submitShard(questId);
    await vault.connect(creator).unlockQuest(questId, unlockHash, 12, await signUnlock(deployer, questId, unlockHash, 12));
    await vault.connect(creator).payout(questId);

    await expect(vault.connect(creator).payout(questId)).to.be.revertedWith("already paid");
  });

  it("allows refund after deadline and blocks verify on expired quest", async function () {
    const { vault, deployer, creator, recipient, signVerify } = await setup();
    const questId = ethers.id("quest-expired");
    const amount = ethers.parseEther("1");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 2;
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof-expired"));

    await vault.connect(creator).createQuest(questId, [recipient.address], [amount], deadline, { value: amount });
    await vault.connect(creator).submitProof(questId, proofHash);

    await ethers.provider.send("evm_increaseTime", [5]);
    await ethers.provider.send("evm_mine", []);

    const sig = await signVerify(deployer, questId, proofHash, 21);
    await expect(vault.connect(creator).verifyQuest(questId, proofHash, 21, sig)).to.be.revertedWith("expired");
    await expect(vault.connect(creator).expireAndRefund(questId)).to.emit(vault, "Expired");
  });

  it("rejects invalid recipients configuration", async function () {
    const { vault, creator } = await setup();
    const questId = ethers.id("quest-invalid-recipient");
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 3600;
    const amount = ethers.parseEther("1");

    await expect(
      vault.connect(creator).createQuest(questId, [ethers.ZeroAddress], [amount], deadline, { value: amount })
    ).to.be.revertedWith("zero recipient");

    await expect(vault.connect(creator).createQuest(questId, [], [], deadline, { value: 0 })).to.be.revertedWith(
      "no recipients"
    );
  });
});
