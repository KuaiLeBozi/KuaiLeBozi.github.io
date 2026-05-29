window.SITE_CONFIG = {
  profile: {
    eyebrow: "联邦搜查部 Schale / 个人档案",
    title: "欢迎，老师。",
    bio:
      "这里是 KuaileBozi 的个人主页，用来收纳项目、笔记和一些正在进行的小实验。",
    name: "KuaileBozi",
    about:
      "这个档案页会继续更新。之后可以把这里替换成更正式的自我介绍、研究方向、常用技术栈，以及希望别人优先看到的作品。",
    nowTitle: "正在调整终端界面",
    now:
      "当前版本使用 GitHub Pages 静态部署，背景为本地 2K 动态资源，保留触摸语音并移除背景音乐与菜单设置。",
    facts: [
      ["Site", "KuaileBozi.github.io"],
      ["Style", "蔚蓝档案风格"],
      ["Stack", "HTML, CSS, JavaScript"],
    ],
  },
  actions: [
    { label: "GitHub 档案", href: "https://github.com/KuaileBozi" },
    { label: "查看任务", panel: "projects" },
  ],
  projects: [
    {
      title: "个人实验室",
      type: "主页",
      description:
        "用于整理项目、笔记和灵感入口的小型个人主页。",
      href: "https://github.com/KuaileBozi",
    },
    {
      title: "档案笔记",
      type: "记录",
      description:
        "预留给文章、学习记录、开发日志，或者任何值得保存的内容。",
      panel: "links",
    },
    {
      title: "下一项课题",
      type: "开发",
      description:
        "之后可以替换成真实仓库、在线演示、模型、游戏或工具。",
      panel: "profile",
    },
  ],
  links: [
    { label: "GitHub", href: "https://github.com/KuaileBozi" },
    { label: "Homepage", href: "https://KuaileBozi.github.io/" },
    { label: "Email", href: "mailto:hello@example.com" },
  ],
};
