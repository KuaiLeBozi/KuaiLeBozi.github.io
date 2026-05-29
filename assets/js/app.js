(function () {
  const config = window.SITE_CONFIG;
  const state = {
    entered: false,
    trackIndex: 0,
    muted: false,
    audio: new Audio(),
  };

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    app: $("#app"),
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
    profileName: $("#profileName"),
    profileText: $("#profileText"),
    factList: $("#factList"),
    nowTitle: $("#nowTitle"),
    nowText: $("#nowText"),
    projectGrid: $("#projectGrid"),
    linkList: $("#linkList"),
  };

  function createLink(item, className) {
    const link = document.createElement("a");
    link.className = className;
    link.href = item.href;
    link.textContent = item.label;
    if (item.href.startsWith("http")) {
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
        card.href = project.href;
        if (project.href.startsWith("http")) {
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
      state.audio.play().catch(() => {
        elements.player.classList.add("needs-tap");
      });
    }
  }

  function enterSite() {
    state.entered = true;
    document.body.classList.add("has-entered");
    elements.entryGate.setAttribute("aria-hidden", "true");
    elements.player.classList.add("is-visible");
    loadTrack(0, true);
  }

  function togglePlay() {
    if (!state.entered) {
      enterSite();
      return;
    }

    if (state.audio.paused) {
      state.audio.play().finally(updateTrackUi);
    } else {
      state.audio.pause();
      updateTrackUi();
    }
  }

  function nextTrack() {
    loadTrack(state.trackIndex + 1, state.entered && !state.audio.paused);
  }

  function toggleMute() {
    state.muted = !state.muted;
    state.audio.muted = state.muted;
    updateTrackUi();
  }

  function bindEvents() {
    elements.enterButton.addEventListener("click", enterSite);
    elements.playPauseButton.addEventListener("click", togglePlay);
    elements.nextButton.addEventListener("click", nextTrack);
    elements.muteButton.addEventListener("click", toggleMute);
    state.audio.addEventListener("ended", () => loadTrack(state.trackIndex + 1, true));
    state.audio.addEventListener("play", updateTrackUi);
    state.audio.addEventListener("pause", updateTrackUi);
  }

  renderContent();
  loadTrack(0, false);
  bindEvents();
})();
