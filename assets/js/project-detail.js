(function () {
  const previewDraftKey = "kuailebozi-admin-preview-draft";
  const $ = (selector) => document.querySelector(selector);

  const elements = {
    title: $("#projectTitle"),
    type: $("#projectType"),
    summary: $("#projectSummary"),
    actions: $("#projectActions"),
    meta: $("#projectMeta"),
    sections: $("#projectSections"),
    liveBackground: $("#liveBackground"),
  };

  function getProjectId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || "diffusion";
  }

  function shouldUsePreviewDraft() {
    const params = new URLSearchParams(window.location.search);
    return params.get("preview") === "1";
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

  function createLink(link) {
    const anchor = document.createElement("a");
    anchor.className = "action-link";
    anchor.href = link.url;
    anchor.textContent = link.label;
    if (link.url.startsWith("http")) {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
    }
    return anchor;
  }

  function createMetaItem(label, value) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = label;
    detail.textContent = value;
    item.append(term, detail);
    return item;
  }

  function renderProject(project) {
    document.title = "KuaileBozi";
    elements.title.textContent = project.title;
    elements.type.textContent = project.type;
    elements.summary.textContent = project.summary;

    elements.actions.replaceChildren(
      createLink({ label: "返回首页", url: "index.html" }),
      createLink({ label: "编辑内容", url: `admin.html?id=${encodeURIComponent(project.id)}` }),
      ...(project.links || []).map(createLink)
    );

    const tags = (project.tags || []).join(" / ");
    elements.meta.replaceChildren(
      createMetaItem("Status", project.status || "未设置"),
      createMetaItem("Updated", project.updated || "未设置"),
      createMetaItem("Tags", tags || "未设置")
    );

    elements.sections.replaceChildren(
      ...(project.sections || []).map((section) => {
        const block = document.createElement("section");
        block.className = "detail-section";
        const heading = document.createElement("h2");
        const body = document.createElement("p");
        heading.textContent = section.heading;
        body.textContent = section.body;
        block.append(heading, body);
        return block;
      })
    );
  }

  function renderNotFound() {
    elements.title.textContent = "没有找到这个课题";
    elements.type.textContent = "Not Found";
    elements.summary.textContent = "请从首页重新进入，或者在后台检查项目 id 是否存在。";
    elements.actions.replaceChildren(createLink({ label: "返回首页", url: "index.html" }));
    elements.meta.replaceChildren();
    elements.sections.replaceChildren();
  }

  function createForwardedMouseEvent(type, sourceEvent, options = {}) {
    return new MouseEvent(type, {
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
    });
  }

  function shouldForwardTouch(event) {
    if (!(event.target instanceof Element)) return true;
    return !event.target.closest("button, a, input, select, textarea");
  }

  function forwardLiveBackgroundPointer(event) {
    if (!shouldForwardTouch(event)) return;
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
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
      }));
    }

    if (event.type === "pointerup") {
      target.dispatchEvent(createForwardedMouseEvent("click", event, { buttons: 0 }));
    }
  }

  const previewData = getPreviewDraftData();
  const dataPromise = previewData
    ? Promise.resolve(previewData)
    : fetch("assets/data/projects.json?v=content-1", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Unable to load project data");
      return response.json();
    });

  dataPromise
    .then((data) => {
      const project = (data.projects || []).find((item) => item.id === getProjectId());
      if (project) {
        renderProject(project);
        return;
      }
      renderNotFound();
    })
    .catch(renderNotFound);

  document.addEventListener("pointerdown", forwardLiveBackgroundPointer, true);
  document.addEventListener("pointermove", forwardLiveBackgroundPointer, true);
  document.addEventListener("pointerup", forwardLiveBackgroundPointer, true);
})();
