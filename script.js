document.addEventListener("DOMContentLoaded", () => {
    console.log("window.location.hash:", window.location.hash);
    setTimeout(() => {
        const hash = window.location.hash.substring(1); // Récupère le hash sans le #
        console.log("hash récupéré:", hash);
        if (hash) {
            showPage(hash, true); // Changé à true pour animer
        } else {
            // Affiche par défaut la page CV avec animation
            showPage('page_cv', true);
        }
        // Force l'animation des sections après un court délai
        setTimeout(animateSections, 100);
    }, 50); // délai de 50ms

    // Écoute du changement de hash
    window.addEventListener("hashchange", () => {
        const newHash = window.location.hash.substring(1);
        showPage(newHash, true);
    });
});

function resetSectionStyles() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;

    const sections = activePage.querySelectorAll(".section");
    sections.forEach((section, index) => {
        // Si c'est la première section, on ne change pas l'opacité initiale
        if (index !== 0) {
            section.style.opacity = 0;
            section.style.transform = "translateY(10px)";
        }

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
    // Cache toutes les pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Affiche la page correspondant à l'ID
    const targetPage = document.getElementById(sectionId);
    if (targetPage) {
        targetPage.classList.add('active');

        // Scrolle vers le haut de la page en douceur
        window.scrollTo({
            top: 0,
            behavior: 'auto'
        });

        // Force l'affichage immédiat si pas d'animation
        if (!animate) {
            targetPage.querySelectorAll('.section').forEach(section => {
                section.style.opacity = 1;
                section.style.transform = 'translateY(0)';
                
                const title = section.querySelector(".section-title");
                if (title) {
                    title.style.opacity = 1;
                    title.style.transform = "translateX(0)";
                }

                const items = section.querySelectorAll(".item");
                items.forEach(item => {
                    item.style.opacity = 1;
                    item.style.transform = "translateY(0)";
                });
            });
        }
    }

    // Ajouter la classe active au bouton de navigation correspondant
    document.querySelectorAll('.nav button').forEach(button => {
        button.classList.remove('active');
    });

    const targetButton = document.querySelector(`.nav button[onclick="showPage('${sectionId}')"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Ajoute la classe active au bouton "Bandes démos" si on est sur une page de démos
    const showAllDemosButton = document.getElementById('show-all-demos');
    if (sectionId.includes('demos_')) {
        showAllDemosButton.classList.add('active');
    } else {
        showAllDemosButton.classList.remove('active');
    }

    if (animate) {
        resetSectionStyles();
        setTimeout(animateSections, 100);
    }


    // Ajuster le défilement pour éviter que la tête de lecture ne se déplace en dessous du header
    setTimeout(() => {
        const headerHeight = document.querySelector('.header').offsetHeight;
    }, 100);
}

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

const images = [
    'ressources/images/profil_1000x1000.jpg',
    'ressources/images/galerie/photo4.png',
    'ressources/images/galerie/photo14.png',
    'ressources/images/galerie/photo16.png',
    'ressources/images/galerie/photo11.png'
];
let currentImageIndex = 0;

const profileImage = document.getElementById('profile-image');
const fullscreenContainer = document.getElementById('fullscreen-container');
const fullscreenImage = document.getElementById('fullscreen-image');

profileImage.addEventListener('click', () => {
    fullscreenContainer.classList.add('active');
    fullscreenImage.src = images[currentImageIndex];
});

fullscreenContainer.addEventListener('click', (event) => {
    if (event.target === fullscreenContainer || event.target.tagName === 'IMG') {
        fullscreenContainer.classList.remove('active');
    }
});

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    fullscreenImage.src = images[currentImageIndex];
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % images.length;
    fullscreenImage.src = images[currentImageIndex];
}

document.addEventListener('keydown', (event) => {
    if (fullscreenContainer.classList.contains('active')) {
        if (event.key === 'ArrowLeft') {
            prevImage();
        } else if (event.key === 'ArrowRight') {
            nextImage();
        } else {
            fullscreenContainer.classList.remove('active');
        }
    }
});

