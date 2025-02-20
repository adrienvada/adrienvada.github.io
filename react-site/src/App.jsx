import React, { useEffect, useState, useRef } from 'react';
import Header from './Components/Header';
import Navigation from './components/Navigation';
import CV from './pages/CV';
import Dates from './pages/Dates';
import Demos from './pages/Demos';
import Autres from './pages/Autres';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState('cv');
  const [galleryFullscreenImage, setGalleryFullscreenImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [videoFullscreen, setVideoFullscreen] = useState(null);

  const fullscreenContainerRef = useRef(null);
  const galleryFullscreenContainerRef = useRef(null);
  const videoFullscreenContainerRef = useRef(null);
  const videoFullscreenIframeRef = useRef(null);
  const profileImageRef = useRef(null);

  const imageFolder = 'ressources/images/galerie/';
  const imageFiles = [
    'photo1.png',
    'photo2.png',
    'photo3.png',
    'photo4.png',
    'photo5.png',
    'photo6.png',
    'photo7.png',
    'photo8.png',
    'photo9.png',
    'photo10.png',
    'photo11.png',
    'photo12.png',
    'photo13.png',
    'photo14.png',
    'photo15.png',
    'photo16.png'
  ];

  // Gestion d'animation d'apparition des sections
  useEffect(() => {
    const sections = document.querySelectorAll('.section');
    const sectionDelay = 300;
    const itemDelay = 100;
    sections.forEach((section, sectionIndex) => {
      setTimeout(() => {
        section.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        section.style.opacity = 1;
        section.style.transform = 'translateY(0)';

        const title = section.querySelector('.section-title');
        if (title) {
          setTimeout(() => {
            title.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            title.style.opacity = 1;
            title.style.transform = 'translateX(0)';
          }, 100);
        }

        const items = section.querySelectorAll('.item');
        items.forEach((item, itemIndex) => {
          setTimeout(() => {
            item.style.transition = 'opacity 1s ease-out, transform 0.3s ease-out';
            item.style.opacity = 1;
            item.style.transform = 'translateY(0)';
          }, itemIndex * itemDelay);
        });
      }, sectionIndex * sectionDelay);
    });
  }, []);

  // Gestion des événements clavier pour la galerie et vidéo fullscreen
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (galleryFullscreenImage) {
        if (event.key === 'Escape' || event.key === 'Esc') {
          setGalleryFullscreenImage(null);
          galleryFullscreenContainerRef.current.classList.remove('active');
        } else if (event.key === 'ArrowRight') {
          showImage(currentImageIndex + 1);
        } else if (event.key === 'ArrowLeft') {
          showImage(currentImageIndex - 1);
        }
      }
      if (videoFullscreen) {
        if (event.key === 'Escape' || event.key === 'Esc') {
          setVideoFullscreen(null);
          if (videoFullscreenIframeRef.current) {
            videoFullscreenIframeRef.current.src = '';
          }
          videoFullscreenContainerRef.current.classList.remove('active');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [galleryFullscreenImage, currentImageIndex, videoFullscreen]);

  const showImage = (index) => {
    if (index >= 0 && index < imageFiles.length) {
      setGalleryFullscreenImage(`${imageFolder}${imageFiles[index]}`);
      setCurrentImageIndex(index);
      galleryFullscreenContainerRef.current.classList.add('active');
    }
  };

  // Gestion du click sur l'image de profil pour passer en fullscreen
  const handleProfileImageClick = () => {
    fullscreenContainerRef.current.classList.add('active');
  };

  // Gestion de la fermeture du fullscreen
  const handleFullscreenContainerClick = (e) => {
    if (e.target === fullscreenContainerRef.current || e.target.tagName === 'IMG') {
      fullscreenContainerRef.current.classList.remove('active');
    }
  };

  const handleGalleryContainerClick = (e) => {
    if (e.target === galleryFullscreenContainerRef.current || e.target.tagName === 'IMG') {
      galleryFullscreenContainerRef.current.classList.remove('active');
      setGalleryFullscreenImage(null);
    }
  };

  // Gestion des vidéos en fullscreen
  const handleVideoClick = (videoUrl) => {
    setVideoFullscreen(videoUrl);
    if (videoFullscreenIframeRef.current) {
      videoFullscreenIframeRef.current.src = videoUrl.replace("watch?v=", "embed/");
    }
    videoFullscreenContainerRef.current.classList.add('active');
  };

  const handleVideoContainerClick = (e) => {
    if (e.target === videoFullscreenContainerRef.current) {
      videoFullscreenContainerRef.current.classList.remove('active');
      setVideoFullscreen(null);
      if (videoFullscreenIframeRef.current) {
        videoFullscreenIframeRef.current.src = '';
      }
    }
  };

  // Affichage de la page selon la navigation
  const showPage = (pageId) => {
    setActivePage(pageId);
  };

  return (
    <>
      <Header 
        profileImageRef={profileImageRef} 
        onProfileClick={handleProfileImageClick} 
      />
      <Navigation showPage={showPage} />
      <div className="content">
        <div className="pages">
          {activePage === 'cv' && <CV />}
          {activePage === 'dates' && <Dates />}
          {activePage === 'demos' && (
            <Demos 
              imageFolder={imageFolder} 
              imageFiles={imageFiles}
              onImageClick={showImage}
              onVideoClick={handleVideoClick}
            />
          )}
          {activePage === 'autres' && <Autres />}
        </div>
      </div>
      {/* Conteneurs externes gérés via refs */}
      <div 
        id="fullscreen-container" 
        className="fullscreen-image" 
        ref={fullscreenContainerRef} 
        onClick={handleFullscreenContainerClick}
      >
        <img 
          src="ressources/images/profil_1000x1000.jpg" 
          alt="Adrien Vada Photo Profil" 
        />
      </div>

      <div 
        id="gallery-fullscreen-container" 
        className="fullscreen-image" 
        ref={galleryFullscreenContainerRef} 
        onClick={handleGalleryContainerClick}
      >
        <img 
          src={galleryFullscreenImage || ''} 
          alt="Image en plein écran" 
          id="gallery-fullscreen-image"
        />
      </div>

      <div 
        id="video-fullscreen-container" 
        className="fullscreen-video" 
        ref={videoFullscreenContainerRef} 
        onClick={handleVideoContainerClick}
      >
        <iframe
          id="video-fullscreen-iframe"
          ref={videoFullscreenIframeRef}
          width="560"
          height="315"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Vidéo fullscreen"
        />
      </div>
    </>
  );
}

export default App;
