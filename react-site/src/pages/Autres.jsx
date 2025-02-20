import React from 'react';

function Autres() {
  return (
    <div id="autres" className="page">
      <div className="section">
        <h2 className="section-title">Liens</h2>
        <ul
          className="item-list"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <li className="item">
            <a
              href="https://linktr.ee/adrien.vada.djerbetian"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <i className="fas fa-tree"></i>
            </a>
          </li>
          <li className="item">
            <a
              href="https://www.instagram.com/adrien.vada.djerbetian"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <i className="fab fa-instagram"></i>
            </a>
          </li>
          <li className="item">
            <a
              href="https://www.facebook.com/AdrienVada/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <i className="fab fa-facebook"></i>
            </a>
          </li>
        </ul>
      </div>

      <div className="section">
        <h2 className="section-title">Compositions</h2>
        <ul className="item-list">
          <li className="item">
            <a
              href="https://ffm.to/adrienvada-armatures"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ flexGrow: 1 }}>
                <span className="item-title">Armatures</span> (2023 - 2024)
                <br />
                <span className="item-info">
                  Avec "Armatures", j'ai cherché à créer un équilibre entre qualité introspective et
                  rythmes fédérateurs. Le piano y occupe une place centrale, tandis que les sons
                  électroniques apportent des ambiances contrastées, allant de la mélancolie à l'énergie
                  dansante. Plus structuré que mon premier album, cet opus explore un dialogue entre
                  acoustique et synthétique, comme un Détour à travers une Plaine de Ressentis enfuis. Un
                  Aller simple initiatique, tantôt Nomade, tantôt Perdus en mer, fortifiant une
                  intériorité faites de multiples Armatures, jusqu'à l'ivresse d'un Envol final...
                </span>
              </div>
              <img
                src="ressources/images/armatures.jpg"
                alt="Pochette album"
                style={{ marginLeft: '20px' }}
              />
            </a>
          </li>

          <li className="item" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <a
              href="https://ffm.to/adrienvada-premierspas"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'flex-start', textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ flexGrow: 1 }}>
                <span className="item-title">Premiers pas</span> (2022 - 2023)
                <br />
                <span className="item-info">
                  Avec "Premiers pas", j’ai compilé ce que j'ai découvert avec les possibilités de la
                  musique assistée par ordinateur, en composant mes premiers morceaux sur FL Studio.
                  Chaque piste est comme une salle différente d’un musée imaginaire, une plongée dans
                  des ambiances variées. Ce projet, à la fois brut et spontané, marque mes premières
                  expérimentations : des boucles hypnotiques, des atmosphères feutrées et un piano
                  quasiment omniprésent. Ici, la danse s’efface au profit de la contemplation, invitant
                  l’auditeur à un voyage introspectif, où chaque sonorité dessine un paysage en mouvement.
                </span>
              </div>
              <img
                src="ressources/images/premierspas.jpg"
                alt="Prochette album"
                style={{ marginLeft: '20px' }}
              />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Autres;