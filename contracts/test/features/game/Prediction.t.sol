// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {Prediction} from "../../../src/features/game/Prediction.sol";
import {IPrediction} from "../../../src/interfaces/game/IPrediction.sol";
import {Match} from "../../../src/features/game/Match.sol";
import {Score} from "../../../src/features/game/Score.sol";

contract PredictionTest is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public player3 = address(0x5);
    address public predictor1 = address(0x6);
    address public predictor2 = address(0x7);
    address public predictor3 = address(0x8);
    
    uint256 public matchId;
    
    event MarketCreated(
        uint256 indexed marketId,
        IPrediction.CompetitionType competitionType,
        uint256 indexed competitionId,
        address token
    );
    event PredictionPlaced(
        uint256 indexed marketId,
        address indexed predictor,
        address indexed predictedPlayer,
        uint256 amount
    );
    event BettingClosed(uint256 indexed marketId);
    event MarketResolved(uint256 indexed marketId, address winner);
    event MarketVoided(uint256 indexed marketId);
    event Claimed(uint256 indexed marketId, address indexed predictor, uint256 payout);
    event PredictionCommitted(uint256 indexed marketId, address indexed predictor, bytes32 commitHash, uint256 amount);
    event PredictionRevealed(uint256 indexed marketId, address indexed predictor, address indexed predictedPlayer, uint256 amount);
    
    function setUp() public {
        // Deploy Score contract
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        // Deploy Match contract
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        // Authorize Match to record scores
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        // Deploy Prediction contract
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0), // no tournament
            address(0), // no league
            feeRecipients,
            feeShares
        );
        
        // Fund predictors
        vm.deal(predictor1, 100 ether);
        vm.deal(predictor2, 100 ether);
        vm.deal(predictor3, 100 ether);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        
        // Create matches for testing (controller creates, then players join)
        // First create a dummy match to avoid matchId=0 (Prediction uses competitionId==0 for not-found check)
        vm.deal(controller, 20 ether);
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2); // Dummy match ID 0
        
        vm.prank(controller);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2); // Test match ID 1
    }
    
    function test_InitialState() public view {
        assertEq(prediction.owner(), owner);
        assertEq(prediction.controller(), controller);
        assertEq(address(prediction.matchContract()), address(matchContract));
        assertEq(prediction.nextMarketId(), 1);
    }
    
    function test_CreateMarket() public {
        vm.prank(controller);
        vm.expectEmit(true, true, false, true);
        emit MarketCreated(1, IPrediction.CompetitionType.Match, matchId, address(0));
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        assertEq(marketId, 1);
        assertEq(prediction.nextMarketId(), 2);
        
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertEq(uint8(market.competitionType), uint8(IPrediction.CompetitionType.Match));
        assertEq(market.competitionId, matchId);
        assertEq(market.token, address(0));
        assertEq(market.totalPool, 0);
        assertFalse(market.bettingClosed);
        assertFalse(market.resolved);
        assertFalse(market.voided);
    }
    
    function test_OnlyControllerCanCreateMarket() public {
        vm.prank(predictor1);
        vm.expectRevert(abi.encodeWithSignature("Unauthorized()"));
        prediction.createMarket(IPrediction.CompetitionType.Match, matchId, address(0));
    }
    
    function test_PlacePrediction() public {
        // Create market
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        // Place prediction
        vm.prank(predictor1);
        vm.expectEmit(true, true, true, true);
        emit PredictionPlaced(marketId, predictor1, player1, 1 ether);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        // Verify prediction
        IPrediction.Prediction memory pred = prediction.getPrediction(marketId, predictor1);
        assertEq(pred.predictedPlayer, player1);
        assertEq(pred.amount, 1 ether);
        assertFalse(pred.claimed);
        
        // Verify market state
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertEq(market.totalPool, 1 ether);
    }
    
    function test_CannotPredictTwice() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.AlreadyPredicted.selector);
        prediction.predict{value: 1 ether}(marketId, player2, 0);
    }
    
    function test_CannotPredictWithZeroAmount() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.ZeroAmount.selector);
        prediction.predict{value: 0}(marketId, player1, 0);
    }
    
    function test_IsBettingOpen() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        assertTrue(prediction.isBettingOpen(marketId));
        
        // Close betting
        vm.prank(controller);
        prediction.closeBetting(marketId);
        
        assertFalse(prediction.isBettingOpen(marketId));
    }
    
    function test_CloseBetting() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(controller);
        vm.expectEmit(true, false, false, false);
        emit BettingClosed(marketId);
        prediction.closeBetting(marketId);
        
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertTrue(market.bettingClosed);
    }
    
    function test_GetOddsForPlayer() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        // Place predictions
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 3 ether}(marketId, player2, 0);
        
        // Total pool is 4 ether
        // Player1 has 1 ether staked -> odds = 4/1 = 4x (40000 basis points)
        // Player2 has 3 ether staked -> odds = 4/3 = 1.33x (13333 basis points)
        
        uint256 oddsPlayer1 = prediction.getOddsForPlayer(marketId, player1);
        uint256 oddsPlayer2 = prediction.getOddsForPlayer(marketId, player2);
        
        assertEq(oddsPlayer1, 40000); // 4x
        assertEq(oddsPlayer2, 13333); // ~1.33x (truncated)
    }
    
    function test_GetAllOdds() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        prediction.predict{value: 2 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 2 ether}(marketId, player2, 0);
        
        IPrediction.PlayerOdds[] memory allOdds = prediction.getAllOdds(marketId);
        
        assertEq(allOdds.length, 2);
        // Both have equal odds (2x = 20000 basis points)
        assertEq(allOdds[0].odds, 20000);
        assertEq(allOdds[1].odds, 20000);
    }
    
    function test_GetStakeForPlayer() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        prediction.predict{value: 5 ether}(marketId, player1, 0);
        
        assertEq(prediction.getStakeForPlayer(marketId, player1), 5 ether);
        assertEq(prediction.getStakeForPlayer(marketId, player2), 0);
    }
    
    function test_GetPredictedPlayers() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 1 ether}(marketId, player2, 0);
        
        address[] memory predictedPlayers = prediction.getPredictedPlayers(marketId);
        assertEq(predictedPlayers.length, 2);
    }
    
    function test_GetPredictors() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        address[] memory predictors = prediction.getPredictors(marketId);
        assertEq(predictors.length, 2);
        assertEq(predictors[0], predictor1);
        assertEq(predictors[1], predictor2);
    }
    
    function test_GetMarketSummary() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        vm.prank(predictor1);
        prediction.predict{value: 2 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 3 ether}(marketId, player2, 0);
        
        (
            IPrediction.CompetitionType competitionType,
            uint256 competitionId,
            uint256 totalPool,
            uint256 predictorCount,
            uint256 uniquePlayersCount,
            bool bettingOpen,
            bool resolved,
            address resolvedWinner
        ) = prediction.getMarketSummary(marketId);
        
        assertEq(uint8(competitionType), uint8(IPrediction.CompetitionType.Match));
        assertEq(competitionId, matchId);
        assertEq(totalPool, 5 ether);
        assertEq(predictorCount, 2);
        assertEq(uniquePlayersCount, 2);
        assertTrue(bettingOpen);
        assertFalse(resolved);
        assertEq(resolvedWinner, address(0));
    }
    
    function test_FeatureMetadata() public view {
        assertEq(prediction.version(), "1.0.0");
        assertEq(prediction.featureName(), "Prediction - OCI-007");
    }
    
    function test_MarketNotFoundReverts() public {
        vm.prank(predictor1);
        vm.expectRevert(Prediction.MarketNotFound.selector);
        prediction.predict{value: 1 ether}(999, player1, 0);
    }
    
    function test_MultiplePredictorsOnSamePlayer() public {
        vm.prank(controller);
        uint256 marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
        
        // Multiple predictors bet on player1
        vm.prank(predictor1);
        prediction.predict{value: 2 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 3 ether}(marketId, player1, 0);
        
        assertEq(prediction.getStakeForPlayer(marketId, player1), 5 ether);
        
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertEq(market.totalPool, 5 ether);
        
        // Only 1 unique player predicted
        address[] memory predictedPlayers = prediction.getPredictedPlayers(marketId);
        assertEq(predictedPlayers.length, 1);
    }
}

