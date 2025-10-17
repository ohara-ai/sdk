// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {GameMatch} from "../src/features/game-match/GameMatch.sol";
import {IGameMatch} from "../src/interfaces/IGameMatch.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockGameScore} from "./mocks/MockGameScore.sol";
import {Owned} from "../src/base/Owned.sol";

contract GameMatchTest is Test {
    GameMatch public gameMatch;
    MockERC20 public token;
    MockGameScore public gameScore;

    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public player3 = address(0x5);

    uint256 constant STAKE_AMOUNT = 1 ether;
    uint256 constant MAX_PLAYERS = 3;

    event MatchCreated(
        uint256 indexed matchId,
        address indexed creator,
        address token,
        uint256 stakeAmount,
        uint256 maxPlayers
    );
    event PlayerJoined(uint256 indexed matchId, address indexed player, uint256 stakeAmount);
    event PlayerWithdrew(uint256 indexed matchId, address indexed player, uint256 amount);
    event MatchActivated(uint256 indexed matchId, address[] players);
    event MatchFinalized(
        uint256 indexed matchId,
        address indexed winner,
        uint256 totalPrize,
        uint256 winnerAmount
    );
    event MatchCancelled(uint256 indexed matchId, address[] players, uint256 refundAmount);

    function setUp() public {
        vm.startPrank(owner);
        uint256 defaultMaxActiveMatches = 100; // Default limit
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        gameMatch = new GameMatch(owner, controller, address(0), defaultMaxActiveMatches, feeRecipients, feeShares);
        token = new MockERC20(1000000 ether);
        gameScore = new MockGameScore();
        vm.stopPrank();

        // Fund players with ETH and tokens
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        vm.deal(player3, 100 ether);

        token.mint(player1, 1000 ether);
        token.mint(player2, 1000 ether);
        token.mint(player3, 1000 ether);
    }

    function test_CreateMatchWithNativeToken() public {
        vm.startPrank(player1);
        
        vm.expectEmit(true, true, false, true);
        emit MatchCreated(0, player1, address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        vm.expectEmit(true, true, false, true);
        emit PlayerJoined(0, player1, STAKE_AMOUNT);
        
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );
        
        vm.stopPrank();

        assertEq(matchId, 0);
        (
            address matchToken,
            uint256 stakeAmount,
            uint256 maxPlayers,
            address[] memory players,
            IGameMatch.MatchStatus status,
            address winner,
            uint256 createdAt
        ) = gameMatch.getMatch(matchId);

        assertEq(matchToken, address(0));
        assertGt(createdAt, 0);
        assertEq(stakeAmount, STAKE_AMOUNT);
        assertEq(maxPlayers, MAX_PLAYERS);
        assertEq(players.length, 1);
        assertEq(players[0], player1);
        assertEq(uint256(status), uint256(IGameMatch.MatchStatus.Open));
        assertEq(winner, address(0));
    }

    function test_CreateMatchWithERC20() public {
        vm.startPrank(player1);
        token.approve(address(gameMatch), STAKE_AMOUNT);
        
        uint256 matchId = gameMatch.createMatch(address(token), STAKE_AMOUNT, MAX_PLAYERS);
        vm.stopPrank();

        assertEq(matchId, 0);
        assertEq(token.balanceOf(address(gameMatch)), STAKE_AMOUNT);
        assertEq(gameMatch.getPlayerStake(matchId, player1), STAKE_AMOUNT);
    }

    function test_JoinMatchWithNativeToken() public {
        // Create match
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        // Join match
        vm.prank(player2);
        vm.expectEmit(true, true, false, true);
        emit PlayerJoined(matchId, player2, STAKE_AMOUNT);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        (, , , address[] memory players, , , ) = gameMatch.getMatch(matchId);
        assertEq(players.length, 2);
        assertEq(players[1], player2);
    }

    function test_JoinMatchWithERC20() public {
        vm.startPrank(player1);
        token.approve(address(gameMatch), STAKE_AMOUNT);
        uint256 matchId = gameMatch.createMatch(address(token), STAKE_AMOUNT, MAX_PLAYERS);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(gameMatch), STAKE_AMOUNT);
        gameMatch.joinMatch(matchId);
        vm.stopPrank();

        assertEq(gameMatch.getPlayerStake(matchId, player2), STAKE_AMOUNT);
        assertEq(token.balanceOf(address(gameMatch)), STAKE_AMOUNT * 2);
    }

    function test_WithdrawStakeBeforeActivation() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        uint256 balanceBefore = player1.balance;
        
        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit PlayerWithdrew(matchId, player1, STAKE_AMOUNT);
        vm.expectEmit(true, false, false, true);
        emit MatchCancelled(matchId, new address[](0), 0);
        gameMatch.withdrawStake(matchId);

        assertEq(player1.balance, balanceBefore + STAKE_AMOUNT);
        assertEq(gameMatch.getPlayerStake(matchId, player1), 0);
        
        // After cleanup, match data is deleted and returns default values
        (address matchToken, uint256 matchStake, , address[] memory players, IGameMatch.MatchStatus status, , ) = gameMatch.getMatch(matchId);
        assertEq(players.length, 0);
        assertEq(matchToken, address(0)); // Default value
        assertEq(matchStake, 0); // Default value
        assertEq(uint256(status), 0); // Default (Open) - match data deleted
        assertEq(gameMatch.getActiveMatchCount(), 0); // Match removed from active matches
    }

    function test_CannotWithdrawAfterActivation() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        vm.prank(player1);
        vm.expectRevert(GameMatch.InvalidMatchStatus.selector);
        gameMatch.withdrawStake(matchId);
    }

    function test_LastPlayerWithdrawalCancelsMatch() public {
        // Create match with 3 players
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(player3);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        assertEq(gameMatch.getActiveMatchCount(), 1);
        
        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;
        uint256 player3BalanceBefore = player3.balance;

        // Player 1 withdraws - match should still be Open
        vm.prank(player1);
        vm.expectEmit(true, true, false, true);
        emit PlayerWithdrew(matchId, player1, STAKE_AMOUNT);
        gameMatch.withdrawStake(matchId);

        (, , , address[] memory players1, IGameMatch.MatchStatus status1, , ) = gameMatch.getMatch(matchId);
        assertEq(players1.length, 2);
        assertEq(uint256(status1), uint256(IGameMatch.MatchStatus.Open));
        assertEq(gameMatch.getActiveMatchCount(), 1); // Still active
        assertEq(player1.balance, player1BalanceBefore + STAKE_AMOUNT);

        // Player 2 withdraws - match should still be Open
        vm.prank(player2);
        vm.expectEmit(true, true, false, true);
        emit PlayerWithdrew(matchId, player2, STAKE_AMOUNT);
        gameMatch.withdrawStake(matchId);

        (, , , address[] memory players2, IGameMatch.MatchStatus status2, , ) = gameMatch.getMatch(matchId);
        assertEq(players2.length, 1);
        assertEq(uint256(status2), uint256(IGameMatch.MatchStatus.Open));
        assertEq(gameMatch.getActiveMatchCount(), 1); // Still active
        assertEq(player2.balance, player2BalanceBefore + STAKE_AMOUNT);

        // Player 3 withdraws (last player) - match should be Cancelled
        vm.prank(player3);
        vm.expectEmit(true, true, false, true);
        emit PlayerWithdrew(matchId, player3, STAKE_AMOUNT);
        vm.expectEmit(true, false, false, true);
        emit MatchCancelled(matchId, new address[](0), 0);
        gameMatch.withdrawStake(matchId);

        // After cleanup, match data is deleted and returns default values
        (address matchToken, uint256 matchStake, , address[] memory players3, IGameMatch.MatchStatus status3, , ) = gameMatch.getMatch(matchId);
        assertEq(players3.length, 0);
        assertEq(matchToken, address(0)); // Default value
        assertEq(matchStake, 0); // Default value
        assertEq(uint256(status3), 0); // Default (Open) - match data deleted
        assertEq(gameMatch.getActiveMatchCount(), 0); // Removed from active matches
        assertEq(player3.balance, player3BalanceBefore + STAKE_AMOUNT);
    }

    function test_ActivateMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        address[] memory expectedPlayers = new address[](2);
        expectedPlayers[0] = player1;
        expectedPlayers[1] = player2;

        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit MatchActivated(matchId, expectedPlayers);
        gameMatch.activateMatch(matchId);

        (, , , , IGameMatch.MatchStatus status, , ) = gameMatch.getMatch(matchId);
        assertEq(uint256(status), uint256(IGameMatch.MatchStatus.Active));
    }

    function test_CannotActivateWithLessThanTwoPlayers() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(controller);
        vm.expectRevert(GameMatch.InvalidMatchStatus.selector);
        gameMatch.activateMatch(matchId);
    }

    function test_OnlyControllerCanActivate() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(player1);
        vm.expectRevert(Owned.Unauthorized.selector);
        gameMatch.activateMatch(matchId);
    }

    function test_FinalizeMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        uint256 player1BalanceBefore = player1.balance;
        uint256 totalPrize = STAKE_AMOUNT * 2;

        vm.prank(controller);
        vm.expectEmit(true, true, false, true);
        emit MatchFinalized(matchId, player1, totalPrize, totalPrize);
        gameMatch.finalizeMatch(matchId, player1);

        assertEq(player1.balance, player1BalanceBefore + totalPrize);
        
        // After cleanup, match data is deleted and returns default values
        (address matchToken, uint256 matchStake, , address[] memory players, IGameMatch.MatchStatus status, address winner, ) = gameMatch.getMatch(matchId);
        assertEq(matchToken, address(0)); // Default value
        assertEq(matchStake, 0); // Default value
        assertEq(players.length, 0); // Default value
        assertEq(uint256(status), 0); // Default (Open) - match data deleted
        assertEq(winner, address(0)); // Default value
    }

    function test_CannotFinalizeBeforeActivation() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        vm.expectRevert(GameMatch.InvalidMatchStatus.selector);
        gameMatch.finalizeMatch(matchId, player1);
    }

    function test_CannotFinalizeWithInvalidWinner() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        vm.prank(controller);
        vm.expectRevert(GameMatch.InvalidWinner.selector);
        gameMatch.finalizeMatch(matchId, player3); // player3 not in match
    }

    function test_FinalizeWithGameScore() public {
        vm.prank(owner);
        gameMatch.setGameScore(address(gameScore));

        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        vm.prank(controller);
        gameMatch.finalizeMatch(matchId, player1);

        assertEq(gameScore.getResultCount(), 1);
        MockGameScore.MatchResult memory result = gameScore.getResult(0);
        assertEq(result.matchId, matchId);
        assertEq(result.winner, player1);
        assertEq(result.losers.length, 1);
        assertEq(result.losers[0], player2);
        assertEq(result.prize, STAKE_AMOUNT * 2);
    }

    function test_FinalizeWithFees() public {
        address feeRecipient = address(0x999);
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%

        vm.prank(owner);
        gameMatch.configureFees(recipients, shares);

        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        uint256 player1BalanceBefore = player1.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        uint256 totalPrize = STAKE_AMOUNT * 2;
        uint256 expectedFee = (totalPrize * 1000) / 10000; // 10%
        uint256 expectedWinnerAmount = totalPrize - expectedFee;

        vm.prank(controller);
        gameMatch.finalizeMatch(matchId, player1);

        assertEq(player1.balance, player1BalanceBefore + expectedWinnerAmount);
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + expectedFee);
    }

    function test_CannotJoinFullMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            2 // Only 2 players max
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(player3);
        vm.expectRevert(GameMatch.MaxPlayersReached.selector);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);
    }

    function test_CannotJoinTwice() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player1);
        vm.expectRevert(GameMatch.InvalidMatchStatus.selector);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);
    }

    function test_FeatureMetadata() public view {
        assertEq(gameMatch.version(), "1.0.0");
        assertEq(gameMatch.featureName(), "GameMatch - OCI-001");
    }

    function test_OwnershipTransfer() public {
        address newOwner = address(0x123);
        
        vm.prank(owner);
        gameMatch.transferOwnership(newOwner);
        
        assertEq(gameMatch.owner(), newOwner);
    }

    function test_ControllerUpdate() public {
        address newController = address(0x456);
        
        vm.prank(owner);
        gameMatch.setController(newController);
        
        assertEq(gameMatch.controller(), newController);
    }

    function test_MatchIncludesTimestamp() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        (,,,,, , uint256 createdAt) = gameMatch.getMatch(matchId);
        assertEq(createdAt, block.timestamp);
    }

    function test_InitialMaxActiveMatches() public view {
        assertEq(gameMatch.maxActiveMatches(), 100);
    }

    function test_SetMaxActiveMatches() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit MaxActiveMatchesUpdated(10);
        gameMatch.setMaxActiveMatches(10);
        
        assertEq(gameMatch.maxActiveMatches(), 10);
    }

    function test_OnlyOwnerCanSetMaxActiveMatches() public {
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.setMaxActiveMatches(10);
    }

    function test_CannotCreateMatchWhenAtCapacity() public {
        vm.prank(owner);
        gameMatch.setMaxActiveMatches(2);
        
        // Create 2 matches (at capacity)
        vm.prank(player1);
        gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        vm.prank(player2);
        gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        assertEq(gameMatch.getActiveMatchCount(), 2);
        
        // Try to create third match
        vm.prank(player3);
        vm.expectRevert(GameMatch.MaxActiveMatchesReached.selector);
        gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
    }

    function test_FinalizedMatchFreesUpCapacity() public {
        vm.prank(owner);
        gameMatch.setMaxActiveMatches(1);
        
        // Create and finalize first match
        vm.prank(player1);
        uint256 matchId1 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, 2);
        
        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId1);
        
        vm.prank(controller);
        gameMatch.activateMatch(matchId1);
        
        vm.prank(controller);
        gameMatch.finalizeMatch(matchId1, player1);
        
        assertEq(gameMatch.getActiveMatchCount(), 0);
        
        // Should be able to create new match now
        vm.prank(player1);
        uint256 matchId2 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, 2);
        
        assertEq(gameMatch.getActiveMatchCount(), 1);
        assertGt(matchId2, 0);
    }

    function test_CleanupInactiveMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        // Player withdraws, leaving match empty - this now auto-cancels the match
        vm.prank(player1);
        gameMatch.withdrawStake(matchId);
        
        // After withdrawal cleanup, match is removed from active matches
        assertEq(gameMatch.getActiveMatchCount(), 0);
        
        // Match data is deleted and returns default values
        (address matchToken, uint256 matchStake, , address[] memory players, IGameMatch.MatchStatus status, , ) = gameMatch.getMatch(matchId);
        assertEq(matchToken, address(0)); // Default value
        assertEq(matchStake, 0); // Default value
        assertEq(players.length, 0); // Default value
        assertEq(uint256(status), 0); // Default (Open) - match data deleted
        
        // Cannot clean up a match that doesn't exist (stakeAmount == 0 means InvalidMatchId)
        vm.prank(owner);
        vm.expectRevert(GameMatch.InvalidMatchId.selector);
        gameMatch.cleanupInactiveMatch(matchId);
    }

    function test_CannotCleanupMatchWithPlayers() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        // Match has player1, cannot clean up
        vm.prank(owner);
        vm.expectRevert(GameMatch.MatchNotInactive.selector);
        gameMatch.cleanupInactiveMatch(matchId);
    }

    function test_CannotCleanupActivatedMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, 2);
        
        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);
        
        vm.prank(controller);
        gameMatch.activateMatch(matchId);
        
        // Match is activated, cannot clean up
        vm.prank(owner);
        vm.expectRevert(GameMatch.MatchNotInactive.selector);
        gameMatch.cleanupInactiveMatch(matchId);
    }

    function test_GetActiveMatchIds() public {
        vm.prank(player1);
        uint256 matchId1 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        vm.prank(player2);
        uint256 matchId2 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        uint256[] memory ids = gameMatch.getActiveMatchIds(0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], matchId1);
        assertEq(ids[1], matchId2);
    }

    function test_GetActiveMatchIdsPagination() public {
        vm.prank(player1);
        uint256 matchId1 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        vm.prank(player2);
        uint256 matchId2 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        vm.prank(player3);
        uint256 matchId3 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, MAX_PLAYERS);
        
        // Get first 2
        uint256[] memory ids1 = gameMatch.getActiveMatchIds(0, 2);
        assertEq(ids1.length, 2);
        assertEq(ids1[0], matchId1);
        assertEq(ids1[1], matchId2);
        
        // Get next 1
        uint256[] memory ids2 = gameMatch.getActiveMatchIds(2, 2);
        assertEq(ids2.length, 1);
        assertEq(ids2[0], matchId3);
    }

    function test_CancelMatchExplicitly() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;

        address[] memory expectedPlayers = new address[](2);
        expectedPlayers[0] = player1;
        expectedPlayers[1] = player2;

        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit MatchCancelled(matchId, expectedPlayers, STAKE_AMOUNT);
        gameMatch.cancelMatch(matchId);

        // Verify refunds
        assertEq(player1.balance, player1BalanceBefore + STAKE_AMOUNT);
        assertEq(player2.balance, player2BalanceBefore + STAKE_AMOUNT);

        // After cleanup, match data is deleted and returns default values
        (address matchToken, uint256 matchStake, , address[] memory players, IGameMatch.MatchStatus status, , ) = gameMatch.getMatch(matchId);
        assertEq(matchToken, address(0)); // Default value
        assertEq(matchStake, 0); // Default value
        assertEq(players.length, 0); // Default value
        assertEq(uint256(status), 0); // Default (Open) - match data deleted

        // Verify capacity freed
        assertEq(gameMatch.getActiveMatchCount(), 0);
    }

    function test_CancelMatchWithERC20() public {
        vm.startPrank(player1);
        token.approve(address(gameMatch), STAKE_AMOUNT);
        uint256 matchId = gameMatch.createMatch(address(token), STAKE_AMOUNT, MAX_PLAYERS);
        vm.stopPrank();

        vm.startPrank(player2);
        token.approve(address(gameMatch), STAKE_AMOUNT);
        gameMatch.joinMatch(matchId);
        vm.stopPrank();

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        uint256 player1BalanceBefore = token.balanceOf(player1);
        uint256 player2BalanceBefore = token.balanceOf(player2);

        vm.prank(controller);
        gameMatch.cancelMatch(matchId);

        // Verify refunds
        assertEq(token.balanceOf(player1), player1BalanceBefore + STAKE_AMOUNT);
        assertEq(token.balanceOf(player2), player2BalanceBefore + STAKE_AMOUNT);
    }

    function test_FinalizeMatchWithTiedResult() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        uint256 player1BalanceBefore = player1.balance;
        uint256 player2BalanceBefore = player2.balance;

        address[] memory expectedPlayers = new address[](2);
        expectedPlayers[0] = player1;
        expectedPlayers[1] = player2;

        // Pass address(0) as winner to indicate tied match
        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit MatchCancelled(matchId, expectedPlayers, STAKE_AMOUNT);
        gameMatch.finalizeMatch(matchId, address(0));

        // Verify refunds
        assertEq(player1.balance, player1BalanceBefore + STAKE_AMOUNT);
        assertEq(player2.balance, player2BalanceBefore + STAKE_AMOUNT);

        // After cleanup, match data is deleted and returns default values
        (address matchToken, uint256 matchStake, , address[] memory players, IGameMatch.MatchStatus status, , ) = gameMatch.getMatch(matchId);
        assertEq(matchToken, address(0)); // Default value
        assertEq(matchStake, 0); // Default value
        assertEq(players.length, 0); // Default value
        assertEq(uint256(status), 0); // Default (Open) - match data deleted
    }

    function test_OnlyControllerCanCancelMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId);

        vm.prank(controller);
        gameMatch.activateMatch(matchId);

        vm.prank(player1);
        vm.expectRevert(Owned.Unauthorized.selector);
        gameMatch.cancelMatch(matchId);
    }

    function test_CannotCancelNonActiveMatch() public {
        vm.prank(player1);
        uint256 matchId = gameMatch.createMatch{value: STAKE_AMOUNT}(
            address(0),
            STAKE_AMOUNT,
            MAX_PLAYERS
        );

        vm.prank(controller);
        vm.expectRevert(GameMatch.InvalidMatchStatus.selector);
        gameMatch.cancelMatch(matchId);
    }

    function test_CancelledMatchFreesUpCapacity() public {
        vm.prank(owner);
        gameMatch.setMaxActiveMatches(1);

        // Create and cancel match
        vm.prank(player1);
        uint256 matchId1 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, 2);

        vm.prank(player2);
        gameMatch.joinMatch{value: STAKE_AMOUNT}(matchId1);

        vm.prank(controller);
        gameMatch.activateMatch(matchId1);

        vm.prank(controller);
        gameMatch.cancelMatch(matchId1);

        assertEq(gameMatch.getActiveMatchCount(), 0);

        // Should be able to create new match now
        vm.prank(player1);
        uint256 matchId2 = gameMatch.createMatch{value: STAKE_AMOUNT}(address(0), STAKE_AMOUNT, 2);

        assertEq(gameMatch.getActiveMatchCount(), 1);
        assertGt(matchId2, 0);
    }

    event MaxActiveMatchesUpdated(uint256 newLimit);
    event InactiveMatchCleaned(uint256 indexed matchId, uint256 createdAt);
}
