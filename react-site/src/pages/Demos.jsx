import React from 'react';

function Demos({ imageFolder, imageFiles, onImageClick, onVideoClick }) {
  return (
    <div id="demos" className="page">
      <div className="section">
        <ul className="item-list">
          <li
            className="item"
            style={{ display: 'flex', alignItems: 'center', textAlign: 'center' }}
          >
            <a
              href="https://www.youtube.com/watch?v=0igK7gPQMIY"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                textDecoration: 'none',
                color: 'inherit'
              }}
              onClick={(e) => {
                e.preventDefault();
                onVideoClick('https://www.youtube.com/watch?v=0igK7gPQMIY');
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <span className="item-title">Bande démo caméra </span>
                <i className="fab fa-youtube"></i>
              </div>
            </a>
          </li>
          <li className="item">
            <a
              href="https://youtu.be/wADBqbwD0a4"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                textDecoration: 'none',
                color: 'inherit'
              }}
              onClick={(e) => {
                e.preventDefault();
                onVideoClick('https://youtu.be/wADBqbwD0a4');
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <span className="item-title">Bande démo voix </span>
                <i className="fa-solid fa-microphone"></i>
              </div>
            </a>
          </li>
        </ul>
      </div>

      <div className="section" id="galerie_photos">
        <h2>Photos</h2>
        <div className="gallery" id="photo-gallery">
          {imageFiles &&
            imageFiles.map((fileName, index) => (
              <img
                key={index}
                src={`${imageFolder}${fileName}`}
                alt={fileName}
                onClick={() => onImageClick(index)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default Demos;