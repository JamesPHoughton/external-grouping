import { ClassicListenersCollector } from "@empirica/core/admin/classic";
export const Empirica = new ClassicListenersCollector();

Empirica.onGameStart(({ game }) => {
  const round = game.addRound({
    name: "Round 1 - Jelly Beans",
    task: "jellybeans",
  });
  round.addStage({ name: "Answer", duration: 300 });
  round.addStage({ name: "Result", duration: 120 });

  const round2 = game.addRound({
    name: "Round 2 - Minesweeper",
    task: "minesweeper",
  });
  round2.addStage({ name: "Play", duration: 300 });
});

Empirica.onRoundStart(({ round }) => {});

Empirica.onStageStart(({ stage }) => {});

Empirica.onStageEnded(({ stage }) => {
  calculateJellyBeansScore(stage);
});

Empirica.onRoundEnded(({ round }) => {});

Empirica.onGameEnded(({ game }) => {});

// Note: this is not the actual number of beans in the pile, it's a guess...
const jellyBeansCount = 634;

function calculateJellyBeansScore(stage) {
  if (
    stage.get("name") !== "Answer" ||
    stage.round.get("task") !== "jellybeans"
  ) {
    return;
  }

  for (const player of stage.currentGame.players) {
    let roundScore = 0;

    const playerGuess = player.round.get("guess");

    if (playerGuess) {
      const deviation = Math.abs(playerGuess - jellyBeansCount);
      const score = Math.round((1 - deviation / jellyBeansCount) * 10);
      roundScore = Math.max(0, score);
    }

    player.round.set("score", roundScore);

    const totalScore = player.get("score") || 0;
    player.set("score", totalScore + roundScore);
  }
}

export function getOpenBatches(ctx) {
  // Return an array of open batches

  const batches = ctx.scopesByKind("batch"); // returns Map object
  // players can join an open batch
  const openBatches = [];

  for (const [, batch] of batches) {
    if (batch.get("status") === "running") openBatches.push(batch);
  }
  return openBatches;
}

export function selectOldestBatch(batches) {
  if (!Array.isArray(batches)) return undefined;
  if (!batches.length > 0) return undefined;

  let currentOldestBatch = batches[0];
  for (const comparisonBatch of batches) {
    try {
      if (
        Date.parse(currentOldestBatch.get("createdAt")) >
        Date.parse(comparisonBatch.get("createdAt"))
      )
        currentOldestBatch = comparisonBatch;
    } catch (err) {
      console.log(
        `Failed to parse createdAt timestamp for Batch ${comparisonBatch.id}`
      );
      console.log(err);
    }
  }
  return currentOldestBatch;
}

Empirica.on("game", (ctx, { game }) => {
  if (game.get("initialize")) return;
  game.set("initialize", true);

  const players = ctx.scopesByKind("player");
  const startingPlayerId = game.get("startingPlayerId");
  const startingPlayer = players.get(startingPlayerId);

  game.assignPlayer(startingPlayer);
  game.start();
});

Empirica.on("player", "groupCode", (ctx, { player, groupCode }) => {
  if (!groupCode) return;
  if (player.get("intialized")) return; // this is to make sure that the callback doesn't run twice, which it does for some reason
  player.set("intialized", true);

  console.log("groupCode", groupCode);

  // get the batch that the player is joining
  const openBatches = getOpenBatches(ctx);
  const batch = selectOldestBatch(openBatches);
  if (batch) {
    player.set("batchID", batch.id);
    console.log("player.set batchID", batch.id);
  }
  console.log("Batch is:", player.get("batchID"));

  if (!batch) {
    console.log("Batch not found");
    return;
  }

  // get all the games currently attached to the batch
  const games = batch.games;

  // get the game that already has the groupCode, if it exists
  const game = games.find((game) => game.get("groupCode") === groupCode);

  // if the game doesn't exist, create it
  if (!game) {
    console.log(`Creating game for group ${groupCode}`);
    batch.addGame([
      {
        key: "groupCode",
        value: groupCode,
      },
      {
        key: "startingPlayerId",
        value: player.id,
      },
      { key: "treatment", value: { playerCount: 2 } },
    ]);
    return; // first player is assigned after the game is created
  }
  // if the game already exists, add the player to it
  console.log(`Found game for group ${groupCode}`);
  game.assignPlayer(player);
});
