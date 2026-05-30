(function () {
  const previewDraftKey = "kuailebozi-admin-preview-draft";

  function boot() {
    const config = window.SITE_CONFIG;
    if (!config) {
      window.setTimeout(boot, 50);
      return;
    }

    const state = {
      entered: false,
      backgroundReady: false,
      musicIndex: 0,
      musicReady: false,
      musicPlaying: false,
      projects: [],
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
      blogReader: $("#blogReader"),
      blogBack: $("#blogBack"),
      blogType: $("#blogType"),
      blogTitle: $("#blogTitle"),
      blogSummary: $("#blogSummary"),
      blogMeta: $("#blogMeta"),
      blogSections: $("#blogSections"),
      blogActions: $("#blogActions"),
      linkList: $("#linkList"),
      contactDetail: $("#contactDetail"),
      navTabs: $$(".nav-tab"),
      panelViews: $$(".panel-view"),
      customCursor: $("#customCursor"),
      fixedPlayer: $("#fixedPlayer"),
      musicToggle: $("#musicToggle"),
      musicTitle: $("#musicTitle"),
      musicPrev: $("#musicPrev"),
      musicNext: $("#musicNext"),
      musicSelect: $("#musicSelect"),
      musicVolumeDown: $("#musicVolumeDown"),
      musicVolumeUp: $("#musicVolumeUp"),
      musicVolumeLabel: $("#musicVolumeLabel"),
      siteMusic: $("#siteMusic"),
      liveDialog: $("#liveDialog"),
    };

    function createLink(item, className) {
      const link = document.createElement(item.href || item.url ? "a" : "button");
      link.className = className;
      link.textContent = item.label;
      if (link.tagName === "BUTTON") {
        link.type = "button";
      } else {
        link.href = item.href || item.url || "#";
      }
      if (item.panel) {
        link.dataset.panel = item.panel;
      }
      if (item.value || item.description) {
        link.dataset.contactLabel = item.label || "";
        link.dataset.contactValue = item.value || "";
        link.dataset.contactDescription = item.description || `${item.label}: ${item.value}`;
      }
      if ((item.href || item.url || "").startsWith("http")) {
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
      const card = document.createElement("button");
      card.className = "project-card";
      card.type = "button";
      card.dataset.projectId = project.id || "";

      const type = document.createElement("span");
      const title = document.createElement("h4");
      const description = document.createElement("p");
      const meta = document.createElement("small");
      type.textContent = project.type;
      title.textContent = project.title;
      description.textContent = project.description;
      meta.textContent = project.updated ? `Blog / ${project.updated}` : "Blog";
      card.append(type, title, description, meta);
      return card;
    }

    function renderProjects(projects) {
      if (!Array.isArray(projects) || projects.length === 0) return;
      state.projects = projects;
      elements.projectGrid.hidden = false;
      elements.blogReader.hidden = true;
      elements.projectGrid.replaceChildren(
        ...projects.map((project) => createProjectCard({
          id: project.id,
          title: project.title,
          type: project.type,
          description: project.description || project.summary || "",
          updated: project.updated,
        }))
      );
    }

    function renderLinks(links) {
      if (!Array.isArray(links) || links.length === 0) return;
      elements.linkList.replaceChildren(
        ...links.map((item) => createLink({
          label: item.label,
          href: item.url || item.href,
          value: item.value,
          description: item.description,
        }, "social-link"))
      );
      elements.contactDetail.textContent = "选择一个通讯频道后，这里会显示对应联系方式。";
    }

    function shouldUsePreviewDraft() {
      return new URLSearchParams(window.location.search).get("preview") === "1";
    }

    function getPreviewDraftData() {
      if (!shouldUsePreviewDraft()) return null;

      try {
        const draft = JSON.parse(sessionStorage.getItem(previewDraftKey) || "null");
        return draft?.data || null;
      } catch {
        return null;
      }
    }

    function applyProjectData(data) {
      if (data.profile) {
        Object.assign(config.profile, data.profile);
        renderContent();
      }
      renderProjects(data.projects);
      renderLinks(data.links);
    }

    function loadProjectData() {
      const previewData = getPreviewDraftData();
      if (previewData) {
        applyProjectData(previewData);
        return Promise.resolve();
      }

      return fetch("assets/data/projects.json?v=content-1", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("Project data unavailable");
          return response.json();
        })
        .then(applyProjectData)
        .catch(() => {});
    }

    function applyInitialRoute() {
      const params = new URLSearchParams(window.location.search);
      const requestedPanel = params.get("panel");
      const requestedBlog = params.get("blog");

      if (["profile", "projects", "links", "home"].includes(requestedPanel)) {
        switchPanel(requestedPanel);
      }

      if (requestedBlog) {
        const project = state.projects.find((item) => item.id === requestedBlog);
        if (project) {
          switchPanel("projects");
          renderBlogDetail(project);
        }
      }
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
      if (!state.backgroundReady) return;
      elements.enterButton.disabled = false;
      elements.enterButton.classList.add("is-ready");
      elements.enterButton.querySelector("small").textContent = "进入基沃托斯";
    }

    function initEntry() {
      elements.enterButton.disabled = true;
      elements.enterButton.classList.remove("is-ready");
      elements.enterButton.querySelector("small").textContent = "背景加载中...";
      if (state.backgroundReady) enableEnterButton();
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

    function updateMusicVolumeLabel() {
      elements.musicVolumeLabel.textContent = `${Math.round(elements.siteMusic.volume * 100)}%`;
    }

    function setMusicVolume(volume) {
      elements.siteMusic.volume = clamp(volume, 0, 1);
      updateMusicVolumeLabel();
    }

    function playMusic() {
      if (!state.musicReady) {
        setMusicTrack(state.musicIndex);
        setMusicVolume(0.38);
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

    function changeMusicVolume(delta) {
      setMusicVolume(elements.siteMusic.volume + delta);
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
      const point = sourceEvent.changedTouches?.[0] || sourceEvent.touches?.[0] || sourceEvent;
      const eventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: point.clientX,
        clientY: point.clientY,
        screenX: point.screenX,
        screenY: point.screenY,
        button: sourceEvent.button || 0,
        buttons: sourceEvent.buttons || 0,
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

    function createForwardedPointerEvent(type, sourceEvent, options = {}) {
      const point = sourceEvent.changedTouches?.[0] || sourceEvent.touches?.[0] || sourceEvent;
      const PointerEventCtor = elements.liveBackground.contentWindow?.PointerEvent || window.PointerEvent;
      const eventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: point.clientX,
        clientY: point.clientY,
        screenX: point.screenX,
        screenY: point.screenY,
        button: sourceEvent.button || 0,
        buttons: sourceEvent.buttons || 0,
        ctrlKey: sourceEvent.ctrlKey,
        altKey: sourceEvent.altKey,
        shiftKey: sourceEvent.shiftKey,
        metaKey: sourceEvent.metaKey,
        pointerId: options.pointerId || sourceEvent.pointerId || 1,
        pointerType: options.pointerType || sourceEvent.pointerType || "mouse",
        isPrimary: options.isPrimary ?? sourceEvent.isPrimary ?? true,
        width: sourceEvent.width || 1,
        height: sourceEvent.height || 1,
        pressure: options.pressure ?? sourceEvent.pressure ?? 0.5,
        ...options,
      };

      if (typeof PointerEventCtor === "function") {
        return new PointerEventCtor(type, eventInit);
      }

      return createForwardedMouseEvent(type, sourceEvent, options);
    }

    function getLiveBackgroundTarget(clientX, clientY) {
      const liveDocument = elements.liveBackground.contentDocument;
      return liveDocument?.elementFromPoint(clientX, clientY);
    }

    function forwardLiveBackgroundPointer(event) {
      const target = getLiveBackgroundTarget(event.clientX, event.clientY);
      if (!target) return false;

      if (typeof (elements.liveBackground.contentWindow?.PointerEvent || window.PointerEvent) === "function") {
        target.dispatchEvent(createForwardedPointerEvent(event.type, event));
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

      return true;
    }

    function handleLiveBackgroundTouch(event) {
      if (!shouldForwardTouch(event)) return;
      forwardLiveBackgroundPointer(event);
    }

    function handleLiveBackgroundTap(event) {
      if (!shouldForwardTouch(event)) return;

      const touch = event.changedTouches?.[0] || event.touches?.[0];
      if (!touch) return;

      const target = getLiveBackgroundTarget(touch.clientX, touch.clientY);
      if (!target) return;

      target.dispatchEvent(createForwardedPointerEvent("pointerdown", event, {
        buttons: 1,
        pointerId: touch.identifier || 1,
        pointerType: "touch",
        isPrimary: true,
      }));
      target.dispatchEvent(createForwardedMouseEvent("mousedown", event, { buttons: 1 }));
      target.dispatchEvent(createForwardedPointerEvent("pointerup", event, {
        buttons: 0,
        pointerId: touch.identifier || 1,
        pointerType: "touch",
        isPrimary: true,
      }));
      target.dispatchEvent(createForwardedMouseEvent("mouseup", event, { buttons: 0 }));
      target.dispatchEvent(createForwardedMouseEvent("click", event, { buttons: 0 }));
    }

    function handleLiveDialogMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source === "kuailebozi-live-branch") {
        window.__LIVE_BG_BRANCH__ = event.data;
        return;
      }
      if (event.data?.source === "kuailebozi-live-ready") {
        state.backgroundReady = true;
        enableEnterButton();
        return;
      }
      if (event.data?.source !== "kuailebozi-live-dialog") return;

      const text = String(event.data.text || "").trim();
      elements.liveDialog.textContent = text;
      elements.liveDialog.classList.toggle("is-visible", Boolean(event.data.visible && text));
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

    function createMetaItem(label, value) {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      wrapper.append(term, detail);
      return wrapper;
    }

    function createBlogAction(link) {
      return createLink({
        label: link.label,
        href: link.url || link.href,
        value: link.value,
        description: link.description,
      }, "action-link");
    }

    function renderBlogDetail(project) {
      if (!project) return;
      elements.projectGrid.hidden = true;
      elements.blogReader.hidden = false;
      elements.blogType.textContent = project.type || "Blog";
      elements.blogTitle.textContent = project.title || "";
      elements.blogSummary.textContent = project.summary || project.description || "";
      elements.blogMeta.replaceChildren(
        createMetaItem("Status", project.status || "未设置"),
        createMetaItem("Updated", project.updated || "未设置"),
        createMetaItem("Tags", (project.tags || []).join(" / ") || "未设置")
      );
      elements.blogSections.replaceChildren(
        ...(project.sections || []).map((section) => {
          const block = document.createElement("section");
          block.className = "detail-section";
          const heading = document.createElement("h2");
          const body = document.createElement("p");
          heading.textContent = section.heading || "";
          body.textContent = section.body || "";
          block.append(heading, body);
          return block;
        })
      );
      elements.blogActions.replaceChildren(
        ...(project.links || []).map(createBlogAction)
      );
    }

    function showBlogList() {
      elements.projectGrid.hidden = false;
      elements.blogReader.hidden = true;
      elements.blogSections.replaceChildren();
      elements.blogActions.replaceChildren();
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
      elements.musicVolumeDown.addEventListener("click", () => changeMusicVolume(-0.08));
      elements.musicVolumeUp.addEventListener("click", () => changeMusicVolume(0.08));
      elements.siteMusic.addEventListener("ended", playNextTrack);
      elements.siteMusic.addEventListener("play", () => updateMusicState(true));
      elements.siteMusic.addEventListener("pause", () => updateMusicState(false));
      window.addEventListener("resize", resetPlayerPosition);
      elements.blogBack.addEventListener("click", showBlogList);
      elements.projectGrid.addEventListener("click", (event) => {
        const card = event.target.closest("[data-project-id]");
        if (!card) return;
        const project = state.projects.find((item) => item.id === card.dataset.projectId);
        renderBlogDetail(project);
      });

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
      elements.linkList.addEventListener("click", (event) => {
        const contact = event.target.closest("[data-contact-description]");
        if (!contact) return;
        event.preventDefault();
        elements.contactDetail.textContent = contact.dataset.contactDescription;
      });

      document.addEventListener("pointerdown", handleLiveBackgroundTouch, true);
      document.addEventListener("pointermove", handleLiveBackgroundTouch, true);
      document.addEventListener("pointerup", handleLiveBackgroundTouch, true);
      document.addEventListener("touchend", handleLiveBackgroundTap, { capture: true, passive: true });
      window.addEventListener("message", handleLiveDialogMessage);
    }

    renderContent();
    initMusicOptions();
    updateMusicVolumeLabel();
    elements.homeLayout.classList.add("is-profile-panel");
    loadProjectData().then(applyInitialRoute);
    bindEvents();
    cleanupOldBackgroundWorkers().finally(initEntry);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
