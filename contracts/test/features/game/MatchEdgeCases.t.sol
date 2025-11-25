// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Match} from "../../../src/features/game/Match.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";
import {MockScore} from "../../mocks/MockScore.sol";

contract MatchEdgeCasesTest is Test {
    Match public gameMatch;
    MockERC20 public token;
    MockScore public gameScore;

    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);

    function setUp() public {
        uint256 defaultMaxActiveMatches = 100;
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        gameMatch = new Match();
        gameMatch.initialize(owner, controller, address(0), defaultMaxActiveMatches, feeRecipients, feeShares);
        
        vm.startPrank(owner);
        token = new MockERC20(0);
        gameScore = new MockScore();
        vm.stopPrank();

        vm.deal(controller, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        token.mint(controller, 1000 ether);
        token.mint(player1, 1000 ether);
        token.mint(player2, 1000 ether);
    }

    function test_SetScore() public {
        vm.startPrank(controller);
        
        // Set valid score contract
        vm.expectEmit(true, true, false, true);
        emit ScoreContractUpdated(address(0), address(gameScore));
        gameMatch.setScore(address(gameScore));
        assertEq(address(gameMatch.score()), address(gameScore));
        
        // Can disable score by setting to address(0)
        vm.expectEmit(true, true, false, true);
        emit ScoreContractUpdated(address(gameScore), address(0));
        gameMatch.setScore(address(0));
        assertEq(address(gameMatch.score()), address(0));
        
        vm.stopPrank();
    }

    function test_SetScore_RevertInvalidAddress() public {
        vm.startPrank(controller);
        
        // Try to set non-contract address (EOA)
        address eoa = address(0x999);
        vm.expectRevert(abi.encodeWithSignature("InvalidTokenAddress()"));
        gameMatch.setScore(eoa);
        
        vm.stopPrank();
    }

    function test_SetScore_OnlyController() public {
        vm.startPrank(player1);
        
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameMatch.setScore(address(gameScore));
        
        vm.stopPrank();
    }

    function test_SetMaxActiveMatches_RevertLimitTooHigh() public {
        vm.startPrank(owner);
        
        uint256 tooHigh = gameMatch.ABSOLUTE_MAX_ACTIVE_MATCHES() + 1;
        vm.expectRevert(abi.encodeWithSignature("LimitTooHigh()"));
        gameMatch.setMaxActiveMatches(tooHigh);
        
        vm.stopPrank();
    }

    function test_SetMaxActiveMatches_AtAbsoluteMax() public {
        vm.startPrank(owner);
        
        uint256 absoluteMax = gameMatch.ABSOLUTE_MAX_ACTIVE_MATCHES();
        gameMatch.setMaxActiveMatches(absoluteMax);
        assertEq(gameMatch.maxActiveMatches(), absoluteMax);
        
        vm.stopPrank();
    }

    function test_CleanupInactiveMatch_AlreadyCleanedByLeave() public {
        // Create match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // When last player leaves, match is automatically cancelled and cleaned up
        gameMatch.leave(matchId);
        vm.stopPrank();
        
        // Verify match was cleaned up (stakeAmount is 0)
        (, uint256 stakeAmount,,,,,) = gameMatch.getMatch(matchId);
        assertEq(stakeAmount, 0);
        
        // Trying to cleanup again should fail with InvalidMatchId
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("InvalidMatchId()"));
        gameMatch.cleanupInactiveMatch(matchId);
        vm.stopPrank();
    }

    function test_CleanupInactiveMatch_RevertInvalidMatchId() public {
        vm.startPrank(owner);
        
        uint256 nonExistentMatchId = 999;
        vm.expectRevert(abi.encodeWithSignature("InvalidMatchId()"));
        gameMatch.cleanupInactiveMatch(nonExistentMatchId);
        
        vm.stopPrank();
    }

    function test_CleanupInactiveMatch_RevertNotInactive() public {
        // Create and activate match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        vm.stopPrank();
        
        // Cannot cleanup active match
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("MatchNotInactive()"));
        gameMatch.cleanupInactiveMatch(matchId);
        vm.stopPrank();
    }

    function test_CleanupInactiveMatch_RevertHasPlayers() public {
        // Create match with players
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        // Cannot cleanup match with players
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSignature("MatchNotInactive()"));
        gameMatch.cleanupInactiveMatch(matchId);
        vm.stopPrank();
    }

    function test_GetActiveMatchIds_EmptyWhenOffsetTooLarge() public {
        // Create a match
        vm.startPrank(controller);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        // Query with offset beyond total
        uint256[] memory matchIds = gameMatch.getActiveMatchIds(10, 10);
        assertEq(matchIds.length, 0);
    }

    function test_GetActiveMatchIds_TruncatesWhenLimitExceedsTotal() public {
        // Create 3 matches
        vm.startPrank(controller);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        // Query with limit larger than remaining
        uint256[] memory matchIds = gameMatch.getActiveMatchIds(1, 10);
        assertEq(matchIds.length, 2); // Only 2 matches after offset 1
    }

    function test_CreateMatch_RevertStakeAmountZero() public {
        vm.startPrank(controller);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidStakeAmount()"));
        gameMatch.create{value: 0}(address(0), 0, 2);
        
        vm.stopPrank();
    }

    function test_CreateMatch_RevertStakeAmountTooHigh() public {
        vm.startPrank(controller);
        
        uint256 tooHigh = gameMatch.MAX_STAKE_AMOUNT() + 1;
        vm.expectRevert(abi.encodeWithSignature("StakeAmountTooHigh()"));
        gameMatch.create(address(0), tooHigh, 2);
        
        vm.stopPrank();
    }

    function test_CreateMatch_RevertMaxPlayersLessThanTwo() public {
        vm.startPrank(controller);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidMaxPlayers()"));
        gameMatch.create{value: 1 ether}(address(0), 1 ether, 1);
        
        vm.stopPrank();
    }

    function test_CreateMatch_RevertMaxPlayersTooMany() public {
        vm.startPrank(controller);
        
        uint256 tooMany = gameMatch.MAX_PLAYERS_LIMIT() + 1;
        vm.expectRevert(abi.encodeWithSignature("TooManyPlayers()"));
        gameMatch.create{value: 1 ether}(address(0), 1 ether, tooMany);
        
        vm.stopPrank();
    }

    function test_CreateMatch_RevertInvalidTokenAddress() public {
        vm.startPrank(controller);
        
        // Try to create match with non-contract token address
        address notAContract = address(0x999);
        vm.expectRevert(abi.encodeWithSignature("InvalidTokenAddress()"));
        gameMatch.create(notAContract, 1 ether, 2);
        
        vm.stopPrank();
    }

    function test_CreateMatch_WithERC20_RevertIfSendingNativeToken() public {
        vm.startPrank(controller);
        token.approve(address(gameMatch), 100 ether);
        
        // Should revert if sending ETH with ERC20 match
        vm.expectRevert(abi.encodeWithSignature("InsufficientStake()"));
        gameMatch.create{value: 1 ether}(address(token), 1 ether, 2);
        
        vm.stopPrank();
    }

    function test_JoinMatch_WithNativeToken_RevertIfAmountMismatch() public {
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        
        // Send wrong amount
        vm.expectRevert(abi.encodeWithSignature("InsufficientStake()"));
        gameMatch.join{value: 0.5 ether}(matchId);
        
        vm.stopPrank();
    }

    function test_JoinMatch_WithERC20_RevertIfSendingNativeToken() public {
        vm.startPrank(controller);
        token.approve(address(gameMatch), 100 ether);
        uint256 matchId = gameMatch.create(address(token), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        token.approve(address(gameMatch), 100 ether);
        
        // Should revert if sending ETH with ERC20 match
        vm.expectRevert(abi.encodeWithSignature("InsufficientStake()"));
        gameMatch.join{value: 1 ether}(matchId);
        
        vm.stopPrank();
    }

    function test_Leave_CancelsMatchWhenLastPlayerLeaves() public {
        // Create match with one player
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        // Last player leaves - should cancel match, cleanup, and emit event
        vm.startPrank(controller);
        vm.expectEmit(true, false, false, false);
        emit MatchCancelled(matchId, new address[](0), 0);
        gameMatch.leave(matchId);
        vm.stopPrank();
        
        // After cleanup, match data is deleted (stakeAmount becomes 0)
        (address matchToken, uint256 stakeAmount,,,,,) = gameMatch.getMatch(matchId);
        assertEq(stakeAmount, 0); // Match was cleaned up
        assertEq(matchToken, address(0));
    }

    function test_FinalizeMatch_WithTiedResult_CancelsMatch() public {
        // Create and activate match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        
        // Finalize with tied result (winner = address(0)) - should emit MatchCancelled
        vm.expectEmit(true, false, false, false);
        emit MatchCancelled(matchId, new address[](2), 1 ether);
        gameMatch.finalize(matchId, address(0));
        vm.stopPrank();
        
        // After cleanup, match data is deleted (stakeAmount becomes 0)
        (, uint256 stakeAmount,,,,,) = gameMatch.getMatch(matchId);
        assertEq(stakeAmount, 0); // Match was cleaned up
    }

    function test_FinalizeMatch_WithScoreContract() public {
        // Set score contract
        vm.startPrank(controller);
        gameMatch.setScore(address(gameScore));
        vm.stopPrank();
        
        // Create and activate match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        
        // Finalize match - should record score
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Verify score was recorded
        assertTrue(gameScore.recordMatchCalled());
    }

    function test_CannotCancelFinalizedMatch() public {
        // Create and finalize a match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        
        // Try to cancel already finalized match - should fail with InvalidMatchId since it was cleaned up
        vm.expectRevert(abi.encodeWithSignature("InvalidMatchId()"));
        gameMatch.cancel(matchId);
        vm.stopPrank();
    }

    function test_ActivateMatch_RevertWithLessThanTwoPlayers() public {
        // Create match with only creator
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidMatchStatus()"));
        gameMatch.activate(matchId);
        
        vm.stopPrank();
    }

    event ScoreContractUpdated(address indexed previousScore, address indexed newScore);
    event InactiveMatchCleaned(uint256 indexed matchId, uint256 createdAt);
    event MatchCancelled(uint256 indexed matchId, address[] players, uint256 refundAmount);
}