contract PredictionCommitRevealTest is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public predictor1 = address(0x6);
    address public predictor2 = address(0x7);
    
    uint256 public matchId;
    uint256 public marketId;
    
    event PredictionCommitted(uint256 indexed marketId, address indexed predictor, bytes32 commitHash, uint256 amount);
    event PredictionRevealed(uint256 indexed marketId, address indexed predictor, address indexed predictedPlayer, uint256 amount);
    
    function setUp() public {
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0),
            address(0),
            feeRecipients,
            feeShares
        );
        
        vm.deal(predictor1, 100 ether);
        vm.deal(predictor2, 100 ether);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(controller, 20 ether);
        
        // Create dummy match to avoid matchId=0 (Prediction uses competitionId==0 for not-found check)
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        vm.prank(controller);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        vm.prank(controller);
        marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
    }
    
    function test_GenerateCommitHash() public view {
        bytes32 salt = keccak256("secret_salt");
        bytes32 expectedHash = keccak256(abi.encodePacked(player1, salt));
        
        bytes32 generatedHash = prediction.generateCommitHash(player1, salt);
        assertEq(generatedHash, expectedHash);
    }
    
    function test_CommitPrediction() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        vm.expectEmit(true, true, false, true);
        emit PredictionCommitted(marketId, predictor1, commitHash, 1 ether);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        (bytes32 storedHash, uint256 amount, uint256 commitTime, bool revealed) = 
            prediction.getCommit(marketId, predictor1);
        
        assertEq(storedHash, commitHash);
        assertEq(amount, 1 ether);
        assertGt(commitTime, 0);
        assertFalse(revealed);
    }
    
    function test_RevealPrediction() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        // Commit
        vm.prank(predictor1);
        prediction.commit{value: 2 ether}(marketId, commitHash, 0);
        
        // Reveal
        vm.prank(predictor1);
        vm.expectEmit(true, true, true, true);
        emit PredictionRevealed(marketId, predictor1, player1, 2 ether);
        prediction.reveal(marketId, player1, salt);
        
        // Verify commit is marked as revealed
        (, , , bool revealed) = prediction.getCommit(marketId, predictor1);
        assertTrue(revealed);
        
        // Verify prediction is recorded
        IPrediction.Prediction memory pred = prediction.getPrediction(marketId, predictor1);
        assertEq(pred.predictedPlayer, player1);
        assertEq(pred.amount, 2 ether);
        
        // Verify market pool updated
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertEq(market.totalPool, 2 ether);
    }
    
    function test_CannotCommitTwice() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.AlreadyCommitted.selector);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
    }
    
    function test_CannotRevealWithWrongSalt() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 wrongSalt = keccak256("wrong_salt");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.InvalidReveal.selector);
        prediction.reveal(marketId, player1, wrongSalt);
    }
    
    function test_CannotRevealWithWrongPlayer() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.InvalidReveal.selector);
        prediction.reveal(marketId, player2, salt);
    }
    
    function test_CannotRevealWithoutCommit() public {
        bytes32 salt = keccak256("secret_salt");
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.NoCommitFound.selector);
        prediction.reveal(marketId, player1, salt);
    }
    
    function test_CannotRevealTwice() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        vm.prank(predictor1);
        prediction.reveal(marketId, player1, salt);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.AlreadyPredicted.selector);
        prediction.reveal(marketId, player1, salt);
    }
    
    function test_CannotRevealForZeroAddress() public {
        bytes32 salt = keccak256("secret_salt");
        bytes32 commitHash = prediction.generateCommitHash(address(0), salt);
        
        vm.prank(predictor1);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.ZeroAddress.selector);
        prediction.reveal(marketId, address(0), salt);
    }
}

