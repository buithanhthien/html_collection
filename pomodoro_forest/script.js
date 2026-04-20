/* ============================================================
   script.js
   - LeafScene animation (unchanged)
   - Sidebar widget toggling
   - Draggable widgets
   - Live clock
   - Background switcher
   - Bring-to-front on click
   - Fullscreen toggle
   ============================================================ */

/* ── LeafScene ────────────────────────────────────────────── */

var LeafScene = function (el) {
    this.viewport = el;
    this.world = document.createElement('div');
    this.leaves = [];

    this.options = {
        numLeaves: 22,
        wind: {
            magnitude: 1.2,
            maxSpeed: 12,
            duration: 300,
            start: 0,
            speed: 0
        },
    };

    this.width = this.viewport.offsetWidth;
    this.height = this.viewport.offsetHeight;
    this.timer = 0;

    this._resetLeaf = function (leaf) {
        leaf.x = this.width * 2 - Math.random() * this.width * 1.75;
        leaf.y = -10;
        leaf.z = Math.random() * 200;
        if (leaf.x > this.width) {
            leaf.x = this.width + 10;
            leaf.y = Math.random() * this.height / 2;
        }
        if (this.timer == 0) leaf.y = Math.random() * this.height;

        leaf.rotation.speed = Math.random() * 10;
        var randomAxis = Math.random();
        if (randomAxis > 0.5) {
            leaf.rotation.axis = 'X';
        } else if (randomAxis > 0.25) {
            leaf.rotation.axis = 'Y';
            leaf.rotation.x = Math.random() * 180 + 90;
        } else {
            leaf.rotation.axis = 'Z';
            leaf.rotation.x = Math.random() * 360 - 180;
            leaf.rotation.speed = Math.random() * 3;
        }

        leaf.xSpeedVariation = Math.random() * 0.8 - 0.4;
        leaf.ySpeed = Math.random() + 1.5;
        return leaf;
    };

    this._updateLeaf = function (leaf) {
        var leafWindSpeed = this.options.wind.speed(this.timer - this.options.wind.start, leaf.y);
        var xSpeed = leafWindSpeed + leaf.xSpeedVariation;
        leaf.x -= xSpeed;
        leaf.y += leaf.ySpeed;
        leaf.rotation.value += leaf.rotation.speed;

        var t = 'translateX( ' + leaf.x + 'px ) translateY( ' + leaf.y + 'px ) translateZ( ' + leaf.z + 'px )  rotate' + leaf.rotation.axis + '( ' + leaf.rotation.value + 'deg )';
        if (leaf.rotation.axis !== 'X') t += ' rotateX(' + leaf.rotation.x + 'deg)';

        leaf.el.style.webkitTransform = t;
        leaf.el.style.MozTransform = t;
        leaf.el.style.oTransform = t;
        leaf.el.style.transform = t;

        if (leaf.x < -10 || leaf.y > this.height + 10) this._resetLeaf(leaf);
    };

    this._updateWind = function () {
        if (this.timer === 0 || this.timer > (this.options.wind.start + this.options.wind.duration)) {
            this.options.wind.magnitude = Math.random() * this.options.wind.maxSpeed;
            this.options.wind.duration = this.options.wind.magnitude * 50 + (Math.random() * 20 - 10);
            this.options.wind.start = this.timer;
            var screenHeight = this.height;
            this.options.wind.speed = function (t, y) {
                var a = this.magnitude / 2 * (screenHeight - 2 * y / 3) / screenHeight;
                return a * Math.sin(2 * Math.PI / this.duration * t + (3 * Math.PI / 2)) + a;
            };
        }
    };
};

