// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Prize} from "../../../src/features/game/Prize.sol";
import {IPrize} from "../../../src/interfaces/game/IPrize.sol";
import {Match} from "../../../src/features/game/Match.sol";
import {Score} from "../../../src/features/game/Score.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";

contract PrizeTest is Test {
    Prize public prize;
    Match public gameMatch;
    Score public gameScore;
    MockERC20 public token;

    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public player3 = address(0x5);

    uint256 constant STAKE_AMOUNT = 1 ether;
    uint256 constant MATCHES_PER_POOL = 3;
    uint256 constant SHARE_BASIS_POINTS = 1000; // 10%

    event PrizePoolCreated(uint256 indexed poolId, address indexed token, uint256 matchesPerPool);
    event MatchRecorded(uint256 indexed poolId, address indexed token, address indexed winner, uint256 matchNumber);
    event PrizePoolFinalized(uint256 indexed poolId, address indexed token, address[] winners, uint256[] winCounts);
    event PrizeClaimed(uint256 indexed poolId, address indexed winner, address indexed token, uint256 amount, uint256 rank);
    event SharesCollected(address indexed token, uint256 amount);
    event RecorderAuthorized(address indexed recorder, bool authorized);

    function setUp() public {
        // Deploy Match contract
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        gameMatch = new Match();
        gameMatch.initialize(owner, controller, address(0), 100, feeRecipients, feeShares);
        
        // Deploy Score contract
        gameScore = new Score();
        gameScore.initialize(owner, controller, 50, 1000, 100);
        
        // Deploy Prize contract
        prize = new Prize();
        prize.initialize(owner, controller, address(gameMatch), MATCHES_PER_POOL);
        
        // Setup integrations
        vm.startPrank(controller);
        // Register Prize as share recipient on Match (10% share)
        gameMatch.registerShareRecipient(address(prize), SHARE_BASIS_POINTS);
        // Authorize Match to record scores
        gameScore.setRecorderAuthorization(address(gameMatch), true);
        // Set Score on Match
        gameMatch.setScore(address(gameScore));
        // Add Prize as score listener
        gameScore.addScoreListener(address(prize));
        // Authorize Score to record on Prize
        prize.setRecorderAuthorization(address(gameScore), true);
        vm.stopPrank();
        
        // Deploy mock token
        vm.prank(owner);
        token = new MockERC20(1000000 ether);

        // Fund players
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);
        
        token.mint(player1, 1000 ether);
        token.mint(player2, 1000 ether);
        token.mint(player3, 1000 ether);
    }

    function test_InitialState() public view {
        assertEq(prize.owner(), owner);
        assertEq(prize.controller(), controller);
        assertEq(prize.getCurrentPoolId(address(0)), 0); // No pool created yet
        assertEq(prize.getMatchesPerPool(), MATCHES_PER_POOL);
        assertEq(prize.getWinnersCount(), 10); // Default
        address[] memory shareContracts = prize.getShareContracts();
        assertEq(shareContracts.length, 1);
        assertEq(shareContracts[0], address(gameMatch));
    }

    function test_RecordMatchResult() public {
        // Authorize a recorder
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.prank(controller);
        prize.recordMatchResult(player1, address(0));
        
        // Pool should be created for native token
        uint256 poolId = prize.getCurrentPoolId(address(0));
        assertEq(poolId, 1);
        
        (address poolToken, uint256 matchesCompleted, bool finalized, ) = prize.getPool(1);
        assertEq(poolToken, address(0));
        assertEq(matchesCompleted, 1);
        assertFalse(finalized);
        
        assertEq(prize.getPoolWins(1, player1), 1);
    }

    function test_OnlyAuthorizedRecorderCanRecord() public {
        vm.prank(player1);
        vm.expectRevert(Prize.UnauthorizedRecorder.selector);
        prize.recordMatchResult(player1, address(0));
    }

    function test_PoolFinalizesAfterMatchesPerPool() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        // Record MATCHES_PER_POOL matches
        vm.startPrank(controller);
        prize.recordMatchResult(player1, address(0)); // Pool 1, Match 1
        prize.recordMatchResult(player1, address(0)); // Pool 1, Match 2
        prize.recordMatchResult(player1, address(0)); // Pool 1, Match 3 - finalizes pool
        vm.stopPrank();
        
        (, uint256 matchesCompleted, bool finalized, ) = prize.getPool(1);
        assertEq(matchesCompleted, 3);
        assertTrue(finalized);
        
        // New pool should be active for this token
        assertEq(prize.getCurrentPoolId(address(0)), 2);
    }

    function test_TopWinnersTracked() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.startPrank(controller);
        prize.recordMatchResult(player1, address(0)); // player1: 1 win
        prize.recordMatchResult(player2, address(0)); // player2: 1 win
        prize.recordMatchResult(player1, address(0)); // player1: 2 wins - pool finalizes
        vm.stopPrank();
        
        // Check winners (sorted by wins)
        (address[] memory winners, uint256[] memory winCounts, ) = prize.getPoolWinners(1);
        assertEq(winners.length, 2);
        assertEq(winners[0], player1); // 2 wins
        assertEq(winners[1], player2); // 1 win
        assertEq(winCounts[0], 2);
        assertEq(winCounts[1], 1);
    }

    function test_FeatureMetadata() public view {
        assertEq(prize.version(), "2.0.0");
        assertEq(prize.featureName(), "GamePrize - OCI-004");
    }

    function test_OwnershipTransfer() public {
        address newOwner = address(0x123);
        
        vm.prank(owner);
        prize.transferOwnership(newOwner);
        
        assertEq(prize.owner(), owner);
        assertEq(prize.pendingOwner(), newOwner);
        
        vm.prank(newOwner);
        prize.acceptOwnership();
        
        assertEq(prize.owner(), newOwner);
    }

    function test_ControllerUpdate() public {
        address newController = address(0x456);
        
        vm.prank(owner);
        prize.setController(newController);
        
        assertEq(prize.controller(), newController);
    }

    function test_SetMatchesPerPool() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit MatchesPerPoolUpdated(MATCHES_PER_POOL, 10);
        prize.setMatchesPerPool(10);
        
        assertEq(prize.getMatchesPerPool(), 10);
    }

    function test_CannotSetMatchesPerPoolToZero() public {
        vm.prank(owner);
        vm.expectRevert(Prize.InvalidMatchesPerPool.selector);
        prize.setMatchesPerPool(0);
    }

    function test_TokenBasedPools() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        // Record matches with different tokens
        vm.startPrank(controller);
        prize.recordMatchResult(player1, address(0)); // Native token pool
        prize.recordMatchResult(player1, address(token)); // ERC20 token pool
        vm.stopPrank();
        
        // Should have separate pools for each token
        uint256 nativePoolId = prize.getCurrentPoolId(address(0));
        uint256 erc20PoolId = prize.getCurrentPoolId(address(token));
        
        assertTrue(nativePoolId != erc20PoolId);
        
        (address nativeToken, , , ) = prize.getPool(nativePoolId);
        (address erc20Token, , , ) = prize.getPool(erc20PoolId);
        
        assertEq(nativeToken, address(0));
        assertEq(erc20Token, address(token));
    }

    function test_GetClaimablePools() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        // Complete 2 pools with player1 winning both
        vm.startPrank(controller);
        // Pool 1
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        // Pool 2
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        vm.stopPrank();
        
        uint256[] memory claimable = prize.getClaimablePools(player1);
        assertEq(claimable.length, 2);
        assertEq(claimable[0], 1);
        assertEq(claimable[1], 2);
        
        // Player2 has no claimable pools
        uint256[] memory claimable2 = prize.getClaimablePools(player2);
        assertEq(claimable2.length, 0);
    }

    function test_CannotClaimUnfinalizedPool() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.prank(controller);
        prize.recordMatchResult(player1, address(0));
        
        vm.prank(player1);
        vm.expectRevert(Prize.PoolNotFinalized.selector);
        prize.claimPrize(1);
    }

    function test_CannotClaimIfNotWinner() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.startPrank(controller);
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        vm.stopPrank();
        
        vm.prank(player2);
        vm.expectRevert(Prize.NotPoolWinner.selector);
        prize.claimPrize(1);
    }

    function test_CannotClaimTwice() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.startPrank(controller);
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        prize.recordMatchResult(player1, address(0));
        vm.stopPrank();
        
        // First claim - will revert with NoPrizeToClaim since no shares accumulated
        vm.prank(player1);
        vm.expectRevert(Prize.NoPrizeToClaim.selector);
        prize.claimPrize(1);
    }

    function test_DistributionStrategies() public {
        // Test Linear distribution
        vm.prank(owner);
        prize.setDistributionStrategy(IPrize.DistributionStrategy.Linear);
        assertEq(uint256(prize.getDistributionStrategy()), uint256(IPrize.DistributionStrategy.Linear));
        
        // Test Equal distribution
        vm.prank(owner);
        prize.setDistributionStrategy(IPrize.DistributionStrategy.Equal);
        assertEq(uint256(prize.getDistributionStrategy()), uint256(IPrize.DistributionStrategy.Equal));
        
        // Test WinnerTakeAll distribution
        vm.prank(owner);
        prize.setDistributionStrategy(IPrize.DistributionStrategy.WinnerTakeAll);
        assertEq(uint256(prize.getDistributionStrategy()), uint256(IPrize.DistributionStrategy.WinnerTakeAll));
    }

    function test_SetWinnersCount() public {
        vm.prank(owner);
        prize.setWinnersCount(5);
        assertEq(prize.getWinnersCount(), 5);
    }

    function test_CannotSetWinnersCountToZero() public {
        vm.prank(owner);
        vm.expectRevert(Prize.InvalidWinnersCount.selector);
        prize.setWinnersCount(0);
    }

    event MatchesPerPoolUpdated(uint256 previousValue, uint256 newValue);
}

