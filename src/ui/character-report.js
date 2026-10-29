import { HOME_THEMES } from './home-theme.js';

// The report uses the same page-lifetime choice as the home and calculation
// scene. No character identity or chart data is stored or sent anywhere here.
function selectedTheme() {
  const id = document.documentElement.dataset.homeTheme;
  return Object.prototype.hasOwnProperty.call(HOME_THEMES, id) ? [id, HOME_THEMES[id]] : null;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function imageFor(asset, className) {
  const image = element('img', className);
  image.src = asset.src;
  image.alt = '';
  image.width = asset.width;
  image.height = asset.height;
  image.decoding = 'async';
  return image;
}

function makePortrait(character, className, withBlink = false) {
  const portrait = element('div', className);
  portrait.setAttribute('aria-hidden', 'true');
  portrait.append(imageFor(character.assets.portrait, 'result-character-portrait'));
  const blink = character.assets.blink;
  const original = character.assets.portrait;
  if (withBlink && blink?.src && blink.width === original.width && blink.height === original.height &&
      (!blink.forPortrait || blink.forPortrait === original.src)) {
    portrait.append(imageFor(blink, 'result-character-blink'));
  }
  return portrait;
}

function animateSpeaking(character, figure) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const speech = character.assets.speaking;
  const portrait = character.assets.portrait;
  if (!speech?.src || speech.width !== portrait.width || speech.height !== portrait.height ||
      (speech.forPortrait && speech.forPortrait !== portrait.src)) return;
  let image = figure.querySelector('.result-character-speaking');
  if (!image) {
    image = imageFor(speech, 'result-character-speaking');
    figure.append(image);
  }
  const play = () => {
    if (!figure.isConnected || document.getElementById('characterResultHint')?.hidden ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    figure.classList.remove('is-speaking');
    void figure.offsetWidth; // Restart on each interaction.
    figure.classList.add('is-speaking');
  };
  if (image.complete && image.naturalWidth > 0) play();
  else image.addEventListener('load', play, { once: true });
}

function revealHint(hint) {
  requestAnimationFrame(() => {
    if (hint.hidden || !hint.isConnected) return;
    const scroll = document.getElementById('p2Scroll');
    if (!scroll) return;
    const dock = document.getElementById('tabBar');
    const scrollBottom = scroll.getBoundingClientRect().bottom;
    const dockTop = dock?.getClientRects().length ? dock.getBoundingClientRect().top : scrollBottom;
    const distance = hint.getBoundingClientRect().bottom - Math.min(scrollBottom, dockTop) + 12;
    if (distance > 0) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      scroll.scrollBy({ top: distance, behavior: reduced ? 'auto' : 'smooth' });
    }
  });
}

function makeTheatre(container) {
  if (!container) return null;
  const theatre = element('div', 'result-western-theatre sys-western');
  theatre.append(container); // Keep the existing canvas, controls and 3D state.
  return theatre;
}

// Portrait visibility is a report preference, shared across the three western
// scenes and preserved when a trait is reselected without rebuilding the canvas.
let westernPortraitHidden = false;
let portraitInteractionInstalled = false;

function syncPortraitToggle(host) {
  host.classList.toggle('is-portrait-hidden', westernPortraitHidden);
  const button = host.querySelector('.result-portrait-toggle');
  if (!button) return;
  button.textContent = westernPortraitHidden ? '显示立绘' : '收起立绘';
  button.setAttribute('aria-label', westernPortraitHidden ? '显示人物立绘' : '收起人物立绘');
  button.setAttribute('aria-expanded', String(!westernPortraitHidden));
}

function setPortraitHidden(hidden) {
  westernPortraitHidden = hidden;
  document.querySelectorAll('#page2 .result-character-hero, #page2 .result-character-chapter').forEach(syncPortraitToggle);
}

function addPortraitToggle(host, figure, section) {
  figure.id = `resultPortrait-${section}`;
  const button = element('button', 'result-portrait-toggle sys-western');
  button.type = 'button';
  button.setAttribute('aria-controls', figure.id);
  button.title = '也可以轻点人物；拖动仍可旋转场景';
  button.addEventListener('click', () => setPortraitHidden(!westernPortraitHidden));
  host.append(button);
  syncPortraitToggle(host);
}

function portraitHit(host, x, y) {
  const figure = host.querySelector('.result-character-figure, .result-chapter-figure');
  const image = figure?.querySelector('.result-character-portrait');
  if (!figure || !image || !figure.getClientRects().length) return false;
  const rect = figure.getBoundingClientRect(), frame = host.getBoundingClientRect();
  const ratio = Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
  if (!ratio) return false;
  // object-fit: contain, object-position: center top. Exclude transparent margins
  // and the clipped part of the figure rather than covering the whole canvas.
  const width = Math.min(rect.width, rect.height * ratio);
  const height = width / ratio, left = rect.left + (rect.width - width) / 2;
  return x >= Math.max(frame.left, left + width * .08) && x <= Math.min(frame.right, left + width * .92) &&
    y >= Math.max(frame.top, rect.top + height * .06) && y <= Math.min(frame.bottom, rect.top + height * .9);
}

