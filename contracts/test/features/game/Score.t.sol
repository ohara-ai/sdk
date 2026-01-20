// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Score} from "../../../src/features/game/Score.sol";

contract ScoreTest is Test {
    Score public score;
    
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
        // Initialize with test limits matching factory defaults: 50 losers, 1000 players, 100 matches
        score = new Score();
        score.initialize(owner, owner, 50, 1000, 100);
    }
    
    function test_InitialState() public view {
        assertEq(score.owner(), owner);
        assertEq(score.getTotalMatches(), 0);
        assertEq(score.getTotalPlayers(), 0);
        assertFalse(score.authorizedRecorders(recorder));
    }
    
    function test_SetRecorderAuthorization() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecorderAuthorized(recorder, true);
        score.setRecorderAuthorization(recorder, true);
        
        assertTrue(score.authorizedRecorders(recorder));
    }
    
    function test_RevokeRecorderAuthorization() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit RecorderAuthorized(recorder, false);
        score.setRecorderAuthorization(recorder, false);
        
        assertFalse(score.authorizedRecorders(recorder));
    }
    
    function test_OnlyOwnerCanAuthorizeRecorders() public {
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        score.setRecorderAuthorization(recorder, true);
    }
    
    function test_RecordMatchResult() public {
        // Authorize recorder
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        // Record match result
        uint256 matchId = 1;
        address[] memory losers = new address[](1);
        losers[0] = player2;
        uint256 prize = 100 ether;
        
        vm.prank(recorder);
        vm.expectEmit(true, true, false, true);
        emit ScoreRecorded(matchId, player1, 1, prize);
        score.recordMatchResult(player1, losers, prize, address(0));
        
        // Verify match record
        (
            address winner,
            address[] memory recordedLosers,
            uint256 recordedPrize,
            uint256 timestamp
        ) = score.getMatchRecord(matchId);
        
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
        ) = score.getPlayerScore(player1);
        
        assertEq(totalWins, 1);
        assertEq(totalPrize, prize);
        assertEq(lastMatchId, matchId);
        assertEq(lastWinTimestamp, block.timestamp);
    }
    
    function test_UnauthorizedRecorderCannotRecord() public {
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        vm.expectRevert(Score.UnauthorizedRecorder.selector);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
    }
    
    // Test removed: duplicate match check no longer needed with internal counter
    
    function test_RecordMultipleMatchesForSamePlayer() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        uint256 prize1 = 100 ether;
        uint256 prize2 = 200 ether;
        
        // Record first match
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, prize1, address(0));
        
        // Record second match
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, prize2, address(0));
        
        // Verify cumulative score
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = score.getPlayerScore(player1);
        
        assertEq(totalWins, 2);
        assertEq(totalPrize, prize1 + prize2);
        assertEq(lastMatchId, 2);
        assertEq(lastWinTimestamp, block.timestamp);
    }
    
    function test_RecordMatchWithMultipleLosers() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](3);
        losers[0] = player2;
        losers[1] = player3;
        losers[2] = player4;
        
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 400 ether, address(0));
        
        // Verify match record
        (
            address winner,
            address[] memory recordedLosers,
            ,
            
        ) = score.getMatchRecord(1);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 3);
        assertEq(recordedLosers[0], player2);
        assertEq(recordedLosers[1], player3);
        assertEq(recordedLosers[2], player4);
        
        // Verify all players are tracked
        assertEq(score.getTotalPlayers(), 4);
    }
    
    function test_GetPlayerScoreForNonExistentPlayer() public view {
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = score.getPlayerScore(player1);
        
        assertEq(totalWins, 0);
        assertEq(totalPrize, 0);
        assertEq(lastMatchId, 0);
        assertEq(lastWinTimestamp, 0);
    }
    
    function test_GetTopPlayersByWins() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player1 wins 3 times
        losers[0] = player2;
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        // Player2 wins 2 times
        losers[0] = player3;
        vm.prank(recorder);
        score.recordMatchResult(player2, losers, 100 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player2, losers, 100 ether, address(0));
        
        // Player3 wins 1 time
        losers[0] = player4;
        vm.prank(recorder);
        score.recordMatchResult(player3, losers, 100 ether, address(0));
        
        // Get players (unsorted - SDK handles sorting)
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = score.getPlayers(10);
        
        // Verify we have the expected number of players
        assertEq(players.length, 4); // player1, player2, player3, player4
        assertEq(wins.length, 4);
        assertEq(prizes.length, 4);
        
        // Note: Data is unsorted - SDK handles sorting client-side
    }
    
    function test_GetPlayersPaginated() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player1 wins 1 time with large prize
        losers[0] = player2;
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 500 ether, address(0));
        
        // Player2 wins 2 times with smaller prizes
        losers[0] = player3;
        vm.prank(recorder);
        score.recordMatchResult(player2, losers, 100 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player2, losers, 100 ether, address(0));
        
        // Player3 wins 3 times with smallest prizes
        losers[0] = player4;
        vm.prank(recorder);
        score.recordMatchResult(player3, losers, 50 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player3, losers, 50 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player3, losers, 50 ether, address(0));
        
        // Get paginated players (offset 1, limit 2)
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = score.getPlayersPaginated(1, 2);
        
        assertEq(players.length, 2);
        assertEq(wins.length, 2);
        assertEq(prizes.length, 2);
    }
    
    function test_GetPlayersPaginatedBeyondEnd() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        // Offset beyond available players
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = score.getPlayersPaginated(10, 5);
        
        assertEq(players.length, 0);
        assertEq(wins.length, 0);
        assertEq(prizes.length, 0);
    }
    
    function test_InvalidWinnerReverts() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("InvalidWinner()"));
        score.recordMatchResult(address(0), losers, 100 ether, address(0));
    }
    
    function test_GetPlayersWithLimitLargerThanPlayerCount() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        // Request 10 players when only 2 exist
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = score.getPlayers(10);
        
        assertEq(players.length, 2); // Should return only 2 players
        assertEq(wins.length, 2);
        assertEq(prizes.length, 2);
    }
    
    function test_GetPlayersWithZeroLimit() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        (
            address[] memory players,
            uint256[] memory wins,
            uint256[] memory prizes
        ) = score.getPlayers(0);
        
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
        ) = score.getMatchRecord(999);
        
        assertEq(winner, address(0));
        assertEq(losers.length, 0);
        assertEq(prize, 0);
        assertEq(timestamp, 0);
    }
    
    function test_GetTotalMatchesAndPlayers() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Record first match
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        assertEq(score.getTotalMatches(), 1);
        assertEq(score.getTotalPlayers(), 2);
        
        // Record second match with different players
        losers[0] = player3;
        vm.prank(recorder);
        score.recordMatchResult(player2, losers, 100 ether, address(0));
        
        assertEq(score.getTotalMatches(), 2);
        assertEq(score.getTotalPlayers(), 3);
    }
    
    function test_TracksLoserParticipation() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        // Player2 lost but should be tracked
        (
            uint256 totalWins,
            ,
            ,
            
        ) = score.getPlayerScore(player2);
        
        assertEq(totalWins, 0); // No wins
        assertEq(score.getTotalPlayers(), 2); // But is counted as a player
    }
    
    function test_OwnershipTransfer() public {
        address newOwner = address(0x123);
        
        // Step 1: Initiate transfer
        vm.prank(owner);
        score.transferOwnership(newOwner);
        
        // Owner should not change yet
        assertEq(score.owner(), owner);
        assertEq(score.pendingOwner(), newOwner);
        
        // Step 2: Accept ownership
        vm.prank(newOwner);
        score.acceptOwnership();
        
        // Now ownership should be transferred
        assertEq(score.owner(), newOwner);
        assertEq(score.pendingOwner(), address(0));
    }
    
    function test_OnlyOwnerCanTransferOwnership() public {
        address newOwner = address(0x123);
        
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        score.transferOwnership(newOwner);
    }
    
    function test_RecordMatchWithEmptyLosersArray() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](0);
        
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        (
            address winner,
            address[] memory recordedLosers,
            ,
            
        ) = score.getMatchRecord(1);
        
        assertEq(winner, player1);
        assertEq(recordedLosers.length, 0);
        assertEq(score.getTotalPlayers(), 1);
    }
    
    function test_PlayerCanWinMultipleConsecutiveMatches() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Fast forward time between matches
        vm.warp(100);
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        vm.warp(200);
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 150 ether, address(0));
        
        (
            uint256 totalWins,
            uint256 totalPrize,
            uint256 lastMatchId,
            uint256 lastWinTimestamp
        ) = score.getPlayerScore(player1);
        
        assertEq(totalWins, 2);
        assertEq(totalPrize, 250 ether);
        assertEq(lastMatchId, 2);
        assertEq(lastWinTimestamp, 200);
    }
    
    function test_LoserCanBecomeWinner() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Player2 loses first
        losers[0] = player2;
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        (uint256 wins1, , , ) = score.getPlayerScore(player2);
        assertEq(wins1, 0);
        
        // Player2 wins second match
        losers[0] = player1;
        vm.prank(recorder);
        score.recordMatchResult(player2, losers, 200 ether, address(0));
        
        (uint256 wins2, uint256 totalPrize, , ) = score.getPlayerScore(player2);
        assertEq(wins2, 1);
        assertEq(totalPrize, 200 ether);
    }

    function test_InitialLimits() public view {
        assertEq(score.maxLosersPerMatch(), 50);
        assertEq(score.maxTotalPlayers(), 1000);
        assertEq(score.maxTotalMatches(), 100);
    }

    function test_UpdateLimits() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit LimitsUpdated(100, 20000, 200000);
        score.updateLimits(100, 20000, 200000);
        
        assertEq(score.maxLosersPerMatch(), 100);
        assertEq(score.maxTotalPlayers(), 20000);
        assertEq(score.maxTotalMatches(), 200000);
    }

    function test_FeatureMetadata() public view {
        assertEq(score.version(), "1.0.0");
        assertEq(score.featureName(), "GameScore - OCI-002");
    }

    function test_OnlyOwnerCanUpdateLimits() public {
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        score.updateLimits(100, 20000, 200000);
    }

    function test_CannotReducePlayerLimitBelowCurrent() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        // Add 2 players
        address[] memory losers = new address[](1);
        losers[0] = player2;
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        assertEq(score.getTotalPlayers(), 2);
        
        // Try to set limit below current count
        vm.prank(owner);
        vm.expectRevert(Score.InvalidLimit.selector);
        score.updateLimits(0, 1, 0); // Try to set maxTotalPlayers to 1
    }

    function test_CannotReduceMatchLimitBelowCurrent() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        // Add 2 matches
        address[] memory losers = new address[](1);
        losers[0] = player2;
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        assertEq(score.getTotalMatches(), 2);
        
        // Try to set limit below current count
        vm.prank(owner);
        vm.expectRevert(Score.InvalidLimit.selector);
        score.updateLimits(0, 0, 1); // Try to set maxTotalMatches to 1
    }

    function test_LosersWithinLimitNotTruncated() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        // Create array with exactly 50 losers (at the limit)
        address[] memory losers = new address[](50);
        for (uint256 i = 0; i < 50; i++) {
            // casting to 'uint160' is safe because i is bounded to 0-49, so i + 100 will never exceed uint160
            // forge-lint: disable-next-line(unsafe-typecast)
            losers[i] = address(uint160(i + 100));
        }
        
        // Should NOT emit LosersTruncated event
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        // Verify all 50 losers are recorded
        (, address[] memory recordedLosers, , ) = score.getMatchRecord(1);
        assertEq(recordedLosers.length, 50);
        
        // Total players should be 51 (winner + 50 losers)
        assertEq(score.getTotalPlayers(), 51);
    }

    function test_TooManyLosersTruncates() public {
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        // Create array with 51 losers (over the limit of 50)
        address[] memory losers = new address[](51);
        for (uint256 i = 0; i < 51; i++) {
            // casting to 'uint160' is safe because i is bounded to 0-50, so i + 100 will never exceed uint160
            // forge-lint: disable-next-line(unsafe-typecast)
            losers[i] = address(uint160(i + 100));
        }
        
        // Should truncate to 50 losers silently
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        // Verify match was recorded with truncated losers
        (, address[] memory recordedLosers, , ) = score.getMatchRecord(1);
        assertEq(recordedLosers.length, 50); // Truncated to 50
        
        // Verify first 50 losers are tracked
        assertEq(recordedLosers[0], address(uint160(100)));
        assertEq(recordedLosers[49], address(uint160(149)));
        
        // Total players should be 51 (winner + 50 losers)
        assertEq(score.getTotalPlayers(), 51);
    }

    function test_GetRemainingCapacity() public {
        assertEq(score.getRemainingPlayerCapacity(), 1000);
        assertEq(score.getRemainingMatchCapacity(), 100);
        
        // Add a match
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        vm.prank(recorder);
        score.recordMatchResult(player1, losers, 100 ether, address(0));
        
        assertEq(score.getRemainingPlayerCapacity(), 998); // 2 players added
        assertEq(score.getRemainingMatchCapacity(), 99); // 1 match added
    }

    function test_MatchEvictionWhenAtCapacity() public {
        // Create scoreboard with small match limit
        Score smallGameScore = new Score();
        smallGameScore.initialize(owner, owner, 50, 1000, 3); // Only 3 matches
        
        vm.prank(owner);
        smallGameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        losers[0] = player2;
        
        // Record 3 matches (at capacity)
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player1, losers, 100 ether, address(0));
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player1, losers, 100 ether, address(0));
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player1, losers, 100 ether, address(0));
        
        assertEq(smallGameScore.getTotalMatches(), 3);
        
        // Record 4th match - should evict oldest (match 1)
        vm.prank(recorder);
        vm.expectEmit(true, false, false, false);
        emit MatchEvicted(1, block.timestamp);
        smallGameScore.recordMatchResult(player1, losers, 100 ether, address(0));
        
        assertEq(smallGameScore.getTotalMatches(), 3); // Still at capacity
        
        // Match 1 should be gone, but match 2, 3, 4 should exist
        (, , , uint256 timestamp1) = smallGameScore.getMatchRecord(1);
        assertEq(timestamp1, 0); // Match 1 evicted
        
        (, , , uint256 timestamp2) = smallGameScore.getMatchRecord(2);
        assertTrue(timestamp2 > 0); // Match 2 still exists
    }

    function test_PlayerEvictionWhenAtCapacity() public {
        // Create scoreboard with small player limit
        Score smallGameScore = new Score();
        smallGameScore.initialize(owner, owner, 50, 3, 1000); // Only 3 players
        
        vm.prank(owner);
        smallGameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Add 3 players (at capacity): player1 wins 2, player2 wins 1, player3 loses
        losers[0] = player3;
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player1, losers, 200 ether, address(0));
        
        losers[0] = player3;
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player1, losers, 100 ether, address(0));
        
        losers[0] = player3;
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player2, losers, 150 ether, address(0));
        
        assertEq(smallGameScore.getTotalPlayers(), 3);
        
        // Player1: 2 wins, 300 ether
        // Player2: 1 win, 150 ether
        // Player3: 0 wins, 0 ether (should be evicted first)
        
        // Add player4 - should evict player3 (least wins)
        losers[0] = player1;
        vm.prank(recorder);
        vm.expectEmit(true, false, false, false);
        emit PlayerEvicted(player3, 0, 0);
        smallGameScore.recordMatchResult(player4, losers, 50 ether, address(0));
        
        assertEq(smallGameScore.getTotalPlayers(), 3); // Still at capacity
        
        (uint256 p3Wins, , , ) = smallGameScore.getPlayerScore(player3);
        assertEq(p3Wins, 0); // Player3 evicted
        
        (uint256 p4Wins, , , ) = smallGameScore.getPlayerScore(player4);
        assertEq(p4Wins, 1); // Player4 added
    }

    function test_PlayerEvictionTieBreaker() public {
        // Create scoreboard with small player limit
        Score smallGameScore = new Score();
        smallGameScore.initialize(owner, owner, 50, 3, 1000);
        
        vm.prank(owner);
        smallGameScore.setRecorderAuthorization(recorder, true);
        
        address[] memory losers = new address[](1);
        
        // Add 3 players with same wins but different prizes
        losers[0] = address(0x999);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player1, losers, 300 ether, address(0)); // 1 win, 300 ether
        
        losers[0] = address(0x999);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player2, losers, 200 ether, address(0)); // 1 win, 200 ether
        
        losers[0] = address(0x999);
        vm.prank(recorder);
        smallGameScore.recordMatchResult(player3, losers, 100 ether, address(0)); // 1 win, 100 ether
        
        // All have 1 win, but player3 has least prize (should be evicted)
        losers[0] = player1;
        vm.prank(recorder);
        vm.expectEmit(true, false, false, false);
        emit PlayerEvicted(player3, 1, 100 ether);
        smallGameScore.recordMatchResult(player4, losers, 50 ether, address(0));
        
        (uint256 p3Wins, , , ) = smallGameScore.getPlayerScore(player3);
        assertEq(p3Wins, 0); // Player3 evicted
    }

    event LimitsUpdated(uint256 maxLosersPerMatch, uint256 maxTotalPlayers, uint256 maxTotalMatches);
    event MatchEvicted(uint256 indexed matchId, uint256 timestamp);
    event PlayerEvicted(address indexed player, uint256 totalWins, uint256 totalPrize);
}

