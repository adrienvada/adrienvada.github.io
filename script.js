function animateSections() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    const sections = activePage.querySelectorAll(".section");
    let delay = 0;
    const sectionDelay = 300; // Définir un délai uniforme entre les sections
    const itemDelay = 100; // Délai entre chaque élément dans une section

    sections.forEach((section, sectionIndex) => {
        setTimeout(() => {
            section.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
            section.style.opacity = 1;
            section.style.transform = "translateY(0)";

            const title = section.querySelector(".section-title");
            if (title) {
                setTimeout(() => {
                    title.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
                    title.style.opacity = 1;
                    title.style.transform = "translateX(0)";
                }, 100);
            }

            const items = section.querySelectorAll(".item");
            items.forEach((item, itemIndex) => {
                setTimeout(() => {
                    item.style.transition = "opacity 0.5s ease-out, transform 0.3s ease-out";
                    item.style.opacity = 1;
                    item.style.transform = "translateY(0)";
                }, itemIndex * itemDelay);
            });
        }, sectionIndex * sectionDelay);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash, false);
    } else {
        animateSections();
    }
    document.querySelector(`.nav button[ onclick="showPage('cv')"]`).classList.add('active');
});

function resetSectionStyles() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    const sections = activePage.querySelectorAll(".section");
    sections.forEach(section => {
        section.style.opacity = 0;
        section.style.transform = "translateY(10px)";
        
        const title = section.querySelector(".section-title");
        if (title) {
            title.style.opacity = 0;
            title.style.transform = "translateX(10px)";
        }

        const items = section.querySelectorAll(".item");
        items.forEach(item => {
            item.style.opacity = 0;
            item.style.transform = "translateY(10px)";
        });
    });
}

function showPage(sectionId, animate = true) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    // Ajouter la classe active au bouton de navigation correspondant
    document.querySelectorAll('.nav button').forEach(button => {
        button.classList.remove('active');
    });

    document.querySelector(`.nav button[onclick="showPage('${sectionId}')"]`).classList.add('active');
    
    resetSectionStyles();
    if (animate) {
        animateSections();
    }

    // Appeler animateGalleryImages si la page "demos" est activée
    if (sectionId === 'demos') {
        animateGalleryImages();
    }
}

const profileImage = document.getElementById('profile-image');
const fullscreenContainer = document.getElementById('fullscreen-container');
const fullscreenImage = document.getElementById('fullscreen-image');

profileImage.addEventListener('click', () => {
    fullscreenContainer.classList.add('active');
});

fullscreenContainer.addEventListener('click', (event) => {
    if (event.target === fullscreenContainer || event.target.tagName === 'IMG') {
        fullscreenContainer.classList.remove('active');
    }
});

/*
const photoGallery = document.getElementById('photo-gallery');
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
    'photo16.png',
    // Ajoutez ici les noms de fichiers des images dans le dossier galerie
];

const galleryFullscreenContainer = document.getElementById('gallery-fullscreen-container');
const galleryFullscreenImage = document.getElementById('gallery-fullscreen-image');
let currentImageIndex = 0;



function animateGalleryImages() {
    const images = photoGallery.querySelectorAll('img');
    images.forEach((img, index) => {
        setTimeout(() => {
            img.style.transition = "opacity 0.5s ease-out, transform 0.3s ease-out";
            img.style.opacity = 1;
            img.style.transform = "translateY(0)";
        }, index * 100);
    });
}

*/

function showImage(index) {
    if (index >= 0 && index < imageFiles.length) {
        galleryFullscreenImage.src = `${imageFolder}${imageFiles[index]}`;
        galleryFullscreenContainer.classList.add('active');
        currentImageIndex = index;
    }
}

/*
imageFiles.forEach((fileName, index) => {
    const img = document.createElement('img');
    img.src = `${imageFolder}${fileName}`;
    img.alt = fileName;
    img.style.opacity = 0;
    img.style.transform = "translateY(10px)";
    img.addEventListener('click', () => {
        showImage(index);
    });
    photoGallery.appendChild(img);
});

galleryFullscreenContainer.addEventListener('click', (event) => {
    if (event.target === galleryFullscreenContainer || event.target.tagName === 'IMG') {
        galleryFullscreenContainer.classList.remove('active');
    }
});

document.addEventListener('keydown', (event) => {
    if (galleryFullscreenContainer.classList.contains('active')) {
        if (event.key === 'Escape' || event.key === 'Esc') {
            galleryFullscreenContainer.classList.remove('active');
        } else if (event.key === 'ArrowRight') {
            showImage(currentImageIndex + 1);
        } else if (event.key === 'ArrowLeft') {
            showImage(currentImageIndex - 1);
        } else {
            galleryFullscreenContainer.classList.remove('active');
        }
    }
});


document.addEventListener("DOMContentLoaded", () => {
    animateGalleryImages();
});
*/

const videoFullscreenContainer = document.getElementById


