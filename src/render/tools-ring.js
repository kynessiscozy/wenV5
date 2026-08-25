/* ============================================================
   tools-ring.js · 竖向卡片 3D 环形立体轮播系统 (True 3D Card Carousel)
   ------------------------------------------------------------
   特性：
     1. 竖向立式卡片 (Portrait 254px × 395px): 磨砂玻璃通透质感
     2. 零穿模 3D 空间环绕 (True 3D Cylindrical Ring):
        - 正前中心卡片: X=0, Z=0, rotateY(0°), scale=1.0, 10% 琉璃通透感 (opacity: 0.90)
        - 左右侧翼卡片: 沿 3D 圆周空间 X=R*sinθ, Z=R*(cosθ-1) 优雅延展并朝向中心偏转 rotateY(θ)
        - 背部卡片 (|θ| > 90°): 自动隐退 (opacity: 0, visibility: hidden)，彻底杜绝重叠与穿模
     3. 智能平滑自轮播 (Autoplay): 恒速慢旋，鼠标悬停或拖拽时无缝暂停，离开后自然恢复
     4. 1:1 即时跟手拖拽与物理惯性 (Instant Drag & Momentum Physics):
        - 拖动时 0 延迟即刻跟手，松手后带平滑物理惯性阻尼滑行与中心卡片磁吸卡位
     5. 滚轮横向驱动 (Wheel Interaction): 滚轮在工具区域任意位置均可平滑驱动 3D 旋转
     6. 点击即开 (Instant Click): 点击正中或侧翼卡片直接打开工具
     7. 专栏分类过滤与实时搜索联动: 动态自适应重算 3D 分度角
     8. 3D 环形 / 2D 平铺网格双视图一键切换
   ============================================================ */

import { TOOL_DEFINITIONS } from './tools-catalog.js';

class Tools3DRingCarousel {
  constructor(container) {
    this.container = container;
    this.stage = null;
    this.track = null;
    this.cards = [];
    this.visibleIndices = [];

    // 当前 3D 旋转角度 (度数)
    this.currentAngle = 0;
    this.targetAngle = 0;

    // 自轮播控制
    this.autoPlay = true;
    this.autoSpeed = 0.08; // 自动轮播速度 (度/帧)
    this.isHovered = false;

    // 拖拽物理状态
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.dragStartAngle = 0;
    this.velocity = 0;
    this.lastDragTime = 0;
    this.hasMoved = false;
    // 记录 pointerdown 时按下的卡片：3D 弹簧动画会在 pointerup 后
    // 把卡片滑离指针，导致真实 click 的事件目标变成舞台而非卡片。
    // 因此点击时以“按下时锁定的卡片”为准，而非依赖事件冒泡目标。
    this._downCard = null;

    // 视图模式: 'ring' (3D 环形) | 'grid' (2D 网格)
    this.viewMode = 'ring';
    this.activeFilter = 'all';
    this.searchQuery = '';

    this.rafId = 0;
    this.snapTimer = null;
    this.radius = 540;

    this.init();
  }

  init() {
    this.stage = this.container.querySelector('.tool-ring-stage, .tool-row-stage');
    this.track = this.container.querySelector('.tool-ring-carousel, .tool-row-track');
    if (!this.stage || !this.track) return;

    this.cards = Array.from(this.track.querySelectorAll('.tool-card-portrait, .tool-card-ring'));
    this.updateRadius();
    this.updateVisibleCards();
    this.bindEvents();
    this.startLoop();
  }

  updateRadius() {
    const stageW = this.stage?.offsetWidth || window.innerWidth || 800;
    const count = Math.max(3, this.visibleIndices.length || 13);
    const cardW = stageW < 480 ? 229 : 280;

    // 精确计算无碰撞弦长几何半径: R >= (CardWidth + Gap) / (2 * sin(pi / N))
    const minChordRadius = (cardW + 28) / (2 * Math.sin(Math.PI / count));

    if (stageW < 480) {
      this.radius = Math.max(minChordRadius, stageW * 0.72);
    } else if (stageW < 768) {
      this.radius = Math.max(minChordRadius, stageW * 0.58);
    } else {
      this.radius = Math.min(640, Math.max(minChordRadius, stageW * 0.48));
    }
  }

