import { HOME_THEMES } from './home-theme.js';

// The report uses the same page-lifetime choice as the home and calculation
// scene. No character identity or chart data is stored or sent anywhere here.
function selectedTheme() {
  const id = document.documentElement.dataset.homeTheme;
  return Object.hasOwn(HOME_THEMES, id) ? [id, HOME_THEMES[id]] : null;
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
    // The visible title remains the existing fold button; expose a proper
    // report heading as well, without nesting a heading inside that button.
    eastern.append(element('h1', 'result-overview-heading', '命盘一览'), overview);
    hero.append(eastern);
  }
  return hero;
}

function pillar(value) {
  return value?.g && value?.z ? `${value.g}${value.z}` : '';
}

// Put the selected character next to the report's existing calculated summary,
// not a second invented prediction. The original text and actions stay intact.
function accompanySummary(section, id, theme, isDemo) {
  const summary = section.querySelector('.sys-eastern .qr-summary');
  if (!summary) return;
  const existing = summary.parentElement?.closest('.result-character-insight');
  if (existing) {
    existing.dataset.reportCharacter = id;
    existing.style.setProperty('--result-character-accent', theme.trait.color);
    existing.querySelector('.result-insight-figure')?.replaceWith(makePortrait(theme.character, 'result-insight-figure'));
    const label = existing.querySelector('.result-insight-label');
    if (label) label.textContent = `${theme.trait.label} · ${isDemo ? '示例解读' : '解读'}`;
    return;
  }
  const insight = element('div', 'result-character-insight');
  insight.dataset.reportCharacter = id;
  insight.style.setProperty('--result-character-accent', theme.trait.color);
  const figure = makePortrait(theme.character, 'result-insight-figure');
  const body = element('div', 'result-insight-body');
  body.append(element('p', 'result-insight-label', `${theme.trait.label} · ${isDemo ? '示例解读' : '解读'}`));
  summary.parentNode.insertBefore(insight, summary);
  body.append(summary);
  insight.append(figure, body);
}

function makeChapter(id, theme, section, easternText, westernText, theatreContainer) {
  const aside = element('aside', 'result-character-chapter');
  aside.dataset.reportCharacter = id;
  aside.dataset.reportChapter = section;
  aside.style.setProperty('--result-character-accent', theme.trait.color);
  aside.setAttribute('aria-label', `${theme.trait.label}同行解读`);
  const theatre = makeTheatre(theatreContainer);
  if (theatre) aside.append(theatre);
  aside.append(makePortrait(theme.character, 'result-chapter-figure'));

  const copy = element('div', 'result-chapter-copy');
  copy.append(element('p', 'result-chapter-kicker', `${theme.trait.label} · 同行解读`));
  for (const [mode, title, detail] of [['eastern', ...easternText], ['western', ...westernText]]) {
    const reading = element('div', `result-chapter-reading sys-${mode}`);
    reading.append(element('h2', '', title), element('p', '', detail));
    copy.append(reading);
  }
  aside.append(copy);
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
  const astro = ming.querySelector('#w3d-astro');
  const horo = yun.querySelector('#w3d-horo');
  const num = rel.querySelector('#w3d-num');
  const originals = [overview, astro, horo, num].filter(Boolean).map(node => ({
    node, parent: node.parentNode, next: node.nextSibling,
  }));
  const luck = [pillar(ctx.cDy) && `${pillar(ctx.cDy)}大运`, pillar(ctx.cLn) && `${pillar(ctx.cLn)}流年`].filter(Boolean).join(' · ');
  const dayPillar = pillar(ctx.b?.D);
  let hero, luckChapter, relationChapter;
  try {
    hero = makeHero(id, theme, ctx, western, isDemo, onReselect, overview, astro);
    luckChapter = makeChapter(id, theme, 'yun',
      ['从时间里看节奏', luck ? `以${isDemo ? '示例的' : ''}${luck}为线索，看看当下的变化。` : '从大运与流年出发，看看当下的变化。'],
      [isDemo ? '示例星象' : '星象一览', '拖动星象，看看此刻的变化。'], horo);
    relationChapter = makeChapter(id, theme, 'rel',
      [isDemo ? '看看示例中的关系' : '看见关系里的你', dayPillar ? `以${isDemo ? '示例的' : ''}日柱${dayPillar}为线索，看看关系中的互动。` : '从命盘出发，看看关系中的互动。'],
      [isDemo ? '示例灵数' : '灵数一览', '从主命数出发，探索数字线索。'], num);
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
  [yun, rel].forEach(section => accompanySummary(section, id, theme, isDemo));
}
