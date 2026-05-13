/**
 * slide-03.cjs - 系统介绍
 * 4个要点卡片布局（2x2网格）
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
  slide.addText("系统介绍", {
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

  // 4个要点卡片数据
  const cards = [
    {
      title: "现代化管理",
      desc: "基于React + Express的全栈管理系统，采用模块化架构设计",
      icon: "rect"
    },
    {
      title: "数据驱动",
      desc: "50+数据库表，完整业务流程数据覆盖，Zustand状态管理",
      icon: "rect"
    },
    {
      title: "智能调度",
      desc: "AI排班算法，自动化工时计算，智能任务分配",
      icon: "rect"
    },
    {
      title: "实时监控",
      desc: "IoT环境数据实时采集，异常预警即时通知",
      icon: "rect"
    }
  ];

  // 2x2网格布局
  const startX = 0.5;
  const startY = 1.2;
  const cardWidth = 4.4;
  const cardHeight = 1.8;
  const gapX = 0.2;
  const gapY = 0.2;

  cards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    // 卡片背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: cardWidth,
      h: cardHeight,
      fill: { color: "F8F9FA" },
      line: { color: theme.light, width: 1 },
      rectRadius: 0.08
    });

    // 左侧彩色装饰条
    slide.addShape("rect", {
      x: x,
      y: y + 0.2,
      w: 0.08,
      h: cardHeight - 0.4,
      fill: { color: index < 2 ? theme.primary : theme.secondary }
    });

    // 图标区域
    slide.addShape("rect", {
      x: x + 0.25,
      y: y + 0.3,
      w: 0.5,
      h: 0.5,
      fill: { color: index < 2 ? theme.primary : theme.secondary, transparency: 20 }
    });

    // 标题
    slide.addText(card.title, {
      x: x + 0.9,
      y: y + 0.25,
      w: cardWidth - 1.1,
      h: 0.5,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: theme.primary,
      bold: true,
      align: "left",
      valign: "middle"
    });

    // 描述
    slide.addText(card.desc, {
      x: x + 0.25,
      y: y + 0.9,
      w: cardWidth - 0.5,
      h: 0.75,
      fontSize: 13,
      fontFace: "Microsoft YaHei",
      color: theme.muted,
      align: "left",
      valign: "top"
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

  slide.addText("3", {
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