  updateVisibleCards() {
    this.visibleIndices = [];
    this.cards.forEach((card, idx) => {
      const group = card.dataset.group || '';
      const text = card.textContent.toLowerCase();
      const matchFilter = this.activeFilter === 'all' || group === this.activeFilter;
      const matchSearch = !this.searchQuery || text.includes(this.searchQuery);
      const isVisible = matchFilter && matchSearch;

      card.classList.toggle('is-hidden', !isVisible);
      if (isVisible) {
        this.visibleIndices.push(idx);
      }
    });

    const emptyTip = this.container.querySelector('.tool-ring-empty');
    if (emptyTip) {
      emptyTip.style.display = this.visibleIndices.length === 0 ? 'block' : 'none';
    }

    this.updateRadius();
    this.updateIndicators();
  }

  updateIndicators() {
    const dotsContainer = this.container.querySelector('.tool-ring-dots');
    if (!dotsContainer) return;

    const count = this.visibleIndices.length;
    if (count <= 1) {
      dotsContainer.innerHTML = '';
      return;
    }

    dotsContainer.innerHTML = this.visibleIndices.map((_, i) =>
      `<span class="ring-dot${i === 0 ? ' active' : ''}" data-idx="${i}" onclick="window._tools3DRing && window._tools3DRing.goToIndex(${i})"></span>`
    ).join('');
  }

  onTabShow() {
    this.updateRadius();
    this.updateVisibleCards();
    this.isDragging = false;
    this.hasMoved = false;
    this.startLoop();
  }

  bindEvents() {
    // 1. 鼠标与触控拖拽 (1:1 即时跟手拖拽)
    const onStart = (clientX, clientY) => {
      if (this.viewMode !== 'ring' || this.visibleIndices.length <= 1) return;
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = clientX;
      this.startY = clientY;
      this.lastX = clientX;
      this.dragStartAngle = this.targetAngle;
      this.velocity = 0;
      this.lastDragTime = performance.now();
      if (this.snapTimer) clearTimeout(this.snapTimer);
    };

    const onMove = (clientX, clientY) => {
      if (!this.isDragging) return;
      const dx = clientX - this.lastX;
      const totalDx = clientX - this.startX;
      const totalDy = clientY - this.startY;

      if (Math.abs(totalDx) > 10 || Math.abs(totalDy) > 10) {
        this.hasMoved = true;
      }

      const now = performance.now();
      const dt = Math.max(1, now - this.lastDragTime);
      this.velocity = (dx / dt) * 14;
      this.lastX = clientX;
      this.lastDragTime = now;

      // 1:1 即时跟手角度响应
      const sens = 0.26;
      this.targetAngle += dx * sens;
      // 拖拽时让当前角度立刻跟随目标角度，消除拖拽迟滞
      this.currentAngle = this.targetAngle;
    };

    const onEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      // 释放惯性
      this.targetAngle += this.velocity * 4.0;
      this.snapToNearest();
      setTimeout(() => { this.hasMoved = false; }, 80);
    };

