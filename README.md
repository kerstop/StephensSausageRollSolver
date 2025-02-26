# Stephen's Sausage Roll Solver

Stephen's Sausage Roll is a critically acclaimed 2016 sokoban style indie puzzle
game created by Increpare games. During the game the player must solve puzzles
by pushing and rolling oversized sausages over grills to cook them evenly without
burning them. It stands out in its genre for having a limited set of rules while
while still providing extremely deep and challenging puzzles.

Stephen's Sausage Roll Solver is a tool to help users solve levels and look at
the game in a new way. Because this tool runs entirely in the browser you can
[try it right now](https://kerstop.github.io/StephensSausageRollSolver/)
through github pages.

## Limitations

This tool is in development and is not complete. It only implements the mechanics
of the first world, as well as some from the second. Also because of the way the
visualizations work some more complicated levels may not work properly. I am
currently working on methods to address this.

## How It Works

By viewing each puzzle as a finite state machine it is possible to think of each
level as a directed graph of all the possible states that the puzzle can be in
the window on the right shows the player this graph and lets them explore it.
