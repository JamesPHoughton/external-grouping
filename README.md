# External group codes demo

This is a demo of how to assign a code to participants in advance that they can enter in order to be assigned to the same game.

To do this we made the following changes:

# Client side

## `client/src/app.jsx`

First we need to tell empirica not to display a nogames page if there are no games,
because we are going to create a game for the player based on what they submit.

```jsx
<EmpiricaContext
  introSteps={introSteps}
  disableNoGames // new
  exitSteps={exitSteps}
>
  <Game />
</EmpiricaContext>
```

In the future we should create a similar page to show when there are no batches open, so the players cannot enter their ids.

## `client/src/intro-exit/Introduction.jsx`

Added code to handle a input box and use it to set a value on the player object when the player submits.

```jsx
// in the return statement
<input
  type="text"
  className="border border-gray-300 rounded-md w-full px-3 py-2 mt-1"
  onChange={handleGroupCodeChange}
/>
```

```jsx
// in the component
const [groupCode, setGroupCode] = useState(""); // new
const player = usePlayer(); // new

function handleGroupCodeChange(event) {
  // new
  setGroupCode(event.target.value);
}

function onSubmit() {
  player.set("groupCode", groupCode); // new
  next();
}
```

# Server side

## `server/src/index`

In the server/src/index, tell emprica classic to disable assignments and game creation.

```js
// server/src/index

ctx.register(Classic({ disableAssignment: true, disableGameCreation: true })); // new
```

## `server/src/callbacks.js`

Added some code to help us get access to the current running batch.

There are probably better ways to do this (@npaton?) but it works.

```js
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
```

Then, when a player submits the group code, we initialize the player.
The first player to join with this code will not have a game to join,
so we need to create it. We can't assign the player to game until the game creation step has finished, so we pass the id of the first player into the game object, so that when the game is created, we can
get the player and assign them.

```js
Empirica.on("player", "groupCode", (ctx, { player, groupCode }) => {
  if (!groupCode) return;
  if (player.get("intialized")) return; // this is to make sure that the callback doesn't run twice, which it does for some reason
  player.set("intialized", true);

  console.log("groupCode", groupCode);

  // get the batch that the player is joining
  const openBatches = getOpenBatches(ctx);
  const batch = selectOldestBatch(openBatches);
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
      { key: "treatment", value: { playerCount: 2 } }, // this doesnt do anything, but empirica complains if its not there
    ]);
    return; // first player is assigned after the game is created
  }
  // if the game already exists, add the player to it
  console.log(`Found game for group ${groupCode}`);
  game.assignPlayer(player);
});
```

The callback that fires on game creation will get the first player
who was responsible for creating the game and assign them to it.

```js
Empirica.on("game", (ctx, { game }) => {
  if (game.get("initialize")) return;
  game.set("initialize", true);

  const players = ctx.scopesByKind("player");
  const startingPlayerId = game.get("startingPlayerId");
  const startingPlayer = players.get(startingPlayerId);

  game.assignPlayer(startingPlayer);
  game.start();
});
```

# running this demo

A batch needs to be running in order for the players to have something to latch onto, but it doesnt have to have anything special in terms of treatments because we ignore them altogether. This isn't super clean at the moment, but whatever.