    // Pointer Events (现代浏览器标准支持)
    this.stage.addEventListener('pointerdown', (e) => {
      const card = e.target && e.target.closest ? e.target.closest('.tool-card-portrait') : null;
      this._downCard = card;
      onStart(e.clientX, e.clientY);
    });
    window.addEventListener('pointermove', (e) => {
      if (this.isDragging) onMove(e.clientX, e.clientY);
    }, { passive: true });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);

    // 触摸兜底 (Touch Events)
    this.stage.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches && e.touches[0]) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchend', onEnd);

    // 2. 滚轮驱动 3D 转盘旋转 (在整个工具面板内滚动滚轮均生效)
    this.container.addEventListener('wheel', (e) => {
      if (this.viewMode !== 'ring' || this.visibleIndices.length <= 1) return;
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      this.targetAngle -= delta * 0.16;
      if (this.snapTimer) clearTimeout(this.snapTimer);
      this.snapTimer = setTimeout(() => this.snapToNearest(), 140);
    }, { passive: false });

    // 3. 悬停暂停轮播
    this.container.addEventListener('mouseenter', () => { this.isHovered = true; });
    this.container.addEventListener('mouseleave', () => { this.isHovered = false; });

    // 4. 卡片点击交互与键盘访问
    // 采用舞台级事件委托：以 pointerdown 时锁定的卡片为准，规避 3D
    // 弹簧动画使卡片滑离指针、导致真实 click 命中舞台而失效的问题。
    this.stage.addEventListener('click', (e) => {
      // 明显拖拽后忽略误触
      if (this.hasMoved) return;
      // 优先使用按下时锁定的卡片；兜底用事件目标向上查找
      const card = this._downCard ||
        (e.target && e.target.closest ? e.target.closest('.tool-card-portrait') : null);
      if (!card) return;
      const toolId = card.dataset.tool;
      if (!toolId) return;
      if (typeof window.openToolPage === 'function') {
        window.openToolPage(toolId);
      }
    });

    this.cards.forEach((card) => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const toolId = card.dataset.tool;
          if (toolId && typeof window.openToolPage === 'function') {
            window.openToolPage(toolId);
          }
        }
      });
    });

    // 窗口尺寸自适应
    window.addEventListener('resize', () => {
      this.updateRadius();
    }, { passive: true });
  }

  snapToNearest() {
    const count = this.visibleIndices.length;
    if (count <= 1) return;
    const step = 360 / count;
    this.targetAngle = Math.round(this.targetAngle / step) * step;
  }

  goToIndex(idx) {
    const count = this.visibleIndices.length;
    if (count <= 1) return;
    const step = 360 / count;
    const targetOffset = -idx * step;
    const curNorm = this.targetAngle % 360;
    let diff = ((targetOffset - curNorm + 540) % 360) - 180;
    this.targetAngle += diff;
  }

  prev() {
    const count = this.visibleIndices.length;
    if (count <= 1) return;
    const step = 360 / count;
    this.targetAngle += step;
    this.snapToNearest();
  }

  next() {
    const count = this.visibleIndices.length;
    if (count <= 1) return;
    const step = 360 / count;
    this.targetAngle -= step;
    this.snapToNearest();
  }

  toggleAutoPlay() {
    this.autoPlay = !this.autoPlay;
    const btn = this.container.querySelector('#toolRingPlayBtn');
    if (btn) {
      btn.classList.toggle('active', this.autoPlay);
      btn.title = this.autoPlay ? '暂停自动轮播' : '开启自动轮播';
    }
  }

  toggleViewMode() {
    const nextMode = this.viewMode === 'ring' ? 'grid' : 'ring';
    this.setViewMode(nextMode);
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.container.classList.toggle('view-mode-grid', mode === 'grid');
    this.container.classList.toggle('view-mode-ring', mode === 'ring');

    const toggleText = this.container.querySelector('#toolViewToggleText');
    if (toggleText) {
      toggleText.textContent = mode === 'grid' ? '一键切换为3D环形' : '一键切换为平铺模式';
    }

    const btnGrid = this.container.querySelector('#toolViewGridBtn');
    const btnRing = this.container.querySelector('#toolViewRingBtn');
    if (btnGrid && btnRing) {
      btnGrid.classList.toggle('active', mode === 'grid');
      btnRing.classList.toggle('active', mode === 'ring');
    }

    if (mode === 'grid') {
      this.cards.forEach(c => {
        c.style.transform = '';
        c.style.opacity = '';
        c.style.zIndex = '';
        c.style.visibility = '';
        c.style.pointerEvents = '';
        c.classList.remove('is-active-center');
      });
    } else {
      this.targetAngle = 0;
      this.currentAngle = 0;
    }
  }

  setFilter(groupKey) {
    this.activeFilter = groupKey;
    this.updateVisibleCards();
    this.targetAngle = 0;
    this.currentAngle = 0;
  }

  setSearch(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
    this.updateVisibleCards();
  }

  startLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const tick = () => {
      if (this.stage && this.stage.isConnected) {
        this.updatePhysics();
        this.render();
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(tick);
    }
  }

  updatePhysics() {
    if (this.viewMode !== 'ring') return;

    // 自动慢速 3D 自轮播 (未悬停、未拖拽时)
    if (this.autoPlay && !this.isDragging && !this.isHovered && this.visibleIndices.length > 1) {
      this.targetAngle -= this.autoSpeed;
    }

    // 平滑弹簧逼近 (Spring Lerp)
    const lerp = this.isDragging ? 0.35 : 0.085;
    this.currentAngle += (this.targetAngle - this.currentAngle) * lerp;
  }

  render() {
    if (this.viewMode !== 'ring') return;
    const count = this.visibleIndices.length;
    if (count === 0) return;

    const step = 360 / count;
    let closestDist = 9999;
    let centerIndex = -1;

    this.visibleIndices.forEach((cardIdx, i) => {
      const card = this.cards[cardIdx];
      const cardAngle = (i * step + this.currentAngle) % 360;
      const normAngle = ((cardAngle + 540) % 360) - 180; // [-180, 180]
      const absAngle = Math.abs(normAngle);
      const rad = (normAngle * Math.PI) / 180;

      const cosVal = Math.cos(rad);
      const sinVal = Math.sin(rad);

      // 【零穿模 3D 空间坐标】：
      // 1. 横向 X 坐标沿着圆周展开: X = sin(rad) * R
      // 2. 深度 Z 坐标沿圆周向后退: Z = (cos(rad) - 1) * R (正前为 0，两侧严格小于 0)
      const x = sinVal * this.radius;
      const z = (cosVal - 1) * this.radius;

      // 3. 景深缩放
      const depthRatio = Math.max(0, (cosVal + 1) / 2); // [0, 1]
      const scale = 0.74 + 0.26 * depthRatio;

      // 判定中心活跃卡片
      if (absAngle < closestDist) {
        closestDist = absAngle;
        centerIndex = i;
      }

      // 【背面隐退机制】：
      // 当卡片转至侧后方 (|θ| > 90° 时)，平滑透明度降为 0 并隐藏，杜绝任何杂乱穿透
      if (absAngle > 92) {
        card.style.transform = `translate3d(${x.toFixed(1)}px, 0px, ${z.toFixed(1)}px) rotateY(${normAngle.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        card.style.opacity = '0';
        card.style.visibility = 'hidden';
        card.style.pointerEvents = 'none';
        card.style.zIndex = '0';
        card.classList.remove('is-active-center');
      } else {
        // 前方可见扇区：带 10% 琉璃通透感 (正前方 0.90，边缘平滑渐隐)
        const fadeFactor = absAngle > 68 ? Math.max(0, (92 - absAngle) / 24) : 1.0;
        const opacity = Math.min(0.90, (0.42 + 0.48 * Math.pow(cosVal, 0.75))) * fadeFactor;
        const zIndex = Math.round(depthRatio * 100);

        card.style.transform = `translate3d(${x.toFixed(1)}px, 0px, ${z.toFixed(1)}px) rotateY(${normAngle.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
        card.style.opacity = opacity.toFixed(3);
        card.style.visibility = 'visible';
        card.style.pointerEvents = 'auto';
        card.style.zIndex = zIndex;
        card.classList.toggle('is-active-center', absAngle <= 16);
      }
    });

    // 更新指示圆点
    const dots = this.container.querySelectorAll('.ring-dot');
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === centerIndex);
    });
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

export function initTools3DRingCarousel(container) {
  if (!container) return null;
  if (window._tools3DRing) {
    try { window._tools3DRing.destroy(); } catch (_) {}
  }
  const instance = new Tools3DRingCarousel(container);
  window._tools3DRing = instance;
  return instance;
}
