(function () {
  function boot() {
    const config = window.SITE_CONFIG;
    if (!config) {
      window.setTimeout(boot, 50);
      return;
    }

    const state = {
      entered: false,
    };

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const elements = {
      liveBackground: $("#liveBackground"),
      entryGate: $("#entryGate"),
      enterButton: $("#enterButton"),
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

    function autoEnterSite() {
      if (state.entered) return;
      state.entered = true;
      document.body.classList.add("has-entered");
      elements.entryGate.setAttribute("aria-hidden", "true");
    }

    function enableEnterButton() {
      elements.enterButton.disabled = false;
      elements.enterButton.classList.add("is-ready");
      elements.enterButton.querySelector("small").textContent = "进入基沃托斯";
    }

    function initEntry() {
      enableEnterButton();
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
    bindEvents();
    cleanupOldBackgroundWorkers().finally(initEntry);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
