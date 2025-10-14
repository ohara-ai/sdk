// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {GameMatch} from "../src/features/game-match/GameMatch.sol";
import {IGameMatch} from "../src/interfaces/IGameMatch.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockScoreBoard} from "./mocks/MockScoreBoard.sol";
import {Owned} from "../src/base/Owned.sol";

contract GameMatchTest is Test {
    GameMatch public gameMatch;
    MockERC20 public token;
    MockScoreBoard public scoreBoard;

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

    function setUp() public {
        vm.startPrank(owner);
        address[] memory emptyRecipients = new address[](0);
        uint256[] memory emptyShares = new uint256[](0);
        gameMatch = new GameMatch(owner, controller, address(0), emptyRecipients, emptyShares);
        token = new MockERC20(1000000 ether);
        scoreBoard = new MockScoreBoard();
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
            address winner
        ) = gameMatch.getMatch(matchId);

        assertEq(matchToken, address(0));
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

        (, , , address[] memory players, , ) = gameMatch.getMatch(matchId);
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
        gameMatch.withdrawStake(matchId);

        assertEq(player1.balance, balanceBefore + STAKE_AMOUNT);
        assertEq(gameMatch.getPlayerStake(matchId, player1), 0);
        
        (, , , address[] memory players, , ) = gameMatch.getMatch(matchId);
        assertEq(players.length, 0);
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

        (, , , , IGameMatch.MatchStatus status, ) = gameMatch.getMatch(matchId);
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
        
        (, , , , IGameMatch.MatchStatus status, address winner) = gameMatch.getMatch(matchId);
        assertEq(uint256(status), uint256(IGameMatch.MatchStatus.Finalized));
        assertEq(winner, player1);
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

    function test_FinalizeWithScoreBoard() public {
        vm.prank(owner);
        gameMatch.setScoreBoard(address(scoreBoard));

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

        assertEq(scoreBoard.getResultCount(), 1);
        MockScoreBoard.MatchResult memory result = scoreBoard.getResult(0);
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
}
