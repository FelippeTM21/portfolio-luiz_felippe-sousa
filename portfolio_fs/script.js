document.documentElement.classList.replace('no-js', 'js');

(async () => {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const intro = document.querySelector('#intro');
  const stage = document.querySelector('#stage');
  const track = document.querySelector('#track');
  const projectInner = document.querySelector('#projects-inner');
  const skillCards = [...document.querySelectorAll('.skill-card--stack')];
  const skillButtons = skillCards.map(card => card.querySelector('.skill-card__tab'));
  const detail = document.querySelector('#detail');
  const detailClose = detail.querySelector('.detail__close');
  const detailVideo = detail.querySelector('#detail-video');
  const detailYoutube = detail.querySelector('#detail-youtube');
  const detailFrame = detail.querySelector('.detail__frame');
  const detailFrameText = detail.querySelector('#detail-frame-text');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // On charge les projets pendant que l'intro se joue.
  const projetsPrets = chargerProjets();

  let timeline = null;
  let scrollTrigger = null;
  let mobileSkillTrigger = null;
  let introDone = false;
  let priorFocus = null;
  let detailOpen = false;

  // no gsap pr le css si gsap load pas.
  if (!gsap || !ScrollTrigger) {
    document.documentElement.classList.add('no-gsap');
    document.body.classList.remove('is-intro');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  // l'intro finit elle glisse par le haut + bouton pour skip 
  function introFinished() {
    if (introDone) return;
    introDone = true;
    gsap.to(intro, {
      yPercent: -100,
      duration: .82,
      ease: 'power3.inOut',
      onComplete: () => {
        intro.hidden = true;
        document.body.classList.remove('is-intro');
        ScrollTrigger.refresh();
      }
    });
  }
  document.querySelector('.intro__skip').addEventListener('click', introFinished);

  if (reduced.matches) {
    introDone = true;
    intro.hidden = true;
    document.body.classList.remove('is-intro');
  } else {
    // typewrite effect text qui s'ecrit lettre par lettre
    const lines = [...document.querySelectorAll('.terminal-line')];
    const messages = lines.map(line => line.textContent);
    const totalChars = messages.reduce((total, message) => total + message.length, 0);
    lines.forEach(line => { line.textContent = ''; });

    const loader = gsap.timeline({onComplete: introFinished});
    messages.forEach((message, index) => {
      const line = lines[index];
      const typed = {count: 0};
      loader.to(typed, {
        count: message.length,
        duration: 1.83 * message.length / totalChars,
        ease: 'none',
        onStart: () => {
          line.style.opacity = '1';
          line.classList.add('is-typing');
        },
        onUpdate: () => { line.textContent = message.slice(0, Math.floor(typed.count)); },
        onComplete: () => {
          line.textContent = message;
          line.classList.remove('is-typing');
        }
      });

      if (index < messages.length - 1) loader.to({}, {duration: .02});
    });

    // barre et pourcentage
    const percent = {value: 0};
    loader.set(['.intro__bar', '.intro__percent'], {autoAlpha: 1}, 1.93)
      .to('.intro__bar span', {width: '100%', duration: .65, ease: 'none'}, 1.93)
      .to(percent, {
        value: 100, duration: .65, ease: 'none',
        onUpdate: () => {
          document.querySelector('.intro__percent').textContent =
            String(Math.round(percent.value)).padStart(2, '0') + ' %';
        }
      }, 1.93)
      .set(['.intro__warning', '.intro__identity'], {autoAlpha: 1}, 2.61)
      .set('.intro__ready', {autoAlpha: 1}, 2.82)
      .call(() => {}, [], 3);
  }

  // contenu modifiable dans json 
  async function chargerProjets() {
    const liste = document.querySelector('#project-list');
    const modele = document.querySelector('#project-template');
    const statut = document.querySelector('#projects-status');
    const compteur = document.querySelector('.projects__count');

    try {
      const reponse = await fetch('data/projets.json', {cache: 'no-cache'});
      if (!reponse.ok) throw new Error(`Chargement des projets : HTTP ${reponse.status}`);
      const projets = await reponse.json();

      if (!Array.isArray(projets)) throw new Error('Le JSON doit contenir une liste entre [ et ].');
      const ids = new Set();
      projets.forEach((projet, index) => {
        if (!projet || typeof projet !== 'object' || Array.isArray(projet)) {
          throw new Error(`Le projet ${index + 1} doit être un objet entre { et }.`);
        }
        for (const champ of ['id', 'title', 'category', 'subtitle', 'description', 'image']) {
          if (typeof projet[champ] !== 'string') {
            throw new Error(`Le champ "${champ}" du projet ${index + 1} doit être du texte.`);
          }
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projet.id) || projet.id === 'contact' || ids.has(projet.id)) {
          throw new Error(`L'id "${projet.id}" doit être unique, sans espace, et différent de "contact".`);
        }
        if (!projet.title.trim()) throw new Error(`Le projet ${index + 1} doit avoir un titre.`);
        for (const champ of ['year', 'imageAlt', 'link', 'illustrationClass', 'frame', 'video']) {
          if (projet[champ] !== undefined && typeof projet[champ] !== 'string') {
            throw new Error(`Le champ "${champ}" du projet ${index + 1} doit être du texte.`);
          }
        }
        ids.add(projet.id);
      });

      const cartes = document.createDocumentFragment();
      projets.forEach((projet, index) => {
        // On remplit une copie du modèle, en gardant les mêmes classes CSS.
        const copie = modele.content.cloneNode(true);
        const image = copie.querySelector('.project-card__photo');
        const cadre = copie.querySelector('.project-card__image');
        const numero = String(index + 1).padStart(2, '0');
        image.src = projet.image || 'assets/images/projet_non_specifier.png';
        image.alt = projet.imageAlt || projet.title;
        cadre.classList.add(...(projet.illustrationClass || '').split(/\s+/).filter(Boolean));
        copie.querySelector('.project-card__number').textContent = `${numero} / ${projet.category}`;
        copie.querySelector('h3').textContent = projet.title;
        copie.querySelector('[data-project-subtitle]').textContent = projet.subtitle;
        copie.querySelector('[data-open]').dataset.open = projet.id;
        cartes.append(copie);
      });

      liste.replaceChildren(cartes);
      const total = String(projets.length).padStart(2, '0');
      compteur.textContent = `ARCHIVE / ${total} ${projets.length === 1 ? 'DOSSIER' : 'DOSSIERS'}`;
      statut.textContent = projets.length ? '' : 'Aucun projet pour le moment.';
      statut.hidden = projets.length > 0;
      return projets;
    } catch (erreur) {
      // Si le fichier est absent ou mal écrit, le reste du site continue de fonctionner.
      console.error('Impossible de charger data/projets.json.', erreur);
      compteur.textContent = 'ARCHIVE / DOSSIERS INDISPONIBLES';
      statut.textContent = 'Les projets sont indisponibles pour le moment.';
      statut.hidden = false;
      return [];
    } finally {
      liste.setAttribute('aria-busy', 'false');
    }
  }

  function buildDesktop() {
    const vw = () => window.innerWidth;
    const vh = () => window.innerHeight;
    const projectDistance = Math.max(0, projectInner.scrollHeight - vh() + 12);
    const projectUnits = Math.max(1.25, projectDistance / vh());

    // defilement gauche a droite sauf pour projets 
    const tl = gsap.timeline({defaults: {ease: 'none'}});
    tl.addLabel('home', 0)
      .to(track, {x: () => -vw(), duration: 1})
      .addLabel('about')
      .to(track, {x: () => -2 * vw(), duration: 1})
      .addLabel('projects')
      // reste et descends dans projets
      .to(projectInner, {
        y: () => -Math.max(0, projectInner.scrollHeight - vh() + 12),
        duration: projectUnits
      })
      .to(track, {x: () => -3 * vw(), duration: 1})
      .addLabel('skills');

    // les 4 compétences en bas qui montent au scroll
    skillCards.forEach((card, index) => {
      tl.fromTo(card, {
        top: () => card.parentElement.clientHeight -
          (skillCards.length - index) * parseFloat(getComputedStyle(skillButtons[index]).height)
      }, {top: 0, duration: .8}, `skills+=${index * .8}`);
    });

    // pin pour garder le cadre a l'ecran et scrub pour lier au scroll?
    scrollTrigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: () => '+=' + Math.round(tl.duration() * vh()),
      animation: tl,
      pin: true,
      scrub: .75,
      anticipatePin: 1,
      invalidateOnRefresh: true
    });
    timeline = tl;
  }

  function buildMobileSkills() {
    // haut en bas et effets de fiches sur competences dans mobile
    const tl = gsap.timeline({defaults: {ease: 'none'}});
    skillCards.forEach((card, index) => {
      tl.fromTo(card, {
        top: () => card.parentElement.clientHeight -
          (skillCards.length - index) * parseFloat(getComputedStyle(skillButtons[index]).height)
      }, {top: 0, duration: 1}, index);
    });
    mobileSkillTrigger = ScrollTrigger.create({
      trigger: '#skills',
      start: 'top top',
      end: () => '+=' + (skillCards.length * window.innerHeight),
      animation: tl,
      pin: true,
      scrub: .65,
      anticipatePin: 1,
      invalidateOnRefresh: true
    });
  }

  // Les cartes doivent être là avant que GSAP mesure la hauteur de Projets.
  const projets = await projetsPrets;
  await document.fonts.ready;

