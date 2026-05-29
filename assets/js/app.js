(function () {
  function boot() {
    const config = window.SITE_CONFIG;
    if (!config) {
      window.setTimeout(boot, 50);
      return;
    }

    const state = {
      entered: false,
      musicIndex: 0,
      musicReady: false,
      musicPlaying: false,
      playerDragging: false,
      playerMoved: false,
      playerPointerId: null,
      playerOffsetX: 0,
      playerOffsetY: 0,
    };

    const musicTracks = [
      { title: "Hello to Halo", src: "assets/music/hello-to-halo-ost.mp3" },
      { title: "Thanks to (KR Ver.)", src: "assets/music/thanks-to-kr-ver.mp3" },
      { title: "Hifumi Daisuki", src: "assets/music/hifumi-daisuki-ost.mp3" },
      { title: "Dolce Biblioteca", src: "assets/music/dolce-biblioteca-ost.mp3" },
    ];

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const elements = {
      liveBackground: $("#liveBackground"),
      entryGate: $("#entryGate"),
      enterButton: $("#enterButton"),
      homeLayout: $("#home"),
      heroPanel: $("#heroPanel"),
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
      customCursor: $("#customCursor"),
      fixedPlayer: $("#fixedPlayer"),
      musicToggle: $("#musicToggle"),
      musicTitle: $("#musicTitle"),
      musicPrev: $("#musicPrev"),
      musicNext: $("#musicNext"),
      musicSelect: $("#musicSelect"),
      siteMusic: $("#siteMusic"),
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
          return createProjectCard(project);
        })
      );

      elements.linkList.replaceChildren(
        ...config.links.map((item) => createLink(item, "social-link"))
      );
    }

    function createProjectCard(project) {
      const card = document.createElement("a");
      card.className = "project-card";
      card.href = project.href || `project.html?id=${encodeURIComponent(project.id || "")}`;
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
    }

    function renderProjects(projects) {
      if (!Array.isArray(projects) || projects.length === 0) return;
      elements.projectGrid.replaceChildren(
        ...projects.map((project) => createProjectCard({
          id: project.id,
          title: project.title,
          type: project.type,
          description: project.description || project.summary || "",
          href: `project.html?id=${encodeURIComponent(project.id)}`,
        }))
      );
    }

    function renderLinks(links) {
      if (!Array.isArray(links) || links.length === 0) return;
      elements.linkList.replaceChildren(
        ...links.map((item) => createLink({
          label: item.label,
          href: item.url || item.href,
        }, "social-link"))
      );
    }

    function loadProjectData() {
      return fetch("assets/data/projects.json?v=content-1", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Project data unavailable");
          return response.json();
        })
        .then((data) => {
          renderProjects(data.projects);
          renderLinks(data.links);
        })
        .catch(() => {});
    }

    function autoEnterSite() {
      if (state.entered) return;
      state.entered = true;
      window.scrollTo(0, 0);
      document.body.classList.add("has-entered");
      elements.entryGate.setAttribute("aria-hidden", "true");
      playMusic();
    }

    function enableEnterButton() {
      elements.enterButton.disabled = false;
      elements.enterButton.classList.add("is-ready");
      elements.enterButton.querySelector("small").textContent = "进入基沃托斯";
    }

    function initEntry() {
      enableEnterButton();
    }

    function setMusicTrack(index) {
      const track = musicTracks[index];
      const shouldResume = state.musicReady && !elements.siteMusic.paused;
      state.musicIndex = index;
      elements.siteMusic.src = track.src;
      elements.musicTitle.textContent = track.title;
      elements.musicSelect.value = String(index);
      if (shouldResume) {
        playMusic();
      }
    }

    function updateMusicState(isPlaying) {
      state.musicPlaying = isPlaying;
      elements.fixedPlayer.classList.toggle("is-playing", isPlaying);
      elements.musicToggle.setAttribute("aria-label", isPlaying ? "暂停音乐" : "播放音乐");
    }

    function playMusic() {
      if (!state.musicReady) {
        setMusicTrack(state.musicIndex);
        elements.siteMusic.volume = 0.38;
        state.musicReady = true;
      }

      elements.siteMusic.play()
        .then(() => updateMusicState(true))
        .catch(() => updateMusicState(false));
    }

    function pauseMusic() {
      elements.siteMusic.pause();
      updateMusicState(false);
    }

    function playNextTrack() {
      const nextIndex = (state.musicIndex + 1) % musicTracks.length;
      setMusicTrack(nextIndex);
      if (!state.musicPlaying) return;
      playMusic();
    }

    function playPreviousTrack() {
      const previousIndex = (state.musicIndex - 1 + musicTracks.length) % musicTracks.length;
      setMusicTrack(previousIndex);
      if (!state.musicPlaying) return;
      playMusic();
    }

    function selectMusicTrack(event) {
      const selectedIndex = Number(event.target.value);
      if (!Number.isInteger(selectedIndex) || !musicTracks[selectedIndex]) return;
      setMusicTrack(selectedIndex);
      if (!state.musicReady || state.musicPlaying) {
        playMusic();
      }
    }

    function toggleMusic() {
      if (elements.siteMusic.paused) {
        playMusic();
        return;
      }

      pauseMusic();
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function shouldForwardTouch(event) {
      if (!(event.target instanceof Element)) return true;

      const interactive = event.target.closest(
        "button, a, audio, input, select, textarea, [data-panel], .fixed-player"
      );

      return !interactive;
    }

    function createForwardedMouseEvent(type, sourceEvent, options = {}) {
      const eventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: sourceEvent.clientX,
        clientY: sourceEvent.clientY,
        screenX: sourceEvent.screenX,
        screenY: sourceEvent.screenY,
        button: sourceEvent.button,
        buttons: sourceEvent.buttons,
        ctrlKey: sourceEvent.ctrlKey,
        altKey: sourceEvent.altKey,
        shiftKey: sourceEvent.shiftKey,
        metaKey: sourceEvent.metaKey,
        ...options,
      };

      if (typeof MouseEvent === "function") {
        return new MouseEvent(type, eventInit);
      }

      const event = document.createEvent("MouseEvents");
      event.initMouseEvent(
        type,
        eventInit.bubbles,
        eventInit.cancelable,
        window,
        0,
        eventInit.screenX,
        eventInit.screenY,
        eventInit.clientX,
        eventInit.clientY,
        eventInit.ctrlKey,
        eventInit.altKey,
        eventInit.shiftKey,
        eventInit.metaKey,
        eventInit.button,
        null
      );
      return event;
    }

    function forwardLiveBackgroundPointer(event) {
      const liveDocument = elements.liveBackground.contentDocument;
      const target = liveDocument?.elementFromPoint(event.clientX, event.clientY);
      if (!target) return;

      const PointerEventCtor = elements.liveBackground.contentWindow?.PointerEvent || window.PointerEvent;
      if (typeof PointerEventCtor === "function") {
        target.dispatchEvent(new PointerEventCtor(event.type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          button: event.button,
          buttons: event.buttons,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          width: event.width,
          height: event.height,
          pressure: event.pressure,
        }));
      } else {
        const mouseType = {
          pointerdown: "mousedown",
          pointermove: "mousemove",
          pointerup: "mouseup",
        }[event.type];

        target.dispatchEvent(createForwardedMouseEvent(event.type, event));
        if (mouseType) {
          target.dispatchEvent(createForwardedMouseEvent(mouseType, event));
        }
      }

      if (event.type === "pointerup") {
        target.dispatchEvent(createForwardedMouseEvent("click", event, { buttons: 0 }));
      }
    }

    function handleLiveBackgroundTouch(event) {
      if (!shouldForwardTouch(event)) return;
      forwardLiveBackgroundPointer(event);
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

    function switchPanel(panelName) {
      const target = panelName === "home" ? "profile" : panelName;
      elements.homeLayout.classList.toggle("is-profile-panel", target === "profile");
      elements.navTabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.panel === target);
      });
      elements.panelViews.forEach((view) => {
        view.classList.toggle("is-active", view.dataset.panelView === target);
      });
    }

    function placePlayer(x, y) {
      const rect = elements.fixedPlayer.getBoundingClientRect();
      const gap = 12;
      const left = clamp(x, gap, window.innerWidth - rect.width - gap);
      const top = clamp(y, gap, window.innerHeight - rect.height - gap);
      elements.fixedPlayer.style.left = `${left}px`;
      elements.fixedPlayer.style.top = `${top}px`;
      elements.fixedPlayer.style.right = "auto";
      elements.fixedPlayer.style.bottom = "auto";
      elements.fixedPlayer.classList.add("is-placed");
    }

    function resetPlayerPosition() {
      elements.fixedPlayer.style.left = "";
      elements.fixedPlayer.style.top = "";
      elements.fixedPlayer.style.right = "";
      elements.fixedPlayer.style.bottom = "";
      elements.fixedPlayer.classList.remove("is-placed");
    }

    function startPlayerDrag(event) {
      if (event.target.closest(".music-toggle, .music-control, .music-select")) return;

      const rect = elements.fixedPlayer.getBoundingClientRect();
      state.playerDragging = true;
      state.playerMoved = false;
      state.playerPointerId = event.pointerId;
      state.playerOffsetX = event.clientX - rect.left;
      state.playerOffsetY = event.clientY - rect.top;
      elements.fixedPlayer.classList.add("is-dragging");
      elements.fixedPlayer.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }

    function movePlayer(event) {
      if (!state.playerDragging || event.pointerId !== state.playerPointerId) return;

      const x = event.clientX - state.playerOffsetX;
      const y = event.clientY - state.playerOffsetY;
      placePlayer(x, y);
      state.playerMoved = true;
      event.preventDefault();
    }

    function stopPlayerDrag(event) {
      if (!state.playerDragging || event.pointerId !== state.playerPointerId) return;

      state.playerDragging = false;
      state.playerPointerId = null;
      elements.fixedPlayer.classList.remove("is-dragging");
      elements.fixedPlayer.releasePointerCapture?.(event.pointerId);
      event.preventDefault();
    }

    function handlePlayerToggle(event) {
      if (state.playerMoved) {
        state.playerMoved = false;
        return;
      }

      toggleMusic();
    }

    function initMusicOptions() {
      elements.musicSelect.replaceChildren(
        ...musicTracks.map((track, index) => {
          const option = document.createElement("option");
          option.value = String(index);
          option.textContent = track.title;
          return option;
        })
      );
      elements.musicSelect.value = String(state.musicIndex);
    }

    function bindEvents() {
      elements.enterButton.addEventListener("pointerdown", forwardLiveBackgroundPointer);
      elements.enterButton.addEventListener("pointerup", forwardLiveBackgroundPointer);
      elements.enterButton.addEventListener("click", autoEnterSite);
      elements.fixedPlayer.addEventListener("pointerdown", startPlayerDrag);
      document.addEventListener("pointermove", movePlayer, true);
      document.addEventListener("pointerup", stopPlayerDrag, true);
      document.addEventListener("pointercancel", stopPlayerDrag, true);
      elements.fixedPlayer.addEventListener("lostpointercapture", stopPlayerDrag);
      elements.musicToggle.addEventListener("click", handlePlayerToggle);
      elements.musicPrev.addEventListener("click", playPreviousTrack);
      elements.musicNext.addEventListener("click", playNextTrack);
      elements.musicSelect.addEventListener("change", selectMusicTrack);
      elements.siteMusic.addEventListener("ended", playNextTrack);
      elements.siteMusic.addEventListener("play", () => updateMusicState(true));
      elements.siteMusic.addEventListener("pause", () => updateMusicState(false));
      window.addEventListener("resize", resetPlayerPosition);

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

      document.addEventListener("pointerdown", handleLiveBackgroundTouch, true);
      document.addEventListener("pointermove", handleLiveBackgroundTouch, true);
      document.addEventListener("pointerup", handleLiveBackgroundTouch, true);
    }

    renderContent();
    initMusicOptions();
    elements.homeLayout.classList.add("is-profile-panel");
    loadProjectData();
    bindEvents();
    cleanupOldBackgroundWorkers().finally(initEntry);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
