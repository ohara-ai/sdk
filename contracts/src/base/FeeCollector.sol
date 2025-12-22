// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Owned} from "./Owned.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FeeCollector
 * @notice Base contract for fee collection and distribution
 * @dev Extends Owned and ReentrancyGuard to provide common fee management functionality
 * @dev Uses pull-over-push pattern for secure fee distribution
 */
abstract contract FeeCollector is Owned, ReentrancyGuard {
    using SafeERC20 for IERC20;
    address[] public feeRecipients;
    uint256[] public feeShares; // In basis points (100 = 1%)
    uint256 public totalFeeShare; // Total fee in basis points
    
    // Pull-over-push: pending fees for each recipient
    mapping(address => mapping(address => uint256)) public pendingFees; // recipient => token => amount
    
    uint256 public constant MAX_FEE_RECIPIENTS = 10;
    uint256 public constant FEE_BASIS_POINTS = 10000; // 100%
    uint256 public constant MAX_FEE_BASIS_POINTS = 5000; // 50%

    event FeesConfigured(address[] recipients, uint256[] shares, uint256 totalShare);
    event FeeAccrued(address indexed recipient, address token, uint256 amount);
    event FeeWithdrawn(address indexed recipient, address token, uint256 amount);

    error InvalidFeeConfiguration();
    error InvalidFeeRecipient();
    error TransferFailed();
    error TooManyFeeRecipients();
    error NoFeesToWithdraw();

    constructor(address _owner) Owned(_owner) {}

    /**
     * @notice Initialize owner for clones
     * @param _owner Owner address
     * @dev Internal function to be called by inheriting contracts during initialization
     */
    function _initializeFeeCollector(address _owner) internal {
        if (_owner == address(0)) revert InvalidOwner();
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @notice Configure fee recipients and their shares
     * @param _recipients Array of recipient addresses
     * @param _shares Array of shares in basis points (100 = 1%)
     */
    function configureFees(
        address[] calldata _recipients,
        uint256[] calldata _shares
    ) external onlyOwner {
        _initializeFees(_recipients, _shares);
    }

    /**
     * @notice Internal function to initialize or update fee configuration
     * @param _recipients Array of recipient addresses
     * @param _shares Array of shares in basis points (100 = 1%)
     */
    function _initializeFees(
        address[] memory _recipients,
        uint256[] memory _shares
    ) internal {
        if (_recipients.length != _shares.length) revert InvalidFeeConfiguration();
        if (_recipients.length > MAX_FEE_RECIPIENTS) revert TooManyFeeRecipients();

        uint256 total;
        uint256 length = _recipients.length;
        for (uint256 i = 0; i < length;) {
            if (_recipients[i] == address(0)) revert InvalidFeeRecipient();
            total += _shares[i];
            unchecked { ++i; }
        }
        if (total > MAX_FEE_BASIS_POINTS) revert InvalidFeeConfiguration();

        feeRecipients = _recipients;
        feeShares = _shares;
        totalFeeShare = total;

        emit FeesConfigured(_recipients, _shares, total);
    }

    /**
     * @notice Accrue fees from a total amount (pull-over-push pattern)
     * @param token The token address (address(0) for native token)
     * @param totalAmount The total amount to calculate fees from
     * @return feeAmount The total amount of fees accrued
     */
    function _accrueFees(
        address token,
        uint256 totalAmount
    ) internal returns (uint256 feeAmount) {
        if (totalFeeShare == 0 || feeRecipients.length == 0) {
            return 0;
        }

        uint256 length = feeRecipients.length;
        for (uint256 i = 0; i < length;) {
            address recipient = feeRecipients[i];
            if (recipient == address(0)) revert InvalidFeeRecipient();
            
            uint256 fee = (totalAmount * feeShares[i]) / FEE_BASIS_POINTS;
            if (fee == 0) {
                unchecked { ++i; }
                continue;
            }
            
            feeAmount += fee;
            pendingFees[recipient][token] += fee;
            emit FeeAccrued(recipient, token, fee);
            
            unchecked { ++i; }
        }
    }

    /**
     * @notice Withdraw accrued fees (pull-over-push pattern)
     * @param token The token address (address(0) for native token)
     */
    function withdrawFees(address token) external nonReentrant {
        uint256 amount = pendingFees[msg.sender][token];
        if (amount == 0) revert NoFeesToWithdraw();
        
        // Clear pending fees before transfer (CEI pattern)
        pendingFees[msg.sender][token] = 0;
        
        // Transfer fees
        _transfer(token, msg.sender, amount);
        
        emit FeeWithdrawn(msg.sender, token, amount);
    }
    
    /**
     * @notice Internal transfer function for native and ERC20 tokens
     * @param token The token address (address(0) for native token)
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function _transfer(address token, address to, uint256 amount) internal {
        if (amount == 0) return; // Save gas on zero transfers
        
        if (token == address(0)) {
            // Native token - ignore failure to prevent DoS
            // slither-disable-next-line low-level-calls,unchecked-lowlevel
            (bool _success, ) = to.call{value: amount}("");
            _success; // Silence unused variable warning - intentionally ignored
        } else {
            // ERC20 token using SafeERC20 - wrap in try-catch to prevent DoS
            // slither-disable-next-line unchecked-transfer
            try IERC20(token).transfer(to, amount) {} catch {}
        }
    }

    /**
     * @notice Get current fee configuration
     * @return recipients Array of fee recipient addresses
     * @return shares Array of fee shares in basis points
     * @return totalShare Total fee percentage in basis points
     */
    function getFeeConfiguration()
        external
        view
        returns (address[] memory recipients, uint256[] memory shares, uint256 totalShare)
    {
        return (feeRecipients, feeShares, totalFeeShare);
    }
}
