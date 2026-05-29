(function () {
  const repoOwner = "KuaiLeBozi";
  const repoName = "KuaiLeBozi.github.io";
  const branch = "main";
  const dataPath = "assets/data/projects.json";

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    form: $("#adminForm"),
    token: $("#githubToken"),
    mode: $("#contentMode"),
    projectSelectWrap: $("#projectSelectWrap"),
    projectEditor: $("#projectEditor"),
    linksEditor: $("#linksEditor"),
    select: $("#projectSelect"),
    title: $("#projectTitleInput"),
    type: $("#projectTypeInput"),
    status: $("#projectStatusInput"),
    updated: $("#projectUpdatedInput"),
    summary: $("#projectSummaryInput"),
    tags: $("#projectTagsInput"),
    sections: $("#projectSectionsInput"),
    links: $("#projectLinksInput"),
    siteLinks: $("#siteLinksInput"),
    message: $("#adminStatus"),
    preview: $("#previewLink"),
    cursor: $("#customCursor"),
    liveBackground: $("#liveBackground"),
  };

  let contentData = { links: [], projects: [] };
  let fileSha = "";

  function setStatus(message, isError = false) {
    elements.message.textContent = message;
    elements.message.classList.toggle("is-error", isError);
  }

  function getSelectedProject() {
    return contentData.projects.find((project) => project.id === elements.select.value);
  }

  function sectionsToText(sections) {
    return (sections || [])
      .map((section) => `${section.heading || ""}\n${section.body || ""}`.trim())
      .join("\n\n");
  }

  function textToSections(text) {
    return text
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split(/\n/);
        return {
          heading: lines.shift().trim(),
          body: lines.join("\n").trim(),
        };
      });
  }

  function linksToText(links) {
    return (links || [])
      .map((link) => `${link.label || ""} | ${link.url || ""}`)
      .join("\n");
  }

  function textToLinks(text) {
    return text
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...urlParts] = line.split("|");
        return {
          label: label.trim(),
          url: urlParts.join("|").trim(),
        };
      })
      .filter((link) => link.label && link.url);
  }

  function fillProject(project) {
    if (!project) return;
    elements.title.value = project.title || "";
    elements.type.value = project.type || "";
    elements.status.value = project.status || "";
    elements.updated.value = project.updated || "";
    elements.summary.value = project.summary || "";
    elements.tags.value = (project.tags || []).join(", ");
    elements.sections.value = sectionsToText(project.sections);
    elements.links.value = linksToText(project.links);
    elements.preview.href = `project.html?id=${encodeURIComponent(project.id)}`;
  }

  function fillSiteLinks() {
    elements.siteLinks.value = linksToText(contentData.links);
  }

  function syncProjectFromForm() {
    const project = getSelectedProject();
    if (!project) return;
    project.title = elements.title.value.trim();
    project.type = elements.type.value.trim();
    project.status = elements.status.value.trim();
    project.updated = elements.updated.value;
    project.summary = elements.summary.value.trim();
    project.description = project.summary;
    project.tags = elements.tags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    project.sections = textToSections(elements.sections.value);
    project.links = textToLinks(elements.links.value);
  }

  function syncLinksFromForm() {
    contentData.links = textToLinks(elements.siteLinks.value);
  }

  function setMode(mode) {
    const editingLinks = mode === "links";
    elements.projectSelectWrap.hidden = editingLinks;
    elements.projectEditor.hidden = editingLinks;
    elements.linksEditor.hidden = !editingLinks;
    elements.preview.href = editingLinks ? "index.html" : `project.html?id=${encodeURIComponent(elements.select.value || "diffusion")}`;
    if (editingLinks) {
      fillSiteLinks();
      return;
    }
    fillProject(getSelectedProject());
  }

  function renderProjectOptions() {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");

    elements.select.replaceChildren(
      ...contentData.projects.map((project) => {
        const option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.title;
        return option;
      })
    );

    const initial = contentData.projects.find((project) => project.id === requestedId)
      || contentData.projects[0];
    if (initial) {
      elements.select.value = initial.id;
      fillProject(initial);
    }
  }

  function decodeBase64Utf8(value) {
    const binary = atob(value.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function loadLocalData() {
    return fetch(`${dataPath}?v=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("无法读取本地数据");
        return response.json();
      })
      .then((data) => {
        contentData = data;
        renderProjectOptions();
        fillSiteLinks();
        setMode(elements.mode.value);
        setStatus("已读取本地内容。粘贴 GitHub Token 后可以保存到仓库。");
      });
  }

  function loadRemoteData(token) {
    return verifyOwnerToken(token)
      .then(() => fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dataPath}?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }))
      .then((response) => {
        if (!response.ok) throw new Error("Token 无法读取仓库内容，请检查权限。");
        return response.json();
      })
      .then((file) => {
        fileSha = file.sha;
        contentData = JSON.parse(decodeBase64Utf8(file.content));
        renderProjectOptions();
        fillSiteLinks();
        setMode(elements.mode.value);
        setStatus("已连接 GitHub，当前内容来自远程仓库。");
      });
  }

  function fetchRemoteFileSha(token) {
    return fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dataPath}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Token 无法读取仓库内容，请检查权限。");
        return response.json();
      })
      .then((file) => {
        fileSha = file.sha;
      });
  }

  function verifyOwnerToken(token) {
    return fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Token 无法验证 GitHub 账号。");
        return response.json();
      })
      .then((user) => {
        if ((user.login || "").toLowerCase() !== repoOwner.toLowerCase()) {
          throw new Error(`当前 Token 属于 ${user.login || "未知账号"}，只有 ${repoOwner} 可以保存。`);
        }
      });
  }

  function saveRemoteData(token) {
    return verifyOwnerToken(token)
      .then(() => {
        if (fileSha) return null;
        return fetchRemoteFileSha(token);
      })
      .then(() => {
        const body = {
          message: "Update project content from admin page",
          content: encodeBase64Utf8(`${JSON.stringify(contentData, null, 2)}\n`),
          branch,
        };
        if (fileSha) {
          body.sha = fileSha;
        }

        return fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${dataPath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify(body),
        });
      })
      .then((response) => {
        if (!response.ok) throw new Error("保存失败，请确认 Token 有 Contents: Read and write 权限。");
        return response.json();
      })
      .then((result) => {
        fileSha = result.content.sha;
        setStatus("已保存到 GitHub。GitHub Pages 可能需要几十秒刷新。");
      });
  }

  function updateCursor(event) {
    elements.cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
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

  elements.token.addEventListener("change", () => {
    const token = elements.token.value.trim();
    if (!token) return;
    setStatus("正在连接 GitHub。");
    loadRemoteData(token).catch((error) => setStatus(error.message, true));
  });

  elements.mode.addEventListener("change", () => setMode(elements.mode.value));
  elements.select.addEventListener("change", () => {
    fillProject(getSelectedProject());
    elements.preview.href = `project.html?id=${encodeURIComponent(elements.select.value)}`;
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const token = elements.token.value.trim();
    if (!token) {
      setStatus("请先粘贴 GitHub Token。", true);
      return;
    }
    if (elements.mode.value === "links") {
      syncLinksFromForm();
    } else {
      syncProjectFromForm();
    }
    setStatus("正在保存到 GitHub。");
    saveRemoteData(token).catch((error) => setStatus(error.message, true));
  });

  document.addEventListener("pointermove", updateCursor);
  document.addEventListener("pointerdown", forwardLiveBackgroundPointer, true);
  document.addEventListener("pointermove", forwardLiveBackgroundPointer, true);
  document.addEventListener("pointerup", forwardLiveBackgroundPointer, true);

  loadLocalData()
    .catch((error) => setStatus(error.message, true));
})();
