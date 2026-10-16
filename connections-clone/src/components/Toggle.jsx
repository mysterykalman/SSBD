import React, { useEffect, useState } from 'react';
import './styles/Toggle.css';

function Toggle() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const isDark = (localStorage.getItem('theme') || 'light') === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    setActive(!isDark);
  }, []);
  const changeTheme = () => {
    const isDark = !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setActive(!isDark);
  };
  return (
    <div className="container--toggle" title="color mode toggle">
      <input role="switch" aria-checked={!active} type="checkbox" id="toggle" className="toggle--checkbox" onChange={changeTheme} checked={active} />
      <label htmlFor="toggle" className="toggle--label"><span className="toggle--label-background" /></label>
    </div>
  );
}
export default Toggle;
