// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Tournament} from "../../../src/features/game/Tournament.sol";
import {ITournament} from "../../../src/interfaces/game/ITournament.sol";

contract TournamentTest is Test {
    Tournament public tournament;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public scoreContract = address(0x3);
    
    address public player1 = address(0x10);
    address public player2 = address(0x11);
    address public player3 = address(0x12);
    address public player4 = address(0x13);
    address public player5 = address(0x14);
    address public player6 = address(0x15);
    address public player7 = address(0x16);
    address public player8 = address(0x17);
    
    event TournamentCreated(uint256 indexed tournamentId, address[] participants, uint256 totalRounds);
    event TournamentActivated(uint256 indexed tournamentId);
    event BracketMatchResolved(uint256 indexed tournamentId, uint256 indexed round, uint256 indexed matchIndex, address winner, address loser);
    event RoundCompleted(uint256 indexed tournamentId, uint256 round, address[] advancingPlayers);
    event TournamentFinalized(uint256 indexed tournamentId, address indexed winner);
    event TournamentCancelled(uint256 indexed tournamentId);
    
    function setUp() public {
        tournament = new Tournament();
        tournament.initialize(owner, controller, scoreContract, 100);
    }
    
    function test_InitialState() public view {
        assertEq(tournament.owner(), owner);
        assertEq(tournament.controller(), controller);
        assertEq(tournament.scoreContract(), scoreContract);
        assertEq(tournament.maxActiveTournaments(), 100);
        assertEq(tournament.getActiveTournamentCount(), 0);
    }
    
    function test_CreateTournament_TwoPlayers() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        assertEq(id, 0);
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(t.participantCount, 2);
        assertEq(t.totalRounds, 1);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Pending));
        assertEq(t.winner, address(0));
    }
    
    function test_CreateTournament_FourPlayers() public {
        address[] memory participants = new address[](4);
        participants[0] = player1;
        participants[1] = player2;
        participants[2] = player3;
        participants[3] = player4;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(t.participantCount, 4);
        assertEq(t.totalRounds, 2);
    }
    
    function test_CreateTournament_EightPlayers() public {
        address[] memory participants = new address[](8);
        participants[0] = player1;
        participants[1] = player2;
        participants[2] = player3;
        participants[3] = player4;
        participants[4] = player5;
        participants[5] = player6;
        participants[6] = player7;
        participants[7] = player8;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(t.participantCount, 8);
        assertEq(t.totalRounds, 3);
    }
    
    function test_CreateTournament_RevertInvalidCount() public {
        // Not power of 2
        address[] memory participants = new address[](3);
        participants[0] = player1;
        participants[1] = player2;
        participants[2] = player3;
        
        vm.prank(controller);
        vm.expectRevert(Tournament.InvalidParticipantCount.selector);
        tournament.createTournament(participants);
    }
    
    function test_CreateTournament_RevertTooFewPlayers() public {
        address[] memory participants = new address[](1);
        participants[0] = player1;
        
        vm.prank(controller);
        vm.expectRevert(Tournament.InvalidParticipantCount.selector);
        tournament.createTournament(participants);
    }
    
    function test_CreateTournament_OnlyController() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        tournament.createTournament(participants);
    }
    
    function test_Activate() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        vm.prank(controller);
        tournament.activate(id);
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Active));
        
        // Check bracket is initialized
        ITournament.BracketMatch memory m = tournament.getBracketMatch(id, 0, 0);
        assertEq(m.player1, player1);
        assertEq(m.player2, player2);
        assertFalse(m.resolved);
    }
    
    function test_Activate_OnlyController() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        tournament.activate(id);
    }
    
    function test_Activate_RevertAlreadyActive() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        
        vm.expectRevert(Tournament.InvalidStatus.selector);
        tournament.activate(id);
        vm.stopPrank();
    }
    
    function test_ResolveMatch_TwoPlayerTournament() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        
        // Resolve the final match
        tournament.resolveMatch(id, 0, 0, player1);
        vm.stopPrank();
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Finalized));
        assertEq(t.winner, player1);
    }
    
    function test_ResolveMatch_FourPlayerTournament() public {
        address[] memory participants = new address[](4);
        participants[0] = player1;
        participants[1] = player2;
        participants[2] = player3;
        participants[3] = player4;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        
        // Round 0: 2 matches
        // Match 0: player1 vs player4 (seeded from ends)
        // Match 1: player2 vs player3
        ITournament.BracketMatch[] memory round0 = tournament.getRoundMatches(id, 0);
        assertEq(round0.length, 2);
        
        // Resolve round 0
        tournament.resolveMatch(id, 0, 0, round0[0].player1);
        tournament.resolveMatch(id, 0, 1, round0[1].player1);
        
        // Round 1: 1 match (finals)
        ITournament.BracketMatch[] memory round1 = tournament.getRoundMatches(id, 1);
        assertEq(round1.length, 1);
        
        // Resolve finals
        tournament.resolveMatch(id, 1, 0, round1[0].player1);
        vm.stopPrank();
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Finalized));
    }
    
    function test_ResolveMatch_RevertInvalidWinner() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        
        // Try to resolve with non-participant
        vm.expectRevert(Tournament.InvalidWinner.selector);
        tournament.resolveMatch(id, 0, 0, player3);
        vm.stopPrank();
    }
    
    function test_ResolveMatch_RevertAlreadyResolved() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        tournament.resolveMatch(id, 0, 0, player1);
        
        // Tournament is finalized now, can't resolve again
        vm.expectRevert(Tournament.InvalidStatus.selector);
        tournament.resolveMatch(id, 0, 0, player2);
        vm.stopPrank();
    }
    
    function test_Cancel_Pending() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        
        tournament.cancel(id);
        vm.stopPrank();
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Cancelled));
    }
    
    function test_Cancel_Active() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        
        tournament.cancel(id);
        vm.stopPrank();
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Cancelled));
    }
    
    function test_Cancel_OnlyController() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        vm.prank(player1);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        tournament.cancel(id);
    }
    
    function test_GetParticipants() public {
        address[] memory participants = new address[](4);
        participants[0] = player1;
        participants[1] = player2;
        participants[2] = player3;
        participants[3] = player4;
        
        vm.prank(controller);
        uint256 id = tournament.createTournament(participants);
        
        address[] memory retrieved = tournament.getParticipants(id);
        assertEq(retrieved.length, 4);
        assertEq(retrieved[0], player1);
        assertEq(retrieved[1], player2);
        assertEq(retrieved[2], player3);
        assertEq(retrieved[3], player4);
    }
    
    function test_HasPendingMatch() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        vm.stopPrank();
        
        (bool exists, uint256 round, uint256 matchIndex) = tournament.hasPendingMatch(id, player1, player2);
        assertTrue(exists);
        assertEq(round, 0);
        assertEq(matchIndex, 0);
        
        // Reverse order should also work
        (exists, round, matchIndex) = tournament.hasPendingMatch(id, player2, player1);
        assertTrue(exists);
    }
    
    function test_OnMatchResult_FromScoreContract() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        vm.stopPrank();
        
        // Simulate Score contract calling onMatchResult
        vm.prank(scoreContract);
        tournament.onMatchResult(player1, player2);
        
        ITournament.TournamentView memory t = tournament.getTournament(id);
        assertEq(uint256(t.status), uint256(ITournament.TournamentStatus.Finalized));
        assertEq(t.winner, player1);
    }
    
    function test_OnMatchResult_RevertUnauthorized() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        uint256 id = tournament.createTournament(participants);
        tournament.activate(id);
        vm.stopPrank();
        
        // Non-score contract should fail
        vm.prank(player3);
        vm.expectRevert(Tournament.UnauthorizedCaller.selector);
        tournament.onMatchResult(player1, player2);
    }
    
    function test_SetScoreContract() public {
        address newScore = address(0x999);
        
        vm.prank(controller);
        tournament.setScoreContract(newScore);
        
        assertEq(tournament.scoreContract(), newScore);
    }
    
    function test_SetMaxActiveTournaments() public {
        vm.prank(owner);
        tournament.setMaxActiveTournaments(50);
        
        assertEq(tournament.maxActiveTournaments(), 50);
    }
    
    function test_SetMaxActiveTournaments_OnlyOwner() public {
        vm.prank(controller);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        tournament.setMaxActiveTournaments(50);
    }
    
    function test_MaxActiveTournaments_RevertWhenReached() public {
        // Set max to 1
        vm.prank(owner);
        tournament.setMaxActiveTournaments(1);
        
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        tournament.createTournament(participants);
        
        // Second tournament should fail
        vm.expectRevert(Tournament.MaxTournamentsReached.selector);
        tournament.createTournament(participants);
        vm.stopPrank();
    }
    
    function test_ActiveTournamentCount() public {
        address[] memory participants = new address[](2);
        participants[0] = player1;
        participants[1] = player2;
        
        vm.startPrank(controller);
        
        assertEq(tournament.getActiveTournamentCount(), 0);
        
        uint256 id1 = tournament.createTournament(participants);
        assertEq(tournament.getActiveTournamentCount(), 1);
        
        uint256 id2 = tournament.createTournament(participants);
        assertEq(tournament.getActiveTournamentCount(), 2);
        
        // Cancel one
        tournament.cancel(id1);
        assertEq(tournament.getActiveTournamentCount(), 1);
        
        // Finalize the other
        tournament.activate(id2);
        tournament.resolveMatch(id2, 0, 0, player1);
        assertEq(tournament.getActiveTournamentCount(), 0);
        
        vm.stopPrank();
    }
    
    function test_Version() public view {
        assertEq(tournament.version(), "2.0.0");
    }
    
    function test_FeatureName() public view {
        assertEq(tournament.featureName(), "Tournament - OCI-005");
    }
}
