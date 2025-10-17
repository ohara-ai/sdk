// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {GameScore} from "../src/features/scoreboard/GameScore.sol";
import {IGameScore} from "../src/interfaces/IGameScore.sol";

contract GameScoreTest is Test {
    GameScore public gameScore;
    
    address public owner = address(0x1);
    address public recorder = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public player3 = address(0x5);
    address public player4 = address(0x6);
    
    event RecorderAuthorized(address indexed recorder, bool authorized);
    event ScoreRecorded(
        uint256 indexed matchId,
        address indexed winner,
        uint256 totalWins,
        uint256 totalPrize
    );
    
    function setUp() public {
        vm.prank(owner);
        // Initialize with test limits matching factory defaults: 50 losers, 1000 players, 100 matches
        gameScore = new GameScore(owner, 50, 1000, 100);
    }
    
    function test_InitialState() public view {
        assertEq(gameScore.owner(), owner);
        assertEq(gameScore.getTotalMatches(), 0);
        assertEq(gameScore.getTotalPlayers(), 0);
        assertFalse(gameScore.authorizedRecorders(recorder));
    }
    
    function test_SetRecorderAuthorization() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecorderAuthorized(recorder, true);
        gameScore.setRecorderAuthorization(recorder, true);
        
        assertTrue(gameScore.authorizedRecorders(recorder));
    }
    
    function test_RevokeRecorderAuthorization() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecorderAuthorized(recorder, false);
        gameScore.setRecorderAuthorization(recorder, false);
        
        assertFalse(gameScore.authorizedRecorders(recorder));
    }
    
    function test_OnlyOwnerCanAuthorizeRecorders() public {
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameScore.setRecorderAuthorization(recorder, true);
    }
    
    function test_RecordMatchResult() public {
        // Authorize recorder
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        // Record match result
        uint256 matchId = 1;
        address[] memory losers = new address[](1);
        losers[0] = player2;
        uint256 prize = 100 ether;
        
        vm.prank(recorder);
        vm.expectEmit(true, true, false, true);
        emit ScoreRecorded(matchId, player1, 1, prize);
        gameScore.recordMatchResult(matchId, player1, losers, prize);
        
        // Verify match record
        (
            address winner,
            address[] memory recordedLosers,
            uint256 recordedPrize,
            uint256 timestamp
        ) = gameScore.getMatchRecord(matchId);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 1);
        assertEq(recordedLosers[0], player2);
        assertEq(recordedPrize, prize);
        assertEq(timestamp, block.timestamp);
        
        // Verify player score
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = gameScore.getPlayerScore(player1);
        
        assertEq(totalWins, 1);
        assertEq(totalPrize, prize);
        assertEq(lastMatchId, matchId);
        assertEq(lastWinTimestamp, block.timestamp);
    }
    
    function test_UnauthorizedRecorderCannotRecord() public {
        uint256 matchId = 1;
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        vm.expectRevert(GameScore.UnauthorizedRecorder.selector);
        gameScore.recordMatchResult(matchId, player1, losers, 100 ether);
    }
    
    function test_CannotRecordDuplicateMatch() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        uint256 matchId = 1;
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        gameScore.recordMatchResult(matchId, player1, losers, 100 ether);
        
        vm.prank(recorder);
        vm.expectRevert(GameScore.MatchAlreadyRecorded.selector);
        gameScore.recordMatchResult(matchId, player1, losers, 100 ether);
    }
    
    function test_RecordMultipleMatchesForSamePlayer() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        uint256 prize1 = 100 ether;
        uint256 prize2 = 200 ether;
        
        // Record first match
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, prize1);
        
        // Record second match
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player1, losers, prize2);
        
        // Verify cumulative score
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            
        ) = gameScore.getPlayerScore(player1);
        
        assertEq(totalWins, 2);
        assertEq(totalPrize, prize1 + prize2);
        assertEq(lastMatchId, 2);
    }
    
    function test_RecordMatchWithMultipleLosers() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](3);
        losers[0] = player2;
        losers[1] = player3;
        losers[2] = player4;
        
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 400 ether);
        
        // Verify match record
        (
            address winner,
            address[] memory recordedLosers,
            ,
            
        ) = gameScore.getMatchRecord(1);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 3);
        assertEq(recordedLosers[0], player2);
        assertEq(recordedLosers[1], player3);
        assertEq(recordedLosers[2], player4);
        
        // Verify all players are tracked
        assertEq(gameScore.getTotalPlayers(), 4);
    }
    
    function test_GetPlayerScoreForNonExistentPlayer() public view {
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = gameScore.getPlayerScore(player1);
        
        assertEq(totalWins, 0);
        assertEq(totalPrize, 0);
        assertEq(lastMatchId, 0);
        assertEq(lastWinTimestamp, 0);
    }
    
    function test_GetTopPlayersByWins() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player1 wins 3 times
        losers[0] = player2;
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player1, losers, 100 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(3, player1, losers, 100 ether);
        
        // Player2 wins 2 times
        losers[0] = player3;
        vm.prank(recorder);
        gameScore.recordMatchResult(4, player2, losers, 100 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(5, player2, losers, 100 ether);
        
        // Player3 wins 1 time
        losers[0] = player4;
        vm.prank(recorder);
        gameScore.recordMatchResult(6, player3, losers, 100 ether);
        
        // Get top 2 players
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = gameScore.getTopPlayersByWins(2);
        
        assertEq(players.length, 2);
        assertEq(players[0], player1);
        assertEq(wins[0], 3);
        assertEq(prizes[0], 300 ether);
        
        assertEq(players[1], player2);
        assertEq(wins[1], 2);
        assertEq(prizes[1], 200 ether);
    }
    
    function test_GetTopPlayersByPrize() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player1 wins 1 time with large prize
        losers[0] = player2;
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 500 ether);
        
        // Player2 wins 2 times with smaller prizes
        losers[0] = player3;
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player2, losers, 100 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(3, player2, losers, 100 ether);
        
        // Player3 wins 3 times with smallest prizes
        losers[0] = player4;
        vm.prank(recorder);
        gameScore.recordMatchResult(4, player3, losers, 50 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(5, player3, losers, 50 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(6, player3, losers, 50 ether);
        
        // Get top 3 players by prize
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = gameScore.getTopPlayersByPrize(3);
        
        assertEq(players.length, 3);
        
        // Player1 should be first (highest prize)
        assertEq(players[0], player1);
        assertEq(wins[0], 1);
        assertEq(prizes[0], 500 ether);
        
        // Player2 should be second
        assertEq(players[1], player2);
        assertEq(wins[1], 2);
        assertEq(prizes[1], 200 ether);
        
        // Player3 should be third
        assertEq(players[2], player3);
        assertEq(wins[2], 3);
        assertEq(prizes[2], 150 ether);
    }
    
    function test_GetTopPlayersWithLimitLargerThanPlayerCount() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        // Request 10 players when only 2 exist
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = gameScore.getTopPlayersByWins(10);
        
        assertEq(players.length, 2); // Should return only 2 players
        assertEq(wins.length, 2);
        assertEq(prizes.length, 2);
    }
    
    function test_GetTopPlayersWithZeroLimit() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = gameScore.getTopPlayersByWins(0);
        
        assertEq(players.length, 0);
        assertEq(wins.length, 0);
        assertEq(prizes.length, 0);
    }
    
    function test_GetMatchRecordForNonExistentMatch() public view {
        (
            address winner,
            address[] memory losers,
            uint256 prize,
            uint256 timestamp
        ) = gameScore.getMatchRecord(999);
        
        assertEq(winner, address(0));
        assertEq(losers.length, 0);
        assertEq(prize, 0);
        assertEq(timestamp, 0);
    }
    
    function test_GetTotalMatchesAndPlayers() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Record first match
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        assertEq(gameScore.getTotalMatches(), 1);
        assertEq(gameScore.getTotalPlayers(), 2);
        
        // Record second match with different players
        losers[0] = player3;
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player2, losers, 100 ether);
        
        assertEq(gameScore.getTotalMatches(), 2);
        assertEq(gameScore.getTotalPlayers(), 3);
    }
    
    function test_TracksLoserParticipation() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        // Player2 lost but should be tracked
        (
            uint256 totalWins,
            ,
            ,
            
        ) = gameScore.getPlayerScore(player2);
        
        assertEq(totalWins, 0); // No wins
        assertEq(gameScore.getTotalPlayers(), 2); // But is counted as a player
    }
    
    function test_OwnershipTransfer() public {
        address newOwner = address(0x123);
        
        vm.prank(owner);
        gameScore.transferOwnership(newOwner);
        
        assertEq(gameScore.owner(), newOwner);
    }
    
    function test_OnlyOwnerCanTransferOwnership() public {
        address newOwner = address(0x123);
        
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameScore.transferOwnership(newOwner);
    }
    
    function test_RecordMatchWithEmptyLosersArray() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](0);
        
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        (
            address winner,
            address[] memory recordedLosers,
            ,
            
        ) = gameScore.getMatchRecord(1);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 0);
        assertEq(gameScore.getTotalPlayers(), 1);
    }
    
    function test_PlayerCanWinMultipleConsecutiveMatches() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Fast forward time between matches
        vm.warp(100);
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        vm.warp(200);
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player1, losers, 150 ether);
        
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = gameScore.getPlayerScore(player1);
        
        assertEq(totalWins, 2);
        assertEq(totalPrize, 250 ether);
        assertEq(lastMatchId, 2);
        assertEq(lastWinTimestamp, 200);
    }
    
    function test_LoserCanBecomeWinner() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player2 loses first
        losers[0] = player2;
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        (uint256 wins1, , , ) = gameScore.getPlayerScore(player2);
        assertEq(wins1, 0);
        
        // Player2 wins second match
        losers[0] = player1;
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player2, losers, 200 ether);
        
        (uint256 wins2, uint256 totalPrize, , ) = gameScore.getPlayerScore(player2);
        assertEq(wins2, 1);
        assertEq(totalPrize, 200 ether);
    }

    function test_InitialLimits() public view {
        assertEq(gameScore.maxLosersPerMatch(), 50);
        assertEq(gameScore.maxTotalPlayers(), 1000);
        assertEq(gameScore.maxTotalMatches(), 100);
    }

    function test_UpdateLimits() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit LimitsUpdated(100, 20000, 200000);
        gameScore.updateLimits(100, 20000, 200000);
        
        assertEq(gameScore.maxLosersPerMatch(), 100);
        assertEq(gameScore.maxTotalPlayers(), 20000);
        assertEq(gameScore.maxTotalMatches(), 200000);
    }

    function test_OnlyOwnerCanUpdateLimits() public {
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        gameScore.updateLimits(100, 20000, 200000);
    }

    function test_CannotReducePlayerLimitBelowCurrent() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        // Add 2 players
        address[] memory losers = new address[](1);
        losers[0] = player2;
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        assertEq(gameScore.getTotalPlayers(), 2);
        
        // Try to set limit below current count
        vm.prank(owner);
        vm.expectRevert(GameScore.InvalidLimit.selector);
        gameScore.updateLimits(0, 1, 0); // Try to set maxTotalPlayers to 1
    }

    function test_CannotReduceMatchLimitBelowCurrent() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        // Add 2 matches
        address[] memory losers = new address[](1);
        losers[0] = player2;
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        vm.prank(recorder);
        gameScore.recordMatchResult(2, player1, losers, 100 ether);
        
        assertEq(gameScore.getTotalMatches(), 2);
        
        // Try to set limit below current count
        vm.prank(owner);
        vm.expectRevert(GameScore.InvalidLimit.selector);
        gameScore.updateLimits(0, 0, 1); // Try to set maxTotalMatches to 1
    }

    function test_LosersWithinLimitNotTruncated() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        // Create array with exactly 50 losers (at the limit)
        address[] memory losers = new address[](50);
        for (uint256 i = 0; i < 50; i++) {
            losers[i] = address(uint160(i + 100));
        }
        
        // Should NOT emit LosersTruncated event
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        // Verify all 50 losers are recorded
        (, address[] memory recordedLosers, , ) = gameScore.getMatchRecord(1);
        assertEq(recordedLosers.length, 50);
        
        // Total players should be 51 (winner + 50 losers)
        assertEq(gameScore.getTotalPlayers(), 51);
    }

    function test_TooManyLosersTruncates() public {
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        // Create array with 51 losers (over the limit of 50)
        address[] memory losers = new address[](51);
        for (uint256 i = 0; i < 51; i++) {
            losers[i] = address(uint160(i + 100));
        }
        
        // Should truncate to 50 losers silently
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        // Verify match was recorded with truncated losers
        (, address[] memory recordedLosers, , ) = gameScore.getMatchRecord(1);
        assertEq(recordedLosers.length, 50); // Truncated to 50
        
        // Verify first 50 losers are tracked
        assertEq(recordedLosers[0], address(uint160(100)));
        assertEq(recordedLosers[49], address(uint160(149)));
        
        // Total players should be 51 (winner + 50 losers)
        assertEq(gameScore.getTotalPlayers(), 51);
    }

    function test_GetRemainingCapacity() public {
        assertEq(gameScore.getRemainingPlayerCapacity(), 1000);
        assertEq(gameScore.getRemainingMatchCapacity(), 100);
        
        // Add a match
        vm.prank(owner);
        gameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        vm.prank(recorder);
        gameScore.recordMatchResult(1, player1, losers, 100 ether);
        
        assertEq(gameScore.getRemainingPlayerCapacity(), 998); // 2 players added
        assertEq(gameScore.getRemainingMatchCapacity(), 99); // 1 match added
    }

    function test_MatchEvictionWhenAtCapacity() public {
        // Create scoreboard with small match limit
        vm.prank(owner);
        GameScore smallGameScore = new GameScore(owner, 50, 1000, 3); // Only 3 matches
        
        vm.prank(owner);
        smallGameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Record 3 matches (at capacity)
        vm.prank(recorder);
        smallGameScore.recordMatchResult(1, player1, losers, 100 ether);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(2, player1, losers, 100 ether);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(3, player1, losers, 100 ether);
        
        assertEq(smallGameScore.getTotalMatches(), 3);
        
        // Record 4th match - should evict oldest (match 1)
        vm.prank(recorder);
        vm.expectEmit(true, false, false, false);
        emit MatchEvicted(1, block.timestamp);
        smallGameScore.recordMatchResult(4, player1, losers, 100 ether);
        
        assertEq(smallGameScore.getTotalMatches(), 3); // Still at capacity
        
        // Match 1 should be gone, but match 2, 3, 4 should exist
        (, , , uint256 timestamp1) = smallGameScore.getMatchRecord(1);
        assertEq(timestamp1, 0); // Match 1 evicted
        
        (, , , uint256 timestamp2) = smallGameScore.getMatchRecord(2);
        assertTrue(timestamp2 > 0); // Match 2 still exists
    }

    function test_PlayerEvictionWhenAtCapacity() public {
        // Create scoreboard with small player limit
        vm.prank(owner);
        GameScore smallGameScore = new GameScore(owner, 50, 3, 1000); // Only 3 players
        
        vm.prank(owner);
        smallGameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Add 3 players (at capacity): player1 wins 2, player2 wins 1, player3 loses
        losers[0] = player3;
        vm.prank(recorder);
        smallGameScore.recordMatchResult(1, player1, losers, 200 ether);
        
        losers[0] = player3;
        vm.prank(recorder);
        smallGameScore.recordMatchResult(2, player1, losers, 100 ether);
        
        losers[0] = player3;
        vm.prank(recorder);
        smallGameScore.recordMatchResult(3, player2, losers, 150 ether);
        
        assertEq(smallGameScore.getTotalPlayers(), 3);
        
        // Player1: 2 wins, 300 ether
        // Player2: 1 win, 150 ether
        // Player3: 0 wins, 0 ether (should be evicted first)
        
        // Add player4 - should evict player3 (least wins)
        losers[0] = player1;
        vm.prank(recorder);
        vm.expectEmit(true, false, false, false);
        emit PlayerEvicted(player3, 0, 0);
        smallGameScore.recordMatchResult(4, player4, losers, 50 ether);
        
        assertEq(smallGameScore.getTotalPlayers(), 3); // Still at capacity
        
        (uint256 p3Wins, , , ) = smallGameScore.getPlayerScore(player3);
        assertEq(p3Wins, 0); // Player3 evicted
        
        (uint256 p4Wins, , , ) = smallGameScore.getPlayerScore(player4);
        assertEq(p4Wins, 1); // Player4 added
    }

    function test_PlayerEvictionTieBreaker() public {
        // Create scoreboard with small player limit
        vm.prank(owner);
        GameScore smallGameScore = new GameScore(owner, 50, 3, 1000);
        
        vm.prank(owner);
        smallGameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Add 3 players with same wins but different prizes
        losers[0] = address(0x999);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(1, player1, losers, 300 ether); // 1 win, 300 ether
        
        losers[0] = address(0x999);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(2, player2, losers, 200 ether); // 1 win, 200 ether
        
        losers[0] = address(0x999);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(3, player3, losers, 100 ether); // 1 win, 100 ether
        
        // All have 1 win, but player3 has least prize (should be evicted)
        losers[0] = player1;
        vm.prank(recorder);
        vm.expectEmit(true, false, false, false);
        emit PlayerEvicted(player3, 1, 100 ether);
        smallGameScore.recordMatchResult(4, player4, losers, 50 ether);
        
        (uint256 p3Wins, , , ) = smallGameScore.getPlayerScore(player3);
        assertEq(p3Wins, 0); // Player3 evicted
    }

    event LimitsUpdated(uint256 maxLosersPerMatch, uint256 maxTotalPlayers, uint256 maxTotalMatches);
    event MatchEvicted(uint256 indexed matchId, uint256 timestamp);
    event PlayerEvicted(address indexed player, uint256 totalWins, uint256 totalPrize);
}
