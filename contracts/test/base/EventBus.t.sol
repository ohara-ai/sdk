// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {EventBus} from "../../src/base/EventBus.sol";

contract MockListener {
    uint256 public matchResultCalls;
    uint256 public competitionStartedCalls;
    uint256 public competitionFinalizedCalls;
    
    uint256 public lastMatchId;
    address public lastWinner;
    uint256 public lastPrizeAmount;
    
    function onMatchResult(
        uint256 matchId,
        address winner,
        address[] calldata,
        uint256 prizeAmount
    ) external {
        matchResultCalls++;
        lastMatchId = matchId;
        lastWinner = winner;
        lastPrizeAmount = prizeAmount;
    }
    
    function onCompetitionStarted(uint8, uint256) external {
        competitionStartedCalls++;
    }
    
    function onCompetitionFinalized(uint8, uint256, address) external {
        competitionFinalizedCalls++;
    }
}

contract RevertingListener {
    function onMatchResult(uint256, address, address[] calldata, uint256) external pure {
        revert("Listener error");
    }
}

contract EventBusTest is Test {
    EventBus public eventBus;
    MockListener public listener1;
    MockListener public listener2;
    
    address public owner = address(0x1);
    address public emitter = address(0x2);
    address public unauthorized = address(0x3);
    
    event EmitterAuthorized(address indexed emitter, bool authorized);
    event ListenerRegistered(uint8 indexed eventType, address indexed listener);
    event ListenerRemoved(uint8 indexed eventType, address indexed listener);
    event EventDispatchFailed(uint8 indexed eventType, address indexed listener, bytes reason);
    
    function setUp() public {
        vm.prank(owner);
        eventBus = new EventBus(owner);
        
        listener1 = new MockListener();
        listener2 = new MockListener();
    }
    
    function test_InitialState() public view {
        assertEq(eventBus.owner(), owner);
        assertFalse(eventBus.authorizedEmitters(emitter));
    }
    
    function test_SetEmitterAuthorization() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit EmitterAuthorized(emitter, true);
        eventBus.setEmitterAuthorization(emitter, true);
        
        assertTrue(eventBus.authorizedEmitters(emitter));
    }
    
    function test_RevokeEmitterAuthorization() public {
        vm.prank(owner);
        eventBus.setEmitterAuthorization(emitter, true);
        
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit EmitterAuthorized(emitter, false);
        eventBus.setEmitterAuthorization(emitter, false);
        
        assertFalse(eventBus.authorizedEmitters(emitter));
    }
    
    function test_OnlyOwnerCanAuthorizeEmitters() public {
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        eventBus.setEmitterAuthorization(emitter, true);
    }
    
    function test_RegisterListener() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        vm.prank(owner);
        eventBus.registerListener(eventType, address(listener1));
        
        assertTrue(eventBus.isListener(eventType, address(listener1)));
    }
    
    function test_RegisterMultipleListeners() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        vm.startPrank(owner);
        eventBus.registerListener(eventType, address(listener1));
        eventBus.registerListener(eventType, address(listener2));
        vm.stopPrank();
        
        address[] memory listeners = eventBus.getListeners(eventType);
        assertEq(listeners.length, 2);
    }
    
    function test_RemoveListener() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        vm.startPrank(owner);
        eventBus.registerListener(eventType, address(listener1));
        eventBus.removeListener(eventType, address(listener1));
        vm.stopPrank();
        
        assertFalse(eventBus.isListener(eventType, address(listener1)));
    }
    
    function test_EmitMatchResult() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        
        // Setup
        vm.startPrank(owner);
        eventBus.setEmitterAuthorization(emitter, true);
        eventBus.registerListener(eventType, address(listener1));
        vm.stopPrank();
        
        // Emit event
        address[] memory losers = new address[](1);
        losers[0] = address(0x100);
        
        vm.prank(emitter);
        eventBus.emitMatchResult(1, address(0x200), losers, 100 ether);
        
        // Verify listener was called
        assertEq(listener1.matchResultCalls(), 1);
        assertEq(listener1.lastMatchId(), 1);
        assertEq(listener1.lastWinner(), address(0x200));
        assertEq(listener1.lastPrizeAmount(), 100 ether);
    }
    
    function test_EmitMatchResultToMultipleListeners() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        
        // Setup
        vm.startPrank(owner);
        eventBus.setEmitterAuthorization(emitter, true);
        eventBus.registerListener(eventType, address(listener1));
        eventBus.registerListener(eventType, address(listener2));
        vm.stopPrank();
        
        // Emit event
        address[] memory losers = new address[](1);
        losers[0] = address(0x100);
        
        vm.prank(emitter);
        eventBus.emitMatchResult(1, address(0x200), losers, 100 ether);
        
        // Both listeners should be called
        assertEq(listener1.matchResultCalls(), 1);
        assertEq(listener2.matchResultCalls(), 1);
    }
    
    function test_UnauthorizedEmitterReverts() public {
        address[] memory losers = new address[](0);
        
        vm.prank(unauthorized);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        eventBus.emitMatchResult(1, address(0x200), losers, 100 ether);
    }
    
    function test_FailedListenerEmitsEvent() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        RevertingListener badListener = new RevertingListener();
        
        vm.startPrank(owner);
        eventBus.setEmitterAuthorization(emitter, true);
        eventBus.registerListener(eventType, address(badListener));
        vm.stopPrank();
        
        address[] memory losers = new address[](0);
        
        // Should emit EventDispatchFailed but not revert
        vm.prank(emitter);
        eventBus.emitMatchResult(1, address(0x200), losers, 100 ether);
        // Test passes if no revert
    }
    
    function test_EmitCompetitionStarted() public {
        uint8 eventType = eventBus.EVENT_COMPETITION_STARTED();
        
        vm.startPrank(owner);
        eventBus.setEmitterAuthorization(emitter, true);
        eventBus.registerListener(eventType, address(listener1));
        vm.stopPrank();
        
        vm.prank(emitter);
        eventBus.emitCompetitionStarted(1, 42);
        
        assertEq(listener1.competitionStartedCalls(), 1);
    }
    
    function test_EmitCompetitionFinalized() public {
        uint8 eventType = eventBus.EVENT_COMPETITION_FINALIZED();
        
        vm.startPrank(owner);
        eventBus.setEmitterAuthorization(emitter, true);
        eventBus.registerListener(eventType, address(listener1));
        vm.stopPrank();
        
        vm.prank(emitter);
        eventBus.emitCompetitionFinalized(1, 42, address(0x300));
        
        assertEq(listener1.competitionFinalizedCalls(), 1);
    }
    
    function test_DuplicateListenerReverts() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        
        vm.startPrank(owner);
        eventBus.registerListener(eventType, address(listener1));
        
        vm.expectRevert(EventBus.ListenerAlreadyRegistered.selector);
        eventBus.registerListener(eventType, address(listener1));
        vm.stopPrank();
    }
    
    function test_RemoveNonexistentListenerReverts() public {
        uint8 eventType = eventBus.EVENT_MATCH_RESULT();
        
        vm.prank(owner);
        vm.expectRevert(EventBus.ListenerNotFound.selector);
        eventBus.removeListener(eventType, address(listener1));
    }
    
    function test_TransferOwnership() public {
        address newOwner = address(0x999);
        
        vm.prank(owner);
        eventBus.transferOwnership(newOwner);
        
        assertEq(eventBus.owner(), newOwner);
    }
}