contract PredictionResolutionTest is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public predictor1 = address(0x6);
    address public predictor2 = address(0x7);
    address public predictor3 = address(0x8);
    
    uint256 public matchId;
    uint256 public marketId;
    
    event MarketResolved(uint256 indexed marketId, address winner);
    event MarketVoided(uint256 indexed marketId);
    event Claimed(uint256 indexed marketId, address indexed predictor, uint256 payout);
    
    function setUp() public {
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0),
            address(0),
            feeRecipients,
            feeShares
        );
        
        // Set prediction contract on match for callbacks
        vm.prank(controller);
        matchContract.setPrediction(address(prediction));
        
        vm.deal(predictor1, 100 ether);
        vm.deal(predictor2, 100 ether);
        vm.deal(predictor3, 100 ether);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(controller, 10 ether);
        
        // Create dummy match to avoid matchId=0 (Prediction uses competitionId==0 for not-found check)
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create match - player1 creates and auto-joins, player2 will join in tests
        vm.prank(player1);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create market
        vm.prank(controller);
        marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
    }
    
    function test_ResolveMarketWhenMatchFinalized() public {
        // Place predictions
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 1 ether}(marketId, player2, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market should be resolved via callback when match is finalized
        vm.expectEmit(true, false, false, true);
        emit MarketResolved(marketId, player1);
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        // Verify market is resolved
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertTrue(market.resolved);
        assertEq(market.resolvedWinner, player1);
    }
    
    function test_CannotResolveBeforeMatchFinalized() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.expectRevert(Prediction.BettingStillOpen.selector);
        prediction.resolve(marketId);
    }
    
    function test_CannotResolveTwice() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        // Trying to resolve again should fail
        vm.expectRevert(Prediction.MarketAlreadyResolved.selector);
        prediction.resolve(marketId);
    }
    
    function test_ClaimWinnings() public {
        // Place predictions: predictor1 bets 1 ETH on player1, predictor2 bets 3 ETH on player2
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 3 ether}(marketId, player2, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        // Total pool: 4 ETH
        // Winner pool (player1): 1 ETH
        // Predictor1 gets: (1 * 4) / 1 = 4 ETH
        
        uint256 balanceBefore = predictor1.balance;
        
        vm.prank(predictor1);
        vm.expectEmit(true, true, false, true);
        emit Claimed(marketId, predictor1, 4 ether);
        prediction.claim(marketId);
        
        uint256 balanceAfter = predictor1.balance;
        assertEq(balanceAfter - balanceBefore, 4 ether);
    }
    
    function test_LoserCannotClaimAnything() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 1 ether}(marketId, player2, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        // predictor2 bet on player2 who lost - claim should succeed but get nothing
        uint256 balanceBefore = predictor2.balance;
        
        vm.prank(predictor2);
        prediction.claim(marketId);
        
        uint256 balanceAfter = predictor2.balance;
        assertEq(balanceAfter, balanceBefore); // No payout for wrong prediction
    }
    
    function test_CannotClaimTwice() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        vm.prank(predictor1);
        prediction.claim(marketId);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.AlreadyClaimed.selector);
        prediction.claim(marketId);
    }
    
    function test_CannotClaimBeforeResolution() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.CompetitionNotFinalized.selector);
        prediction.claim(marketId);
    }
    
    function test_CannotClaimWithoutPrediction() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        vm.prank(predictor2); // Never placed a prediction
        vm.expectRevert(Prediction.NoPrediction.selector);
        prediction.claim(marketId);
    }
    
    function test_IsPredictionCorrect() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 1 ether}(marketId, player2, 0);
        
        // Before resolution
        assertFalse(prediction.isPredictionCorrect(marketId, predictor1));
        assertFalse(prediction.isPredictionCorrect(marketId, predictor2));
        
        // Finalize match
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        assertTrue(prediction.isPredictionCorrect(marketId, predictor1));
        assertFalse(prediction.isPredictionCorrect(marketId, predictor2));
    }
    
    function test_GetPotentialPayout() public {
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 3 ether}(marketId, player2, 0);
        
        // Total pool: 4 ETH
        // Predictor1 staked 1 ETH on player1 (pool 1 ETH) -> potential payout: 4 ETH
        // Predictor2 staked 3 ETH on player2 (pool 3 ETH) -> potential payout: 4 ETH
        
        assertEq(prediction.getPotentialPayout(marketId, predictor1), 4 ether);
        assertEq(prediction.getPotentialPayout(marketId, predictor2), 4 ether);
    }
    
    function test_PayoutDistributionWithMultipleWinners() public {
        // predictor1 bets 1 ETH on player1
        // predictor2 bets 2 ETH on player1
        // predictor3 bets 3 ETH on player2
        // Total pool: 6 ETH, Winner pool (player1): 3 ETH
        
        vm.prank(predictor1);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 2 ether}(marketId, player1, 0);
        
        vm.prank(predictor3);
        prediction.predict{value: 3 ether}(marketId, player2, 0);
        
        // Finalize match - player1 wins
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Market is resolved via callback when match is finalized
        vm.prank(controller);
        matchContract.finalize(matchId, player1);
        
        // Predictor1: (1 * 6) / 3 = 2 ETH
        // Predictor2: (2 * 6) / 3 = 4 ETH
        
        uint256 balance1Before = predictor1.balance;
        uint256 balance2Before = predictor2.balance;
        
        vm.prank(predictor1);
        prediction.claim(marketId);
        
        vm.prank(predictor2);
        prediction.claim(marketId);
        
        assertEq(predictor1.balance - balance1Before, 2 ether);
        assertEq(predictor2.balance - balance2Before, 4 ether);
    }
}