LeafScene.prototype.init = function () {
    for (var i = 0; i < this.options.numLeaves; i++) {
        var leaf = {
            el: document.createElement('div'),
            x: 0, y: 0, z: 0,
            rotation: { axis: 'X', value: 0, speed: 0, x: 0 },
            xSpeedVariation: 0,
            ySpeed: 0,
            path: { type: 1, start: 0 },
            image: 1
        };
        this._resetLeaf(leaf);
        var colorClasses = ['leaf-c1', 'leaf-c2', 'leaf-c3', 'leaf-c4', 'leaf-c5'];
        leaf.el.classList.add(colorClasses[Math.floor(Math.random() * colorClasses.length)]);
        this.leaves.push(leaf);
        this.world.appendChild(leaf.el);
    }

    this.world.className = 'leaf-scene';
    this.viewport.appendChild(this.world);

    this.world.style.webkitPerspective = '400px';
    this.world.style.MozPerspective = '400px';
    this.world.style.oPerspective = '400px';
    this.world.style.perspective = '400px';

    var self = this;
    window.addEventListener('resize', function () {
        self.width = self.viewport.offsetWidth;
        self.height = self.viewport.offsetHeight;
    });
};

LeafScene.prototype.render = function () {
    this._updateWind();
    for (var i = 0; i < this.leaves.length; i++) {
        this._updateLeaf(this.leaves[i]);
    }
    this.timer++;
    requestAnimationFrame(this.render.bind(this));
};

// Leaf scene disabled
// var leafContainer = document.querySelector('.falling-leaves');
// var leaves = new LeafScene(leafContainer);
// leaves.init();
// leaves.render();

