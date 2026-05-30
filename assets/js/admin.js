(function () {
  const repoOwner = "KuaiLeBozi";
  const repoName = "KuaiLeBozi.github.io";
  const branch = "main";
  const dataPath = "assets/data/projects.json";
  const previewDraftKey = "kuailebozi-admin-preview-draft";

  const $ = (selector) => document.querySelector(selector);

  const elements = {
    form: $("#adminForm"),
    token: $("#githubToken"),
    loginButton: $("#loginButton"),
    loginState: $("#loginState"),
    mode: $("#contentMode"),
    projectSelectWrap: $("#projectSelectWrap"),
    projectEditor: $("#projectEditor"),
    profileEditor: $("#profileEditor"),
    linksEditor: $("#linksEditor"),
    select: $("#projectSelect"),
    projectMarkdown: $("#projectMarkdownInput"),
    profileMarkdown: $("#profileMarkdownInput"),
    siteLinks: $("#siteLinksInput"),
    save: $("#saveProject"),
    message: $("#adminStatus"),
    preview: $("#previewLink"),
    liveBackground: $("#liveBackground"),
  };

  const defaultProfile = {
    eyebrow: "联邦搜查部 SCHALE / 个人档案",
    title: "欢迎，老师。",
    bio: "这里是 KuaileBozi 的个人主页，用来收纳项目、笔记、研究记录和一些正在进行的小实验。XWX",
    name: "KuaileBozi",
    about: "华中科技大学网络空间安全学院 2024 级学生，目前在实习与探索 diffusion 等方向。华科七边形一员，努力把有趣的想法做成能跑起来的小东西。XWX",
    nowTitle: "正在实习与研究 diffusion",
    now: "当前关注方向包括生成模型、网络空间安全、前端交互和一些个人实验项目。欢迎用 GitHub 账号在下方留言交流。>w<",
    facts: [
      ["Site", "KuaileBozi.github.io"],
      ["School", "华中科技大学网络空间安全学院"],
      ["Grade", "2024 级"],
      ["Focus", "Diffusion / AI / Cybersecurity"],
      ["Team", "华科七边形"],
    ],
  };

  let contentData = { profile: { ...defaultProfile }, links: [], projects: [] };
  let fileSha = "";
  let activeMode = "projects";
  let activeProjectId = "";

  function setStatus(message, isError = false) {
    elements.message.textContent = message;
    elements.message.classList.toggle("is-error", isError);
  }

  function normalizeContentData(data) {
    contentData = {
      profile: {
        ...defaultProfile,
        ...(data?.profile || {}),
        facts: Array.isArray(data?.profile?.facts) ? data.profile.facts : defaultProfile.facts,
      },
      links: Array.isArray(data?.links) ? data.links : [],
      projects: Array.isArray(data?.projects) ? data.projects : [],
    };
  }

  function getProjectById(id) {
    return contentData.projects.find((project) => project.id === id);
  }

  function getSelectedProject() {
    return getProjectById(elements.select.value);
  }

  function getActiveProject() {
    return getProjectById(activeProjectId || elements.select.value);
  }

  function sectionsToMarkdown(sections) {
    return (sections || [])
      .map((section) => `## ${section.heading || "未命名段落"}\n\n${section.body || ""}`.trim())
      .join("\n\n");
  }

  function linksToMarkdown(links) {
    return (links || [])
      .map((link) => `- ${link.label || ""} | ${link.url || link.href || link.value || ""} | ${link.description || ""}`)
      .join("\n");
  }

  function textToLinks(text) {
    return text
      .split(/\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*]\s+/, ""))
      .filter(Boolean)
      .map((line) => {
        const [label, value = "", ...descriptionParts] = line.split("|");
        const trimmedValue = value.trim();
        const isUrl = /^(https?:|mailto:)/i.test(trimmedValue);
        return {
          label: label.trim(),
          ...(isUrl ? { url: trimmedValue } : { value: trimmedValue }),
          description: descriptionParts.join("|").trim() || `${label.trim()}: ${trimmedValue}`,
        };
      })
      .filter((link) => link.label && (link.url || link.value));
  }

  function factsToMarkdown(facts) {
    return (facts || [])
      .map(([label, value]) => `- ${label || ""} | ${value || ""}`)
      .join("\n");
  }

  function textToFacts(text) {
    return text
      .split(/\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^[-*]\s+/, ""))
      .filter(Boolean)
      .map((line) => {
        const [label, ...valueParts] = line.split("|");
        return [label.trim(), valueParts.join("|").trim()];
      })
      .filter(([label, value]) => label && value);
  }

  function parseFrontMatter(markdown) {
    const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    const meta = {};
    let body = markdown;
    if (match) {
      match[1].split(/\n/).forEach((line) => {
        const separator = line.indexOf(":");
        if (separator < 0) return;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        if (key) meta[key] = value;
      });
      body = markdown.slice(match[0].length);
    }
    return { meta, body: body.trim() };
  }

  function frontMatterToMarkdown(meta) {
    return [
      "---",
      ...Object.entries(meta).map(([key, value]) => `${key}: ${value || ""}`),
      "---",
    ].join("\n");
  }

  function splitMarkdownSections(markdown) {
    const lines = markdown.split(/\n/);
    const intro = [];
    const sections = [];
    let current = null;

    lines.forEach((line) => {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        current = { heading: heading[1].trim(), body: [] };
        sections.push(current);
        return;
      }
      if (current) {
        current.body.push(line);
      } else {
        intro.push(line);
      }
    });

    return {
      intro: intro.join("\n").trim(),
      sections: sections.map((section) => ({
        heading: section.heading,
        body: section.body.join("\n").trim(),
      })),
    };
  }

  function extractTitle(markdown, fallback = "") {
    const lines = markdown.split(/\n/);
    const index = lines.findIndex((line) => /^#\s+/.test(line));
    if (index < 0) return { title: fallback, body: markdown.trim() };
    const title = lines[index].replace(/^#\s+/, "").trim();
    lines.splice(index, 1);
    return { title: title || fallback, body: lines.join("\n").trim() };
  }

  function projectToMarkdown(project) {
    const meta = frontMatterToMarkdown({
      id: project.id || "",
      type: project.type || "",
      status: project.status || "",
      updated: project.updated || "",
      tags: (project.tags || []).join(", "),
    });
    const summary = project.summary || project.description || "";
    const links = linksToMarkdown(project.links);
    return [
      meta,
      `# ${project.title || "未命名文章"}`,
      summary,
      sectionsToMarkdown(project.sections),
      links ? `## Links\n\n${links}` : "",
    ].filter(Boolean).join("\n\n");
  }

  function markdownToProject(markdown, fallbackProject) {
    const { meta, body } = parseFrontMatter(markdown);
    const { title, body: withoutTitle } = extractTitle(body, fallbackProject.title || "未命名文章");
    const { intro, sections } = splitMarkdownSections(withoutTitle);
    const normalSections = [];
    let links = [];

    sections.forEach((section) => {
      if (section.heading.toLowerCase() === "links") {
        links = textToLinks(section.body);
        return;
      }
      normalSections.push(section);
    });

    const summary = intro.trim();
    return {
      ...fallbackProject,
      id: meta.id || fallbackProject.id,
      type: meta.type || fallbackProject.type || "Blog",
      title,
      summary,
      description: summary,
      status: meta.status || fallbackProject.status || "",
      updated: meta.updated || fallbackProject.updated || "",
      tags: (meta.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      sections: normalSections,
      links,
    };
  }

  function profileToMarkdown(profile) {
    return [
      frontMatterToMarkdown({
        eyebrow: profile.eyebrow || "",
        name: profile.name || "",
      }),
      `# ${profile.title || ""}`,
      profile.bio || "",
      "## About",
      profile.about || "",
      "## Now",
      `### ${profile.nowTitle || ""}`,
      profile.now || "",
      "## Facts",
      factsToMarkdown(profile.facts),
    ].filter(Boolean).join("\n\n");
  }

  function markdownToProfile(markdown) {
    const { meta, body } = parseFrontMatter(markdown);
    const { title, body: withoutTitle } = extractTitle(body, defaultProfile.title);
    const { intro, sections } = splitMarkdownSections(withoutTitle);
    const profile = {
      eyebrow: meta.eyebrow || defaultProfile.eyebrow,
      title,
      bio: intro,
      name: meta.name || defaultProfile.name,
      about: "",
      nowTitle: "",
      now: "",
      facts: [],
    };

    sections.forEach((section) => {
      const key = section.heading.toLowerCase();
      if (key === "about") {
        profile.about = section.body;
        return;
      }
      if (key === "now") {
        const lines = section.body.split(/\n/);
        const titleIndex = lines.findIndex((line) => /^###\s+/.test(line));
        if (titleIndex >= 0) {
          profile.nowTitle = lines[titleIndex].replace(/^###\s+/, "").trim();
          lines.splice(titleIndex, 1);
        }
        profile.now = lines.join("\n").trim();
        return;
      }
      if (key === "facts") {
        profile.facts = textToFacts(section.body);
      }
    });

    return profile;
  }

  function getPreviewHref(projectId = activeProjectId || elements.select.value) {
    if (activeMode === "links") return "index.html?preview=1&panel=links";
    if (activeMode === "profile") return "index.html?preview=1&panel=profile";
    return `index.html?preview=1&panel=projects&blog=${encodeURIComponent(projectId || "")}`;
  }

  function refreshPreviewHref() {
    elements.preview.href = getPreviewHref();
  }

  function fillProject(project) {
    if (!project) return;
    activeProjectId = project.id;
    elements.select.value = project.id;
    elements.projectMarkdown.value = projectToMarkdown(project);
    refreshPreviewHref();
  }

  function fillProfile() {
    const profile = contentData.profile || defaultProfile;
    elements.profileMarkdown.value = profileToMarkdown(profile);
  }

  function fillSiteLinks() {
    elements.siteLinks.value = linksToMarkdown(contentData.links);
  }

  function syncProjectFromForm() {
    const project = getActiveProject();
    if (!project) return;
    Object.assign(project, markdownToProject(elements.projectMarkdown.value, project));
    refreshPreviewHref();
  }

  function syncProfileFromForm() {
    contentData.profile = markdownToProfile(elements.profileMarkdown.value);
  }

  function syncLinksFromForm() {
    contentData.links = textToLinks(elements.siteLinks.value);
  }

  function syncCurrentEditor() {
    if (activeMode === "links") {
      syncLinksFromForm();
      return;
    }
    if (activeMode === "profile") {
      syncProfileFromForm();
      return;
    }
    syncProjectFromForm();
  }

  function persistPreviewDraft() {
    syncCurrentEditor();
    sessionStorage.setItem(previewDraftKey, JSON.stringify({
      savedAt: Date.now(),
      data: contentData,
    }));
  }

  function setMode(mode) {
    activeMode = mode;
    const editingLinks = mode === "links";
    const editingProfile = mode === "profile";
    const editingProjects = mode === "projects";
    elements.projectSelectWrap.hidden = !editingProjects;
    elements.projectEditor.hidden = !editingProjects;
    elements.profileEditor.hidden = !editingProfile;
    elements.linksEditor.hidden = !editingLinks;

    if (editingLinks) {
      fillSiteLinks();
      refreshPreviewHref();
      return;
    }
    if (editingProfile) {
      fillProfile();
      refreshPreviewHref();
      return;
    }
    fillProject(getSelectedProject() || contentData.projects[0]);
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

  function hydrateEditors() {
    renderProjectOptions();
    fillSiteLinks();
    fillProfile();
    setMode(elements.mode.value);
  }

  function loadLocalData() {
    return fetch(`${dataPath}?v=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("无法读取本地数据。");
        return response.json();
      })
      .then((data) => {
        normalizeContentData(data);
        hydrateEditors();
        setStatus("已读取本地内容。粘贴 GitHub Token 后可以保存到仓库。");
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
        if (response.ok) return response.json();
        if (response.status === 403) return null;
        throw new Error("Token 无法验证 GitHub 账号。");
      })
      .then((user) => {
        if (!user) return;
        if ((user.login || "").toLowerCase() !== repoOwner.toLowerCase()) {
          throw new Error(`当前 Token 属于 ${user.login || "未知账号"}，只有 ${repoOwner} 可以保存。`);
        }
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
        normalizeContentData(JSON.parse(decodeBase64Utf8(file.content)));
        hydrateEditors();
        elements.loginState.textContent = "已登录：当前 Token 属于 KuaiLeBozi，可以保存内容。";
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

  function saveRemoteData(token) {
    return verifyOwnerToken(token)
      .then(() => {
        if (fileSha) return null;
        return fetchRemoteFileSha(token);
      })
      .then(() => {
        const body = {
          message: "Update site content from admin page",
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

  function connectGitHub() {
    const token = elements.token.value.trim();
    if (!token) {
      elements.loginState.textContent = "未登录：请先粘贴 GitHub Token。";
      setStatus("请先粘贴 GitHub Token。", true);
      return;
    }

    elements.loginButton.disabled = true;
    elements.loginState.textContent = "连接中：正在验证账号和仓库权限...";
    setStatus("正在连接 GitHub。");
    loadRemoteData(token)
      .catch((error) => {
        elements.loginState.textContent = "未登录：Token 验证失败。";
        setStatus(error.message, true);
      })
      .finally(() => {
        elements.loginButton.disabled = false;
      });
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

  elements.loginButton.addEventListener("click", connectGitHub);
  elements.token.addEventListener("change", connectGitHub);

  elements.mode.addEventListener("change", () => {
    syncCurrentEditor();
    setMode(elements.mode.value);
    persistPreviewDraft();
    setStatus("已临时保存当前编辑内容。");
  });

  elements.select.addEventListener("change", () => {
    syncProjectFromForm();
    fillProject(getSelectedProject());
    persistPreviewDraft();
    setStatus("已临时保存上一个项目的编辑内容。");
  });

  elements.preview.addEventListener("click", () => {
    persistPreviewDraft();
    refreshPreviewHref();
  });

  elements.form.addEventListener("input", () => {
    persistPreviewDraft();
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const token = elements.token.value.trim();
    if (!token) {
      setStatus("请先粘贴 GitHub Token。", true);
      return;
    }
    syncCurrentEditor();
    persistPreviewDraft();
    setStatus("正在保存到 GitHub。");
    elements.save.disabled = true;
    saveRemoteData(token)
      .catch((error) => setStatus(error.message, true))
      .finally(() => {
        elements.save.disabled = false;
      });
  });

  document.addEventListener("pointerdown", forwardLiveBackgroundPointer, true);
  document.addEventListener("pointermove", forwardLiveBackgroundPointer, true);
  document.addEventListener("pointerup", forwardLiveBackgroundPointer, true);

  loadLocalData()
    .catch((error) => setStatus(error.message, true));
})();
