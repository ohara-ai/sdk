// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IFeature
 * @notice Base interface for all on-chain features
 */
interface IFeature {
    /**
     * @notice Returns the version of the feature
     */
    function version() external pure returns (string memory);

    /**
     * @notice Returns the name of the feature
     */
    function featureName() external pure returns (string memory);
}