contract PredictionVoidedMarketTest is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public predictor1 = address(0x6);
    address public predictor2 = address(0x7);
    
    uint256 public matchId;
    uint256 public marketId;
    
    event MarketVoided(uint256 indexed marketId);
    event Claimed(uint256 indexed marketId, address indexed predictor, uint256 payout);
    
    function setUp() public {
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0),
            address(0),
            feeRecipients,
            feeShares
        );
        
        // Set prediction contract on match for callbacks
        vm.prank(controller);
        matchContract.setPrediction(address(prediction));
        
        vm.deal(predictor1, 100 ether);
        vm.deal(predictor2, 100 ether);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(controller, 10 ether);
        
        // Create dummy match to avoid matchId=0 (Prediction uses competitionId==0 for not-found check)
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create match - player1 creates and auto-joins
        vm.prank(player1);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create market
        vm.prank(controller);
        marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
    }
    
    function test_VoidedMarketRefundsEveryone() public {
        // Place predictions
        vm.prank(predictor1);
        prediction.predict{value: 2 ether}(marketId, player1, 0);
        
        vm.prank(predictor2);
        prediction.predict{value: 3 ether}(marketId, player2, 0);
        
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        // Activate match first (required before cancel)
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Cancel match - market is voided via callback
        vm.prank(controller);
        matchContract.cancel(matchId);
        
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertTrue(market.voided);
        assertFalse(market.resolved);
        
        // Both predictors should be able to claim refunds
        uint256 balance1Before = predictor1.balance;
        uint256 balance2Before = predictor2.balance;
        
        vm.prank(predictor1);
        prediction.claim(marketId);
        
        vm.prank(predictor2);
        prediction.claim(marketId);
        
        // Should get full refunds
        assertEq(predictor1.balance - balance1Before, 2 ether);
        assertEq(predictor2.balance - balance2Before, 3 ether);
    }
}

