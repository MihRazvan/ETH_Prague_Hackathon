// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IBeaconStateProof } from "../interfaces/IBeaconStateProof.sol";
import { MockUSDC } from "./MockUSDC.sol";

contract Lender {
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
    uint256 public totalLoansIssued;
    uint256 public totalCollateralLocked;
    uint256 public totalDebtIssued;

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
    event LoanClosed(uint256 indexed loanId, address indexed borrower);

    constructor(address verifier_, address vault_, uint256 ltvBps_, uint256 maxProofAge_) {
        verifier = IBeaconStateProof(verifier_);
        vault = vault_;
        ltvBps = ltvBps_;
        maxProofAge = maxProofAge_;
        stablecoin = new MockUSDC(address(this));
    }

    /// @notice Borrow hUSDC against a proven Ethereum vault lock.
    ///         If the caller already has an active loan, it is closed first.
    function borrow(IBeaconStateProof.ProofBundle calldata proof) external returns (uint256 loanId, uint256 debtAmount) {
        // Auto-close any existing active loan for this borrower
        uint256 existingLoanId = activeLoanIds[msg.sender];
        if (existingLoanId != 0 && loans[existingLoanId].active) {
            Loan storage oldLoan = loans[existingLoanId];
            // Burn any remaining stablecoin balance (best-effort)
            uint256 balance = stablecoin.balanceOf(msg.sender);
            if (balance > 0) {
                uint256 burnAmount = balance < oldLoan.debtAmount ? balance : oldLoan.debtAmount;
                stablecoin.burnFrom(msg.sender, burnAmount);
            }
            oldLoan.active = false;
            oldLoan.repaid = true;
            emit LoanClosed(existingLoanId, msg.sender);
        }

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

        totalLoansIssued++;
        totalCollateralLocked += collateralWei;
        totalDebtIssued += debtAmount;

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

    // ── View helpers ──

    /// @notice Get protocol-level stats for the frontend
    function getProtocolStats() external view returns (
        uint256 _totalLoansIssued,
        uint256 _totalCollateralLocked,
        uint256 _totalDebtIssued,
        uint256 _nextLoanId
    ) {
        return (totalLoansIssued, totalCollateralLocked, totalDebtIssued, nextLoanId);
    }

    /// @notice Get a borrower's active loan details
    function getActiveLoan(address borrower) external view returns (
        uint256 loanId,
        uint256 collateralWei,
        uint256 debtAmount,
        uint64 sourceBlockNumber,
        bool repaid,
        bool active
    ) {
        loanId = activeLoanIds[borrower];
        if (loanId == 0) return (0, 0, 0, 0, false, false);
        Loan storage loan = loans[loanId];
        return (loanId, loan.collateralWei, loan.debtAmount, loan.sourceBlockNumber, loan.repaid, loan.active);
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
