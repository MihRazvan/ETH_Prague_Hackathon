// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBeaconStateProof } from "../interfaces/IBeaconStateProof.sol";
import { MockUSDC } from "./MockUSDC.sol";

contract Lender {
    error LoanAlreadyActive();
    error InvalidSourceAccount(address expected, address actual);
    error InvalidSourceSlot(bytes32 expected, bytes32 actual);
    error InvalidLockState(uint8 status);
    error ZeroBorrowCapacity();
    error LoanNotFound(uint256 loanId);
    error NotBorrower(address borrower, address caller);
    error LoanAlreadyRepaid();
    error LoanNotRepaid();
    error InvalidSettlementAmount(uint256 expectedAmount, uint256 actualAmount);

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DEMO_USDC_PER_ETH = 1_000_000;
    uint8 public constant STATUS_ACTIVE = 1;
    uint8 public constant STATUS_RELEASED = 2;

    struct Loan {
        address borrower;
        uint256 collateralWei;
        uint256 debtAmount;
        uint64 sourceBlockNumber;
        bool repaid;
        bool active;
    }

    IBeaconStateProof public immutable verifier;
    address public immutable vault;
    MockUSDC public immutable stablecoin;
    uint256 public immutable ltvBps;
    uint256 public immutable maxProofAge;

    uint256 public nextLoanId;

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256) public activeLoanIds;

    event Borrowed(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 collateralWei,
        uint256 debtAmount,
        uint64 sourceBlockNumber
    );
    event Repaid(uint256 indexed loanId, address indexed borrower, uint256 debtAmount);
    event Settled(uint256 indexed loanId, address indexed borrower);

    constructor(address verifier_, address vault_, uint256 ltvBps_, uint256 maxProofAge_) {
        verifier = IBeaconStateProof(verifier_);
        vault = vault_;
        ltvBps = ltvBps_;
        maxProofAge = maxProofAge_;
        stablecoin = new MockUSDC(address(this));
    }

    function borrow(IBeaconStateProof.ProofBundle calldata proof) external returns (uint256 loanId, uint256 debtAmount) {
        if (activeLoanIds[msg.sender] != 0) revert LoanAlreadyActive();

        (bytes32 verifiedValue, uint64 sourceBlockNumber, address sourceAccount, bytes32 sourceSlot) =
            verifier.verifyStorageSlot(proof, maxProofAge);

        address expectedVault = vault;
        if (sourceAccount != expectedVault) {
            revert InvalidSourceAccount(expectedVault, sourceAccount);
        }

        bytes32 expectedSlot = _vaultSlot(msg.sender);
        if (sourceSlot != expectedSlot) {
            revert InvalidSourceSlot(expectedSlot, sourceSlot);
        }

        uint256 packedValue = uint256(verifiedValue);
        uint8 status = _statusOf(packedValue);
        if (status != STATUS_ACTIVE) {
            revert InvalidLockState(status);
        }

        uint256 collateralWei = _amountOf(packedValue);
        debtAmount = collateralWei * ltvBps * DEMO_USDC_PER_ETH / (BPS_DENOMINATOR * 1 ether);
        if (debtAmount == 0) revert ZeroBorrowCapacity();

        loanId = ++nextLoanId;
        loans[loanId] = Loan({
            borrower: msg.sender,
            collateralWei: collateralWei,
            debtAmount: debtAmount,
            sourceBlockNumber: sourceBlockNumber,
            repaid: false,
            active: true
        });
        activeLoanIds[msg.sender] = loanId;

        stablecoin.mint(msg.sender, debtAmount);
        emit Borrowed(loanId, msg.sender, collateralWei, debtAmount, sourceBlockNumber);
    }

    function repay(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert LoanNotFound(loanId);
        if (loan.borrower != msg.sender) revert NotBorrower(loan.borrower, msg.sender);
        if (loan.repaid) revert LoanAlreadyRepaid();

        stablecoin.burnFrom(msg.sender, loan.debtAmount);
        loan.repaid = true;

        emit Repaid(loanId, msg.sender, loan.debtAmount);
    }

    function settle(IBeaconStateProof.ProofBundle calldata proof, uint256 loanId) external {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert LoanNotFound(loanId);
        if (loan.borrower != msg.sender) revert NotBorrower(loan.borrower, msg.sender);
        if (!loan.repaid) revert LoanNotRepaid();

        (bytes32 verifiedValue,, address sourceAccount, bytes32 sourceSlot) = verifier.verifyStorageSlot(proof, maxProofAge);
        if (sourceAccount != vault) {
            revert InvalidSourceAccount(vault, sourceAccount);
        }

        bytes32 expectedSlot = _vaultSlot(msg.sender);
        if (sourceSlot != expectedSlot) {
            revert InvalidSourceSlot(expectedSlot, sourceSlot);
        }

        uint256 packedValue = uint256(verifiedValue);
        uint8 status = _statusOf(packedValue);
        if (status != STATUS_RELEASED) {
            revert InvalidLockState(status);
        }

        uint256 amount = _amountOf(packedValue);
        if (amount != loan.collateralWei) {
            revert InvalidSettlementAmount(loan.collateralWei, amount);
        }

        loan.active = false;
        activeLoanIds[msg.sender] = 0;
        emit Settled(loanId, msg.sender);
    }

    function _vaultSlot(address borrower) internal pure returns (bytes32) {
        return keccak256(abi.encode(borrower, uint256(0)));
    }

    function _amountOf(uint256 packedValue) internal pure returns (uint256) {
        return packedValue >> 8;
    }

    function _statusOf(uint256 packedValue) internal pure returns (uint8) {
        return uint8(packedValue);
    }
}