contract PredictionBettingClosedTest is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public predictor1 = address(0x6);
    
    uint256 public matchId;
    uint256 public marketId;
    
    event RefundAvailable(uint256 indexed marketId, address indexed predictor, uint256 amount);
    
    function setUp() public {
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0),
            address(0),
            feeRecipients,
            feeShares
        );
        
        vm.prank(controller);
        matchContract.setPrediction(address(prediction));
        
        vm.deal(predictor1, 100 ether);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(controller, 10 ether);
        
        // Create dummy match to avoid matchId=0 (Prediction uses competitionId==0 for not-found check)
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create match - player1 creates and auto-joins
        vm.prank(player1);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create market
        vm.prank(controller);
        marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
    }
    
    function test_PredictWhenBettingClosedCreatesRefund() public {
        // Close betting
        vm.prank(controller);
        prediction.closeBetting(marketId);
        
        // Try to predict - should create pending refund
        vm.prank(predictor1);
        vm.expectEmit(true, true, false, true);
        emit RefundAvailable(marketId, predictor1, 1 ether);
        prediction.predict{value: 1 ether}(marketId, player1, 0);
        
        // Claim refund
        uint256 balanceBefore = predictor1.balance;
        vm.prank(predictor1);
        prediction.claimRefund(marketId);
        assertEq(predictor1.balance - balanceBefore, 1 ether);
    }
    
    function test_AutoCloseBettingWhenMatchActivates() public {
        // player1 already joined when creating match, player2 joins now
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        // Activate match - should close betting via callback
        vm.prank(controller);
        matchContract.activate(matchId);
        
        // Betting should now be closed
        assertFalse(prediction.isBettingOpen(marketId));
    }
}

import {MockERC20} from "../../mocks/MockERC20.sol";