contract ScoreListenerIntegrationTest is Test {
    Score public score;
    
    address public owner = address(0x1);
    address public recorder = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public listenerContract = address(0x5);
    address public listenerContract2 = address(0x6);
    
    event ScoreListenerAdded(address indexed listener);
    event ScoreListenerRemoved(address indexed listener);
    
    function setUp() public {
        score = new Score();
        score.initialize(owner, owner, 50, 1000, 100);
        
        vm.prank(owner);
        score.setRecorderAuthorization(recorder, true);
    }
    
    function test_AddScoreListener() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ScoreListenerAdded(listenerContract);
        score.addScoreListener(listenerContract);
        
        address[] memory listeners = score.getScoreListeners();
        assertEq(listeners.length, 1);
        assertEq(listeners[0], listenerContract);
    }
    
    function test_OnlyControllerCanAddListener() public {
        vm.prank(recorder);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        score.addScoreListener(listenerContract);
    }
    
    function test_CannotAddZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Score.InvalidListener.selector);
        score.addScoreListener(address(0));
    }
    
    function test_CannotAddDuplicateListener() public {
        vm.prank(owner);
        score.addScoreListener(listenerContract);
        
        vm.prank(owner);
        vm.expectRevert(Score.ListenerAlreadyRegistered.selector);
        score.addScoreListener(listenerContract);
    }
    
    function test_RemoveScoreListener() public {
        vm.prank(owner);
        score.addScoreListener(listenerContract);
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ScoreListenerRemoved(listenerContract);
        score.removeScoreListener(listenerContract);
        
        address[] memory listeners = score.getScoreListeners();
        assertEq(listeners.length, 0);
    }
    
    function test_CannotRemoveNonexistentListener() public {
        vm.prank(owner);
        vm.expectRevert(Score.ListenerNotFound.selector);
        score.removeScoreListener(listenerContract);
    }
    
    function test_MultipleListeners() public {
        vm.startPrank(owner);
        score.addScoreListener(listenerContract);
        score.addScoreListener(listenerContract2);
        vm.stopPrank();
        
        address[] memory listeners = score.getScoreListeners();
        assertEq(listeners.length, 2);
    }
}
