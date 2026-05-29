(function () {
  function boot() {
  const config = window.SITE_CONFIG;
  if (!config) {
    window.setTimeout(boot, 50);
    return;
  }
  const state = {
    entered: false,
    trackIndex: 0,
    muted: false,
    lobbySwitched: false,
    activeLobbyVideo: null,
    canvasRaf: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    lobbyVideoUrls: {},
    mediaCacheReady: Promise.resolve(),
    audio: new Audio(),
  };
  const backgroundVideos = [
    "assets/media/CH0295_home_Start_Idle_01.webm",
    "assets/media/CH0295_home_Idle_01.webm",
  ];
  const videoCacheName = "kuailebozi-background-videos-v1";
  const videoDbName = "kuailebozi-background-videos";
  const videoStoreName = "videos";
  const serviceWorkerPath = "sw.js";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const elements = {
    memoryCanvas: $("#memoryCanvas"),
    memoryLobby: $("#memoryLobby"),
    memoryLobbyIdle: $("#memoryLobbyIdle"),
    entryGate: $("#entryGate"),
    enterButton: $("#enterButton"),
    player: $("#player"),
    playPauseButton: $("#playPauseButton"),
    nextButton: $("#nextButton"),
    muteButton: $("#muteButton"),
    trackTitle: $("#trackTitle"),
    statusTrack: $("#statusTrack"),
    heroEyebrow: $("#heroEyebrow"),
    heroTitle: $("#heroTitle"),
    heroBio: $("#heroBio"),
    heroActions: $("#heroActions"),
    loadingProgress: $("#loadingProgress"),
    loadingLabel: $("#loadingLabel"),
    profileName: $("#profileName"),
    profileText: $("#profileText"),
    factList: $("#factList"),
    nowTitle: $("#nowTitle"),
    nowText: $("#nowText"),
    projectGrid: $("#projectGrid"),
    linkList: $("#linkList"),
    navTabs: $$(".nav-tab"),
    panelViews: $$(".panel-view"),
    customCursor: $("#customCursor"),
  };

  function createLink(item, className) {
    const link = document.createElement("a");
    link.className = className;
    link.href = item.href || "#";
    link.textContent = item.label;
    if (item.panel) {
      link.dataset.panel = item.panel;
    }
    if (item.href && item.href.startsWith("http")) {
      link.target = "_blank";
      link.rel = "noreferrer";
    }
    return link;
  }

  function renderContent() {
    const profile = config.profile;
    elements.heroEyebrow.textContent = profile.eyebrow;
    elements.heroTitle.textContent = profile.title;
    elements.heroBio.textContent = profile.bio;
    elements.profileName.textContent = profile.name;
    elements.profileText.textContent = profile.about;
    elements.nowTitle.textContent = profile.nowTitle;
    elements.nowText.textContent = profile.now;

    elements.heroActions.replaceChildren(
      ...config.actions.map((item) => createLink(item, "action-link"))
    );

    elements.factList.replaceChildren(
      ...profile.facts.map(([label, value]) => {
        const wrapper = document.createElement("div");
        const term = document.createElement("dt");
        const detail = document.createElement("dd");
        term.textContent = label;
        detail.textContent = value;
        wrapper.append(term, detail);
        return wrapper;
      })
    );

    elements.projectGrid.replaceChildren(
      ...config.projects.map((project) => {
        const card = document.createElement("a");
        card.className = "project-card";
        card.href = project.href || "#";
        if (project.panel) {
          card.dataset.panel = project.panel;
        }
        if (project.href && project.href.startsWith("http")) {
          card.target = "_blank";
          card.rel = "noreferrer";
        }

        const type = document.createElement("span");
        const title = document.createElement("h4");
        const description = document.createElement("p");
        type.textContent = project.type;
        title.textContent = project.title;
        description.textContent = project.description;
        card.append(type, title, description);
        return card;
      })
    );

    elements.linkList.replaceChildren(
      ...config.links.map((item) => createLink(item, "social-link"))
    );
  }

  function currentTrack() {
    return config.playlist[state.trackIndex];
  }

  function updateTrackUi() {
    const track = currentTrack();
    elements.trackTitle.textContent = track.title;
    if (elements.statusTrack) {
      elements.statusTrack.textContent = track.title;
    }
    elements.playPauseButton.setAttribute(
      "aria-label",
      state.audio.paused ? "Play music" : "Pause music"
    );
    elements.playPauseButton.querySelector("span").textContent = state.audio.paused ? ">" : "II";
    elements.muteButton.setAttribute("aria-label", state.muted ? "Unmute music" : "Mute music");
    elements.muteButton.querySelector("span").textContent = state.muted ? "X" : "M";
  }

  function loadTrack(index, shouldPlay) {
    state.trackIndex = (index + config.playlist.length) % config.playlist.length;
    state.audio.src = currentTrack().src;
    state.audio.loop = false;
    state.audio.muted = state.muted;
    updateTrackUi();

    if (shouldPlay) {
      playAudio();
    }
  }

  function playAudio() {
    return state.audio
      .play()
      .then(() => {
        updateTrackUi();
      })
      .catch(() => {
        // Browsers may block audible autoplay. Keep the player visible so the next click can resume.
        updateTrackUi();
      });
  }

  function autoEnterSite() {
    if (state.entered) return;
    state.entered = true;
    document.body.classList.add("has-entered");
    elements.entryGate.setAttribute("aria-hidden", "true");
    elements.player.classList.add("is-visible");
    loadTrack(0, true);
  }

  function enableEnterButton() {
    elements.enterButton.disabled = false;
    elements.enterButton.classList.add("is-ready");
    elements.enterButton.querySelector("small").textContent = "进入基沃托斯";
  }

  function updateLoadingProgress(ratio) {
    const progress = Math.max(0, Math.min(ratio, 1));
    elements.loadingProgress.style.transform = `scaleX(${progress})`;
    elements.loadingLabel.textContent = `Loading ${Math.round(progress * 100)}%`;
  }

  async function readResponseAsBlob(response, onProgress) {
    const total = Number(response.headers.get("content-length")) || 0;
    const reader = response.body && response.body.getReader ? response.body.getReader() : null;

    if (!reader) {
      const blob = await response.blob();
      onProgress(1);
      return blob;
    }

    const chunks = [];
    let received = 0;

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      received += result.value.byteLength;
      if (total > 0) {
        onProgress(received / total);
      }
    }

    onProgress(1);
    return new Blob(chunks, {
      type: response.headers.get("content-type") || "video/webm",
    });
  }

  function openVideoDb() {
    if (!("indexedDB" in window)) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(videoDbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(videoStoreName)) {
          db.createObjectStore(videoStoreName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  async function getVideoFromIndexedDb(src) {
    const db = await openVideoDb();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction(videoStoreName, "readonly");
      const store = transaction.objectStore(videoStoreName);
      const request = store.get(src);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  }

  async function putVideoInIndexedDb(src, blob) {
    const db = await openVideoDb();
    if (!db) return;

    await new Promise((resolve) => {
      const transaction = db.transaction(videoStoreName, "readwrite");
      const store = transaction.objectStore(videoStoreName);
      store.put(blob, src);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        resolve();
      };
    });
  }

  async function cacheVideo(src, onProgress) {
    let cache = null;
    let cached = null;

    try {
      cache = "caches" in window ? await caches.open(videoCacheName) : null;
      cached = cache ? await cache.match(src) : null;
    } catch (_) {
      cache = null;
      cached = null;
    }

    if (cached) {
      onProgress(1);
      return src;
    }

    const indexedDbBlob = await getVideoFromIndexedDb(src);
    if (indexedDbBlob) {
      onProgress(1);
      return src;
    }

    const response = await fetch(src, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Unable to cache video: ${src}`);
    }

    const blob = await readResponseAsBlob(response, onProgress);
    if (cache) {
      try {
        await cache.put(src, new Response(blob, { headers: { "content-type": blob.type } }));
      } catch (_) {
        // Some embedded browsers expose Cache Storage but reject large media writes.
      }
    }
    await putVideoInIndexedDb(src, blob);
    return src;
  }

  async function cacheLobbyVideos() {
    await state.mediaCacheReady;

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      updateLoadingProgress(1);
      backgroundVideos.forEach((src) => {
        state.lobbyVideoUrls[src] = src;
      });
      return;
    }

    const progressByVideo = new Map(backgroundVideos.map((src) => [src, 0]));
    const updateTotalProgress = (src, ratio) => {
      progressByVideo.set(src, Math.max(0, Math.min(ratio, 1)));
      const total = Array.from(progressByVideo.values()).reduce((sum, value) => sum + value, 0);
      updateLoadingProgress(total / backgroundVideos.length);
    };

    await Promise.all(
      backgroundVideos.map((src) => cacheVideo(src, (ratio) => updateTotalProgress(src, ratio)))
    );

    backgroundVideos.forEach((src) => {
      state.lobbyVideoUrls[src] = src;
    });
  }

  function waitForVideoReady(video) {
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("loadeddata", handleReady);
        video.removeEventListener("error", handleError);
      };
      const handleReady = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("Lobby video failed to decode."));
      };

      video.addEventListener("canplay", handleReady, { once: true });
      video.addEventListener("loadeddata", handleReady, { once: true });
      video.addEventListener("error", handleError, { once: true });
      video.load();
    });
  }

  function seekToStart(video) {
    try {
      video.currentTime = 0;
    } catch (_) {
      // Some media containers do not allow precise seeks before metadata is fully settled.
    }
  }

  function resizeMemoryCanvas() {
    const canvas = elements.memoryCanvas;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(window.innerWidth * pixelRatio));
    const height = Math.max(1, Math.round(window.innerHeight * pixelRatio));

    if (state.canvasWidth === width && state.canvasHeight === height) {
      return;
    }

    state.canvasWidth = width;
    state.canvasHeight = height;
    canvas.width = width;
    canvas.height = height;
  }

  function drawCoverFrame(context, video) {
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      return;
    }

    const targetWidth = elements.memoryCanvas.width;
    const targetHeight = elements.memoryCanvas.height;
    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    const x = (targetWidth - width) / 2;
    const y = (targetHeight - height) / 2;

    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(video, x, y, width, height);
  }

  function startCanvasRenderer() {
    const context = elements.memoryCanvas.getContext("2d", { alpha: false });
    if (!context) {
      return;
    }

    const render = () => {
      resizeMemoryCanvas();
      drawCoverFrame(context, state.activeLobbyVideo);
      state.canvasRaf = window.requestAnimationFrame(render);
    };

    window.cancelAnimationFrame(state.canvasRaf);
    render();
  }

  function setActiveLobbyVideo(video) {
    state.activeLobbyVideo = video;
  }

  function registerVideoServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return Promise.resolve();
    }

    return navigator.serviceWorker
      .register(serviceWorkerPath)
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        if (navigator.serviceWorker.controller) {
          return undefined;
        }

        return new Promise((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
          window.setTimeout(resolve, 1500);
        });
      })
      .catch(() => {});
  }

  async function enterWhenLobbyReady() {
    updateLoadingProgress(0);

    const finish = () => {
      if (state.entered) return;
      updateLoadingProgress(1);
      elements.loadingLabel.textContent = "Ready";
      enableEnterButton();
    };

    try {
      await cacheLobbyVideos();
      elements.memoryLobby.src = state.lobbyVideoUrls[backgroundVideos[0]];
      elements.memoryLobbyIdle.src = state.lobbyVideoUrls[backgroundVideos[1]];
      elements.memoryLobby.load();
      elements.memoryLobbyIdle.load();
      await Promise.all([
        waitForVideoReady(elements.memoryLobby),
        waitForVideoReady(elements.memoryLobbyIdle),
      ]);
      setActiveLobbyVideo(elements.memoryLobby);
      startCanvasRenderer();
      await elements.memoryLobby.play().catch(() => {});
      finish();
    } catch (_) {
      elements.memoryLobby.src = backgroundVideos[0];
      elements.memoryLobbyIdle.src = backgroundVideos[1];
      elements.memoryLobby.load();
      elements.memoryLobbyIdle.load();
      setActiveLobbyVideo(elements.memoryLobby);
      startCanvasRenderer();
      elements.memoryLobby.play().catch(() => {});
      finish();
    }
  }

  function togglePlay() {
    if (state.audio.paused) {
      playAudio();
    } else {
      state.audio.pause();
      updateTrackUi();
    }
  }

  function nextTrack() {
    loadTrack(state.trackIndex + 1, !state.audio.paused);
  }

  function toggleMute() {
    state.muted = !state.muted;
    state.audio.muted = state.muted;
    updateTrackUi();
  }

  function switchPanel(panelName) {
    const target = panelName === "home" ? "profile" : panelName;
    elements.navTabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.panel === target);
    });
    elements.panelViews.forEach((view) => {
      view.classList.toggle("is-active", view.dataset.panelView === target);
    });
  }

  function updateCursor(event) {
    elements.customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
  }

  function bindEvents() {
    elements.enterButton.addEventListener("click", autoEnterSite);
    elements.playPauseButton.addEventListener("click", togglePlay);
    elements.nextButton.addEventListener("click", nextTrack);
    elements.muteButton.addEventListener("click", toggleMute);
    state.audio.addEventListener("ended", () => loadTrack(state.trackIndex + 1, true));
    state.audio.addEventListener("play", updateTrackUi);
    state.audio.addEventListener("pause", updateTrackUi);

    [...elements.navTabs, $(".brand")].forEach((control) => {
      control.addEventListener("click", () => switchPanel(control.dataset.panel));
    });
    document.addEventListener("click", (event) => {
      const panelLink = event.target.closest("[data-panel]");
      if (!panelLink || panelLink.classList.contains("nav-tab") || panelLink.classList.contains("brand")) {
        return;
      }
      event.preventDefault();
      switchPanel(panelLink.dataset.panel);
    });

    document.addEventListener("pointermove", updateCursor);
    window.addEventListener("resize", resizeMemoryCanvas);

    elements.memoryLobby.addEventListener("ended", () => {
      if (state.lobbySwitched) return;
      state.lobbySwitched = true;
      elements.memoryLobby.pause();
      seekToStart(elements.memoryLobbyIdle);
      setActiveLobbyVideo(elements.memoryLobbyIdle);
      elements.memoryLobbyIdle.play().catch(() => {});
    });
  }

  state.mediaCacheReady = registerVideoServiceWorker();
  renderContent();
  loadTrack(0, false);
  bindEvents();
  enterWhenLobbyReady();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