// defilement horizontal sur desktop et vertical sur mobile
const mm = gsap.matchMedia();

mm.add('(min-width: 761px)', () => {
  buildDesktop();

  // mobile clear les positions
  return () => {
    timeline = null;
    scrollTrigger = null;
    gsap.set([track, projectInner, ...skillCards], { clearProps: 'all' });
  };
});

// petit ecran = mobile
mm.add('(max-width: 760px)', () => {
  buildMobileSkills();

  // desktop clear positions mobile
  return () => {
    mobileSkillTrigger = null;
    gsap.set(skillCards, { clearProps: 'all' });
  };
});

  // les boutons vont au bon endroit "moment"
  function goTo(name) {
    if (scrollTrigger && timeline?.labels[name] !== undefined) {
      const progress = timeline.labels[name] / timeline.duration();
      window.scrollTo({
        top: scrollTrigger.start + progress * (scrollTrigger.end - scrollTrigger.start) + 2,
        behavior: reduced.matches ? 'instant' : 'smooth'
      });
    } else {
      document.getElementById(name)?.scrollIntoView({
        behavior: reduced.matches ? 'instant' : 'smooth',
        block: 'start'
      });
    }
  }
  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => goTo(button.dataset.go));
  });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    if (!introDone) introFinished();
    goTo('about');
  });

  // cliquer une competence defile jusqu'a que sa fiche ouvre completement
  skillButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const trigger = scrollTrigger || mobileSkillTrigger;
      if (!trigger) return;
      const targetTime = scrollTrigger
        ? timeline.labels.skills + (index + 1) * .8
        : index + 1;
      window.scrollTo({
        top: trigger.start + targetTime / trigger.animation.duration()
          * (trigger.end - trigger.start) + 2,
        behavior: 'smooth'
      });
    });
  });

  // texte des dossiers ouverts
  const details = {
    contact: {
      number: 'CONTACT / FELIPPE SOUSA', title: 'CONTACT',
      text: 'Voici mes coordonnées, n\'hésitez pas à me contacter!',
      frame: 'felippetm21@gmail.com'
    }
  };

  // la carte et son popup utilisent les infos du même projet dans le JSON
  projets.forEach((projet, index) => {
    details[projet.id] = {
      number: 'DOSSIER / ' + String(index + 1).padStart(2, '0'),
      title: projet.title,
      text: projet.description,
      frame: projet.frame || 'VISUELS ET LIENS DU PROJET À AJOUTER',
      category: projet.category,
      year: projet.year || '',
      link: projet.link || '',
      video: projet.video || '',
      image: projet.image
    };
  });

  // Un lien vide reste caché. On accepte les liens web et les chemins vers tes fichiers.
  function lienProjet(valeur) {
    if (!valeur || !valeur.trim() || valeur.trim() === '#') return '';
    try {
      const url = new URL(valeur.trim(), document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  // On transforme le lien YouTube normal en lien pour le lecteur intégré.
  function lienYoutube(valeur) {
    if (!valeur) return '';
    try {
      const url = new URL(valeur);
      const domaine = url.hostname.replace(/^www\./, '');
      const morceaux = url.pathname.split('/').filter(Boolean);
      let id = '';

      if (domaine === 'youtu.be') {
        id = morceaux[0];
      } else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(domaine)) {
        if (morceaux[0] === 'watch') id = url.searchParams.get('v');
        else if (['embed', 'shorts', 'live'].includes(morceaux[0])) id = morceaux[1];
      }

      if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) return '';
      return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
    } catch {
      return '';
    }
  }

  // dossier arrive de la gauche 
  function openDetail(key) {
    const data = details[key];
    if (!data || detailOpen) return;
    detailOpen = true;
    priorFocus = document.activeElement;
    detail.querySelector('#detail-number').textContent = data.number;
    detail.querySelector('#detail-title').textContent = data.title;
    detail.querySelector('#detail-text').textContent = data.text;
    detailFrameText.textContent = data.frame;

    // lecteur video du projet dans json qui prend la place du cadre
    const video = lienProjet(data.video);
    const lien = lienProjet(data.link);
    const youtubeDansLien = lienYoutube(lien);
    // Si "video" est vide, un lien YouTube dans "link" peut aussi servir de lecteur.
    const youtube = lienYoutube(video) || (!video ? youtubeDansLien : '');
    const aUneVideo = Boolean(video || youtube);
    detailVideo.hidden = !video || Boolean(youtube);
    detailYoutube.hidden = !youtube;
    detailFrameText.hidden = aUneVideo;
    detailFrame.classList.toggle('detail__frame--video', aUneVideo);
    detailVideo.removeAttribute('poster');
    if (youtube) {
      detailYoutube.title = 'Vidéo du projet ' + data.title;
      detailYoutube.src = youtube;
    } else if (video) {
      detailVideo.src = video;
      detailVideo.setAttribute('aria-label', 'Vidéo du projet ' + data.title);
      const affiche = lienProjet(data.image);
      if (affiche) detailVideo.poster = affiche;
      // fichier chargé a l'ouverture du dossier
      detailVideo.load();
    }

    const meta = detail.querySelector('#detail-meta');
    meta.textContent = [data.category, data.year].filter(Boolean).join(' / ');
    meta.hidden = !data.year;
    // Le lien YouTube est déjà dans le lecteur, pas besoin d'un deuxième bouton.
    const lienExterne = youtube && youtubeDansLien ? '' : lien;
    const boutonLien = detail.querySelector('#detail-link');
    detail.querySelector('#detail-link-block').hidden = !lienExterne;
    if (lienExterne) boutonLien.href = lienExterne;
    else boutonLien.removeAttribute('href');
    detail.scrollTop = 0;
    detail.inert = false;
    detail.removeAttribute('aria-hidden');
    gsap.set(detail, {visibility: 'visible', x: 0, xPercent: -100});
    document.documentElement.style.overflow = 'hidden';
    gsap.to(detail, {
      xPercent: 0, duration: .85, ease: 'power3.out',
      onComplete: () => detailClose.focus()
    });
  }

  function closeDetail() {
    if (!detailOpen) return;
    detailOpen = false;
    // coupe le son de la video a la fermeture du popup
    detailVideo.pause();
    detailYoutube.removeAttribute('src');
    gsap.to(detail, {
      xPercent: -100, duration: .6, ease: 'power3.in',
      onComplete: () => {
        gsap.set(detail, {visibility: 'hidden'});
        detail.inert = true;
        detail.setAttribute('aria-hidden', 'true');
        detailVideo.removeAttribute('src');
        detailVideo.removeAttribute('poster');
        detailVideo.load();
        document.documentElement.style.overflow = '';
        priorFocus?.focus();
      }
    });
  }
  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => openDetail(button.dataset.open));
  });
  detailClose.addEventListener('click', closeDetail);
  detailVideo.addEventListener('error', () => {
    if (!detailOpen || detailVideo.hidden || !detailVideo.hasAttribute('src')) return;
    detailVideo.hidden = true;
    detailFrame.classList.remove('detail__frame--video');
    detailFrameText.hidden = false;
    detailFrameText.textContent = 'La vidéo est indisponible pour le moment.';
  });
  // config clavier
  detail.querySelector('.detail__bottom').addEventListener('focus', () => detailClose.focus());
  document.addEventListener('keydown', event => {
    if (!detailOpen) return;
    if (event.key === 'Escape' && !document.fullscreenElement) closeDetail();
    if (event.key === 'Tab') {
      const boutons = [...detail.querySelectorAll('button:not([disabled]), a[href], video[controls], iframe')]
        .filter(element => element.getClientRects().length > 0);
      const premier = boutons[0];
      const dernier = boutons[boutons.length - 1];
      if (event.shiftKey && document.activeElement === premier) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && document.activeElement === dernier && dernier !== detailVideo && dernier !== detailYoutube) {
        event.preventDefault();
        premier.focus();
      }
    }
  });

  window.addEventListener('load', () => ScrollTrigger.refresh(), {once: true});
  ScrollTrigger.refresh();
})();
