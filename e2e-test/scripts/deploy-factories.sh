#!/usr/bin/env bash

# Deploy factory contracts to the network
# Deploys all game factories: Match, Score, Prize, League, Tournament, Prediction

set -e

# Load environment variables
if [ -f ./.env ]; then
  export $(cat ./.env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found in root directory"
  exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY not set in .env file"
  exit 1
fi

# Check if RPC_URL is set
if [ -z "$RPC_URL" ]; then
  echo "Error: RPC_URL not set in .env file"
  exit 1
fi

echo "🚀 Deploying factory contracts..."
echo "   RPC URL: $RPC_URL"
echo ""

# Deploy game.MatchFactory
echo "🏭 Deploying game.MatchFactory..."
forge script ../contracts/script/game/DeployMatchFactory.s.sol:DeployMatchFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy game.ScoreFactory
echo "🏭 Deploying game.ScoreFactory..."
forge script ../contracts/script/game/DeployScoreFactory.s.sol:DeployScoreFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy game.PrizeFactory
echo "🏭 Deploying game.PrizeFactory..."
forge script ../contracts/script/game/DeployPrizeFactory.s.sol:DeployPrizeFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy game.LeagueFactory
echo "🏭 Deploying game.LeagueFactory..."
forge script ../contracts/script/game/DeployLeagueFactory.s.sol:DeployLeagueFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy game.TournamentFactory
echo "🏭 Deploying game.TournamentFactory..."
forge script ../contracts/script/game/DeployTournamentFactory.s.sol:DeployTournamentFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""

# Deploy game.PredictionFactory
echo "🏭 Deploying game.PredictionFactory..."
forge script ../contracts/script/game/DeployPredictionFactory.s.sol:DeployPredictionFactory \
  --rpc-url "$RPC_URL" --broadcast

echo ""
echo "✅ Factory contracts deployed successfully!"
echo "   Update .env.local with the deployed addresses for:"
echo "   - NEXT_PUBLIC_GAME_MATCH_FACTORY"
echo "   - NEXT_PUBLIC_GAME_SCORE_FACTORY"
echo "   - NEXT_PUBLIC_GAME_PRIZE_FACTORY"
echo "   - NEXT_PUBLIC_LEAGUE_FACTORY"
echo "   - NEXT_PUBLIC_TOURNAMENT_FACTORY"
echo "   - NEXT_PUBLIC_PREDICTION_FACTORY"