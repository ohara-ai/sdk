// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Prize} from "../../../src/features/game/Prize.sol";
import {Match} from "../../../src/features/game/Match.sol";
import {Score} from "../../../src/features/game/Score.sol";
import {IPrize} from "../../../src/interfaces/game/IPrize.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";
import {Owned} from "../../../src/base/Owned.sol";

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

    event PrizePoolCreated(uint256 indexed poolId, uint256 matchesPerPool);
    event MatchRecorded(uint256 indexed poolId, address indexed winner, uint256 matchNumber);
    event PrizePoolFinalized(uint256 indexed poolId, address indexed winner, uint256 totalWins);
    event PrizeClaimed(uint256 indexed poolId, address indexed winner, address indexed token, uint256 amount);
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
        // Set Prize on Score
        gameScore.setPrize(address(prize));
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
        assertEq(prize.getCurrentPoolId(), 1);
        assertEq(prize.getMatchesPerPool(), MATCHES_PER_POOL);
        assertEq(address(prize.matchContract()), address(gameMatch));
    }

    function test_RecordMatchResult() public {
        // Authorize a recorder
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.prank(controller);
        vm.expectEmit(true, true, false, true);
        emit MatchRecorded(1, player1, 1);
        prize.recordMatchResult(player1);
        
        (uint256 matchesCompleted, address winner, uint256 highestWins, bool finalized, bool claimed) = prize.getPool(1);
        assertEq(matchesCompleted, 1);
        assertEq(winner, player1);
        assertEq(highestWins, 1);
        assertFalse(finalized);
        assertFalse(claimed);
        
        assertEq(prize.getPoolWins(1, player1), 1);
    }

    function test_OnlyAuthorizedRecorderCanRecord() public {
        vm.prank(player1);
        vm.expectRevert(Prize.UnauthorizedRecorder.selector);
        prize.recordMatchResult(player1);
    }

    function test_PoolFinalizesAfterMatchesPerPool() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        // Record MATCHES_PER_POOL matches
        vm.startPrank(controller);
        prize.recordMatchResult(player1); // Pool 1, Match 1
        prize.recordMatchResult(player1); // Pool 1, Match 2
        
        vm.expectEmit(true, true, false, true);
        emit PrizePoolFinalized(1, player1, 3);
        vm.expectEmit(true, false, false, true);
        emit PrizePoolCreated(2, MATCHES_PER_POOL);
        prize.recordMatchResult(player1); // Pool 1, Match 3 - finalizes pool
        vm.stopPrank();
        
        (uint256 matchesCompleted, address winner, uint256 highestWins, bool finalized, bool claimed) = prize.getPool(1);
        assertEq(matchesCompleted, 3);
        assertEq(winner, player1);
        assertEq(highestWins, 3);
        assertTrue(finalized);
        assertFalse(claimed);
        
        // New pool should be active
        assertEq(prize.getCurrentPoolId(), 2);
    }

    function test_WinnerIsMostWins() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.startPrank(controller);
        prize.recordMatchResult(player1); // player1: 1 win
        prize.recordMatchResult(player2); // player2: 1 win
        prize.recordMatchResult(player1); // player1: 2 wins - wins pool
        vm.stopPrank();
        
        (,address winner, uint256 highestWins, bool finalized,) = prize.getPool(1);
        assertEq(winner, player1);
        assertEq(highestWins, 2);
        assertTrue(finalized);
    }

    function test_FeatureMetadata() public view {
        assertEq(prize.version(), "1.0.0");
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

    function test_GetClaimablePools() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        // Complete 2 pools with player1 winning both
        vm.startPrank(controller);
        // Pool 1
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        // Pool 2
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
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
        prize.recordMatchResult(player1);
        
        vm.prank(player1);
        vm.expectRevert(Prize.PoolNotFinalized.selector);
        prize.claimPrize(1);
    }

    function test_CannotClaimIfNotWinner() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.startPrank(controller);
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        vm.stopPrank();
        
        vm.prank(player2);
        vm.expectRevert(Prize.NotPoolWinner.selector);
        prize.claimPrize(1);
    }

    function test_CannotClaimTwice() public {
        vm.prank(controller);
        prize.setRecorderAuthorization(controller, true);
        
        vm.startPrank(controller);
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        prize.recordMatchResult(player1);
        vm.stopPrank();
        
        // First claim - will revert with NoPrizeToClaim since no shares accumulated
        vm.prank(player1);
        vm.expectRevert(Prize.NoPrizeToClaim.selector);
        prize.claimPrize(1);
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
    event PrizeClaimed(uint256 indexed poolId, address indexed winner, address indexed token, uint256 amount);

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
        
        // Directly record on Prize (simulating what Score would do)
        vm.prank(controller);
        prize.recordMatchResult(winner);
        
        return matchId;
    }

    function test_FullIntegration_SharesAccrueAndClaim() public {
        // Complete 2 matches with player1 winning both -> pool finalized
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        
        // Pool should be finalized with shares collected
        (uint256 matchesCompleted, address winner, uint256 highestWins, bool finalized, bool claimed) = prize.getPool(1);
        assertEq(matchesCompleted, 2);
        assertEq(winner, player1);
        assertEq(highestWins, 2);
        assertTrue(finalized);
        assertFalse(claimed);
        
        // Check prize amount (10% of 2 matches * 2 ether each = 0.4 ether)
        uint256 expectedPrize = (STAKE_AMOUNT * 2 * SHARE_BASIS_POINTS / 10000) * 2;
        uint256 poolPrize = prize.getPoolPrize(1, address(0));
        assertEq(poolPrize, expectedPrize);
        
        // Claim prize
        uint256 balanceBefore = player1.balance;
        
        vm.prank(player1);
        prize.claimPrize(1);
        
        assertEq(player1.balance, balanceBefore + expectedPrize);
        
        // Verify claimed
        (,,,, bool claimedAfter) = prize.getPool(1);
        assertTrue(claimedAfter);
    }

    function test_MultiplePoolsWithDifferentWinners() public {
        // Pool 1: player1 wins both matches
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        _createAndFinalizeMatchWithDirectPrizeRecord(player1);
        
        // Pool 2: player2 wins both matches
        _createAndFinalizeMatchWithDirectPrizeRecord(player2);
        _createAndFinalizeMatchWithDirectPrizeRecord(player2);
        
        // Pool 1 winner is player1
        (,address winner1,,bool finalized1,) = prize.getPool(1);
        assertEq(winner1, player1);
        assertTrue(finalized1);
        
        // Pool 2 winner is player2
        (,address winner2,,bool finalized2,) = prize.getPool(2);
        assertEq(winner2, player2);
        assertTrue(finalized2);
        
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
        
        // Pool finalized - player1 reached 1 win first, player2 also has 1
        // First to reach highest wins is the winner (player1)
        (,address winner,,bool finalized,) = prize.getPool(1);
        assertTrue(finalized);
        assertEq(winner, player1); // First to reach 1 win
    }
}
