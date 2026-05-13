/**
 * slide-02.cjs - 目录页
 * 展示5个章节内容
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

// 目录页幻灯片
function createSlide(pres, theme) {
  const slide = pres.addSlide();

  const slideWidth = 10;
  const slideHeight = 5.625;

  // 白色背景
  slide.background = { color: theme.bg };

  // 左侧绿色竖条装饰
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.12,
    h: slideHeight,
    fill: { color: theme.primary }
  });

  // 标题
  slide.addText("目录", {
    x: 0.5,
    y: 0.35,
    w: 3,
    h: 0.7,
    fontSize: 32,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    bold: true,
    align: "left"
  });

  // 标题下方装饰线
  slide.addShape("rect", {
    x: 0.5,
    y: 1.0,
    w: 1.0,
    h: 0.04,
    fill: { color: theme.accent }
  });

  // 目录项数据
  const tocItems = [
    { num: "01", title: "系统概述与架构" },
    { num: "02", title: "功能模块详细介绍" },
    { num: "03", title: "业务流程说明" },
    { num: "04", title: "数据架构" },
    { num: "05", title: "系统特点与总结" }
  ];

  // 布局参数
  const startY = 1.5;
  const itemHeight = 0.75;
  const leftColX = 0.8;
  const rightColX = 5.2;

  // 左侧列 - 01到03
  for (let i = 0; i < 3; i++) {
    const item = tocItems[i];
    const y = startY + i * itemHeight;

    // 编号圆形背景
    slide.addShape("ellipse", {
      x: leftColX,
      y: y + 0.05,
      w: 0.45,
      h: 0.45,
      fill: { color: theme.primary }
    });

    // 编号
    slide.addText(item.num, {
      x: leftColX,
      y: y + 0.05,
      w: 0.45,
      h: 0.45,
      fontSize: 14,
      fontFace: "Arial",
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle"
    });

    // 标题
    slide.addText(item.title, {
      x: leftColX + 0.6,
      y: y,
      w: 3.5,
      h: 0.55,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: theme.text,
      align: "left",
      valign: "middle"
    });

    // 底部装饰线
    slide.addShape("rect", {
      x: leftColX + 0.6,
      y: y + 0.55,
      w: 2.5,
      h: 0.02,
      fill: { color: theme.light }
    });
  }

  // 右侧列 - 04到05
  for (let i = 3; i < 5; i++) {
    const item = tocItems[i];
    const y = startY + (i - 3) * itemHeight;

    // 编号圆形背景
    slide.addShape("ellipse", {
      x: rightColX,
      y: y + 0.05,
      w: 0.45,
      h: 0.45,
      fill: { color: theme.secondary }
    });

    // 编号
    slide.addText(item.num, {
      x: rightColX,
      y: y + 0.05,
      w: 0.45,
      h: 0.45,
      fontSize: 14,
      fontFace: "Arial",
      color: "FFFFFF",
      bold: true,
      align: "center",
      valign: "middle"
    });

    // 标题
    slide.addText(item.title, {
      x: rightColX + 0.6,
      y: y,
      w: 3.5,
      h: 0.55,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: theme.text,
      align: "left",
      valign: "middle"
    });

    // 底部装饰线
    slide.addShape("rect", {
      x: rightColX + 0.6,
      y: y + 0.55,
      w: 2.5,
      h: 0.02,
      fill: { color: theme.light }
    });
  }

  // 右侧装饰块
  slide.addShape("rect", {
    x: 9.0,
    y: 4.5,
    w: 0.6,
    h: 0.6,
    fill: { color: theme.light, transparency: 50 }
  });

  slide.addShape("rect", {
    x: 9.3,
    y: 4.8,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.accent, transparency: 40 }
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("2", {
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
