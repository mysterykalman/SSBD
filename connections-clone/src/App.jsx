import React, { useMemo, useState } from 'react';
import Game from './components/Game';
import puzzles1 from './data/puzzles-1.json';
import puzzles2 from './data/puzzles-2.json';
import puzzles3 from './data/puzzles-3.json';
import puzzles4 from './data/puzzles-4.json';
import puzzles5 from './data/puzzles-5.json';

const puzzles = [...puzzles1, ...puzzles2, ...puzzles3, ...puzzles4, ...puzzles5];
const categoryMap = { yellow: 1, green: 2, blue: 3, purple: 4 };

function App() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const puzzle = puzzles[puzzleIndex];
  const tilesData = useMemo(() => puzzle.groups.flatMap((group) => group.words.map((word) => ({
    word,
    theme: group.category,
    category: categoryMap[group.difficulty],
  }))), [puzzle]);

  return (
    <div className="App">
      <div>
        <div className="puzzle-nav">
          <button type="button" onClick={() => setPuzzleIndex((i) => Math.max(0, i - 1))} disabled={puzzleIndex === 0}>Previous</button>
          <strong>{puzzle.title} of 50</strong>
          <button type="button" onClick={() => setPuzzleIndex((i) => Math.min(puzzles.length - 1, i + 1))} disabled={puzzleIndex === puzzles.length - 1}>Next</button>
        </div>
        <Game key={puzzle.id} tilesData={tilesData} />
      </div>
    </div>
  );
}

export default App;