function installPortraitInteraction() {
  if (portraitInteractionInstalled) return;
  portraitInteractionInstalled = true;
  const presses = new Map();
  const hostFor = target => target?.closest?.('.result-western-theatre .w3d-hero')
    ?.closest('.result-character-hero, .result-character-chapter');
  const canStart = event => {
    if (westernPortraitHidden || document.documentElement.dataset.systemMode !== 'western' ||
        event.target?.closest?.('button, a, input, select, textarea')) return null;
    const host = hostFor(event.target);
    return host && portraitHit(host, event.clientX, event.clientY) ? host : null;
  };
  if (window.PointerEvent) {
    // Do not intercept the actual pointer stream: an intentional drag starting
    // over the art still reaches the same 3D orbit and its pointer capture.
    document.addEventListener('pointerdown', event => {
      if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const host = canStart(event);
      if (host) presses.set(event.pointerId, { host, x: event.clientX, y: event.clientY, moved: false });
    }, true);
    document.addEventListener('pointermove', event => {
      const press = presses.get(event.pointerId);
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) press.moved = true;
    }, true);
    document.addEventListener('pointerup', event => {
      const press = presses.get(event.pointerId);
      presses.delete(event.pointerId);
      if (press && !press.moved && press.host.isConnected && !westernPortraitHidden &&
          portraitHit(press.host, event.clientX, event.clientY)) setPortraitHidden(true);
    }, true);
    document.addEventListener('pointercancel', event => presses.delete(event.pointerId), true);
  } else {
    // Older browsers without pointer events still get a simple tap/click path.
    document.addEventListener('click', event => { if (event.detail && canStart(event)) setPortraitHidden(true); }, true);
  }
}

function makeHero(id, theme, ctx, western, isDemo, onReselect, overview, astro) {
  const hero = element('section', 'result-character-hero');
  hero.id = 'characterResultHero';
  hero.dataset.reportCharacter = id;
  hero.dataset.reportDemo = String(isDemo);
  hero.style.setProperty('--result-character-accent', theme.trait.color);
  hero.setAttribute('aria-label', isDemo ? '示例命盘与星盘一览' : '命盘与星盘一览');
  const theatre = makeTheatre(astro);
  if (theatre) hero.append(theatre);

  const scene = element('div', 'result-character-scene');
  scene.setAttribute('aria-hidden', 'true');
  const picture = document.createElement('picture');
  const mobile = document.createElement('source');
  mobile.media = '(max-aspect-ratio: 4/5)';
  mobile.srcset = theme.backdrop.mobile;
  const background = element('img', 'result-character-backdrop');
  background.src = theme.backdrop.wide;
  background.alt = '';
  background.decoding = 'async';
  picture.append(mobile, background);
  const figure = makePortrait(theme.character, 'result-character-figure', true);
  scene.append(picture, figure);
  hero.append(scene);

  const copy = element('div', 'result-character-copy');
  const kicker = element('p', 'result-character-kicker');
  kicker.append(element('span', 'result-character-mark', theme.trait.mark),
    element('span', '', `${theme.trait.label} · 同行`));
  if (isDemo) kicker.append(element('span', 'result-character-demo', '示例'));
  if (typeof onReselect === 'function') {
    const change = element('button', 'result-character-reselect', '换特质 ↻');
    change.id = 'reportTraitReselect';
    change.type = 'button';
    change.setAttribute('aria-label', '重新选择特质');
    change.setAttribute('aria-haspopup', 'dialog');
    change.setAttribute('aria-controls', 'traitSelection');
    change.addEventListener('click', () => onReselect(change));
    kicker.append(change);
  }
  copy.append(kicker);

  const dayMaster = [ctx?.dg, ctx?.dw].filter(Boolean).join('');
  const westernHeading = element('div', 'result-character-reading sys-western');
  westernHeading.append(element('h1', 'result-character-title', isDemo ? '示例星盘' : '星盘一览'));
  westernHeading.append(element('p', 'result-character-description', '拖动星盘，探索星体位置。'));
  copy.append(westernHeading);

  const controls = element('div', 'result-character-controls');

  // A short, character-specific reading cue uses only facts already calculated
  // in the report. It is not an AI response or a second prediction.
  const hint = element('div', 'result-character-hint');
  hint.id = 'characterResultHint';
  hint.hidden = true;
  hint.setAttribute('role', 'status');
  hint.setAttribute('aria-live', 'polite');
  const lead = theme.reportLead || '先从这里看起。';
  const easternFacts = [dayMaster && `日主${dayMaster}`, ctx?.wx?.ys && `用神${ctx.wx.ys}`].filter(Boolean).join('、');
  const westernFacts = [western?.astro?.sun?.name && `太阳${western.astro.sun.name}`,
    western?.astro?.moon?.name && `月亮${western.astro.moon.name}`].filter(Boolean).join('、');
  const chart = isDemo ? '示例' : '这张';
  hint.append(element('p', 'sys-eastern', easternFacts
    ? `${lead}${easternFacts}是${chart}命盘的起点，可以接着看四柱和五行。`
    : `${lead}从${chart}命盘的四柱和五行开始读。`));
  hint.append(element('p', 'sys-western', westernFacts
    ? `${lead}${westernFacts}是${chart}星盘的起点，可以接着看它们的落点与相位。`
    : `${lead}从${chart}星盘的星体位置开始读。`));

  const hintButton = element('button', 'result-character-hint-button', '看一条提示');
  hintButton.type = 'button';
  hintButton.setAttribute('aria-controls', hint.id);
  hintButton.setAttribute('aria-expanded', 'false');
  hintButton.addEventListener('click', () => {
    const opening = hint.hidden;
    hint.hidden = !opening;
    hero.classList.toggle('has-hint', opening);
    hintButton.setAttribute('aria-expanded', String(opening));
    hintButton.textContent = opening ? '收起提示' : '看一条提示';
    if (opening) {
      animateSpeaking(theme.character, figure);
      revealHint(hint);
    }
  });
  controls.append(hintButton);
  copy.append(controls, hint);
  hero.append(copy);
  if (overview) {
    const eastern = element('div', 'result-character-overview sys-eastern');
    // Keep a structural heading for assistive technology without adding a
    // second visible title above the calculated values.
    eastern.append(element('h1', 'result-overview-heading', '命盘'), overview);
    hero.append(eastern);
  }
  addPortraitToggle(hero, figure, 'ming');
  return hero;
}

