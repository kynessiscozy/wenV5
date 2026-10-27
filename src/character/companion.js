import { WENWEN, createCharacterAvatar } from './wenwen.js';

/** A small, reusable choice-based conversation; hosts provide their own navigation actions. */
export function mountCharacterCompanion(host, {
  character = WENWEN,
  hasReport = () => false,
  actionButton = null,
  showGreeting = true,
  onDefault = () => {},
  onStart = () => {},
  onResume = () => {},
  onSelectionChange = () => {},
} = {}) {
  if (!host) return null;
  let selected = null;
  const response = document.createElement('p');
  response.className = 'character-companion-response';
  response.setAttribute('role', 'status');
  response.setAttribute('aria-live', 'polite');
  response.setAttribute('aria-atomic', 'true');

  const options = document.createElement('div');
  options.className = 'character-companion-options';
  options.setAttribute('role', 'group');
  options.setAttribute('aria-label', `选择和${character.name}聊的话题`);
  const buttons = character.topics.map(topic => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-companion-option';
    button.dataset.topic = topic.id;
    button.textContent = topic.label;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      selected = topic;
      render();
      onSelectionChange(topic);
    });
    options.appendChild(button);
    return button;
  });

  const next = actionButton || document.createElement('button');
  next.type = 'button';
  if (!actionButton) next.className = 'character-companion-next';
  const handleAction = () => {
    if (!selected) onDefault();
    else if (hasReport()) onResume(selected);
    else onStart(selected);
  };
  next.addEventListener('click', handleAction);
  host.replaceChildren(response, options);
  if (!actionButton) host.appendChild(next);

  function render() {
    response.textContent = selected ? selected.response : (showGreeting ? character.greeting : '');
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === selected?.id)));
    if (!actionButton) next.hidden = !selected;
    next.textContent = !selected ? '开启探索' : hasReport() ? '继续聊聊' : '填写信息';
  }
  render();

  return {
    refresh: render,
    getTopic: () => selected,
    clearSelection() {
      if (!selected) return;
      selected = null;
      render();
      onSelectionChange(null);
    },
    destroy() {
      next.removeEventListener('click', handleAction);
      host.replaceChildren();
    },
    focus() {
      const target = buttons.find(button => button.dataset.topic === selected?.id) || buttons[0];
      if (!target) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
      target.focus({ preventScroll: true });
    },
  };
}

/** Reusable avatar + message + optional actions, for forms, reports, or future surfaces. */
export function mountCharacterPrompt(host, {
  character = WENWEN,
  message = '',
  actionLabel = '',
  onAction = () => {},
  dismissLabel = '',
  onDismiss = () => {},
  variant = '',
} = {}) {
  if (!host) return null;
  const root = document.createElement('div');
  root.className = `character-prompt${variant ? ` character-prompt--${variant}` : ''}`;
  const avatar = document.createElement('span');
  avatar.className = 'character-prompt-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.appendChild(createCharacterAvatar(character));
  const text = document.createElement('p');
  text.className = 'character-prompt-text';
  text.textContent = message;
  root.append(avatar, text);
  if (actionLabel) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'character-prompt-action';
    action.textContent = actionLabel;
    action.addEventListener('click', onAction);
    root.appendChild(action);
  }
  if (dismissLabel) {
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'character-prompt-dismiss';
    dismiss.setAttribute('aria-label', dismissLabel);
    dismiss.textContent = '×';
    dismiss.addEventListener('click', onDismiss);
    root.appendChild(dismiss);
  }
  host.replaceChildren(root);
  return root;
}
