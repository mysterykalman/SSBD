import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './styles/Toast.css';

function Toast({ message, onClose }) {
  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    const fadeOutTimer = setTimeout(() => setFadeOut(true), 1000);
    const timer = setTimeout(onClose, 1200);
    return () => { clearTimeout(fadeOutTimer); clearTimeout(timer); };
  }, [onClose]);
  return <div className="toast-wrapper"><div className={`toasty show ${fadeOut ? 'toast-out' : 'toast-in'}`}>{message}</div></div>;
}

Toast.propTypes = { message: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired };
export default Toast;
