(function () {
  const config = window.SITE_CONFIG;
  const state = {
    entered: false,
    trackIndex: 0,
    muted: false,
    dragging: false,
    dragOffset: { x: 0, y: 0 },
    audio: new Audio(),
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const elements = {
    entryGate: $("#entryGate"),
    player: $("#player"),
    audioUnlock: $("#audioUnlock"),
    audioUnlockButton: $("#audioUnlockButton"),
    playPauseButton: $("#playPauseButton"),
    nextButton: $("#nextButton"),
    muteButton: $("#muteButton"),
    trackTitle: $("#trackTitle"),
    statusTrack: $("#statusTrack"),
    heroEyebrow: $("#heroEyebrow"),
    heroTitle: $("#heroTitle"),
    heroBio: $("#heroBio"),
    heroActions: $("#heroActions"),
    profileName: $("#profileName"),
    profileText: $("#profileText"),
    factList: $("#factList"),
    nowTitle: $("#nowTitle"),
    nowText: $("#nowText"),
    projectGrid: $("#projectGrid"),
    linkList: $("#linkList"),
    navTabs: $$(".nav-tab"),
    panelViews: $$(".panel-view"),
    characterDock: $("#characterDock"),
    dragHandle: $("#dragHandle"),
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
    elements.statusTrack.textContent = track.title;
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
        elements.audioUnlock.classList.remove("is-visible");
        updateTrackUi();
      })
      .catch(() => {
        elements.audioUnlock.classList.add("is-visible");
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

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getPoint(event) {
    return event.touches ? event.touches[0] : event;
  }

  function startDrag(event) {
    if (window.innerWidth < 900) return;
    const point = getPoint(event);
    const rect = elements.characterDock.getBoundingClientRect();
    state.dragging = true;
    state.dragOffset.x = point.clientX - rect.left;
    state.dragOffset.y = point.clientY - rect.top;
    elements.characterDock.classList.add("is-dragging");
    document.body.classList.add("is-dragging-model");
  }

  function moveDrag(event) {
    if (!state.dragging) return;
    const point = getPoint(event);
    const width = elements.characterDock.offsetWidth;
    const height = elements.characterDock.offsetHeight;
    const left = clamp(point.clientX - state.dragOffset.x, 12, window.innerWidth - width - 12);
    const top = clamp(point.clientY - state.dragOffset.y, 88, window.innerHeight - height - 12);
    elements.characterDock.style.left = `${left}px`;
    elements.characterDock.style.top = `${top}px`;
    elements.characterDock.style.right = "auto";
  }

  function endDrag() {
    state.dragging = false;
    elements.characterDock.classList.remove("is-dragging");
    document.body.classList.remove("is-dragging-model");
  }

  function bindEvents() {
    elements.audioUnlockButton.addEventListener("click", playAudio);
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
    elements.dragHandle.addEventListener("pointerdown", startDrag);
    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", endDrag);
    elements.dragHandle.addEventListener("mousedown", startDrag);
    document.addEventListener("mousemove", moveDrag);
    document.addEventListener("mouseup", endDrag);
    elements.dragHandle.addEventListener("touchstart", startDrag, { passive: true });
    document.addEventListener("touchmove", moveDrag, { passive: true });
    document.addEventListener("touchend", endDrag);
  }

  renderContent();
  loadTrack(0, false);
  bindEvents();
  window.setTimeout(autoEnterSite, 1450);
})();