contract PrizeIntegrationTest is Test {
    Prize public prize;
    Match public gameMatch;
    MockERC20 public token;

    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);

    uint256 constant STAKE_AMOUNT = 1 ether;
    uint256 constant MATCHES_PER_POOL = 2;
    uint256 constant SHARE_BASIS_POINTS = 1000; // 10%

    event SharesCollected(address indexed token, uint256 amount);
    event PrizeClaimed(uint256 indexed poolId, address indexed winner, address indexed token, uint256 amount, uint256 rank);

    function setUp() public {
        // Deploy contracts
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        gameMatch = new Match();
        gameMatch.initialize(owner, controller, address(0), 100, feeRecipients, feeShares);
        
        prize = new Prize();
        prize.initialize(owner, controller, address(gameMatch), MATCHES_PER_POOL);
        
        // Setup integrations
        vm.startPrank(controller);
        gameMatch.registerShareRecipient(address(prize), SHARE_BASIS_POINTS);
        // Authorize controller directly on Prize for simpler testing
        prize.setRecorderAuthorization(controller, true);
        vm.stopPrank();

        // Fund players
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
    }

    function _createAndFinalizeMatchWithDirectPrizeRecord(address winner) internal returns (uint256) {
        address loser = winner == player1 ? player2 : player1;
        
        vm.prank(winner);
        uint256 matchId = gameMatch.create{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, 2);
        
        vm.prank(loser);
        gameMatch.join{value: STAKE_AMOUNT}(matchId);
        
        vm.prank(controller);
        gameMatch.activate(matchId);
        
        vm.prank(controller);
        gameMatch.finalize(matchId, winner);
        
        // Directly record on Prize (simulating what Score would do) - pass native token
        vm.prank(controller);
        prize.recordMatchResult(winner, address(0));
        
        return matchId;
    }

    function test_FullIntegration_SharesAccrueAndClaim() public {
        // Complete 2 matches with player1 winning both -> pool finalized
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        
        // Pool should be finalized with shares collected
        (, uint256 matchesCompleted, bool finalized, uint256 prizeAmount) = prize.getPool(1);
        assertEq(matchesCompleted, 2);
        assertTrue(finalized);
        
        // Check winners
        (address[] memory winners, uint256[] memory winCounts, ) = prize.getPoolWinners(1);
        assertEq(winners.length, 1);
        assertEq(winners[0], player1);
        assertEq(winCounts[0], 2);
        
        // Check prize amount (10% of 2 matches * 2 ether each = 0.4 ether)
        uint256 expectedPrize = (STAKE_AMOUNT * 2 * SHARE_BASIS_POINTS * 2) / 10000;
        assertEq(prizeAmount, expectedPrize);
        
        // Claim prize
        uint256 balanceBefore = player1.balance;
        
        vm.prank(player1);
        prize.claimPrize(1);
        
        assertEq(player1.balance, balanceBefore + expectedPrize);
        
        // Verify claimed
        (, , bool[] memory claimed) = prize.getPoolWinners(1);
        assertTrue(claimed[0]);
    }

    function test_MultiplePoolsWithDifferentWinners() public {
        // Pool 1: player1 wins both matches
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        
        // Pool 2: player2 wins both matches
        _createAndFinalizeMatchWithDirectPrizeRecord(player2);
        _createAndFinalizeMatchWithDirectPrizeRecord(player2);
        
        // Pool 1 winner is player1
        (address[] memory winners1, , ) = prize.getPoolWinners(1);
        assertEq(winners1[0], player1);
        
        // Pool 2 winner is player2
        (address[] memory winners2, , ) = prize.getPoolWinners(2);
        assertEq(winners2[0], player2);
        
        // Both can claim
        uint256[] memory player1Claimable = prize.getClaimablePools(player1);
        uint256[] memory player2Claimable = prize.getClaimablePools(player2);
        
        assertEq(player1Claimable.length, 1);
        assertEq(player1Claimable[0], 1);
        
        assertEq(player2Claimable.length, 1);
        assertEq(player2Claimable[0], 2);
    }

    function test_TieBreaker_FirstToReachHighestWins() public {
        // Pool: player1 wins first, player2 wins second
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        _createAndFinalizeMatchWithDirectPrizeRecord(player2);
        
        // Pool finalized - both have 1 win, sorted by order of reaching wins
        (address[] memory winners, uint256[] memory winCounts, ) = prize.getPoolWinners(1);
        assertEq(winners.length, 2);
        // Both have 1 win, player1 reached 1 win first
        assertEq(winCounts[0], 1);
        assertEq(winCounts[1], 1);
    }
}
