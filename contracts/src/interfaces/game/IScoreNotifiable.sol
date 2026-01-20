// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title IScoreNotifiable
 * @notice Interface for contracts that receive match result notifications from Score
 * @dev Implemented by Prize, Tournament, League, and other contracts that need score updates
 */
interface IScoreNotifiable {
    /**
     * @notice Called by Score contract when a match result is recorded
     * @param winner The match winner address
     * @param losers Array of loser addresses
     * @param token The token used for stakes (address(0) for native)
     * @param prizeAmount The prize amount won
     */
    function onScoreRecorded(
        address winner,
        address[] calldata losers,
        address token,
        uint256 prizeAmount
    ) external;
}
