import React from 'react';
import PropTypes from 'prop-types';
import './styles/ActionButton.css';

function ActionButton({ onClick, disabled = false, children, ariaLabel, type }) {
  return (
    <button
      type="button"
      className={`action_button ${disabled ? 'disabled' : ''} ${type === 'submit' ? 'submit_button' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </button>
  );
}

ActionButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
  ariaLabel: PropTypes.string,
  type: PropTypes.string,
};

ActionButton.defaultProps = { ariaLabel: undefined, type: undefined };
export default ActionButton;