/* ── App logic ────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {

    // ── Live clock ──────────────────────────────────────────

    var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var clockEl = document.getElementById('liveClock');
    var dateEl = document.getElementById('liveDate');

    function updateClock() {
        var now = new Date();
        var h = String(now.getHours()).padStart(2, '0');
        var m = String(now.getMinutes()).padStart(2, '0');
        clockEl.textContent = h + ':' + m;
        clockEl.title = h + ':' + m + ':' + String(now.getSeconds()).padStart(2, '0');
        if (dateEl) {
            dateEl.textContent = DAYS[now.getDay()] + ', ' + MONTHS[now.getMonth()] + ' ' + now.getDate();
        }
    }

    updateClock();
    setInterval(updateClock, 1000);

    // ── Heartbeat: keep server alive; server exits when pings stop ──
    function ping() { fetch('/api/ping').catch(function () { }); }
    ping();
    setInterval(ping, 5000);

    // ── Sidebar toggle ──────────────────────────────────────

    var sidebarBtns = document.querySelectorAll('.sidebar-btn[data-target]');
    sidebarBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var targetId = btn.dataset.target;
            var widget = document.getElementById(targetId);
            if (!widget) return;

            var isVisible = widget.classList.contains('visible');
            widget.classList.toggle('visible', !isVisible);
            btn.classList.toggle('active', !isVisible);

            // Bring to front when opened
            if (!isVisible) bringToFront(widget);
        });
    });

    // ── Widget close buttons ────────────────────────────────

    document.querySelectorAll('.widget-close-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var targetId = btn.dataset.target;
            var widget = document.getElementById(targetId);
            if (widget) widget.classList.remove('visible');

            var navBtn = document.querySelector('.sidebar-btn[data-target="' + targetId + '"]');
            if (navBtn) navBtn.classList.remove('active');
        });
    });

    // ── Bring widget to front on click ──────────────────────

    var topZ = 200;

    function bringToFront(el) {
        topZ++;
        el.style.zIndex = topZ;
    }

    document.querySelectorAll('.widget').forEach(function (widget) {
        widget.addEventListener('mousedown', function () {
            bringToFront(widget);
        }, true);
    });

    // ── Draggable widgets ───────────────────────────────────

    function makeDraggable(widget, handle) {
        var dragging = false;
        var startMouseX, startMouseY, startLeft, startTop;

        handle.addEventListener('mousedown', function (e) {
            // Don't start drag on interactive elements
            if (e.target.closest('button, input, select, textarea, a')) return;

            dragging = true;
            bringToFront(widget);

            var rect = widget.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            startMouseX = e.clientX;
            startMouseY = e.clientY;

            // Freeze position as explicit left/top (remove any CSS centering)
            widget.style.left = startLeft + 'px';
            widget.style.top = startTop + 'px';
            widget.style.right = 'auto';
            widget.style.margin = '0';

            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var dx = e.clientX - startMouseX;
            var dy = e.clientY - startMouseY;

            var newLeft = startLeft + dx;
            var newTop = startTop + dy;

            // Clamp inside viewport (leave a 20px margin)
            var minLeft = 68 + 4; // sidebar width + gap
            var maxLeft = window.innerWidth - widget.offsetWidth - 4;
            var minTop = 0;
            var maxTop = window.innerHeight - widget.offsetHeight - 4;

            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
            newTop = Math.max(minTop, Math.min(maxTop, newTop));

            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', function () {
            dragging = false;
        });
    }

    // ── Resizable widgets (bottom-left / bottom-right corner drag) ──────────

    function makeResizable(widget) {
        widget.querySelectorAll('.resize-handle').forEach(function (handle) {
            handle.addEventListener('mousedown', function (e) {
                e.preventDefault();
                e.stopPropagation(); // don't trigger the drag handler

                var isLeft = handle.classList.contains('resize-handle--bl');
                var startX = e.clientX;
                var startY = e.clientY;
                var startW = widget.offsetWidth;
                var startH = widget.offsetHeight;
                var startL = widget.getBoundingClientRect().left;
                var minW = 200;
                var minH = 80;

                // Freeze explicit dimensions so CSS width/height apply cleanly
                widget.style.width = startW + 'px';
                widget.style.height = startH + 'px';

                function onMove(e) {
                    var dx = e.clientX - startX;
                    var dy = e.clientY - startY;
                    var newH = Math.max(minH, startH + dy);
                    widget.style.height = newH + 'px';

                    if (isLeft) {
                        var newW = Math.max(minW, startW - dx);
                        var newL = startL + (startW - newW);
                        widget.style.width = newW + 'px';
                        widget.style.left = newL + 'px';
                        widget.style.right = 'auto';
                    } else {
                        widget.style.width = Math.max(minW, startW + dx) + 'px';
                    }
                }

                function onUp() {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                }

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        });
    }

    // Attach draggable + resizable to all widgets
    document.querySelectorAll('.widget').forEach(function (widget) {
        var handle = widget.querySelector('.widget-header');
        if (handle) makeDraggable(widget, handle);
        makeResizable(widget);
    });

    // ── Background switcher (still images + optional muted YouTube URL) ─────

    var sceneYoutube = document.getElementById('sceneYoutube');
    var ytFrame = document.getElementById('sceneYoutubeFrame');
    var fallingEl = document.getElementById('fallingLeaves');
    var bgGrid = document.getElementById('bgGrid');
    var bgYtInput = document.getElementById('bgYtUrlInput');
    var bgYtApply = document.getElementById('bgYtApplyBtn');

    function extractBgYtId(url) {
        var m = String(url).match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
        return m ? m[1] : null;
    }

    function stopSceneYoutube() {
        if (!sceneYoutube || !ytFrame) return;
        sceneYoutube.classList.remove('is-active');
        ytFrame.src = 'about:blank';
    }

    function applyStillBackground(file) {
        if (!fallingEl) return;
        stopSceneYoutube();
        fallingEl.style.backgroundImage = "url('asset/img/" + file + "')";
        fallingEl.style.backgroundSize = 'cover';
        fallingEl.style.backgroundPosition = 'center';
        fallingEl.style.backgroundRepeat = 'no-repeat';
        fallingEl.style.backgroundColor = '';
    }

    function applyYoutubeBackgroundFromUrl(url) {
        var id = extractBgYtId(url);
        if (!id || !ytFrame || !sceneYoutube || !fallingEl) return;
        var q = 'autoplay=1&mute=1&loop=1&playlist=' + encodeURIComponent(id) +
            '&playsinline=1&controls=0&modestbranding=1&rel=0';
        ytFrame.src = 'https://www.youtube.com/embed/' + id + '?' + q;
        sceneYoutube.classList.add('is-active');
        fallingEl.style.backgroundImage = 'none';
        fallingEl.style.backgroundColor = 'transparent';
        document.querySelectorAll('.bg-card').forEach(function (c) {
            c.classList.remove('active');
        });
    }

    function isDirectMediaUrl(url) {
        return /\.(jpg|jpeg|png|webp|gif|avif|svg|mp4|webm)(\?.*)?$/i.test(url);
    }

    function applyDirectMediaUrl(url) {
        stopSceneYoutube();
        if (!fallingEl) return;
        var src = /^https?:\/\//i.test(url)
            ? '/api/proxy?url=' + encodeURIComponent(url)
            : url;
        fallingEl.style.backgroundImage = "url('" + src + "')";
        // 'contain' shows the full image without cropping.
        // The dark base bg (#1c1828) fills any empty space around it.
        fallingEl.style.backgroundSize = 'contain';
        fallingEl.style.backgroundPosition = 'center center';
        fallingEl.style.backgroundRepeat = 'no-repeat';
        fallingEl.style.backgroundColor = '#1c1828';
        document.querySelectorAll('.bg-card').forEach(function (c) {
            c.classList.remove('active');
        });
    }

    function onBgYtApply() {
        if (!bgYtInput) return;
        var url = bgYtInput.value.trim();
        if (!url) return;
        if (isDirectMediaUrl(url)) {
            applyDirectMediaUrl(url);
        } else {
            applyYoutubeBackgroundFromUrl(url);
        }
    }

    if (bgYtApply) {
        bgYtApply.addEventListener('click', onBgYtApply);
    }
    if (bgYtInput) {
        bgYtInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') onBgYtApply();
        });
    }

    // ── Google Images search popup ──────────────────────────
    var bgSearchInput = document.getElementById('bgSearchInput');
    var bgSearchBtn = document.getElementById('bgSearchBtn');

    function openGoogleImages() {
        var q = bgSearchInput ? bgSearchInput.value.trim() : '';
        var url = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q || 'nature wallpaper');
        window.open(url, '_blank', 'width=1100,height=700,resizable=yes,scrollbars=yes');
    }

    if (bgSearchBtn) {
        bgSearchBtn.addEventListener('click', openGoogleImages);
    }
    if (bgSearchInput) {
        bgSearchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') openGoogleImages();
        });
    }

    function buildBgGrid(files) {
        if (!bgGrid) return;
        bgGrid.innerHTML = '';
        if (!files || files.length === 0) return;
        files.forEach(function (file, idx) {
            var label = file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            var card = document.createElement('div');
            card.className = 'bg-card' + (idx === 0 ? ' active' : '');
            card.style.backgroundImage = "url('asset/img/" + file + "')";
            card.title = label;

            var labelEl = document.createElement('span');
            labelEl.className = 'bg-label';
            labelEl.textContent = label;
            card.appendChild(labelEl);

            card.addEventListener('click', function () {
                applyStillBackground(file);
                document.querySelectorAll('.bg-card').forEach(function (c) {
                    c.classList.remove('active');
                });
                card.classList.add('active');
            });

            bgGrid.appendChild(card);
        });
        if (files.length > 0) applyStillBackground(files[0]);
    }

    // Fetch image list from server; fall back to empty grid on error
    fetch('/api/backgrounds')
        .then(function (r) { return r.json(); })
        .then(function (files) { buildBgGrid(files); })
        .catch(function () { buildBgGrid([]); });

    // ── Fullscreen toggle ───────────────────────────────────

    var btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(function () { });
            } else {
                document.exitFullscreen().catch(function () { });
            }
        });

        document.addEventListener('fullscreenchange', function () {
            btnFullscreen.title = document.fullscreenElement ? 'Exit Fullscreen' : 'Toggle Fullscreen';
        });
    }

    // ── Confetti Widget ─────────────────────────────────────────────────────────

    var CONFETTI_KEY = 'pomodoro-confetti';
    var confettiSaved = (function () {
        try { return JSON.parse(localStorage.getItem(CONFETTI_KEY) || '{}'); } catch (e) { return {}; }
    })();

    // ── Helper: spawn one particle ──────────────────────────────────────────────
    function spawnSpark(opts) {
        /* opts: { cx, cy, container, isLocal, symbol, color, shadow, tx, ty, rot, dur, extraClass } */
        var span = document.createElement('span');
        span.className = 'celeb-spark'
            + (opts.isLocal ? ' celeb-spark--local' : '')
            + (opts.extraClass ? ' ' + opts.extraClass : '');
        span.textContent = opts.symbol;
        span.style.color = opts.color;
        span.style.fontSize = opts.size + 'px';
        span.style.left = opts.cx + 'px';
        span.style.top = opts.cy + 'px';
        if (opts.shadow) span.style.textShadow = opts.shadow;
        span.style.setProperty('--tx', opts.tx + 'px');
        span.style.setProperty('--ty', opts.ty + 'px');
        span.style.setProperty('--rot', opts.rot + 'deg');
        span.style.setProperty('--dur', opts.dur + 's');
        if (opts.tyLand !== undefined)
            span.style.setProperty('--ty-land', opts.tyLand + 'px');
        (opts.container || document.body).appendChild(span);
        span.addEventListener('animationend', function () {
            if (span.parentNode) span.parentNode.removeChild(span);
        });
    }

    function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    // ── 1. Star Burst ────────────────────────────────────────────────────────────
    function fireStarBurst(cx, cy, container, isLocal) {
        var symbols = ['★', '✦', '✧', '✶', '✸'];
        var colors = ['#9b2948', '#ff7251', '#ffca7b', '#ffcd74', '#ffedbf', '#ff9f80'];
        var COUNT = 38, MIN_R = isLocal ? 30 : 220, MAX_R = isLocal ? 110 : 560;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 10px currentColor, 0 0 3px #fff',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 900 - 450, dur: isLocal ? 1.2 : 2,
                        size: (isLocal ? 10 : 13) + Math.random() * (isLocal ? 12 : 18)
                    });
                }, Math.random() * (isLocal ? 10 : 20));
            })();
        }
    }

    // ── 2. Bubble Rain ───────────────────────────────────────────────────────────
    function fireBubbleRain(cx, cy, container, isLocal) {
        var symbols = ['◆', '✿', '⬡', '·', '⁕', '○', '●'];
        var colors = ['#064273', '#76b6c4', '#7fcdff', '#1da2d8', '#def3f6', '#aee8ff'];
        var COUNT = 38, MIN_R = isLocal ? 30 : 220, MAX_R = isLocal ? 110 : 560;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 8px currentColor',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 360 - 180, dur: isLocal ? 1.2 : 2,
                        size: (isLocal ? 8 : 11) + Math.random() * (isLocal ? 10 : 16)
                    });
                }, Math.random() * (isLocal ? 10 : 20));
            })();
        }
    }

    // ── 3. Petal Burst ───────────────────────────────────────────────────────────
    function firePetalFall(cx, cy, container, isLocal) {
        var symbols = ['❀', '✿', '❁', '✾', '✽'];
        var colors = ['#ffb7c5', '#ffc2d1', '#e8b0c8', '#d4a0d0', '#f9d0e0', '#c8a0d8'];
        var COUNT = 35, MIN_R = isLocal ? 15 : 120, MAX_R = isLocal ? 80 : 420;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 6px currentColor',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 360, dur: isLocal ? 1.5 : 2.5,
                        size: (isLocal ? 12 : 16) + Math.random() * (isLocal ? 8 : 14)
                    });
                }, Math.random() * (isLocal ? 10 : 20));
            })();
        }
    }

    // ── 4. Firefly Swarm  (tiny glowing dots, slow) ─────────────────────────────
    function fireFireflySwarm(cx, cy, container, isLocal) {
        var symbols = ['°', '•', '∘', '˙', '⋅'];
        var colors = ['#c8ff60', '#ffffa0', '#d4ff80', '#e8ff40', '#b8ff90', '#ffff60'];
        var COUNT = 45, MIN_R = isLocal ? 15 : 120, MAX_R = isLocal ? 80 : 420;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 12px currentColor, 0 0 4px #fff, 0 0 20px currentColor',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 180, dur: isLocal ? 2 : 3.5,
                        size: (isLocal ? 6 : 8) + Math.random() * (isLocal ? 6 : 10)
                    });
                }, Math.random() * (isLocal ? 50 : 600));
            })();
        }
    }

    // ── 5. Leaf Burst ────────────────────────────────────────────────────────────
    function fireLeafShower(cx, cy, container, isLocal) {
        var symbols = ['❧', '✾', '❁', '♣', '✻'];
        var colors = ['#4a7c59', '#a8d5b5', '#6cb87a', '#2d6a4f', '#74c69d', '#52b788'];
        var COUNT = 35, MIN_R = isLocal ? 20 : 140, MAX_R = isLocal ? 85 : 460;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 8px currentColor',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 720 - 360, dur: isLocal ? 1.6 : 2.6,
                        size: (isLocal ? 11 : 14) + Math.random() * (isLocal ? 9 : 16)
                    });
                }, Math.random() * (isLocal ? 10 : 20));
            })();
        }
    }

    // ── 6. Gold Confetti  (geometric shapes, gold/champagne) ────────────────────
    function fireGoldConfetti(cx, cy, container, isLocal) {
        var symbols = ['▪', '▸', '▴', '■', '▲', '◆'];
        var colors = ['#ffd700', '#ffec8b', '#f0c040', '#ffe066', '#fbbf24', '#fef3c7'];
        var COUNT = 42, MIN_R = isLocal ? 25 : 180, MAX_R = isLocal ? 100 : 540;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 8px currentColor, 0 0 2px #fff8',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 720 - 360, dur: isLocal ? 1.2 : 2.2,
                        size: (isLocal ? 8 : 10) + Math.random() * (isLocal ? 10 : 14)
                    });
                }, Math.random() * (isLocal ? 15 : 30));
            })();
        }
    }

    // ── 7. Aurora Ribbons  (wavy chars, purple→teal gradient palette) ────────────
    function fireAuroraRibbons(cx, cy, container, isLocal) {
        var symbols = ['≋', '≈', '∼', '~', '╱', '╲'];
        var colors = ['#b8a0e0', '#7fcdff', '#8ec4e4', '#c084fc', '#67e8f9', '#a78bfa'];
        var COUNT = 40, MIN_R = isLocal ? 28 : 200, MAX_R = isLocal ? 105 : 550;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 14px currentColor',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 540 - 270, dur: isLocal ? 1.3 : 2.4,
                        size: (isLocal ? 14 : 18) + Math.random() * (isLocal ? 10 : 16)
                    });
                }, Math.random() * (isLocal ? 20 : 30));
            })();
        }
    }

    // ── 8. Emoji Pop  (large multicolor unicode symbols) ────────────────────────
    function fireEmojiPop(cx, cy, container, isLocal) {
        var symbols = ['✨', '⭐', '🌟', '💫', '✵', '✶', '✷', '✸'];
        var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bcc', '#ff9f43'];
        var COUNT = 28, MIN_R = isLocal ? 30 : 240, MAX_R = isLocal ? 105 : 580;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = Math.random() * Math.PI * 2;
                    var dist = MIN_R + Math.random() * (MAX_R - MIN_R);
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 12px currentColor',
                        tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist,
                        rot: Math.random() * 360 - 180, dur: isLocal ? 1.4 : 2.5,
                        size: (isLocal ? 14 : 20) + Math.random() * (isLocal ? 10 : 18)
                    });
                }, Math.random() * (isLocal ? 20 : 40));
            })();
        }
    }

    // ── 9. Fountain  (continuous large fountain spray) ───────────────────────────
    function fireFountain(cx, cy, container, isLocal) {
        var symbols = ['★', '◆', '•', '✦', '▪'];
        var colors = ['#64d2ff', '#ffffff', '#ffd700', '#7fcdff', '#b8a0e0', '#aee8ff'];
        var COUNT = 120; // Larger stream
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var spreadX = (Math.random() * (isLocal ? 160 : 1200)) - (isLocal ? 80 : 600); // Much wider spread
                    var peakY = -((isLocal ? 50 : 350) + Math.random() * (isLocal ? 80 : 450)); // shoots much higher
                    var landY = (isLocal ? 100 : 500) + Math.random() * (isLocal ? 60 : 300);    // fall further downstream
                    spawnSpark({
                        cx, cy, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 10px currentColor',
                        tx: spreadX, ty: peakY, tyLand: landY,
                        rot: Math.random() * 720 - 360, dur: isLocal ? 2.0 : 3.8, // Takes longer to complete its arc
                        size: (isLocal ? 10 : 14) + Math.random() * (isLocal ? 8 : 16),
                        extraClass: 'celeb-spark--fountain'
                    });
                }, Math.random() * (isLocal ? 600 : 2500)); // Fountain stream continues for much longer (2.5s)
            })();
        }
    }

    // ── 10. Ring Pulse  (appear at fixed ring, scale then drift) ─────────────────
    function fireRingPulse(cx, cy, container, isLocal) {
        var symbols = ['○', '◯', '∘', '◌', '⊙'];
        var colors = ['#ff64c8', '#ff96e0', '#e052a0', '#ff4ddb', '#c084fc', '#f472b6'];
        var RING_R = isLocal ? 50 : 260;
        var COUNT = 24;
        var driftR = isLocal ? 30 : 140;
        for (var i = 0; i < COUNT; i++) {
            (function () {
                setTimeout(function () {
                    var angle = (Math.random() * Math.PI * 2);
                    // Place particle at the ring edge
                    var startX = cx + Math.cos(angle) * RING_R;
                    var startY = cy + Math.sin(angle) * RING_R;
                    var outX = Math.cos(angle) * (driftR + Math.random() * driftR);
                    var outY = Math.sin(angle) * (driftR + Math.random() * driftR);
                    spawnSpark({
                        cx: startX, cy: startY, container, isLocal,
                        symbol: randFrom(symbols), color: randFrom(colors),
                        shadow: '0 0 12px currentColor, 0 0 4px #fff',
                        tx: outX, ty: outY,
                        rot: Math.random() * 180 - 90, dur: isLocal ? 1.8 : 2.3,
                        size: (isLocal ? 10 : 14) + Math.random() * (isLocal ? 8 : 12),
                        extraClass: 'celeb-spark--ring'
                    });
                }, Math.random() * (isLocal ? 20 : 40));
            })();
        }
    }

    // ── 11. Rain Down  (fast rain continuously for 5 seconds) ────────────────────
    function fireRainDown(cx, cy, container, isLocal) {
        var symbols = ['|', '│', '💧', '·', '°', '⁄'];
        var colors = ['#78b4ff', '#93c5fd', '#60a5fa', '#3b82f6', '#e0f2fe', '#a5b4fc'];
        var COUNT = isLocal ? 120 : 400; // Tons of rain to sustain the 5 second storm
        for (var i = 0; i < COUNT; i++) {
            (function () {
                // Spread the spawn time across 5 full seconds (5000ms) for a continuous heavy shower
                setTimeout(function () {
                    var startX, startY, fallDist, driftX;
                    if (isLocal && container) {
                        var w = container.offsetWidth || 160;
                        var h = container.offsetHeight || 120;
                        startX = Math.random() * w;
                        startY = -20;
                        fallDist = h + 40;
                        driftX = (Math.random() * 16) - 8;
                    } else {
                        startX = Math.random() * window.innerWidth;
                        startY = -50;
                        fallDist = window.innerHeight + 100;
                        driftX = (Math.random() * 100) - 50; // Wind blows them slightly
                    }
                    var char = randFrom(symbols);
                    var isDrop = (char === '💧');
                    spawnSpark({
                        cx: startX, cy: startY, container, isLocal,
                        symbol: char, color: randFrom(colors),
                        shadow: isDrop ? 'none' : '0 0 6px currentColor',
                        tx: driftX, ty: fallDist,
                        rot: isDrop ? 0 : driftX / 2, // Tilt rain streaks with the wind
                        dur: isLocal ? (0.4 + Math.random() * 0.3) : (0.7 + Math.random() * 0.4), // Falling fast again!
                        size: (isLocal ? 10 : 12) + Math.random() * (isLocal ? 6 : 14),
                        extraClass: 'celeb-spark--rain'
                    });
                }, Math.random() * (isLocal ? 1500 : 5000)); // The shower itself lasts 5 seconds
            })();
        }
    }

    // ── 12. Side Cannons (canvas-confetti library) ──────────────────────────────
    function fireSideCannons(cx, cy, container, isLocal) {
        if (typeof confetti !== 'function') return; // Fail gracefully if library missing

        var end = Date.now() + 1800;
        var colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

        var targetConfetti = confetti; // Default full screen
        var localCanvas = null;

        // If rendering locally in the widget preview box
        if (isLocal && container) {
            localCanvas = document.createElement('canvas');
            localCanvas.style.position = 'absolute';
            localCanvas.style.top = '0';
            localCanvas.style.left = '0';
            localCanvas.style.width = '100%';
            localCanvas.style.height = '100%';
            localCanvas.style.pointerEvents = 'none'; // let clicks pass through
            container.appendChild(localCanvas);

            // Bind instance to the small canvas
            targetConfetti = confetti.create(localCanvas, {
                resize: true,
                useWorker: true
            });

            // Cleanup the temp canvas after animation
            setTimeout(function() {
                if (localCanvas.parentNode) localCanvas.parentNode.removeChild(localCanvas);
            }, 2500); // giving extra safety buffer before deleting node
        }

        var lastFrameTime = Date.now();

        (function frame() {
            var now = Date.now();
            
            // Throttle to run every ~40ms (25 FPS) instead of 60 FPS to prevent heavy lag
            if (now - lastFrameTime > 40) {
                targetConfetti({
                    particleCount: isLocal ? 2 : 4, // Heavily reduced particle count per blast
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: isLocal ? 1 : 0.8 },
                    colors: colors,
                    zIndex: 99999
                });
                targetConfetti({
                    particleCount: isLocal ? 2 : 4,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: isLocal ? 1 : 0.8 },
                    colors: colors,
                    zIndex: 99999
                });
                lastFrameTime = now;
            }

            if (now < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    // ── State management (data-driven loop) ─────────────────────────────────────

    var EFFECTS = [
        { id: 'star', fn: fireStarBurst },
        { id: 'bubble', fn: fireBubbleRain },
        { id: 'petal', fn: firePetalFall },
        { id: 'firefly', fn: fireFireflySwarm },
        { id: 'leaf', fn: fireLeafShower },
        { id: 'gold', fn: fireGoldConfetti },
        { id: 'aurora', fn: fireAuroraRibbons },
        { id: 'emoji', fn: fireEmojiPop },
        { id: 'fountain', fn: fireFountain },
        { id: 'ring', fn: fireRingPulse },
        { id: 'rain', fn: fireRainDown },
        { id: 'cannons', fn: fireSideCannons },
        { id: 'fireworks', fn: window.fireFireworksEffect },
    ];

    var enabledEffects = {};
    EFFECTS.forEach(function (e) { enabledEffects[e.id] = !!confettiSaved[e.id]; });

    function saveConfettiState() {
        localStorage.setItem(CONFETTI_KEY, JSON.stringify(enabledEffects));
    }

    EFFECTS.forEach(function (eff) {
        var cap = eff.id.charAt(0).toUpperCase() + eff.id.slice(1);
        var card = document.getElementById('confetti' + cap + 'Card');
        var pill = document.getElementById('confetti' + cap + 'Pill');
        var status = document.getElementById('confetti' + cap + 'Status');
        var preview = document.getElementById('confetti' + cap + 'Preview');

        function applyState() {
            var on = enabledEffects[eff.id];
            if (pill) pill.classList.toggle('active', on);
            if (card) card.classList.toggle('enabled', on);
            if (status) status.textContent = on ? 'ON' : 'OFF';
        }

        applyState();

        if (pill) {
            pill.addEventListener('click', function () {
                enabledEffects[eff.id] = !enabledEffects[eff.id];
                applyState();
                saveConfettiState();
            });
        }

        if (preview) {
            preview.addEventListener('click', function (e) {
                var r = preview.getBoundingClientRect();
                eff.fn(e.clientX - r.left, e.clientY - r.top, preview, true);
            });
        }
    });

    // ── playCelebration — fires only enabled effects ─────────────────────────────

    window.playCelebration = function () {
        var timerWidget = document.getElementById('widgetTimer');
        var rect = timerWidget
            ? timerWidget.getBoundingClientRect()
            : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var anyEnabled = EFFECTS.some(function (e) { return enabledEffects[e.id]; });
        if (!anyEnabled) {
            // nothing selected → fall back to star + bubble
            fireStarBurst(cx, cy, null, false);
            fireBubbleRain(cx, cy, null, false);
            return;
        }
        EFFECTS.forEach(function (eff) {
            if (enabledEffects[eff.id]) eff.fn(cx, cy, null, false);
        });
    };

});
