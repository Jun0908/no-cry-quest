// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Vault {
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant VERIFY_TYPEHASH = keccak256("VerifyQuest(bytes32 questId,bytes32 proofHash,uint256 nonce)");
    bytes32 private constant UNLOCK_TYPEHASH = keccak256("UnlockQuest(bytes32 questId,bytes32 unlockProofHash,uint256 nonce)");
    bytes32 private constant NAME_HASH = keccak256(bytes("NoCryVault"));
    bytes32 private constant VERSION_HASH = keccak256(bytes("1"));
    uint256 private constant SECP256K1N_DIV_2 =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    struct Quest {
        address creator;
        uint256 deposit;
        address winner;   // set when final shard is submitted
        uint256 deadline; // unix timestamp
        bool verified;
        bool unlocked;
        bool paid;
        bytes32 proofHash;
        bytes32 unlockProofHash;
        uint8 shardCount;
    }

    address public oracle; // account allowed to call verify
    address public owner;
    uint8 public constant REQUIRED_SHARDS = 4;

    mapping(bytes32 => Quest) public quests;
    mapping(bytes32 => mapping(address => bool)) public shardSubmitted;
    mapping(bytes32 => mapping(uint256 => bool)) public usedNonces;
    mapping(bytes32 => bool) public questExists;

    // simple reentrancy guard
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "Reentrant");
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    event Deposited(bytes32 indexed questId, address indexed creator, uint256 deposit);
    event ProofSubmitted(bytes32 indexed questId, bytes32 proofHash, address indexed submitter);
    event QuestVerified(bytes32 indexed questId, address indexed oracle, bytes32 proofHash, uint256 nonce);
    event ShardSubmitted(bytes32 indexed questId, address indexed by);
    event WinnerRecorded(bytes32 indexed questId, address indexed winner);
    event Unlocked(bytes32 indexed questId, bytes32 unlockProofHash, uint256 nonce);
    event PayoutExecuted(bytes32 indexed questId, address indexed winner, uint256 amount);
    event Expired(bytes32 indexed questId);

    constructor(address _oracle) {
        require(_oracle != address(0), "zero oracle");
        owner = msg.sender;
        oracle = _oracle;
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "zero");
        oracle = _oracle;
    }

    // Step 1: create a quest (no ETH needed here)
    function createQuest(bytes32 questId, uint256 deadline) external {
        require(!questExists[questId], "quest exists");
        require(deadline > block.timestamp, "invalid deadline");

        Quest storage q = quests[questId];
        q.creator = msg.sender;
        q.deposit = 0;
        q.deadline = deadline;
        q.winner = address(0);
        q.verified = false;
        q.unlocked = false;
        q.paid = false;
        q.proofHash = 0x0;
        q.unlockProofHash = 0x0;
        q.shardCount = 0;

        questExists[questId] = true;

        emit Deposited(questId, msg.sender, 0);
    }

    // Step 2: deposit prize ETH separately (VALUE フィールドに金額を入れて呼び出す)
    function fund(bytes32 questId) external payable {
        require(questExists[questId], "no quest");
        require(msg.value > 0, "send ETH to fund");
        Quest storage q = quests[questId];
        require(!q.paid, "already paid");
        q.deposit += msg.value;
        emit Deposited(questId, msg.sender, msg.value);
    }

    // submit off-chain proof hash (anyone can submit)
    function submitProof(bytes32 questId, bytes32 proofHash) external {
        require(questExists[questId], "no quest");
        Quest storage q = quests[questId];
        require(block.timestamp <= q.deadline, "expired");
        q.proofHash = proofHash;
        emit ProofSubmitted(questId, proofHash, msg.sender);
    }

    // oracle signed message is verified on-chain (EIP-712)
    function verifyQuest(bytes32 questId, bytes32 proofHash, uint256 nonce, bytes calldata signature) external {
        require(questExists[questId], "no quest");
        Quest storage q = quests[questId];
        require(!usedNonces[questId][nonce], "nonce used");
        require(q.proofHash != bytes32(0), "no proof submitted");
        require(q.proofHash == proofHash, "proof mismatch");
        require(!q.verified, "already verified");
        require(block.timestamp <= q.deadline, "expired");

        bytes32 structHash = keccak256(abi.encode(VERIFY_TYPEHASH, questId, proofHash, nonce));
        address signer = _recoverSigner(structHash, signature);
        require(signer == oracle, "invalid oracle sig");

        usedNonces[questId][nonce] = true;
        q.verified = true;
        emit QuestVerified(questId, signer, proofHash, nonce);
    }

    // participants submit their shard on-chain (shard count tracker for future use)
    function submitShard(bytes32 questId) external {
        require(questExists[questId], "no quest");
        Quest storage q = quests[questId];
        require(q.verified, "not verified");
        require(!q.unlocked, "already unlocked");
        require(!shardSubmitted[questId][msg.sender], "already submitted");

        shardSubmitted[questId][msg.sender] = true;
        q.shardCount += 1;
        emit ShardSubmitted(questId, msg.sender);

        if (q.shardCount >= REQUIRED_SHARDS) {
            q.winner = msg.sender; // the player who submits the final shard wins
            emit WinnerRecorded(questId, msg.sender);
        }
    }

    // oracle signs unlock proof hash derived from off-chain shamir reconstruction
    // shard tracking and on-chain verification are optional (handled off-chain)
    function unlockQuest(bytes32 questId, bytes32 unlockProofHash, uint256 nonce, bytes calldata signature) external {
        require(questExists[questId], "no quest");
        Quest storage q = quests[questId];
        require(!usedNonces[questId][nonce], "nonce used");
        require(!q.unlocked, "already unlocked");
        require(block.timestamp <= q.deadline, "expired");
        require(unlockProofHash != bytes32(0), "empty unlockProofHash");

        bytes32 structHash = keccak256(abi.encode(UNLOCK_TYPEHASH, questId, unlockProofHash, nonce));
        address signer = _recoverSigner(structHash, signature);
        require(signer == oracle, "invalid oracle sig");

        usedNonces[questId][nonce] = true;
        q.unlocked = true;
        q.unlockProofHash = unlockProofHash;
        if (q.winner == address(0)) {
            q.winner = msg.sender;
            emit WinnerRecorded(questId, msg.sender);
        }

        emit Unlocked(questId, unlockProofHash, nonce);
    }

    function payout(bytes32 questId) external nonReentrant {
        Quest storage q = quests[questId];
        require(q.unlocked, "not unlocked");
        require(!q.paid, "already paid");
        require(q.winner != address(0), "no winner recorded");

        uint256 amount = q.deposit;
        q.paid = true;
        (bool ok, ) = q.winner.call{value: amount}("");
        require(ok, "transfer failed");

        emit PayoutExecuted(questId, q.winner, amount);
    }

    // expire and refund (only creator can trigger after deadline and if not verified/unlocked)
    function expireAndRefund(bytes32 questId) external nonReentrant {
        require(questExists[questId], "no quest");
        Quest storage q = quests[questId];
        require(block.timestamp > q.deadline, "not expired");
        require(!q.paid, "already paid");
        require(!q.unlocked, "already unlocked");

        uint256 amount = q.deposit;
        q.deposit = 0;
        q.paid = true;

        (bool ok, ) = q.creator.call{value: amount}("");
        require(ok, "refund failed");

        emit Expired(questId);
    }

    // helper to get quest winner and deposit
    function getWinner(bytes32 questId) external view returns (address winner, uint256 deposit) {
        Quest storage q = quests[questId];
        return (q.winner, q.deposit);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator();
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(EIP712_DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this))
        );
    }

    function _recoverSigner(bytes32 structHash, bytes calldata signature) internal view returns (address) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
        return _recover(digest, signature);
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "invalid sig length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }

        require(uint256(s) <= SECP256K1N_DIV_2, "invalid s");
        require(v == 27 || v == 28, "invalid v");

        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "invalid sig");
        return signer;
    }
}
