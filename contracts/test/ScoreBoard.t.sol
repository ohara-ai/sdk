// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {ScoreBoard} from "../src/features/scoreboard/ScoreBoard.sol";
import {IScoreBoard} from "../src/interfaces/IScoreBoard.sol";

contract ScoreBoardTest is Test {
    ScoreBoard public scoreBoard;
    
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
        scoreBoard = new ScoreBoard(owner);
    }
    
    function test_InitialState() public view {
        assertEq(scoreBoard.owner(), owner);
        assertEq(scoreBoard.getTotalMatches(), 0);
        assertEq(scoreBoard.getTotalPlayers(), 0);
        assertFalse(scoreBoard.authorizedRecorders(recorder));
    }
    
    function test_SetRecorderAuthorization() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecorderAuthorized(recorder, true);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        assertTrue(scoreBoard.authorizedRecorders(recorder));
    }
    
    function test_RevokeRecorderAuthorization() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecorderAuthorized(recorder, false);
        scoreBoard.setRecorderAuthorization(recorder, false);
        
        assertFalse(scoreBoard.authorizedRecorders(recorder));
    }
    
    function test_OnlyOwnerCanAuthorizeRecorders() public {
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        scoreBoard.setRecorderAuthorization(recorder, true);
    }
    
    function test_RecordMatchResult() public {
        // Authorize recorder
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        // Record match result
        uint256 matchId = 1;
        address[] memory losers = new address[](1);
        losers[0] = player2;
        uint256 prize = 100 ether;
        
        vm.prank(recorder);
        vm.expectEmit(true, true, false, true);
        emit ScoreRecorded(matchId, player1, 1, prize);
        scoreBoard.recordMatchResult(matchId, player1, losers, prize);
        
        // Verify match record
        (
            address winner,
            address[] memory recordedLosers,
            uint256 recordedPrize,
            uint256 timestamp
        ) = scoreBoard.getMatchRecord(matchId);
        
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
        ) = scoreBoard.getPlayerScore(player1);
        
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
        vm.expectRevert(ScoreBoard.UnauthorizedRecorder.selector);
        scoreBoard.recordMatchResult(matchId, player1, losers, 100 ether);
    }
    
    function test_CannotRecordDuplicateMatch() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        uint256 matchId = 1;
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(matchId, player1, losers, 100 ether);
        
        vm.prank(recorder);
        vm.expectRevert(ScoreBoard.MatchAlreadyRecorded.selector);
        scoreBoard.recordMatchResult(matchId, player1, losers, 100 ether);
    }
    
    function test_RecordMultipleMatchesForSamePlayer() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        uint256 prize1 = 100 ether;
        uint256 prize2 = 200 ether;
        
        // Record first match
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, prize1);
        
        // Record second match
        vm.prank(recorder);
        scoreBoard.recordMatchResult(2, player1, losers, prize2);
        
        // Verify cumulative score
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            
        ) = scoreBoard.getPlayerScore(player1);
        
        assertEq(totalWins, 2);
        assertEq(totalPrize, prize1 + prize2);
        assertEq(lastMatchId, 2);
    }
    
    function test_RecordMatchWithMultipleLosers() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](3);
        losers[0] = player2;
        losers[1] = player3;
        losers[2] = player4;
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 400 ether);
        
        // Verify match record
        (
            address winner,
            address[] memory recordedLosers,
            ,
            
        ) = scoreBoard.getMatchRecord(1);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 3);
        assertEq(recordedLosers[0], player2);
        assertEq(recordedLosers[1], player3);
        assertEq(recordedLosers[2], player4);
        
        // Verify all players are tracked
        assertEq(scoreBoard.getTotalPlayers(), 4);
    }
    
    function test_GetPlayerScoreForNonExistentPlayer() public view {
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = scoreBoard.getPlayerScore(player1);
        
        assertEq(totalWins, 0);
        assertEq(totalPrize, 0);
        assertEq(lastMatchId, 0);
        assertEq(lastWinTimestamp, 0);
    }
    
    function test_GetTopPlayersByWins() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player1 wins 3 times
        losers[0] = player2;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(2, player1, losers, 100 ether);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(3, player1, losers, 100 ether);
        
        // Player2 wins 2 times
        losers[0] = player3;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(4, player2, losers, 100 ether);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(5, player2, losers, 100 ether);
        
        // Player3 wins 1 time
        losers[0] = player4;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(6, player3, losers, 100 ether);
        
        // Get top 2 players
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = scoreBoard.getTopPlayersByWins(2);
        
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
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player1 wins 1 time with large prize
        losers[0] = player2;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 500 ether);
        
        // Player2 wins 2 times with smaller prizes
        losers[0] = player3;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(2, player2, losers, 100 ether);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(3, player2, losers, 100 ether);
        
        // Player3 wins 3 times with smallest prizes
        losers[0] = player4;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(4, player3, losers, 50 ether);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(5, player3, losers, 50 ether);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(6, player3, losers, 50 ether);
        
        // Get top 3 players by prize
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = scoreBoard.getTopPlayersByPrize(3);
        
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
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        // Request 10 players when only 2 exist
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = scoreBoard.getTopPlayersByWins(10);
        
        assertEq(players.length, 2); // Should return only 2 players
        assertEq(wins.length, 2);
        assertEq(prizes.length, 2);
    }
    
    function test_GetTopPlayersWithZeroLimit() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = scoreBoard.getTopPlayersByWins(0);
        
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
        ) = scoreBoard.getMatchRecord(999);
        
        assertEq(winner, address(0));
        assertEq(losers.length, 0);
        assertEq(prize, 0);
        assertEq(timestamp, 0);
    }
    
    function test_GetTotalMatchesAndPlayers() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Record first match
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        assertEq(scoreBoard.getTotalMatches(), 1);
        assertEq(scoreBoard.getTotalPlayers(), 2);
        
        // Record second match with different players
        losers[0] = player3;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(2, player2, losers, 100 ether);
        
        assertEq(scoreBoard.getTotalMatches(), 2);
        assertEq(scoreBoard.getTotalPlayers(), 3);
    }
    
    function test_TracksLoserParticipation() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        // Player2 lost but should be tracked
        (
            uint256 totalWins,
            ,
            ,
            
        ) = scoreBoard.getPlayerScore(player2);
        
        assertEq(totalWins, 0); // No wins
        assertEq(scoreBoard.getTotalPlayers(), 2); // But is counted as a player
    }
    
    function test_OwnershipTransfer() public {
        address newOwner = address(0x123);
        
        vm.prank(owner);
        scoreBoard.transferOwnership(newOwner);
        
        assertEq(scoreBoard.owner(), newOwner);
    }
    
    function test_OnlyOwnerCanTransferOwnership() public {
        address newOwner = address(0x123);
        
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        scoreBoard.transferOwnership(newOwner);
    }
    
    function test_RecordMatchWithEmptyLosersArray() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](0);
        
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        (
            address winner,
            address[] memory recordedLosers,
            ,
            
        ) = scoreBoard.getMatchRecord(1);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 0);
        assertEq(scoreBoard.getTotalPlayers(), 1);
    }
    
    function test_PlayerCanWinMultipleConsecutiveMatches() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Fast forward time between matches
        vm.warp(100);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        vm.warp(200);
        vm.prank(recorder);
        scoreBoard.recordMatchResult(2, player1, losers, 150 ether);
        
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = scoreBoard.getPlayerScore(player1);
        
        assertEq(totalWins, 2);
        assertEq(totalPrize, 250 ether);
        assertEq(lastMatchId, 2);
        assertEq(lastWinTimestamp, 200);
    }
    
    function test_LoserCanBecomeWinner() public {
        vm.prank(owner);
        scoreBoard.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player2 loses first
        losers[0] = player2;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(1, player1, losers, 100 ether);
        
        (uint256 wins1, , , ) = scoreBoard.getPlayerScore(player2);
        assertEq(wins1, 0);
        
        // Player2 wins second match
        losers[0] = player1;
        vm.prank(recorder);
        scoreBoard.recordMatchResult(2, player2, losers, 200 ether);
        
        (uint256 wins2, uint256 totalPrize, , ) = scoreBoard.getPlayerScore(player2);
        assertEq(wins2, 1);
        assertEq(totalPrize, 200 ether);
    }
}
