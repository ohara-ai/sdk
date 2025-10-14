// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Owned} from "./Owned.sol";

/**
 * @title FeeCollector
 * @notice Base contract for fee collection and distribution
 * @dev Extends Owned to provide common fee management functionality
 */
abstract contract FeeCollector is Owned {
    address[] public feeRecipients;
    uint256[] public feeShares; // In basis points (100 = 1%)
    uint256 public totalFeeShare; // Total fee in basis points

    event FeesConfigured(address[] recipients, uint256[] shares, uint256 totalShare);
    event FeeDistributed(address indexed recipient, address token, uint256 amount);

    error InvalidFeeConfiguration();
    error TransferFailed();

    constructor(address _owner) Owned(_owner) {}

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

        uint256 total = 0;
        for (uint256 i = 0; i < _shares.length; i++) {
            total += _shares[i];
        }
        if (total > 5000) revert InvalidFeeConfiguration(); // Max 50% fee

        feeRecipients = _recipients;
        feeShares = _shares;
        totalFeeShare = total;

        emit FeesConfigured(_recipients, _shares, total);
    }

    /**
     * @notice Distribute fees from a total amount
     * @param token The token address (address(0) for native token)
     * @param totalAmount The total amount to calculate fees from
     * @return feeAmount The total amount of fees distributed
     */
    function _distributeFees(
        address token,
        uint256 totalAmount
    ) internal returns (uint256 feeAmount) {
        if (totalFeeShare == 0 || feeRecipients.length == 0) {
            return 0;
        }

        for (uint256 i = 0; i < feeRecipients.length; i++) {
            uint256 fee = (totalAmount * feeShares[i]) / 10000;
            feeAmount += fee;
            _transfer(token, feeRecipients[i], fee);
            emit FeeDistributed(feeRecipients[i], token, fee);
        }
    }

    /**
     * @notice Internal transfer function for native and ERC20 tokens
     * @param token The token address (address(0) for native token)
     * @param to The recipient address
     * @param amount The amount to transfer
     */
    function _transfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            // Native token
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20 token
            (bool success, bytes memory data) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", to, amount)
            );
            if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
                revert TransferFailed();
            }
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