contract PredictionERC20Test is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    MockERC20 public token;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public predictor1 = address(0x6);
    
    uint256 public matchId;
    uint256 public marketId;
    
    function setUp() public {
        token = new MockERC20(0);
        
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0),
            address(0),
            feeRecipients,
            feeShares
        );
        
        // Mint tokens to predictors
        token.mint(predictor1, 100 ether);
        
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(controller, 10 ether);
        
        // Create dummy match
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create match
        vm.prank(player1);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create market with ERC20 token
        vm.prank(controller);
        marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(token)
        );
    }
    
    function test_PredictWithERC20() public {
        vm.prank(predictor1);
        token.approve(address(prediction), 10 ether);
        
        vm.prank(predictor1);
        prediction.predict(marketId, player1, 1 ether);
        
        IPrediction.Prediction memory pred = prediction.getPrediction(marketId, predictor1);
        assertEq(pred.amount, 1 ether);
        assertEq(pred.predictedPlayer, player1);
    }
    
    function test_PredictWithERC20_RevertZeroAmount() public {
        vm.prank(predictor1);
        token.approve(address(prediction), 10 ether);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.ZeroAmount.selector);
        prediction.predict(marketId, player1, 0);
    }
    
    function test_PredictWithERC20_RevertIfSendingNative() public {
        vm.prank(predictor1);
        token.approve(address(prediction), 10 ether);
        
        vm.deal(predictor1, 1 ether);
        vm.prank(predictor1);
        vm.expectRevert(Prediction.InvalidStakeAmount.selector);
        prediction.predict{value: 1 ether}(marketId, player1, 1 ether);
    }
    
    function test_CommitWithERC20() public {
        bytes32 salt = keccak256("secret");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        token.approve(address(prediction), 10 ether);
        
        vm.prank(predictor1);
        prediction.commit(marketId, commitHash, 1 ether);
        
        (bytes32 storedHash, uint256 amount, , bool revealed) = prediction.getCommit(marketId, predictor1);
        assertEq(storedHash, commitHash);
        assertEq(amount, 1 ether);
        assertFalse(revealed);
    }
    
    function test_CommitWithERC20_RevertZeroAmount() public {
        bytes32 salt = keccak256("secret");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        token.approve(address(prediction), 10 ether);
        
        vm.prank(predictor1);
        vm.expectRevert(Prediction.ZeroAmount.selector);
        prediction.commit(marketId, commitHash, 0);
    }
    
    function test_CommitWithERC20_RevertIfSendingNative() public {
        bytes32 salt = keccak256("secret");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        token.approve(address(prediction), 10 ether);
        
        vm.deal(predictor1, 1 ether);
        vm.prank(predictor1);
        vm.expectRevert(Prediction.InvalidStakeAmount.selector);
        prediction.commit{value: 1 ether}(marketId, commitHash, 1 ether);
    }
}

contract PredictionRefundTest is Test {
    Prediction public prediction;
    Match public matchContract;
    Score public score;
    
    address public owner = address(0x1);
    address public controller = address(0x2);
    address public player1 = address(0x3);
    address public player2 = address(0x4);
    address public predictor1 = address(0x6);
    
    uint256 public matchId;
    uint256 public marketId;
    
    function setUp() public {
        score = new Score();
        score.initialize(owner, controller, 50, 1000, 100);
        
        matchContract = new Match();
        address[] memory feeRecipients = new address[](0);
        uint256[] memory feeShares = new uint256[](0);
        matchContract.initialize(owner, controller, address(score), 100, feeRecipients, feeShares);
        
        vm.prank(controller);
        score.setRecorderAuthorization(address(matchContract), true);
        
        prediction = new Prediction();
        prediction.initialize(
            owner,
            controller,
            address(matchContract),
            address(0),
            address(0),
            feeRecipients,
            feeShares
        );
        
        vm.deal(predictor1, 100 ether);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(controller, 10 ether);
        
        // Create dummy match
        vm.prank(controller);
        matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create match
        vm.prank(player1);
        matchId = matchContract.create{value: 1 ether}(address(0), 1 ether, 2);
        
        // Create market
        vm.prank(controller);
        marketId = prediction.createMarket(
            IPrediction.CompetitionType.Match,
            matchId,
            address(0)
        );
    }
    
    function test_ClaimRefund_NoRefundAvailable() public {
        vm.prank(predictor1);
        vm.expectRevert(Prediction.NoRefundAvailable.selector);
        prediction.claimRefund(marketId);
    }
    
    function test_ClaimRefund_UnrevealedCommitAfterVoid() public {
        bytes32 salt = keccak256("secret");
        bytes32 commitHash = prediction.generateCommitHash(player1, salt);
        
        vm.prank(predictor1);
        prediction.commit{value: 1 ether}(marketId, commitHash, 0);
        
        // player2 joins so match can be cancelled
        vm.prank(player2);
        matchContract.join{value: 1 ether}(matchId);
        
        // Set prediction contract on match for callbacks
        vm.prank(controller);
        matchContract.setPrediction(address(prediction));
        
        // Activate and then cancel match to void market
        vm.prank(controller);
        matchContract.activate(matchId);
        
        vm.prank(controller);
        matchContract.cancel(matchId);
        
        // Now market should be voided via callback
        IPrediction.Market memory market = prediction.getMarket(marketId);
        assertTrue(market.voided);
        
        // Should be able to claim refund for unrevealed commit
        uint256 balanceBefore = predictor1.balance;
        vm.prank(predictor1);
        prediction.claimRefund(marketId);
        assertEq(predictor1.balance - balanceBefore, 1 ether);
    }
}