// Put each original quick-read card inside its companion scene. Moving the
// existing node preserves actual data, action handlers and folding state.
function makeChapter(id, theme, section, westernText, theatreContainer, overview, isDemo) {
  const aside = element('aside', 'result-character-chapter');
  aside.dataset.reportCharacter = id;
  aside.dataset.reportChapter = section;
  aside.style.setProperty('--result-character-accent', theme.trait.color);
  aside.setAttribute('aria-label', `${theme.trait.label}同行解读`);
  const theatre = makeTheatre(theatreContainer);
  if (theatre) aside.append(theatre);
  const figure = makePortrait(theme.character, 'result-chapter-figure');
  aside.append(figure);

  const copy = element('div', 'result-chapter-copy');
  copy.append(element('p', 'result-chapter-kicker', `${theme.trait.label} · 同行解读${isDemo ? ' · 示例' : ''}`));
  const reading = element('div', 'result-chapter-reading sys-western');
  reading.append(element('h2', '', westernText[0]), element('p', '', westernText[1]));
  copy.append(reading);
  aside.append(copy);
  if (overview) {
    const eastern = element('div', 'result-character-overview result-chapter-overview sys-eastern');
    eastern.append(overview);
    aside.append(eastern);
  }
  addPortraitToggle(aside, figure, section);
  return aside;
}

/** Rebuild the selected character's result surfaces after each actual calculation. */
export function mountCharacterReport({ ctx, western = {}, isDemo = false, onReselect } = {}) {
  const selected = selectedTheme();
  if (!selected || !ctx) return;
  const [id, theme] = selected;
  const ming = document.getElementById('s-ming');
  const yun = document.getElementById('s-yun');
  const rel = document.getElementById('s-rel');
  if (!ming || !yun || !rel) return;

  // Build the new character surfaces around the existing overview and 3D
  // containers. They are moved, not recreated, so fold and orbit state survive.
  const overview = ming.querySelector('.sys-eastern .qr-card');
  const luckOverview = yun.querySelector('.sys-eastern .qr-card');
  const relationOverview = rel.querySelector('.sys-eastern .qr-card');
  const astro = ming.querySelector('#w3d-astro');
  const horo = yun.querySelector('#w3d-horo');
  const num = rel.querySelector('#w3d-num');
  const originals = [overview, luckOverview, relationOverview, astro, horo, num].filter(Boolean).map(node => ({
    node, parent: node.parentNode, next: node.nextSibling,
  }));
  let hero, luckChapter, relationChapter;
  try {
    hero = makeHero(id, theme, ctx, western, isDemo, onReselect, overview, astro);
    luckChapter = makeChapter(id, theme, 'yun',
      [isDemo ? '示例星象' : '星象一览', '拖动星象，看看此刻的变化。'], horo, luckOverview, isDemo);
    relationChapter = makeChapter(id, theme, 'rel',
      [isDemo ? '示例灵数' : '灵数一览', '从主命数出发，探索数字线索。'], num, relationOverview, isDemo);
  } catch (error) {
    // A bad optional character definition must never remove calculated report
    // data or a working canvas. The previous surfaces are still connected here.
    originals.forEach(({ node, parent, next }) => {
      if (parent) parent.insertBefore(node, next?.parentNode === parent ? next : null);
    });
    throw error;
  }
  [ming, yun, rel].forEach(section => section.querySelector(':scope > .result-character-hero, :scope > .result-character-chapter')?.remove());
  ming.prepend(hero);
  yun.prepend(luckChapter);
  rel.prepend(relationChapter);
  installPortraitInteraction();
}
