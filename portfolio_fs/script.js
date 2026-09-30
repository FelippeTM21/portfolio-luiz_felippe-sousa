document.documentElement.classList.replace('no-js', 'js');

(() => {
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
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

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
      tl.to(card, {top: 0, duration: .8}, `skills+=${index * .8}`);
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
    skillCards.forEach((card, index) => tl.to(card, {top: 0, duration: 1}, index));
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
    antrum: {
      number: 'DOSSIER / 01',
      title: 'ANTRUM',
      text: 'Court métrage inspiré de l’analog horror et de Don’t Hug Me I’m Scared. Stop motion, image VHS et found footage se rejoignent dans un univers faussement innocent.',
      frame: 'IMAGES, BANDE-ANNONCE ET CRÉDITS À AJOUTER'
    },
    'project-02': {
      number: 'DOSSIER / 02', title: 'PROJET 02',
      text: 'Ce dossier est prêt à recevoir la description de ton deuxième projet.',
      frame: 'VISUELS ET LIENS DU PROJET À AJOUTER'
    },
    'project-03': {
      number: 'DOSSIER / 03', title: 'PROJET 03',
      text: 'Ce dossier est prêt à recevoir la description de ton troisième projet.',
      frame: 'VISUELS ET LIENS DU PROJET À AJOUTER'
    },
    contact: {
      number: 'CONTACT / FELIPPE SOUSA', title: 'CONTACT',
      text: 'Les coordonnées seront ajoutées ici avant la mise en ligne publique du portfolio.',
      frame: 'ADRESSE E-MAIL ET RÉSEAUX À AJOUTER'
    }
  };

  // dossier arrive de la gauche (FONCTIONNE PAS)
  function openDetail(key) {
    const data = details[key];
    if (!data || detailOpen) return;
    detailOpen = true;
    priorFocus = document.activeElement;
    detail.querySelector('#detail-number').textContent = data.number;
    detail.querySelector('#detail-title').textContent = data.title;
    detail.querySelector('#detail-text').textContent = data.text;
    detail.querySelector('.detail__frame').textContent = data.frame;
    detail.inert = false;
    detail.removeAttribute('aria-hidden');
    gsap.set(detail, {visibility: 'visible', xPercent: -100});
    document.documentElement.style.overflow = 'hidden';
    gsap.to(detail, {
      xPercent: 0, duration: .85, ease: 'power3.out',
      onComplete: () => detailClose.focus()
    });
  }

  function closeDetail() {
    if (!detailOpen) return;
    detailOpen = false;
    gsap.to(detail, {
      xPercent: -100, duration: .6, ease: 'power3.in',
      onComplete: () => {
        gsap.set(detail, {visibility: 'hidden'});
        detail.inert = true;
        detail.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
        priorFocus?.focus();
      }
    });
  }
  document.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => openDetail(button.dataset.open));
  });
  detailClose.addEventListener('click', closeDetail);
  document.addEventListener('keydown', event => {
    if (!detailOpen) return;
    if (event.key === 'Escape') closeDetail();
    if (event.key === 'Tab') {
      event.preventDefault();
      detailClose.focus();
    }
  });

  // Une fois les polices et les images chargées, on recalcule les distances.
  window.addEventListener('load', () => ScrollTrigger.refresh(), {once: true});
})();
