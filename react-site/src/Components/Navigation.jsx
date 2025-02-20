import React from 'react';

function Navigation({ showPage }) {
  return (
    <div className="nav">
      <button onClick={() => showPage('cv')}>CV</button>
      <button onClick={() => showPage('dates')}>Dates de la saison</button>
      <button onClick={() => showPage('demos')}>Démos et photos</button>
      <button onClick={() => showPage('autres')}>Autres</button>
    </div>
  );
}

export default Navigation;