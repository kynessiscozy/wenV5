import { CURR_YEAR, SS } from '../engines/shared.js';
import { CD } from '../engines/cities.js';
import { mkBazi, mkDy, mkLn, mkSs, mkWx } from '../engines/bazi.js';
import { getResultStyle } from '../state/result-style.js';
import { calcYearScores } from '../state/scoring.js';
import { getCtx } from '../state/context.js';
import { TJ } from '../state/tj.js';
import { showToast } from '../ui/toast.js';

const DB_NAME = 'TJ_Bazi';
const DB_VERSION = 2;
const UNKNOWN_CITY = { n: '未知' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function validProfile(raw) {
  return raw && typeof raw === 'object'
    && typeof raw.bd === 'string' && raw.bd.trim()
    && typeof raw.bp === 'string' && raw.bp.trim()
    && typeof raw.gen === 'string' && raw.gen.trim();
}

function normalizeProfile(raw, now = Date.now()) {
  if (!validProfile(raw)) return null;

  const profile = {
    bd: String(raw.bd).trim(),
    timeStr: String(raw.timeStr || '09:00').trim(),
    bp: String(raw.bp).trim(),
    gen: raw.gen === 'female' ? 'female' : 'male',
    q: String(raw.q || '').trim(),
    useTrueSolar: Boolean(raw.useTrueSolar),
    resultStyle: String(raw.resultStyle || 'companion').trim(),
    name: String(raw.name || '未命名').trim().slice(0, 40),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : now,
    updatedAt: now
  };

  return profile;
}

function birthParts(profile) {
  const [year = 1990, month = 1, day = 1] = String(profile.bd || '1990-01-01')
    .split('-')
    .map(Number);

  return {
    year: Number.isFinite(year) ? year : 1990,
    month: Number.isFinite(month) ? month : 1,
    day: Number.isFinite(day) ? day : 1
  };
}

function profileCard(profile) {
  const city = CD[profile.bp] || UNKNOWN_CITY;
  const { year, month, day } = birthParts(profile);
  const hour = Number(String(profile.timeStr || '').split(':')[0]);
  const safeHour = Number.isFinite(hour) ? hour : 12;
  const hourBranch = Math.floor(((safeHour + 1) % 24) / 2);
  const chart = mkBazi(year, month, day, hourBranch, safeHour);
  const dayMaster = chart.D.g;
  const decadalLuck = mkDy(chart, profile.gen, year, month, day);
  const age = TJ.calcAge(year, month, day);
  const currentLuck = TJ.findDaYun(decadalLuck, age) || decadalLuck.ds[0];
  const annualLuck = mkLn(CURR_YEAR);
  let stars = '★★★☆☆';

  try {
    const fiveElements = mkWx(chart);
    const tenGods = mkSs(chart);
    const score = calcYearScores(
      chart,
      fiveElements,
      tenGods,
      SS[dayMaster][currentLuck.g],
      SS[dayMaster][annualLuck.g],
      null,
      currentLuck,
      annualLuck
    );
    const average = (score.career + score.wealth + score.love + score.health) / 4;
    const count = Math.max(1, Math.min(5, Math.round(average / 20)));
    stars = '★'.repeat(count) + '☆'.repeat(5 - count);
  } catch (error) {
    console.warn('Unable to calculate profile summary', error);
  }

  return {
    city,
    currentLuck,
    stars
  };
}

/**
 * Owns profile persistence and its associated DOM rendering. Keeping the
 * IndexedDB boundary here prevents application orchestration from knowing
 * storage schema or HTML details.
 */
export function createProfileManager({ onProfileLoad }) {
  let db = null;

  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = event => {
        db = event.target.result;
        resolve(db);
      };
      request.onupgradeneeded = event => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains('profiles')) {
          const store = database.createObjectStore('profiles', { keyPath: 'id', autoIncrement: true });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  function put(record) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('DB未就绪'));
        return;
      }
      const request = db.transaction('profiles', 'readwrite').objectStore('profiles').put(record);
      request.onsuccess = event => resolve(event.target.result);
      request.onerror = () => reject(request.error);
    });
  }

  function list() {
    return new Promise((resolve, reject) => {
      if (!db) {
        resolve([]);
        return;
      }
      const request = db.transaction('profiles', 'readonly')
        .objectStore('profiles')
        .index('updatedAt')
        .openCursor(null, 'prev');
      const profiles = [];
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          profiles.push(cursor.value);
          cursor.continue();
          return;
        }
        resolve(profiles);
      };
      request.onerror = () => reject(request.error);
    });
  }

  function remove(id) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('DB未就绪'));
        return;
      }
      const request = db.transaction('profiles', 'readwrite').objectStore('profiles').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function saveCurrentProfile(name) {
    const context = getCtx();
    const input = context && (context._input || context.input);
    if (!context || !input) return Promise.reject(new Error('无当前命盘数据'));

    const profile = normalizeProfile({
      bd: input.bd_raw || input.bd,
      timeStr: input.timeStr,
      bp: input.bp,
      gen: input.gen,
      q: input.q,
      useTrueSolar: input.useTrueSolar,
      resultStyle: input.resultStyle,
      name,
      createdAt: Date.now()
    });

    return put(profile);
  }

  async function renderProfiles() {
    try {
      const profiles = await list();
      const zone = document.getElementById('profileZone');
      const grid = document.getElementById('profileGrid');
      const empty = document.getElementById('profileEmpty');
      const recentZone = document.getElementById('recentZone');
      const recentGrid = document.getElementById('recentGrid');
      const recentEmpty = document.getElementById('recentEmpty');
      const profileZoneEmpty = document.getElementById('profileZoneEmpty');

      if (!profiles.length) {
        if (grid) grid.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (zone) zone.style.display = 'none';
        if (recentZone) recentZone.style.display = 'none';
        if (recentEmpty) recentEmpty.style.display = 'block';
        if (profileZoneEmpty) profileZoneEmpty.style.display = 'block';
        return;
      }

      if (empty) empty.style.display = 'none';
      if (zone) zone.style.display = 'block';
      if (recentEmpty) recentEmpty.style.display = 'none';
      if (profileZoneEmpty) profileZoneEmpty.style.display = 'none';

      if (recentZone && recentGrid) {
        recentZone.style.display = 'block';
        recentGrid.innerHTML = profiles.slice(0, 3).map(profile => {
          const { currentLuck, stars } = profileCard(profile);
          const name = escapeHtml(profile.name || '未命名');
          return `<div class="r-card" onclick="loadProfile(${Number(profile.id)})">
            <div class="r-ava">${name.charAt(0)}</div>
            <div class="r-info">
              <div class="r-name">${name}</div>
              <div class="r-meta">当前大运：${escapeHtml(currentLuck.g + currentLuck.z)} · ${CURR_YEAR}运势：${stars}<br>最近关注：${escapeHtml(profile.q || '综合')}</div>
            </div>
            <div class="r-arrow">›</div>
          </div>`;
        }).join('');
      }

      if (grid) {
        grid.innerHTML = profiles.slice(0, 8).map(profile => {
          const city = CD[profile.bp] || UNKNOWN_CITY;
          const name = escapeHtml(profile.name || '未命名');
          return `<div class="r-card" onclick="loadProfile(${Number(profile.id)})">
            <div class="r-ava">${name.charAt(0)}</div>
            <div class="r-info">
              <div class="r-name">${name}</div>
              <div class="r-meta">${escapeHtml(profile.bd)} · ${escapeHtml(city.n)} · ${profile.gen === 'male' ? '男' : '女'}${profile.useTrueSolar ? '·真' : ''}</div>
            </div>
            <div style="position:absolute;top:6px;right:8px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9em;color:var(--c-text-4);cursor:pointer;transition:all .15s;z-index:2" onclick="event.stopPropagation();deleteProfile(${Number(profile.id)})">×</div>
          </div>`;
        }).join('');
      }
    } catch (error) {
      console.error('renderProfiles', error);
    }
  }

  async function loadProfile(id) {
    try {
      const profile = (await list()).find(item => item.id === Number(id));
      if (!profile) return;

      document.getElementById('bDate').value = profile.bd || '';
      document.getElementById('bTime').value = profile.timeStr || '09:00';
      document.getElementById('bPlace').value = profile.bp || '';
      document.getElementById('cInp').value = (CD[profile.bp] || { n: '' }).n;
      document.getElementById('bGen').value = profile.gen || 'male';
      document.getElementById('bQ').value = profile.q || '';

      const style = document.getElementById('bResultStyle');
      if (style) {
        style.value = profile.resultStyle || 'companion';
        document.querySelectorAll('.result-style-option').forEach(button => {
          const active = button.dataset.style === style.value;
          button.classList.toggle('active', active);
          button.setAttribute('aria-checked', active ? 'true' : 'false');
        });
        const hint = document.getElementById('resultStyleHint');
        if (hint) hint.textContent = getResultStyle(style.value).intro;
      }

      const trueSolar = document.getElementById('swTrueSolar');
      if (trueSolar) {
        trueSolar.classList.toggle('on', Boolean(profile.useTrueSolar));
        document.getElementById('swText').textContent = `${trueSolar.classList.contains('on') ? '开启' : '关闭'}真太阳时（按出生地经度精确换算时辰）`;
      }

      document.querySelectorAll('#qChips .chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.q === profile.q);
      });
      onProfileLoad?.();
    } catch (error) {
      console.error('loadProfile', error);
    }
  }

  async function deleteProfile(id) {
    try {
      await remove(id);
      renderProfiles();
    } catch (error) {
      console.error('deleteProfile', error);
    }
  }

  function openSaveModal() {
    const modal = document.getElementById('saveModal');
    if (!modal) return;

    modal.classList.add('open');
    document.querySelector('.ig-dock.tab-bar')?.style.removeProperty('display');
    const dock = document.querySelector('.ig-dock.tab-bar');
    if (dock) dock.style.display = 'none';

    const input = document.getElementById('saveName');
    input.value = '';
    updateSaveNameCount();
    setTimeout(() => input.focus(), 100);

    const context = getCtx();
    const chartInput = context && (context._input || context.input);
    if (!chartInput) return;

    const birthDate = document.getElementById('spBd');
    const birthplace = document.getElementById('spBp');
    const gender = document.getElementById('spGen');
    const genderIcon = document.getElementById('spGenIcon');
    const pillars = document.getElementById('spBazi');
    if (birthDate) birthDate.textContent = chartInput.bd || '—';
    if (birthplace) birthplace.textContent = (CD[chartInput.bp] || UNKNOWN_CITY).n;
    if (gender) gender.textContent = chartInput.gen === 'male' ? '男（乾造）' : '女（坤造）';
    if (genderIcon) genderIcon.textContent = chartInput.gen === 'male' ? '♂' : '♀';
    if (pillars && context?.b) {
      pillars.innerHTML = [
        { label: '年', gz: context.b.Y.g + context.b.Y.z },
        { label: '月', gz: context.b.M.g + context.b.M.z },
        { label: '日', gz: context.b.D.g + context.b.D.z },
        { label: '时', gz: context.b.H.g + context.b.H.z }
      ].map(pillar => `<span class="bz-pillar"><small>${pillar.label}</small><b>${pillar.gz}</b></span>`).join('');
    }
  }

  function closeSaveModal() {
    document.getElementById('saveModal')?.classList.remove('open');
    const dock = document.querySelector('.ig-dock.tab-bar');
    if (dock) dock.style.display = '';
  }

  function openArchiveModal() {
    const modal = document.getElementById('archiveModal');
    if (!modal) return;
    modal.classList.add('open');
    const dock = document.querySelector('.ig-dock.tab-bar');
    if (dock) dock.style.display = 'none';
    renderArchiveList();
  }

  function closeArchiveModal() {
    document.getElementById('archiveModal')?.classList.remove('open');
    const dock = document.querySelector('.ig-dock.tab-bar');
    if (dock) dock.style.display = '';
  }

  async function renderArchiveList() {
    const container = document.getElementById('archiveList');
    if (!container) return;

    try {
      const profiles = await list();
      if (!profiles.length) {
        container.innerHTML = '<div class="save-archives-empty">还没有保存的命盘<br>点击「保存命盘」即可添加</div>';
        return;
      }

      container.innerHTML = profiles.map(profile => {
        const city = CD[profile.bp] || UNKNOWN_CITY;
        const updatedAt = new Date(profile.updatedAt);
        const dateLabel = `${updatedAt.getMonth() + 1}/${updatedAt.getDate()} ${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')}`;
        const name = escapeHtml(profile.name || '未命名');
        return `<div class="save-archive-card" onclick="loadProfileFromArchive(${Number(profile.id)})">
          <div class="sa-ava">${name.charAt(0)}</div>
          <div class="sa-info">
            <div class="sa-name">${name}</div>
            <div class="sa-meta">${escapeHtml(profile.bd)} · ${escapeHtml(city.n)} · ${profile.gen === 'male' ? '男' : '女'} · ${dateLabel}</div>
          </div>
          <div class="sa-actions">
            <button type="button" class="sa-del" onclick="event.stopPropagation();deleteProfileFromArchive(${Number(profile.id)})" title="删除">×</button>
          </div>
        </div>`;
      }).join('');
    } catch (error) {
      console.error('renderArchiveList', error);
    }
  }

  function loadProfileFromArchive(id) {
    loadProfile(id);
    closeArchiveModal();
  }

  async function deleteProfileFromArchive(id) {
    try {
      await remove(id);
      renderArchiveList();
      renderProfiles();
      showToast('已删除');
    } catch (error) {
      console.error('deleteProfileFromArchive', error);
    }
  }

  function updateSaveNameCount() {
    const input = document.getElementById('saveName');
    const count = document.getElementById('saveNameCount');
    if (!input || !count) return;
    count.textContent = input.value.length;
    count.parentElement?.classList.toggle('has-text', input.value.length > 0);
  }

  function quickSaveName(name) {
    const input = document.getElementById('saveName');
    if (!input) return;
    input.value = name;
    updateSaveNameCount();
    input.focus();
    input.setSelectionRange(name.length, name.length);
  }

  function confirmSaveProfile() {
    const name = document.getElementById('saveName').value.trim();
    if (!name) {
      showToast('请输入档案名称');
      return;
    }

    saveCurrentProfile(name)
      .then(() => {
        closeSaveModal();
        renderProfiles();
        showToast('已保存到档案库');
      })
      .catch(error => showToast(`保存失败：${error.message || error}`));
  }

  async function exportProfiles() {
    try {
      const profiles = await list();
      const blob = new Blob([JSON.stringify(profiles, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `问问大师档案_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('exportProfiles', error);
      showToast('导出失败');
    }
  }

  async function handleImport(input) {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error('格式错误');

      let count = 0;
      for (const raw of parsed) {
        const profile = normalizeProfile(raw);
        if (!profile) continue;
        await put(profile);
        count += 1;
      }
      renderProfiles();
      renderArchiveList();
      showToast(`成功导入 ${count} 条档案`);
    } catch (error) {
      showToast(`导入失败：${error.message || error}`);
    } finally {
      input.value = '';
    }
  }

  async function toggleProfileMenu() {
    const menu = document.getElementById('p2ProfileMenu');
    const button = document.getElementById('p2ProfileBtn');
    if (!menu) return;

    const isOpen = menu.classList.toggle('open');
    if (button) button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (!isOpen) return;

    try {
      const profiles = await list();
      let html = '<button class="p2-profile-save-btn" onclick="openSaveModal();document.getElementById(\'p2ProfileMenu\').classList.remove(\'open\')"><span class="p2ps-icon">＋</span><span class="p2ps-text">保存当前命盘</span><span class="p2ps-arrow">→</span></button>';
      html += '<div class="p2-profile-sep" style="height:1px;background:var(--c-border,#eee);margin:6px 0"></div>';
      if (!profiles.length) {
        html += '<div class="profile-empty">还没有保存的档案</div>';
      } else {
        html += profiles.slice(0, 10).map(profile => {
          const city = CD[profile.bp] || UNKNOWN_CITY;
          const name = escapeHtml(profile.name || '未命名');
          return `<div class="profile-item" style="cursor:pointer" onclick="loadProfile(${Number(profile.id)});document.getElementById('p2ProfileMenu').classList.remove('open')">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:600;font-size:.9em">${name}</span>
              <span style="font-size:.7em;color:var(--c-text-4,#aaa);cursor:pointer" onclick="event.stopPropagation();deleteProfile(${Number(profile.id)});TJToggleProfileMenu()">×</span>
            </div>
            <div style="font-size:.72em;color:var(--c-text-3,#999);margin-top:2px">${escapeHtml(profile.bd)} · ${escapeHtml(city.n)} · ${profile.gen === 'male' ? '男' : '女'}</div>
          </div>`;
        }).join('');
      }
      html += '<div class="p2-profile-sep" style="height:1px;background:var(--c-border,#eee);margin:6px 0"></div>';
      html += '<div style="display:flex;gap:8px;padding:0 4px"><button class="profile-item" style="flex:1;font-size:.78em;padding:6px" onclick="exportProfiles();document.getElementById(\'p2ProfileMenu\').classList.remove(\'open\')">导出</button><button class="profile-item" style="flex:1;font-size:.78em;padding:6px" onclick="document.getElementById(\'impFile2\').click();document.getElementById(\'p2ProfileMenu\').classList.remove(\'open\')">导入</button></div>';
      html += '<input type="file" id="impFile2" style="display:none" accept=".json" onchange="handleImport(this)">';
      menu.innerHTML = html;
    } catch (error) {
      console.error('toggleProfileMenu', error);
      menu.innerHTML = '<div class="profile-empty">加载失败</div>';
    }
  }

  return {
    init,
    list,
    renderProfiles,
    loadProfile,
    deleteProfile,
    openSaveModal,
    closeSaveModal,
    openArchiveModal,
    closeArchiveModal,
    loadProfileFromArchive,
    deleteProfileFromArchive,
    confirmSaveProfile,
    quickSaveName,
    updateSaveNameCount,
    exportProfiles,
    handleImport,
    toggleProfileMenu
  };
}
