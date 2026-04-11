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
    var dateEl  = document.getElementById('liveDate');

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

    // ── Sidebar toggle ──────────────────────────────────────

    var sidebarBtns = document.querySelectorAll('.sidebar-btn[data-target]');
    sidebarBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var targetId = btn.dataset.target;
            var widget   = document.getElementById(targetId);
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
            var widget   = document.getElementById(targetId);
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
            startLeft  = rect.left;
            startTop   = rect.top;
            startMouseX = e.clientX;
            startMouseY = e.clientY;

            // Freeze position as explicit left/top (remove any CSS centering)
            widget.style.left = startLeft + 'px';
            widget.style.top  = startTop  + 'px';
            widget.style.right  = 'auto';
            widget.style.margin = '0';

            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var dx = e.clientX - startMouseX;
            var dy = e.clientY - startMouseY;

            var newLeft = startLeft + dx;
            var newTop  = startTop  + dy;

            // Clamp inside viewport (leave a 20px margin)
            var minLeft = 68 + 4; // sidebar width + gap
            var maxLeft = window.innerWidth  - widget.offsetWidth  - 4;
            var minTop  = 0;
            var maxTop  = window.innerHeight - widget.offsetHeight - 4;

            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
            newTop  = Math.max(minTop,  Math.min(maxTop,  newTop));

            widget.style.left = newLeft + 'px';
            widget.style.top  = newTop  + 'px';
        });

        document.addEventListener('mouseup', function () {
            dragging = false;
        });
    }

    // Attach draggable to all widgets
    document.querySelectorAll('.widget').forEach(function (widget) {
        var handle = widget.querySelector('.widget-header');
        if (handle) makeDraggable(widget, handle);
    });

    // ── Background switcher (still images + optional muted YouTube URL) ─────

    var sceneYoutube = document.getElementById('sceneYoutube');
    var ytFrame      = document.getElementById('sceneYoutubeFrame');
    var fallingEl    = document.getElementById('fallingLeaves');
    var bgGrid       = document.getElementById('bgGrid');
    var bgYtInput    = document.getElementById('bgYtUrlInput');
    var bgYtApply    = document.getElementById('bgYtApplyBtn');

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
        // Route external URLs through the local proxy to avoid CORS blocks
        var src = /^https?:\/\//i.test(url)
            ? '/api/proxy?url=' + encodeURIComponent(url)
            : url;
        fallingEl.style.backgroundImage = "url('" + src + "')";
        fallingEl.style.backgroundColor = '';
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

    function buildBgGrid(files) {
        if (!bgGrid) return;
        bgGrid.innerHTML = '';
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
                document.documentElement.requestFullscreen().catch(function () {});
            } else {
                document.exitFullscreen().catch(function () {});
            }
        });

        document.addEventListener('fullscreenchange', function () {
            btnFullscreen.title = document.fullscreenElement ? 'Exit Fullscreen' : 'Toggle Fullscreen';
        });
    }

});