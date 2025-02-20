import React from 'react';

function Header({ profileImageRef, onProfileClick }) {
  return (
    <div className="header">
      <div className="header-info">
        <h1>Adrien VADA</h1>
        <h2 className="job">Artiste interprète</h2>
        <p>
          <a href="mailto:adrien.vada@gmail.com">adrien.vada@gmail.com</a>
        </p>
      </div>
      <img 
        src="ressources/images/profil_1000x1000.jpg" 
        alt="Adrien Vada Photo Profil" 
        id="profile-image"
        ref={profileImageRef}
        onClick={onProfileClick}
      />
    </div>
  );
}

export default Header;