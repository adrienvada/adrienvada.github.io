import React from 'react';

function CV() {
  return (
    <div id="cv" className="page active">
      <div className="section">
        <h2 className="section-title">
          Théâtre
          <button
            id="download-cv-button"
            onClick={() => (window.location.href = 'ressources/Adrien Vada CV2025.pdf')}
            style={{ marginLeft: '20px' }}
          >
            <i className="fas fa-file-pdf"></i> PDF
          </button>
        </h2>
        <ul className="item-list">
          <li className="item">
            <a
              href="https://www.facebook.com/cieduptitballon/posts/pfbid0TRcq1Gk9WtQGv9Tp8tTuk8MUtJEgzQi2XU6tBLTWgkWEgMGY1Ybf2NHANYjTLGjKl"
              target="_blank"
              rel="noopener noreferrer"
            >
              2025 <span className="item-title">Audiences - spectacle de prévention</span> - Steeve Brunet
              <br />
              <span className="item-info"> Compagnie du P'tit Ballon</span>
            </a>
          </li>
          <li className="item">
            <a href="https://crescite.fr/cleophene/" target="_blank" rel="noopener noreferrer">
              2024 <span className="item-title">Rodogune </span> (Corneille) - Angelo Jossec
              <br />
              <span className="item-info">Théâtre des Crescite</span>
            </a>
          </li>
          <li className="item">
            <a
              href="https://www.cdn-normandierouen.fr/spectacle/a-la-barre/"
              target="_blank"
              rel="noopener noreferrer"
            >
              2024 <span className="item-title">À La Barre</span> (Ronan Chéneau) - Steeve Brunet
              <br />
              <span className="item-info">
                Compagnie du P'tit Ballon - CDN de Normandie-Rouen
              </span>
            </a>
          </li>
          <li className="item">
            <a href="https://alchimiecie.com/fulgure-e-s/" target="_blank" rel="noopener noreferrer">
              2023 <span className="item-title">Fulguré.e.s</span> (Jérémie Fabre) - Amélie Chalmey
              <br />
              <span className="item-info">Compagnie Alchimie</span>
            </a>
          </li>
          <li className="item">
            <a href="https://crescite.fr/berenice/" target="_blank" rel="noopener noreferrer">
              2022 <span className="item-title">Bérénice</span> (Racine) - Angelo Jossec
              <br />
              <span className="item-info">Théâtre des Crescite</span>
            </a>
          </li>
          <li className="item">
            <a href="https://labloomsbury.wixsite.com/compagnie/as-you-like-it" target="_blank" rel="noopener noreferrer">
              2022 <span className="item-title">As You Like It</span> (Shakespeare) - Nicolas Gaspar
              <br />
              <span className="item-info">Compagnie Bloomsbury</span>
            </a>
          </li>
        </ul>
      </div>

      <div className="section">
        <h2 className="section-title">Courts-métrages</h2>
        <ul className="item-list">
          <li className="item">
            2023 <span className="item-title">À tout prix</span> - Max Laure
          </li>
          <li className="item">
            2022 <span className="item-title">La peau des anges n'est pas si douce</span> - Emma Fridé
          </li>
          <li className="item">
            2022 <span className="item-title">A la croisée des chemins</span> - Doltin Baveux
          </li>
          <li className="item">
            2019 <span className="item-title">Le rapt</span> - Cécile Dessillons et Ladane Dehdar
          </li>
        </ul>
      </div>

      <div className="section">
        <h2 className="section-title">Formation</h2>
        <ul className="item-list">
          <li className="item">
            2024 <span className="item-title">Voix en studio professionnel</span>
            <br />
            <span className="item-info">Coachs Associés</span>
          </li>
          <li className="item">
            2018 - 2021 <span className="item-title">Art dramatique</span>
            <br />
            <span className="item-info">
              Conservatoire à rayonnement régional de Rouen
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CV;