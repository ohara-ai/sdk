// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Heap} from "../../../src/features/game/Heap.sol";
import {IHeap} from "../../../src/interfaces/game/IHeap.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";
import {MockScore} from "../../mocks/MockScore.sol";
import {Owned} from "../../../src/base/Owned.sol";

contract HeapTest is Test {
    Heap public heap;
    MockERC20 public token;
    MockScore public gameScore;

    address public owner = address(0x1);
    address public controller = address(0x2);
    address public contributor1 = address(0x3);
    address public contributor2 = address(0x4);
    address public contributor3 = address(0x5);

    uint256 constant CONTRIBUTION_AMOUNT = 1 ether;
    uint256 constant MAX_CONTRIBUTIONS = 3;

    event HeapCreated(
        uint256 indexed heapId,
        address indexed creator,
        address token,
        uint256 contributionAmount,
        uint256 maxContributions
    );
    event ContributionAdded(uint256 indexed heapId, address indexed contributor, uint256 amount, uint256 totalContributions);
    event ContributionWithdrawn(uint256 indexed heapId, address indexed contributor, uint256 amount);
    event HeapActivated(uint256 indexed heapId, address[] contributors);
    event HeapFinalized(
        uint256 indexed heapId,
        address indexed winner,
        uint256 totalPrize,
        uint256 winnerAmount
    );
    event HeapCancelled(uint256 indexed heapId, address[] contributors, uint256 refundAmount);

    function setUp() public {
        uint256 defaultMaxActiveHeaps = 100;
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        heap = new Heap();
        heap.initialize(owner, controller, address(0), defaultMaxActiveHeaps, feeRecipients, feeShares);
        
        vm.startPrank(owner);
        token = new MockERC20(1000000 ether);
        gameScore = new MockScore();
        vm.stopPrank();

        // Fund contributors with ETH and tokens
        vm.deal(contributor1, 100 ether);
        vm.deal(contributor2, 100 ether);
        vm.deal(contributor3, 100 ether);

        token.mint(contributor1, 1000 ether);
        token.mint(contributor2, 1000 ether);
        token.mint(contributor3, 1000 ether);
    }

    function test_CreateHeapWithNativeToken() public {
        vm.startPrank(contributor1);
        
        vm.expectEmit(true, true, false, true);
        emit HeapCreated(0, contributor1, address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        vm.expectEmit(true, true, false, true);
        emit ContributionAdded(0, contributor1, CONTRIBUTION_AMOUNT, 1);
        
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );
        
        vm.stopPrank();

        assertEq(heapId, 0);
        (
            address heapToken,
            uint256 contributionAmount,
            uint256 maxContributions,
            address[] memory contributors,
            IHeap.HeapStatus status,
            address winner,
            uint256 createdAt
        ) = heap.getHeap(heapId);

        assertEq(heapToken, address(0));
        assertGt(createdAt, 0);
        assertEq(contributionAmount, CONTRIBUTION_AMOUNT);
        assertEq(maxContributions, MAX_CONTRIBUTIONS);
        assertEq(contributors.length, 1);
        assertEq(contributors[0], contributor1);
        assertEq(uint256(status), uint256(IHeap.HeapStatus.Open));
        assertEq(winner, address(0));
    }

    function test_CreateHeapWithERC20() public {
        vm.startPrank(contributor1);
        token.approve(address(heap), CONTRIBUTION_AMOUNT);
        
        uint256 heapId = heap.create(address(token), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        vm.stopPrank();

        assertEq(heapId, 0);
        assertEq(token.balanceOf(address(heap)), CONTRIBUTION_AMOUNT);
        assertEq(heap.getContribution(heapId, contributor1), CONTRIBUTION_AMOUNT);
    }

    function test_ContributeToHeapWithNativeToken() public {
        // Create heap
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        // Contribute to heap
        vm.prank(contributor2);
        vm.expectEmit(true, true, false, true);
        emit ContributionAdded(heapId, contributor2, CONTRIBUTION_AMOUNT, 2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        (, , , address[] memory contributors, , , ) = heap.getHeap(heapId);
        assertEq(contributors.length, 2);
        assertEq(contributors[1], contributor2);
    }

    function test_ContributeToHeapWithERC20() public {
        vm.startPrank(contributor1);
        token.approve(address(heap), CONTRIBUTION_AMOUNT);
        uint256 heapId = heap.create(address(token), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        vm.stopPrank();

        vm.startPrank(contributor2);
        token.approve(address(heap), CONTRIBUTION_AMOUNT);
        heap.contribute(heapId);
        vm.stopPrank();

        assertEq(heap.getContribution(heapId, contributor2), CONTRIBUTION_AMOUNT);
        assertEq(token.balanceOf(address(heap)), CONTRIBUTION_AMOUNT * 2);
    }

    function test_WithdrawContributionBeforeActivation() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        uint256 balanceBefore = contributor1.balance;
        
        vm.prank(contributor1);
        vm.expectEmit(true, true, false, true);
        emit ContributionWithdrawn(heapId, contributor1, CONTRIBUTION_AMOUNT);
        vm.expectEmit(true, false, false, true);
        emit HeapCancelled(heapId, new address[](0), 0);
        heap.withdraw(heapId);

        assertEq(contributor1.balance, balanceBefore + CONTRIBUTION_AMOUNT);
        assertEq(heap.getContribution(heapId, contributor1), 0);
        
        // After cleanup, heap data is deleted and returns default values
        (address heapToken, uint256 heapContribution, , address[] memory contributors, IHeap.HeapStatus status, , ) = heap.getHeap(heapId);
        assertEq(contributors.length, 0);
        assertEq(heapToken, address(0));
        assertEq(heapContribution, 0);
        assertEq(uint256(status), 0);
        assertEq(heap.getActiveHeapCount(), 0);
    }

    function test_CannotWithdrawAfterActivation() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        vm.prank(contributor1);
        vm.expectRevert(Heap.InvalidHeapStatus.selector);
        heap.withdraw(heapId);
    }

    function test_LastContributorWithdrawalCancelsHeap() public {
        // Create heap with 3 contributors
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(contributor3);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        assertEq(heap.getActiveHeapCount(), 1);
        
        uint256 contributor1BalanceBefore = contributor1.balance;
        uint256 contributor2BalanceBefore = contributor2.balance;
        uint256 contributor3BalanceBefore = contributor3.balance;

        // Contributor 1 withdraws - heap should still be Open
        vm.prank(contributor1);
        vm.expectEmit(true, true, false, true);
        emit ContributionWithdrawn(heapId, contributor1, CONTRIBUTION_AMOUNT);
        heap.withdraw(heapId);

        (, , , address[] memory contributors1, IHeap.HeapStatus status1, , ) = heap.getHeap(heapId);
        assertEq(contributors1.length, 2);
        assertEq(uint256(status1), uint256(IHeap.HeapStatus.Open));
        assertEq(heap.getActiveHeapCount(), 1);
        assertEq(contributor1.balance, contributor1BalanceBefore + CONTRIBUTION_AMOUNT);

        // Contributor 2 withdraws - heap should still be Open
        vm.prank(contributor2);
        vm.expectEmit(true, true, false, true);
        emit ContributionWithdrawn(heapId, contributor2, CONTRIBUTION_AMOUNT);
        heap.withdraw(heapId);

        (, , , address[] memory contributors2, IHeap.HeapStatus status2, , ) = heap.getHeap(heapId);
        assertEq(contributors2.length, 1);
        assertEq(uint256(status2), uint256(IHeap.HeapStatus.Open));
        assertEq(heap.getActiveHeapCount(), 1);
        assertEq(contributor2.balance, contributor2BalanceBefore + CONTRIBUTION_AMOUNT);

        // Contributor 3 withdraws (last contributor) - heap should be Cancelled
        vm.prank(contributor3);
        vm.expectEmit(true, true, false, true);
        emit ContributionWithdrawn(heapId, contributor3, CONTRIBUTION_AMOUNT);
        vm.expectEmit(true, false, false, true);
        emit HeapCancelled(heapId, new address[](0), 0);
        heap.withdraw(heapId);

        // After cleanup, heap data is deleted
        (address heapToken, uint256 heapContribution, , address[] memory contributors3, IHeap.HeapStatus status3, , ) = heap.getHeap(heapId);
        assertEq(contributors3.length, 0);
        assertEq(heapToken, address(0));
        assertEq(heapContribution, 0);
        assertEq(uint256(status3), 0);
        assertEq(heap.getActiveHeapCount(), 0);
        assertEq(contributor3.balance, contributor3BalanceBefore + CONTRIBUTION_AMOUNT);
    }

    function test_ActivateHeap() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        address[] memory expectedContributors = new address[](2);
        expectedContributors[0] = contributor1;
        expectedContributors[1] = contributor2;

        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit HeapActivated(heapId, expectedContributors);
        heap.activate(heapId);

        (, , , , IHeap.HeapStatus status, , ) = heap.getHeap(heapId);
        assertEq(uint256(status), uint256(IHeap.HeapStatus.Active));
    }

    function test_CanActivateWithOneContributor() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        address[] memory expectedContributors = new address[](1);
        expectedContributors[0] = contributor1;

        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit HeapActivated(heapId, expectedContributors);
        heap.activate(heapId);

        (, , , , IHeap.HeapStatus status, , ) = heap.getHeap(heapId);
        assertEq(uint256(status), uint256(IHeap.HeapStatus.Active));
    }

    function test_OnlyControllerCanActivate() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(contributor1);
        vm.expectRevert(Owned.Unauthorized.selector);
        heap.activate(heapId);
    }

    function test_FinalizeHeap() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        uint256 contributor1BalanceBefore = contributor1.balance;
        uint256 totalPrize = CONTRIBUTION_AMOUNT * 2;

        vm.prank(controller);
        vm.expectEmit(true, true, false, true);
        emit HeapFinalized(heapId, contributor1, totalPrize, totalPrize);
        heap.finalize(heapId, contributor1);

        assertEq(contributor1.balance, contributor1BalanceBefore + totalPrize);
        
        // After cleanup, heap data is deleted
        (address heapToken, uint256 heapContribution, , address[] memory contributors, IHeap.HeapStatus status, address winner, ) = heap.getHeap(heapId);
        assertEq(heapToken, address(0));
        assertEq(heapContribution, 0);
        assertEq(contributors.length, 0);
        assertEq(uint256(status), 0);
        assertEq(winner, address(0));
    }

    function test_CannotFinalizeBeforeActivation() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        vm.expectRevert(Heap.InvalidHeapStatus.selector);
        heap.finalize(heapId, contributor1);
    }

    function test_CannotFinalizeWithInvalidWinner() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        vm.prank(controller);
        vm.expectRevert(Heap.InvalidWinner.selector);
        heap.finalize(heapId, contributor3); // contributor3 not in heap
    }

    function test_FinalizeWithGameScore() public {
        vm.prank(controller);
        heap.setScore(address(gameScore));

        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        vm.prank(controller);
        heap.finalize(heapId, contributor1);

        assertEq(gameScore.getResultCount(), 1);
        MockScore.MatchResult memory result = gameScore.getResult(0);
        assertEq(result.winner, contributor1);
        assertEq(result.losers.length, 1);
        assertEq(result.losers[0], contributor2);
        assertEq(result.prize, CONTRIBUTION_AMOUNT * 2);
    }

    function test_FinalizeWithFees() public {
        address feeRecipient = address(0x999);
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%

        vm.prank(owner);
        heap.configureFees(recipients, shares);

        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        uint256 contributor1BalanceBefore = contributor1.balance;
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        uint256 totalPrize = CONTRIBUTION_AMOUNT * 2;
        uint256 expectedFee = (totalPrize * 1000) / 10000; // 10%
        uint256 expectedWinnerAmount = totalPrize - expectedFee;

        vm.prank(controller);
        heap.finalize(heapId, contributor1);

        // Winner receives payout immediately
        assertEq(contributor1.balance, contributor1BalanceBefore + expectedWinnerAmount);
        
        // Fees are accrued but not sent yet (pull-over-push pattern)
        assertEq(heap.pendingFees(feeRecipient, address(0)), expectedFee);
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore);
        
        // Fee recipient withdraws fees
        vm.prank(feeRecipient);
        heap.withdrawFees(address(0));
        
        // Now fee recipient should have received fees
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + expectedFee);
        assertEq(heap.pendingFees(feeRecipient, address(0)), 0);
    }

    function test_CannotContributeToFullHeap() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            2 // Only 2 contributors max
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(contributor3);
        vm.expectRevert(Heap.MaxContributionsReached.selector);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);
    }

    function test_CanContributeMultipleTimes() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            5 // Allow more contributions
        );

        // Contributor1 contributes again
        vm.prank(contributor1);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        // Verify contribution is accumulated
        assertEq(heap.getContribution(heapId, contributor1), CONTRIBUTION_AMOUNT * 2);
        
        // Verify contributor is only in the array once
        (, , , address[] memory contributors, , , ) = heap.getHeap(heapId);
        assertEq(contributors.length, 1);
        assertEq(contributors[0], contributor1);

        // Contributor1 contributes a third time
        vm.prank(contributor1);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        assertEq(heap.getContribution(heapId, contributor1), CONTRIBUTION_AMOUNT * 3);
        
        // Still only one entry in contributors array
        (, , , address[] memory contributors2, , , ) = heap.getHeap(heapId);
        assertEq(contributors2.length, 1);
    }

    function test_FeatureMetadata() public view {
        assertEq(heap.version(), "1.0.0");
        assertEq(heap.featureName(), "Heap - OCI-002");
    }

    function test_OwnershipTransfer() public {
        address newOwner = address(0x123);
        
        // Step 1: Initiate transfer
        vm.prank(owner);
        heap.transferOwnership(newOwner);
        
        // Owner should not change yet
        assertEq(heap.owner(), owner);
        assertEq(heap.pendingOwner(), newOwner);
        
        // Step 2: Accept ownership
        vm.prank(newOwner);
        heap.acceptOwnership();
        
        // Now ownership should be transferred
        assertEq(heap.owner(), newOwner);
        assertEq(heap.pendingOwner(), address(0));
    }

    function test_ControllerUpdate() public {
        address newController = address(0x456);
        
        vm.prank(owner);
        heap.setController(newController);
        
        assertEq(heap.controller(), newController);
    }

    function test_HeapIncludesTimestamp() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        (,,,,, , uint256 createdAt) = heap.getHeap(heapId);
        assertEq(createdAt, block.timestamp);
    }

    function test_InitialMaxActiveHeaps() public view {
        assertEq(heap.maxActiveHeaps(), 100);
    }

    function test_SetMaxActiveHeaps() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit MaxActiveHeapsUpdated(10);
        heap.setMaxActiveHeaps(10);
        
        assertEq(heap.maxActiveHeaps(), 10);
    }

    function test_OnlyOwnerCanSetMaxActiveHeaps() public {
        vm.prank(contributor1);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        heap.setMaxActiveHeaps(10);
    }

    function test_CannotCreateHeapWhenAtCapacity() public {
        vm.prank(owner);
        heap.setMaxActiveHeaps(2);
        
        // Create 2 heaps (at capacity)
        vm.prank(contributor1);
        heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        vm.prank(contributor2);
        heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        assertEq(heap.getActiveHeapCount(), 2);
        
        // Try to create third heap
        vm.prank(contributor3);
        vm.expectRevert(Heap.MaxActiveHeapsReached.selector);
        heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
    }

    function test_FinalizedHeapFreesUpCapacity() public {
        vm.prank(owner);
        heap.setMaxActiveHeaps(1);
        
        // Create and finalize first heap
        vm.prank(contributor1);
        uint256 heapId1 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);
        
        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId1);
        
        vm.prank(controller);
        heap.activate(heapId1);
        
        vm.prank(controller);
        heap.finalize(heapId1, contributor1);
        
        assertEq(heap.getActiveHeapCount(), 0);
        
        // Should be able to create new heap now
        vm.prank(contributor1);
        uint256 heapId2 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);
        
        assertEq(heap.getActiveHeapCount(), 1);
        assertGt(heapId2, 0);
    }

    function test_GetActiveHeapIds() public {
        vm.prank(contributor1);
        uint256 heapId1 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        vm.prank(contributor2);
        uint256 heapId2 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        uint256[] memory ids = heap.getActiveHeapIds(0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], heapId1);
        assertEq(ids[1], heapId2);
    }

    function test_GetActiveHeapIdsPagination() public {
        vm.prank(contributor1);
        uint256 heapId1 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        vm.prank(contributor2);
        uint256 heapId2 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        vm.prank(contributor3);
        uint256 heapId3 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        // Get first 2
        uint256[] memory ids1 = heap.getActiveHeapIds(0, 2);
        assertEq(ids1.length, 2);
        assertEq(ids1[0], heapId1);
        assertEq(ids1[1], heapId2);
        
        // Get next 1
        uint256[] memory ids2 = heap.getActiveHeapIds(2, 2);
        assertEq(ids2.length, 1);
        assertEq(ids2[0], heapId3);
    }

    function test_CancelHeapExplicitly() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        uint256 contributor1BalanceBefore = contributor1.balance;
        uint256 contributor2BalanceBefore = contributor2.balance;

        address[] memory expectedContributors = new address[](2);
        expectedContributors[0] = contributor1;
        expectedContributors[1] = contributor2;

        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit HeapCancelled(heapId, expectedContributors, CONTRIBUTION_AMOUNT);
        heap.cancel(heapId);

        // Verify refunds
        assertEq(contributor1.balance, contributor1BalanceBefore + CONTRIBUTION_AMOUNT);
        assertEq(contributor2.balance, contributor2BalanceBefore + CONTRIBUTION_AMOUNT);

        // After cleanup, heap data is deleted
        (address heapToken, uint256 heapContribution, , address[] memory contributors, IHeap.HeapStatus status, , ) = heap.getHeap(heapId);
        assertEq(heapToken, address(0));
        assertEq(heapContribution, 0);
        assertEq(contributors.length, 0);
        assertEq(uint256(status), 0);

        // Verify capacity freed
        assertEq(heap.getActiveHeapCount(), 0);
    }

    function test_CancelHeapWithERC20() public {
        vm.startPrank(contributor1);
        token.approve(address(heap), CONTRIBUTION_AMOUNT);
        uint256 heapId = heap.create(address(token), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        vm.stopPrank();

        vm.startPrank(contributor2);
        token.approve(address(heap), CONTRIBUTION_AMOUNT);
        heap.contribute(heapId);
        vm.stopPrank();

        vm.prank(controller);
        heap.activate(heapId);

        uint256 contributor1BalanceBefore = token.balanceOf(contributor1);
        uint256 contributor2BalanceBefore = token.balanceOf(contributor2);

        vm.prank(controller);
        heap.cancel(heapId);

        // Verify refunds
        assertEq(token.balanceOf(contributor1), contributor1BalanceBefore + CONTRIBUTION_AMOUNT);
        assertEq(token.balanceOf(contributor2), contributor2BalanceBefore + CONTRIBUTION_AMOUNT);
    }

    function test_FinalizeHeapWithNoWinner() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        uint256 contributor1BalanceBefore = contributor1.balance;
        uint256 contributor2BalanceBefore = contributor2.balance;

        address[] memory expectedContributors = new address[](2);
        expectedContributors[0] = contributor1;
        expectedContributors[1] = contributor2;

        // Pass address(0) as winner to indicate no winner
        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit HeapCancelled(heapId, expectedContributors, CONTRIBUTION_AMOUNT);
        heap.finalize(heapId, address(0));

        // Verify refunds
        assertEq(contributor1.balance, contributor1BalanceBefore + CONTRIBUTION_AMOUNT);
        assertEq(contributor2.balance, contributor2BalanceBefore + CONTRIBUTION_AMOUNT);

        // After cleanup, heap data is deleted
        (address heapToken, uint256 heapContribution, , address[] memory contributors, IHeap.HeapStatus status, , ) = heap.getHeap(heapId);
        assertEq(heapToken, address(0));
        assertEq(heapContribution, 0);
        assertEq(contributors.length, 0);
        assertEq(uint256(status), 0);
    }

    function test_OnlyControllerCanCancelHeap() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);

        vm.prank(controller);
        heap.activate(heapId);

        vm.prank(contributor1);
        vm.expectRevert(Owned.Unauthorized.selector);
        heap.cancel(heapId);
    }

    function test_CannotCancelNonActiveHeap() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(
            address(0),
            CONTRIBUTION_AMOUNT,
            MAX_CONTRIBUTIONS
        );

        vm.prank(controller);
        vm.expectRevert(Heap.InvalidHeapStatus.selector);
        heap.cancel(heapId);
    }

    function test_CancelledHeapFreesUpCapacity() public {
        vm.prank(owner);
        heap.setMaxActiveHeaps(1);

        // Create and cancel heap
        vm.prank(contributor1);
        uint256 heapId1 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);

        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId1);

        vm.prank(controller);
        heap.activate(heapId1);

        vm.prank(controller);
        heap.cancel(heapId1);

        assertEq(heap.getActiveHeapCount(), 0);

        // Should be able to create new heap now
        vm.prank(contributor1);
        uint256 heapId2 = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);

        assertEq(heap.getActiveHeapCount(), 1);
        assertGt(heapId2, 0);
    }

    event MaxActiveHeapsUpdated(uint256 newLimit);
    event InactiveHeapCleaned(uint256 indexed heapId, uint256 createdAt);

    // Additional branch coverage tests
    
    function test_CannotCreateWithZeroContribution() public {
        vm.prank(contributor1);
        vm.expectRevert(Heap.InvalidContributionAmount.selector);
        heap.create{value: 0}(address(0), 0, MAX_CONTRIBUTIONS);
    }
    
    function test_CannotCreateWithContributionTooHigh() public {
        uint256 tooHigh = 1000001 ether;
        vm.deal(contributor1, tooHigh);
        vm.prank(contributor1);
        vm.expectRevert(Heap.ContributionAmountTooHigh.selector);
        heap.create{value: tooHigh}(address(0), tooHigh, MAX_CONTRIBUTIONS);
    }
    
    function test_CannotCreateWithLessThanTwoMaxContributions() public {
        vm.prank(contributor1);
        vm.expectRevert(Heap.InvalidMaxContributions.selector);
        heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 1);
    }
    
    function test_CannotCreateWithTooManyMaxContributions() public {
        vm.prank(contributor1);
        vm.expectRevert(Heap.TooManyContributions.selector);
        heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 1001);
    }
    
    function test_CannotCreateWithInvalidTokenAddress() public {
        address fakeToken = address(0x1234);
        vm.prank(contributor1);
        vm.expectRevert(Heap.InvalidTokenAddress.selector);
        heap.create(fakeToken, CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
    }
    
    function test_SetScoreWithInvalidAddress() public {
        address fakeScore = address(0x1234);
        vm.prank(controller);
        vm.expectRevert(Heap.InvalidTokenAddress.selector);
        heap.setScore(fakeScore);
    }
    
    function test_SetScoreToZeroDisables() public {
        vm.prank(controller);
        heap.setScore(address(gameScore));
        
        vm.prank(controller);
        heap.setScore(address(0));
        assertEq(address(heap.score()), address(0));
    }
    
    function test_SetPredictionWithInvalidAddress() public {
        address fakePrediction = address(0x1234);
        vm.prank(controller);
        vm.expectRevert(Heap.InvalidTokenAddress.selector);
        heap.setPrediction(fakePrediction);
    }
    
    function test_CannotSetMaxActiveHeapsTooHigh() public {
        vm.prank(owner);
        vm.expectRevert(Heap.LimitTooHigh.selector);
        heap.setMaxActiveHeaps(10001);
    }
    
    function test_CleanupInactiveHeapNonExistent() public {
        vm.prank(owner);
        vm.expectRevert(Heap.InvalidHeapId.selector);
        heap.cleanupInactiveHeap(999);
    }
    
    function test_GetActiveHeapIdsOffsetBeyondTotal() public {
        vm.prank(contributor1);
        heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        uint256[] memory ids = heap.getActiveHeapIds(100, 10);
        assertEq(ids.length, 0);
    }
    
    function test_CannotContributeToNonExistentHeap() public {
        vm.prank(contributor1);
        vm.expectRevert(Heap.InvalidHeapId.selector);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(999);
    }
    
    function test_CannotWithdrawFromNonExistentHeap() public {
        vm.prank(contributor1);
        vm.expectRevert(Heap.InvalidHeapId.selector);
        heap.withdraw(999);
    }
    
    function test_CannotActivateNonExistentHeap() public {
        vm.prank(controller);
        vm.expectRevert(Heap.InvalidHeapId.selector);
        heap.activate(999);
    }
    
    function test_CannotFinalizeNonExistentHeap() public {
        vm.prank(controller);
        vm.expectRevert(Heap.InvalidHeapId.selector);
        heap.finalize(999, contributor1);
    }
    
    function test_CannotCancelNonExistentHeap() public {
        vm.prank(controller);
        vm.expectRevert(Heap.InvalidHeapId.selector);
        heap.cancel(999);
    }
    
    function test_CannotContributeWithWrongNativeValue() public {
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, MAX_CONTRIBUTIONS);
        
        vm.prank(contributor2);
        vm.expectRevert(Heap.InsufficientContribution.selector);
        heap.contribute{value: CONTRIBUTION_AMOUNT / 2}(heapId);
    }
}

