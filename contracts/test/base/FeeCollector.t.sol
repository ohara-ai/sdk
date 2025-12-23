// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Match} from "../../src/features/game/Match.sol";
import {MatchFactory} from "../../src/factories/game/MatchFactory.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract FeeCollectorTest is Test {
    MatchFactory public factory;
    Match public gameMatch;
    MockERC20 public token;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public feeRecipient1 = address(0x3);
    address public feeRecipient2 = address(0x4);
    address public player1 = address(0x5);
    address public player2 = address(0x6);

    function setUp() public {
        vm.startPrank(owner);
        factory = new MatchFactory();
        
        vm.startPrank(controller);
        address instance = factory.deployMatch(address(0));
        gameMatch = Match(instance);
        vm.stopPrank();
        
        token = new MockERC20(0);
        
        // Fund players
        vm.deal(controller, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
        token.mint(controller, 1000 ether);
        token.mint(player1, 1000 ether);
        token.mint(player2, 1000 ether);
    }

    function test_ConfigureFees() public {
        vm.startPrank(owner);
        
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        
        uint256[] memory shares = new uint256[](2);
        shares[0] = 500; // 5%
        shares[1] = 300; // 3%
        
        vm.expectEmit(true, true, true, true);
        emit FeesConfigured(recipients, shares, 800);
        gameMatch.configureFees(recipients, shares);
        
        (address[] memory _recipients, uint256[] memory _shares, uint256 totalShare) = gameMatch.getFeeConfiguration();
        assertEq(_recipients.length, 2);
        assertEq(_recipients[0], feeRecipient1);
        assertEq(_recipients[1], feeRecipient2);
        assertEq(_shares[0], 500);
        assertEq(_shares[1], 300);
        assertEq(totalShare, 800);
        
        vm.stopPrank();
    }

    function test_ConfigureFees_RevertLengthMismatch() public {
        vm.startPrank(owner);
        
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        
        uint256[] memory shares = new uint256[](1);
        shares[0] = 500;
        
        vm.expectRevert(abi.encodeWithSignature("InvalidFeeConfiguration()"));
        gameMatch.configureFees(recipients, shares);
        
        vm.stopPrank();
    }

    function test_ConfigureFees_RevertTooManyRecipients() public {
        vm.startPrank(owner);
        
        address[] memory recipients = new address[](11);
        uint256[] memory shares = new uint256[](11);
        
        for (uint256 i = 0; i < 11; i++) {
            // casting to 'uint160' is safe because i is bounded to 0-10, so 0x100 + i will never exceed uint160
            // forge-lint: disable-next-line(unsafe-typecast)
            recipients[i] = address(uint160(0x100 + i));
            shares[i] = 100;
        }
        
        vm.expectRevert(abi.encodeWithSignature("TooManyFeeRecipients()"));
        gameMatch.configureFees(recipients, shares);
        
        vm.stopPrank();
    }

    function test_ConfigureFees_RevertExceedsMaxFee() public {
        vm.startPrank(owner);
        
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        
        uint256[] memory shares = new uint256[](1);
        shares[0] = 5001; // Exceeds 50% max
        
        vm.expectRevert(abi.encodeWithSignature("InvalidFeeConfiguration()"));
        gameMatch.configureFees(recipients, shares);
        
        vm.stopPrank();
    }

    function test_WithdrawFees_NativeToken() public {
        // Configure fees
        vm.startPrank(owner);
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%
        gameMatch.configureFees(recipients, shares);
        vm.stopPrank();
        
        // Create and finalize match to generate fees
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Check pending fees
        uint256 pendingFees = gameMatch.pendingFees(feeRecipient1, address(0));
        assertGt(pendingFees, 0);
        
        // Withdraw fees
        uint256 balanceBefore = feeRecipient1.balance;
        vm.startPrank(feeRecipient1);
        vm.expectEmit(true, true, false, true);
        emit FeeWithdrawn(feeRecipient1, address(0), pendingFees);
        gameMatch.withdrawFees(address(0));
        vm.stopPrank();
        
        // Verify fees were withdrawn
        assertEq(gameMatch.pendingFees(feeRecipient1, address(0)), 0);
        assertEq(feeRecipient1.balance - balanceBefore, pendingFees);
    }

    function test_WithdrawFees_ERC20Token() public {
        // Configure fees
        vm.startPrank(owner);
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%
        gameMatch.configureFees(recipients, shares);
        vm.stopPrank();
        
        // Approve token spending
        vm.startPrank(controller);
        token.approve(address(gameMatch), 100 ether);
        uint256 matchId = gameMatch.create(address(token), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        token.approve(address(gameMatch), 100 ether);
        gameMatch.join(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Check pending fees
        uint256 pendingFees = gameMatch.pendingFees(feeRecipient1, address(token));
        assertGt(pendingFees, 0);
        
        // Withdraw fees
        uint256 balanceBefore = token.balanceOf(feeRecipient1);
        vm.startPrank(feeRecipient1);
        gameMatch.withdrawFees(address(token));
        vm.stopPrank();
        
        // Verify fees were withdrawn
        assertEq(gameMatch.pendingFees(feeRecipient1, address(token)), 0);
        assertEq(token.balanceOf(feeRecipient1) - balanceBefore, pendingFees);
    }

    function test_WithdrawFees_RevertNoFees() public {
        vm.startPrank(feeRecipient1);
        
        vm.expectRevert(abi.encodeWithSignature("NoFeesToWithdraw()"));
        gameMatch.withdrawFees(address(0));
        
        vm.stopPrank();
    }

    function test_WithdrawFees_MultipleFeeRecipients() public {
        // Configure multiple fee recipients
        vm.startPrank(owner);
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 500; // 5%
        shares[1] = 300; // 3%
        gameMatch.configureFees(recipients, shares);
        vm.stopPrank();
        
        // Create and finalize match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Both recipients should have pending fees
        uint256 pendingFees1 = gameMatch.pendingFees(feeRecipient1, address(0));
        uint256 pendingFees2 = gameMatch.pendingFees(feeRecipient2, address(0));
        assertGt(pendingFees1, 0);
        assertGt(pendingFees2, 0);
        assertGt(pendingFees1, pendingFees2); // Recipient 1 has higher share
        
        // Each can withdraw their fees
        vm.prank(feeRecipient1);
        gameMatch.withdrawFees(address(0));
        
        vm.prank(feeRecipient2);
        gameMatch.withdrawFees(address(0));
        
        // Verify all fees withdrawn
        assertEq(gameMatch.pendingFees(feeRecipient1, address(0)), 0);
        assertEq(gameMatch.pendingFees(feeRecipient2, address(0)), 0);
    }

    function test_AccrueFees_WithZeroTotalFeeShare() public {
        // Don't configure any fees (totalFeeShare = 0)
        
        // Create and finalize match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // No fees should be accrued
        assertEq(gameMatch.pendingFees(feeRecipient1, address(0)), 0);
    }

    function test_AccrueFees_WithZeroShare() public {
        // Configure with one zero share
        vm.startPrank(owner);
        address[] memory recipients = new address[](2);
        recipients[0] = feeRecipient1;
        recipients[1] = feeRecipient2;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 0; // Zero share
        shares[1] = 500; // 5%
        gameMatch.configureFees(recipients, shares);
        vm.stopPrank();
        
        // Create and finalize match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Only recipient 2 should have fees
        assertEq(gameMatch.pendingFees(feeRecipient1, address(0)), 0);
        assertGt(gameMatch.pendingFees(feeRecipient2, address(0)), 0);
    }

    event FeesConfigured(address[] recipients, uint256[] shares, uint256 totalShare);
    event FeeAccrued(address indexed recipient, address token, uint256 amount);
    event FeeWithdrawn(address indexed recipient, address token, uint256 amount);
    event TransferFailed(address indexed to, address indexed token, uint256 amount);
    event FailedTransferClaimed(address indexed to, address indexed token, uint256 amount);
}

contract FeeCollectorTransferFailedTest is Test {
    MatchFactory public factory;
    Match public gameMatch;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public feeRecipient1;
    address public player1 = address(0x5);
    address public player2 = address(0x6);

    event TransferFailed(address indexed to, address indexed token, uint256 amount);
    event FailedTransferClaimed(address indexed to, address indexed token, uint256 amount);

    function setUp() public {
        vm.startPrank(owner);
        factory = new MatchFactory();
        vm.stopPrank();
        
        vm.startPrank(controller);
        address instance = factory.deployMatch(address(0));
        gameMatch = Match(instance);
        vm.stopPrank();
        
        // Create a contract that rejects ETH transfers
        feeRecipient1 = address(new RejectingReceiver());
        
        // Fund players
        vm.deal(controller, 100 ether);
        vm.deal(player1, 100 ether);
        vm.deal(player2, 100 ether);
    }

    function test_TransferFailedEventEmitted() public {
        // Configure fees with a rejecting recipient
        vm.startPrank(owner);
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%
        gameMatch.configureFees(recipients, shares);
        vm.stopPrank();
        
        // Create and finalize match to generate fees
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Check pending fees
        uint256 pendingFees = gameMatch.pendingFees(feeRecipient1, address(0));
        assertGt(pendingFees, 0);
        
        // Attempt to withdraw - should emit TransferFailed
        vm.startPrank(feeRecipient1);
        vm.expectEmit(true, true, false, true);
        emit TransferFailed(feeRecipient1, address(0), pendingFees);
        gameMatch.withdrawFees(address(0));
        vm.stopPrank();
        
        // Verify failed transfer is tracked
        uint256 failedAmount = gameMatch.failedTransfers(feeRecipient1, address(0));
        assertEq(failedAmount, pendingFees);
    }

    function test_ClaimFailedTransfer() public {
        // Configure fees with a rejecting recipient
        vm.startPrank(owner);
        address[] memory recipients = new address[](1);
        recipients[0] = feeRecipient1;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000; // 10%
        gameMatch.configureFees(recipients, shares);
        vm.stopPrank();
        
        // Create and finalize match
        vm.startPrank(controller);
        uint256 matchId = gameMatch.create{value: 1 ether}(address(0), 1 ether, 2);
        vm.stopPrank();
        
        vm.startPrank(player1);
        gameMatch.join{value: 1 ether}(matchId);
        vm.stopPrank();
        
        vm.startPrank(controller);
        gameMatch.activate(matchId);
        gameMatch.finalize(matchId, controller);
        vm.stopPrank();
        
        // Withdraw fees (will fail and be tracked)
        vm.prank(feeRecipient1);
        gameMatch.withdrawFees(address(0));
        
        uint256 failedAmount = gameMatch.failedTransfers(feeRecipient1, address(0));
        assertGt(failedAmount, 0);
        
        // Now make the receiver accept ETH
        RejectingReceiver(payable(feeRecipient1)).setAccept(true);
        
        // Claim the failed transfer
        uint256 balanceBefore = feeRecipient1.balance;
        vm.prank(feeRecipient1);
        vm.expectEmit(true, true, false, true);
        emit FailedTransferClaimed(feeRecipient1, address(0), failedAmount);
        gameMatch.claimFailedTransfer(address(0));
        
        // Verify transfer succeeded
        assertEq(feeRecipient1.balance - balanceBefore, failedAmount);
        assertEq(gameMatch.failedTransfers(feeRecipient1, address(0)), 0);
    }
}

// Helper contract that rejects ETH transfers
contract RejectingReceiver {
    bool public acceptTransfers;
    
    function setAccept(bool _accept) external {
        acceptTransfers = _accept;
    }
    
    receive() external payable {
        if (!acceptTransfers) {
            revert("Rejecting transfer");
        }
    }
}
