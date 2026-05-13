/**
 * slide-19.cjs - 系统特点
 * 4个核心特点卡片
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
  slide.addText("系统特点", {
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

  // 4个核心特点
  const features = [
    {
      title: "模块化设计",
      desc: "采用模块化架构，各功能模块独立开发、测试和部署，支持灵活扩展和定制",
      color: theme.primary
    },
    {
      title: "数据驱动",
      desc: "50+数据库表完整覆盖业务数据，Zustand状态管理确保数据一致性和实时性",
      color: theme.secondary
    },
    {
      title: "实时监控",
      desc: "IoT环境数据实时采集，异常情况即时预警，支持移动端随时查看",
      color: theme.accent
    },
    {
      title: "智能调度",
      desc: "AI排班算法自动优化人力资源配置，智能任务分配提高工作效率",
      color: theme.primary
    }
  ];

  // 2x2网格布局
  const startX = 0.5;
  const startY = 1.15;
  const cardWidth = 4.4;
  const cardHeight = 1.95;
  const gapX = 0.2;
  const gapY = 0.2;

  features.forEach((feature, index) => {
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
      fill: { color: "FFFFFF" },
      line: { color: theme.light, width: 1 },
      rectRadius: 0.1
    });

    // 顶部装饰条
    slide.addShape("rect", {
      x: x,
      y: y,
      w: cardWidth,
      h: 0.12,
      fill: { color: feature.color }
    });

    // 大数字
    slide.addText(String(index + 1).padStart(2, "0"), {
      x: x + 0.2,
      y: y + 0.25,
      w: 0.8,
      h: 0.6,
      fontSize: 32,
      fontFace: "Arial",
      color: feature.color,
      bold: true,
      align: "left"
    });

    // 标题
    slide.addText(feature.title, {
      x: x + 1.0,
      y: y + 0.3,
      w: cardWidth - 1.2,
      h: 0.45,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: feature.color,
      bold: true,
      align: "left",
      valign: "middle"
    });

    // 描述
    slide.addText(feature.desc, {
      x: x + 0.2,
      y: y + 0.9,
      w: cardWidth - 0.4,
      h: 0.9,
      fontSize: 12,
      fontFace: "Microsoft YaHei",
      color: theme.text,
      align: "left",
      valign: "top"
    });
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("19", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fontSize: 11,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle"
  });

  return slide;
}

module.exports = { createSlide, theme };
