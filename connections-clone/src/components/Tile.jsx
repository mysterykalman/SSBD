import React from 'react';
import PropTypes from 'prop-types';
import './styles/Tile.css';

function Tile({ word, selected, onSelect, disabled, animateGuess, animateWrongGuess, ariaLabel }) {
  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') onSelect();
  };
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => { if (!disabled) onSelect(); }}
      onKeyDown={handleKeyDown}
      className={`tile ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''} ${animateGuess ? 'guess-bounce' : ''} ${animateWrongGuess ? 'wrong-shake' : ''}`}
      aria-disabled={disabled}
      aria-label={ariaLabel}
    >
      {word}
    </div>
  );
}

Tile.propTypes = {
  word: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  animateGuess: PropTypes.bool.isRequired,
  animateWrongGuess: PropTypes.bool.isRequired,
  ariaLabel: PropTypes.string,
};
Tile.defaultProps = { ariaLabel: undefined };
export default Tile;
