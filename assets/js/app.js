(function () {
  function boot() {
    const config = window.SITE_CONFIG;
    if (!config) {
      window.setTimeout(boot, 50);
      return;
    }

    const backgroundVideos = {
      start: "assets/media/CH0295_home_Start_Idle_01.webm",
      idle: "assets/media/CH0295_home_Idle_01.webm",
    };

    const state = {
      entered: false,
      trackIndex: 0,
      muted: false,
      lobbyPhase: "start",
      audio: new Audio(),
    };

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const elements = {
      memoryLobby: $("#memoryLobby"),
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
        .then(updateTrackUi)
        .catch(updateTrackUi);
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

    function loadLobbyVideo(src) {
      const video = elements.memoryLobby;
      video.src = src;
      video.loop = false;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.load();
    }

    async function initLobbyVideo() {
      updateLoadingProgress(0);
      state.lobbyPhase = "start";
      loadLobbyVideo(backgroundVideos.start);

      try {
        await waitForVideoReady(elements.memoryLobby);
      } catch (_) {
        // Keep going so the visible page is not blocked forever by media errors.
      }

      updateLoadingProgress(1);
      elements.loadingLabel.textContent = "Ready";
      enableEnterButton();
      elements.memoryLobby.play().catch(() => {});
    }

    function replayIdleVideo() {
      const video = elements.memoryLobby;
      try {
        video.currentTime = 0;
      } catch (_) {
        loadLobbyVideo(backgroundVideos.idle);
      }
      video.play().catch(() => {});
    }

    function handleLobbyEnded() {
      if (state.lobbyPhase === "start") {
        state.lobbyPhase = "idle";
        loadLobbyVideo(backgroundVideos.idle);
        waitForVideoReady(elements.memoryLobby)
          .catch(() => {})
          .finally(() => elements.memoryLobby.play().catch(() => {}));
        return;
      }

      replayIdleVideo();
    }

    function removeOldMediaWorkers() {
      if (!("serviceWorker" in navigator)) return;
      return navigator.serviceWorker.getRegistrations()
        .then((registrations) => registrations.forEach((registration) => registration.unregister()))
        .catch(() => {});
    }

    function clearOldMediaCaches() {
      if (!("caches" in window)) return;
      return caches.keys()
        .then((keys) => keys
          .filter((key) => key.includes("kuailebozi"))
          .forEach((key) => caches.delete(key)))
        .catch(() => {});
    }

    function cleanupOldBackgroundWorkers() {
      return Promise.all([
        removeOldMediaWorkers(),
        clearOldMediaCaches(),
      ]);
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
      elements.memoryLobby.addEventListener("ended", handleLobbyEnded);
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
    }

    renderContent();
    loadTrack(0, false);
    bindEvents();
    cleanupOldBackgroundWorkers().finally(initLobbyVideo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