contract HeapSharesTest is Test {
    Heap public heap;
    MockERC20 public token;

    address public owner = address(0x1);
    address public controller = address(0x2);
    address public contributor1 = address(0x3);
    address public contributor2 = address(0x4);
    address public shareRecipient = address(0x5);

    uint256 constant CONTRIBUTION_AMOUNT = 1 ether;

    event ShareRecipientRegistered(address indexed recipient, uint256 shareBasisPoints);
    event ShareRecipientRemoved(address indexed recipient);
    event SharesAccrued(address indexed recipient, address indexed token, uint256 amount);
    event SharesClaimed(address indexed recipient, address indexed token, uint256 amount);

    function setUp() public {
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        heap = new Heap();
        heap.initialize(owner, controller, address(0), 100, feeRecipients, feeShares);
        
        vm.prank(owner);
        token = new MockERC20(1000000 ether);

        vm.deal(contributor1, 100 ether);
        vm.deal(contributor2, 100 ether);
        vm.deal(shareRecipient, 1 ether);

        token.mint(contributor1, 1000 ether);
        token.mint(contributor2, 1000 ether);
    }

    function test_RegisterShareRecipient() public {
        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit ShareRecipientRegistered(shareRecipient, 1000);
        heap.registerShareRecipient(shareRecipient, 1000);
        
        assertEq(heap.getShareConfig(shareRecipient), 1000);
        assertEq(heap.totalShareBasisPoints(), 1000);
    }

    function test_OnlyControllerCanRegisterShareRecipient() public {
        vm.prank(contributor1);
        vm.expectRevert(Owned.Unauthorized.selector);
        heap.registerShareRecipient(shareRecipient, 1000);
    }

    function test_CannotRegisterZeroAddress() public {
        vm.prank(controller);
        vm.expectRevert(Heap.InvalidShareRecipient.selector);
        heap.registerShareRecipient(address(0), 1000);
    }

    function test_RemoveShareRecipient() public {
        vm.prank(controller);
        heap.registerShareRecipient(shareRecipient, 1000);
        
        vm.prank(controller);
        vm.expectEmit(true, false, false, true);
        emit ShareRecipientRemoved(shareRecipient);
        heap.removeShareRecipient(shareRecipient);
        
        assertEq(heap.getShareConfig(shareRecipient), 0);
        assertEq(heap.totalShareBasisPoints(), 0);
    }

    function test_SharesAccrueOnFinalize() public {
        vm.prank(controller);
        heap.registerShareRecipient(shareRecipient, 1000); // 10%
        
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);
        
        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);
        
        vm.prank(controller);
        heap.activate(heapId);
        
        uint256 totalPrize = CONTRIBUTION_AMOUNT * 2;
        uint256 expectedShares = (totalPrize * 1000) / 10000; // 10%
        
        vm.prank(controller);
        vm.expectEmit(true, true, false, true);
        emit SharesAccrued(shareRecipient, address(0), expectedShares);
        heap.finalize(heapId, contributor1);
        
        assertEq(heap.getPendingShares(shareRecipient, address(0)), expectedShares);
    }

    function test_ClaimShares() public {
        vm.prank(controller);
        heap.registerShareRecipient(shareRecipient, 1000); // 10%
        
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);
        
        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);
        
        vm.prank(controller);
        heap.activate(heapId);
        
        vm.prank(controller);
        heap.finalize(heapId, contributor1);
        
        uint256 totalPrize = CONTRIBUTION_AMOUNT * 2;
        uint256 expectedShares = (totalPrize * 1000) / 10000;
        uint256 balanceBefore = shareRecipient.balance;
        
        vm.prank(shareRecipient);
        vm.expectEmit(true, true, false, true);
        emit SharesClaimed(shareRecipient, address(0), expectedShares);
        heap.claimShares(address(0));
        
        assertEq(shareRecipient.balance, balanceBefore + expectedShares);
        assertEq(heap.getPendingShares(shareRecipient, address(0)), 0);
    }

    function test_GetShareRecipients() public {
        address shareRecipient2 = address(0x6);
        
        vm.startPrank(controller);
        heap.registerShareRecipient(shareRecipient, 1000);
        heap.registerShareRecipient(shareRecipient2, 500);
        vm.stopPrank();
        
        (address[] memory recipients, uint256[] memory shares) = heap.getShareRecipients();
        
        assertEq(recipients.length, 2);
        assertEq(recipients[0], shareRecipient);
        assertEq(recipients[1], shareRecipient2);
        assertEq(shares[0], 1000);
        assertEq(shares[1], 500);
    }

    function test_GetShareTokens() public {
        vm.prank(controller);
        heap.registerShareRecipient(shareRecipient, 1000);
        
        vm.prank(contributor1);
        uint256 heapId = heap.create{value: CONTRIBUTION_AMOUNT}(address(0), CONTRIBUTION_AMOUNT, 2);
        
        vm.prank(contributor2);
        heap.contribute{value: CONTRIBUTION_AMOUNT}(heapId);
        
        vm.prank(controller);
        heap.activate(heapId);
        
        vm.prank(controller);
        heap.finalize(heapId, contributor1);
        
        address[] memory tokens = heap.getShareTokens();
        assertEq(tokens.length, 1);
        assertEq(tokens[0], address(0));
    }
    
    function test_CannotRegisterShareRecipientTwice() public {
        vm.prank(controller);
        heap.registerShareRecipient(shareRecipient, 1000);
        
        vm.prank(controller);
        vm.expectRevert(Heap.ShareRecipientAlreadyExists.selector);
        heap.registerShareRecipient(shareRecipient, 500);
    }
    
    function test_CannotRegisterShareExceedingMax() public {
        vm.prank(controller);
        vm.expectRevert(Heap.ShareExceedsMax.selector);
        heap.registerShareRecipient(shareRecipient, 5001);
    }
    
    function test_CannotRemoveNonExistentShareRecipient() public {
        vm.prank(controller);
        vm.expectRevert(Heap.ShareRecipientNotFound.selector);
        heap.removeShareRecipient(shareRecipient);
    }
    
    function test_CannotClaimZeroShares() public {
        vm.prank(shareRecipient);
        vm.expectRevert(Heap.NoSharesToClaim.selector);
        heap.claimShares(address(0));
    }
}

contract HeapFactoryTest is Test {
    Heap public heap;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    
    function test_InitializeHeap() public {
        address[] memory feeRecipients = new address[](1);
        feeRecipients[0] = address(0x999);
        uint256[] memory feeShares = new uint256[](1);
        feeShares[0] = 100; // 1%
        
        heap = new Heap();
        heap.initialize(owner, controller, address(0), 50, feeRecipients, feeShares);
        
        assertEq(heap.owner(), owner);
        assertEq(heap.controller(), controller);
        assertEq(heap.maxActiveHeaps(), 50);
        assertEq(heap.pendingFees(address(0x999), address(0)), 0);
    }
    
    function test_CannotReinitialize() public {
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        
        heap = new Heap();
        heap.initialize(owner, controller, address(0), 100, feeRecipients, feeShares);
        
        vm.expectRevert();
        heap.initialize(owner, controller, address(0), 100, feeRecipients, feeShares);
    }
}
