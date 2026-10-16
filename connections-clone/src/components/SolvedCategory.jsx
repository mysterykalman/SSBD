import React from 'react';
import PropTypes from 'prop-types';
import './styles/SolvedCategory.css';

function SolvedCategory({ tile, className = '' }) {
  return (
    <div className={`solvedCategory ${className}`} data-category={tile.category}>
      <div className="category-title">{tile.theme}</div>
      <div>{tile.words.join(', ')}</div>
    </div>
  );
}

SolvedCategory.propTypes = {
  tile: PropTypes.shape({ category: PropTypes.number.isRequired, theme: PropTypes.string.isRequired, words: PropTypes.arrayOf(PropTypes.string).isRequired }).isRequired,
  className: PropTypes.string,
};
export default SolvedCategory;
