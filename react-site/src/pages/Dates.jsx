import React from 'react';

function Dates() {
  return (
    <div id="dates" className="page">
      <div className="section">    
        <h2>A venir</h2>
        <div className="item">
          <span className="item-title">11 mars 2025 : À la barre</span>, Hôtel de Ville de Rouen
          <br />
          <span className="item-info"> 19h</span>
        </div>
      </div>
      <div className="section">
        <h2>Passées</h2>
        <div className="item">
          8 février 2025 : À la barre, Hôtel de Ville de Canteleu
        </div>
        <div className="item">
          17 janvier 2025 : Audiences - spectacle de prévention, Centre André Malraux, Rouen{" "}
          <span style={{ fontStyle: "italic" }}>(première)</span>
        </div>
        <div className="item">
          12 décembre 2024 : Bérénice, lycée Raymond Queneau, Yvetot
        </div>
        <div className="item">
          6 décembre 2024 : Bérénice, Lycée Jean-Baptiste de la Salle, Rouen
        </div>
        <div className="item">
          29 novembre 2024 : Rodogune, Athanor, Guérande
        </div>
        <div className="item">
          26 novembre 2024 : Rodogune, Théâtre Le Rayon Vert, Saint-Valéry-en-Caux
        </div>
        <div className="item">
          25 novembre 2024 : À la barre, Lycée les Buyères, Sotteville-lès-Rouen
        </div>
        <div className="item">
          22 novembre 2024 : À la barre, Hotel de ville de Notre-Dame de Bondeville
        </div>
        <div className="item">
          21 novembre 2024 : Bérénice, Lycée Vallée du Cailly, Déville-lès-Rouen
        </div>
        <div className="item">
          18 novembre 2024 : Audiences - spectacle de prévention, Collège Boieldieu, Rouen{" "}
          <span style={{ fontStyle: "italic" }}>(forme participative)</span>
        </div>
        <div className="item">
          2 novembre 2024 : Bérénice, La Rotonde, Fauville-en-Caux
        </div>
        <div className="item">
          10-11 octobre 2024 : Rodogune, Théâtre L'étincelle, Rouen{" "}
          <span style={{ fontStyle: "italic" }}>(premières)</span>
        </div>
      </div>
    </div>
  );
}

export default Dates;