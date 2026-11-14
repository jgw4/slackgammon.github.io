This software has a single purpose of allowing a user to play standard backgammon against a computer opponent.

## Design
This software should show minimal text and options. Only what is necessary.

## Backgammon Rules
- Each player has 15 checkers. From each player's perspective, the starting layout is 2 on the 24-point, 5 on the 13-point, 3 on the 8-point, and 5 on the 6-point. Players move in opposite directions toward their home boards.
- To start, each player rolls one die. The higher roll goes first and uses both rolled values as the first turn; reroll ties. On later turns, roll two dice. Each die is a separate move, and doubles provide four moves of that value.
- Play the maximum number of dice that can legally be used. If only one of two different values can be played, use the higher value. When a checker is on the bar, re-enter it before moving any other checker; use each die to enter on the corresponding point in the opponent's home board. If no entry is open, no move can be made with that die.
- A checker may land on an empty point, a point occupied by its own checkers, or a point occupied by exactly one opposing checker (a blot). Two or more opposing checkers block a point. Hitting a blot sends it to the bar.
- A player may bear off only when all 15 active checkers are in their home board and none are on the bar. A die bears off from its matching point. A higher die may bear off from the highest occupied point only when no checker is on a higher point. A player may choose another legal move instead of bearing off.
- The first player to bear off all 15 checkers wins. A gammon is a win when the loser has borne off none; a backgammon is a gammon where the loser still has a checker on the bar or in the winner's home board.
- Standard play uses a doubling cube: either player may offer a double at the start of their turn before rolling. The opponent may concede at the current stakes or accept; the accepting player owns the cube. A single game starts at one point; gammons and backgammons score two and three times the cube value. Match scoring and the Crawford rule apply only to match play.

Reference: [U.S. Backgammon Federation, Backgammon Basics](https://usbgf.org/backgammon-basics-how-to-play/).

## Scoring and Match Engine Rules
- A single win is worth 1 base point. A gammon (loser bore off zero checkers) is worth 2; a backgammon (loser bore off zero and still has a checker on the bar or in the winner's home board) is worth 3.
- Multiply the base result by the doubling cube value. The cube starts at 1, doubles each time it is turned, and is capped at 64 in this app. Reset it to 1 for each new game. Clicking or tapping the cube advances directly to the next doubled value without a separate offer/take flow.
- Add each game's awarded points to the winner's match total. The first player to reach the selected target wins the match. The default target is 7 points.
- If Crawford is enabled, when either player reaches exactly one point below the target, the next game is the Crawford game and the cube is unavailable for that whole game. Apply this once per match; restore the cube afterward. For a target of 1, there is no Crawford game.
- A game win updates the match score once, at game completion. A gammon/backgammon multiplier must be determined from the loser's borne-off count, bar count, and checkers in the winner's home board at that moment. When a match is won, the next roll starts a new match; otherwise it starts the next game and preserves the match score.

Scoring reference: [Backgammon.com, How Backgammon Scoring Works](https://backgammon.com/learn/how-scoring-works).
