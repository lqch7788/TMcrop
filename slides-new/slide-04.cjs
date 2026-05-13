/**
 * slide-04.cjs - 技术架构
 * 双列布局：前端技术栈 | 后端技术栈
 */

// 主题配色
const theme = {
  primary: "1B4332",
  secondary: "2D6A4F",
  accent: "40916C",
  light: "95D5B2",
  bg: "FFFFFF",
  text: "1B1B1B",
  muted: "6C757D"
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();

  const slideWidth = 10;
  const slideHeight = 5.625;

  // 白色背景
  slide.background = { color: theme.bg };

  // 顶部深绿色标题栏
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: slideWidth,
    h: 0.9,
    fill: { color: theme.primary }
  });

  // 标题
  slide.addText("技术架构", {
    x: 0.5,
    y: 0.2,
    w: 4,
    h: 0.5,
    fontSize: 26,
    fontFace: "Microsoft YaHei",
    color: "FFFFFF",
    bold: true,
    align: "left"
  });

  // 前端技术栈
  const frontendTech = [
    { name: "React 18", desc: "UI框架" },
    { name: "TypeScript", desc: "类型安全" },
    { name: "Vite", desc: "构建工具" },
    { name: "TanStack Query", desc: "数据请求" },
    { name: "Zustand", desc: "状态管理" },
    { name: "Radix UI", desc: "UI组件库" },
    { name: "Tailwind CSS", desc: "样式框架" },
    { name: "React Router", desc: "路由管理" }
  ];

  // 后端技术栈
  const backendTech = [
    { name: "Express", desc: "Web框架" },
    { name: "TypeScript", desc: "语言" },
    { name: "SQLite", desc: "数据库" },
    { name: "Zod", desc: "数据验证" },
    { name: "tsx", desc: "运行环境" },
    { name: "Node.js", desc: "运行时" }
  ];

  // 前端区域标题
  slide.addText("前端技术栈", {
    x: 0.5,
    y: 1.15,
    w: 4.3,
    h: 0.45,
    fontSize: 18,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    bold: true,
    align: "center"
  });

  // 前端技术标签
  const feStartY = 1.7;
  const feTagW = 2.0;
  const feTagH = 0.55;
  const feGapX = 0.15;
  const feGapY = 0.12;

  frontendTech.forEach((tech, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.5 + col * (feTagW + feGapX);
    const y = feStartY + row * (feTagH + feGapY);

    // 标签背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: feTagW,
      h: feTagH,
      fill: { color: theme.primary, transparency: 90 },
      line: { color: theme.primary, width: 1 },
      rectRadius: 0.06
    });

    // 技术名称
    slide.addText(tech.name, {
      x: x + 0.1,
      y: y + 0.05,
      w: feTagW - 0.2,
      h: 0.28,
      fontSize: 13,
      fontFace: "Arial",
      color: theme.primary,
      bold: true,
      align: "center"
    });

    // 技术描述
    slide.addText(tech.desc, {
      x: x + 0.1,
      y: y + 0.3,
      w: feTagW - 0.2,
      h: 0.2,
      fontSize: 10,
      fontFace: "Microsoft YaHei",
      color: theme.muted,
      align: "center"
    });
  });

  // 分隔线
  slide.addShape("rect", {
    x: 4.95,
    y: 1.3,
    w: 0.04,
    h: 3.8,
    fill: { color: theme.light }
  });

  // 后端区域标题
  slide.addText("后端技术栈", {
    x: 5.2,
    y: 1.15,
    w: 4.3,
    h: 0.45,
    fontSize: 18,
    fontFace: "Microsoft YaHei",
    color: theme.secondary,
    bold: true,
    align: "center"
  });

  // 后端技术标签
  const beStartY = 1.7;
  const beTagW = 2.0;
  const beTagH = 0.55;
  const beGapX = 0.15;
  const beGapY = 0.12;

  backendTech.forEach((tech, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 5.2 + col * (beTagW + beGapX);
    const y = beStartY + row * (beTagH + beGapY);

    // 标签背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: beTagW,
      h: beTagH,
      fill: { color: theme.secondary, transparency: 90 },
      line: { color: theme.secondary, width: 1 },
      rectRadius: 0.06
    });

    // 技术名称
    slide.addText(tech.name, {
      x: x + 0.1,
      y: y + 0.05,
      w: beTagW - 0.2,
      h: 0.28,
      fontSize: 13,
      fontFace: "Arial",
      color: theme.secondary,
      bold: true,
      align: "center"
    });

    // 技术描述
    slide.addText(tech.desc, {
      x: x + 0.1,
      y: y + 0.3,
      w: beTagW - 0.2,
      h: 0.2,
      fontSize: 10,
      fontFace: "Microsoft YaHei",
      color: theme.muted,
      align: "center"
    });
  });

  // 底部装饰
  slide.addShape("rect", {
    x: 0.5,
    y: 5.1,
    w: 0.3,
    h: 0.3,
    fill: { color: theme.light }
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("4", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fontSize: 12,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle"
  });

  return slide;
}

module.exports = { createSlide, theme };
