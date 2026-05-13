/**
 * slide-16.cjs - 数据架构
 * 数据库50+张表分类展示，API 36个路由模块列表
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
  slide.addText("数据架构", {
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

  // 数据库表分类
  const dbTables = [
    { category: "基础数据", count: 12, color: theme.primary },
    { category: "生产管理", count: 15, color: theme.secondary },
    { category: "人工管理", count: 10, color: theme.accent },
    { category: "库存物料", count: 8, color: theme.primary },
    { category: "审批流程", count: 5, color: theme.secondary },
    { category: "系统管理", count: 5, color: theme.accent }
  ];

  // API路由模块
  const apiModules = [
    "auth", "users", "departments",
    "fields", "crops", "planting",
    "tasks", "inspection", "problems",
    "labor", "attendance", "leave",
    "materials", "inventory", "suppliers",
    "approvals", "production", "reports",
    "iot", "settings", "upload"
  ];

  // 左侧：数据库表统计
  slide.addText("数据库表", {
    x: 0.5,
    y: 1.1,
    w: 2,
    h: 0.4,
    fontSize: 16,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    bold: true,
    align: "left"
  });

  slide.addText("50+", {
    x: 2.3,
    y: 1.05,
    w: 0.8,
    h: 0.45,
    fontSize: 22,
    fontFace: "Arial",
    color: theme.accent,
    bold: true,
    align: "left"
  });

  // 数据库表分类网格
  const dbStartX = 0.5;
  const dbStartY = 1.55;
  const dbColW = 1.45;
  const dbRowH = 0.7;
  const dbGapX = 0.1;
  const dbGapY = 0.1;

  dbTables.forEach((table, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = dbStartX + col * (dbColW + dbGapX);
    const y = dbStartY + row * (dbRowH + dbGapY);

    // 卡片背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: dbColW,
      h: dbRowH,
      fill: { color: table.color, transparency: 88 },
      line: { color: table.color, width: 1 },
      rectRadius: 0.05
    });

    // 分类名称
    slide.addText(table.category, {
      x: x,
      y: y + 0.1,
      w: dbColW,
      h: 0.3,
      fontSize: 11,
      fontFace: "Microsoft YaHei",
      color: table.color,
      bold: true,
      align: "center"
    });

    // 数量
    slide.addText(String(table.count) + "张", {
      x: x,
      y: y + 0.38,
      w: dbColW,
      h: 0.25,
      fontSize: 14,
      fontFace: "Arial",
      color: table.color,
      bold: true,
      align: "center"
    });
  });

  // 分隔线
  slide.addShape("rect", {
    x: 4.95,
    y: 1.1,
    w: 0.04,
    h: 4.0,
    fill: { color: theme.light }
  });

  // 右侧：API路由模块
  slide.addText("API路由模块", {
    x: 5.2,
    y: 1.1,
    w: 2,
    h: 0.4,
    fontSize: 16,
    fontFace: "Microsoft YaHei",
    color: theme.secondary,
    bold: true,
    align: "left"
  });

  slide.addText("36", {
    x: 7.3,
    y: 1.05,
    w: 0.6,
    h: 0.45,
    fontSize: 22,
    fontFace: "Arial",
    color: theme.accent,
    bold: true,
    align: "left"
  });

  slide.addText("个", {
    x: 7.8,
    y: 1.15,
    w: 0.4,
    h: 0.35,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.muted,
    align: "left"
  });

  // API模块网格
  const apiStartX = 5.2;
  const apiStartY = 1.55;
  const apiColW = 1.1;
  const apiRowH = 0.45;
  const apiGapX = 0.08;
  const apiGapY = 0.08;

  apiModules.forEach((mod, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = apiStartX + col * (apiColW + apiGapX);
    const y = apiStartY + row * (apiRowH + apiGapY);

    // 标签背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: apiColW,
      h: apiRowH,
      fill: { color: theme.secondary, transparency: 85 },
      rectRadius: 0.04
    });

    // 模块名称
    slide.addText(mod, {
      x: x,
      y: y,
      w: apiColW,
      h: apiRowH,
      fontSize: 10,
      fontFace: "Arial",
      color: theme.secondary,
      align: "center",
      valign: "middle"
    });
  });

  // 底部说明
  slide.addShape("rect", {
    x: 0.5,
    y: 4.8,
    w: 9.0,
    h: 0.35,
    fill: { color: theme.primary, transparency: 92 }
  });

  slide.addText("采用 RESTful API 设计，支持 CRUD 操作、批量处理、数据校验", {
    x: 0.7,
    y: 4.8,
    w: 8.6,
    h: 0.35,
    fontSize: 11,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    align: "center",
    valign: "middle"
  });

  // 页码
  slide.addShape("ellipse", {
    x: 9.2,
    y: 5.05,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.primary }
  });

  slide.addText("16", {
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
