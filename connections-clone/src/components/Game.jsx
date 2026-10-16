import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Toast from './Toast';
import Tile from './Tile';
import ActionButton from './ActionButton';
import Toggle from './Toggle';
import SolvedCategory from './SolvedCategory';
import './styles/Game.css';

function Game({ tilesData }) {
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [mistakes, setMistakes] = useState(4);
  const [removingMistake, setRemovingMistake] = useState(null);
  const [status, setStatus] = useState('playing');
  const [solvedCategories, setSolvedCategories] = useState([]);
  const [newSolvedTheme, setNewSolvedTheme] = useState('');
  const [submittedSelections, setSubmittedSelections] = useState([]);
  const [guessAnimation, setGuessAnimation] = useState({ show: false, index: -1 });
  const [shakingTiles, setShakingTiles] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const shuffleTiles = (arr) => {
    const shuffledArray = [...arr];
    for (let i = shuffledArray.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  };
  const [shuffledTiles, setShuffledTiles] = useState(() => shuffleTiles([...tilesData]));
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const animateGuess = async (tiles) => {
    const tileIndexMap = new Map(shuffledTiles.map((tile, index) => [tile, index]));
    const sorted = tiles.map((tile) => ({ tile, index: tileIndexMap.get(tile) })).sort((a, b) => a.index - b.index);
    for (let i = 0; i < sorted.length; i += 1) {
      setGuessAnimation({ show: true, index: sorted[i].index });
      await delay(150);
    }
    setGuessAnimation({ show: false, index: -1 });
    await delay(500);
  };

  const animateWrongGuess = async () => { setShakingTiles(true); await delay(225); setShakingTiles(false); };

  const handleTileSelect = (tile) => {
    if (status === 'lost' || status === 'won' || (selectedTiles.length >= 4 && !selectedTiles.includes(tile))) return;
    if (selectedTiles.includes(tile)) setSelectedTiles(selectedTiles.filter((t) => t !== tile));
    else {
      if (status === 'wrong') setStatus('playing');
      setSelectedTiles([...selectedTiles, tile]);
    }
  };

  const isCorrectMatch = (tiles) => {
    if (tiles.length !== 4) return false;
    const counts = {};
    tiles.forEach(({ theme }) => { counts[theme] = (counts[theme] || 0) + 1; });
    const values = Object.values(counts);
    if (values.length === 1) return true;
    if (values.includes(3) && mistakes > 1) setToastMessage('One away...');
    return false;
  };

  const arraysEqual = (a, b) => a.length === b.length && a.map((x) => x.word).sort().every((word, i) => word === b.map((x) => x.word).sort()[i]);

  const checkSelection = async () => {
    if (selectedTiles.length !== 4) return;
    if (submittedSelections.some((selection) => arraysEqual(selection, selectedTiles))) { setToastMessage('Already guessed!'); return; }
    await animateGuess(selectedTiles);
    if (isCorrectMatch(selectedTiles)) {
      const { theme, category } = selectedTiles[0];
      const words = selectedTiles.map((t) => t.word);
      setSolvedCategories((prev) => (prev.some((cat) => cat.theme === theme) ? prev : [...prev, { theme, title: theme, words, category }]));
      setNewSolvedTheme(theme);
      setTimeout(() => setNewSolvedTheme(''), 300);
      const unmatchedTiles = shuffledTiles.filter((tile) => !selectedTiles.includes(tile));
      setShuffledTiles(unmatchedTiles);
      setSelectedTiles([]);
      if (unmatchedTiles.length === 0) { setToastMessage('Perfect'); setStatus('won'); }
    } else {
      await animateWrongGuess();
      const newMistakes = mistakes - 1;
      setRemovingMistake(newMistakes);
      setTimeout(() => { setRemovingMistake(null); setMistakes(newMistakes); }, 300);
      if (newMistakes === 0) { setToastMessage('Next Time'); setStatus('lost'); } else setStatus('wrong');
    }
    setSubmittedSelections([...submittedSelections, selectedTiles]);
  };

  return (
    <main className="container">
      <h1 className="game_title">Clonections</h1>
      <div>Create four groups of four!</div>
      <div className="grid" role="grid">
        {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
        {solvedCategories.map((cat) => <SolvedCategory key={cat.theme} tile={cat} className={newSolvedTheme === cat.theme ? 'pulse' : ''} />)}
        {shuffledTiles.map((tile) => (
          <Tile key={tile.word} word={tile.word} selected={selectedTiles.includes(tile)} onSelect={() => handleTileSelect(tile)} disabled={(status === 'won' || status === 'lost') || (selectedTiles.length >= 4 && !selectedTiles.includes(tile))} animateGuess={guessAnimation.show && guessAnimation.index === shuffledTiles.indexOf(tile)} animateWrongGuess={shakingTiles && selectedTiles.includes(tile)} ariaLabel={`Tile ${tile.word}`} />
        ))}
      </div>
      <div className="mistakesWrapper"><div className="mistakesContent">Mistakes Remaining:&nbsp;<span className="mistakesRemaining">{Array.from({ length: mistakes }, (_, index) => <span key={index} className={`circle ${removingMistake === index ? 'fade-out' : ''}`} />)}</span></div></div>
      <div className="actionButtonGrid">
        <ActionButton onClick={() => setShuffledTiles(shuffleTiles(shuffledTiles))} disabled={status === 'won' || status === 'lost'}>Shuffle</ActionButton>
        <ActionButton onClick={() => setSelectedTiles([])} disabled={selectedTiles.length < 1 || status === 'won' || status === 'lost'}>Deselect All</ActionButton>
        <ActionButton onClick={checkSelection} disabled={selectedTiles.length !== 4 || status !== 'playing'} type="submit">Submit</ActionButton>
      </div>
      <Toggle />
    </main>
  );
}

Game.propTypes = { tilesData: PropTypes.arrayOf(PropTypes.shape({ word: PropTypes.string.isRequired, theme: PropTypes.string.isRequired, category: PropTypes.number.isRequired })).isRequired };
export default Game;
