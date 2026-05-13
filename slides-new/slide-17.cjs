/**
 * slide-17.cjs - 状态管理
 * Context Providers列表，Zustand Stores列表
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
  slide.addText("状态管理", {
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

  // 迁移前Context Providers
  const oldContexts = [
    "AuthContext",
    "ThemeContext",
    "NotificationContext",
    "PermissionContext",
    "UserContext",
    "ToastContext"
  ];

  // 迁移后Zustand Stores
  const zustandStores = [
    "useAuthStore",
    "useUserStore",
    "usePermissionStore",
    "useNotificationStore",
    "useToastStore",
    "useThemeStore",
    "useTagsStore",
    "useKeepAliveStore"
  ];

  // 左侧：已废弃的Context
  slide.addText("已迁移 (Context -> Zustand)", {
    x: 0.5,
    y: 1.1,
    w: 4.3,
    h: 0.4,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: theme.muted,
    bold: true,
    align: "left"
  });

  // Context卡片
  const ctxStartX = 0.5;
  const ctxStartY = 1.55;
  const ctxColW = 2.0;
  const ctxRowH = 0.55;
  const ctxGapX = 0.15;
  const ctxGapY = 0.1;

  oldContexts.forEach((ctx, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = ctxStartX + col * (ctxColW + ctxGapX);
    const y = ctxStartY + row * (ctxRowH + ctxGapY);

    // 删除线背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: ctxColW,
      h: ctxRowH,
      fill: { color: theme.muted, transparency: 85 },
      rectRadius: 0.05
    });

    // 文字
    slide.addText(ctx, {
      x: x,
      y: y,
      w: ctxColW,
      h: ctxRowH,
      fontSize: 12,
      fontFace: "Arial",
      color: theme.muted,
      align: "center",
      valign: "middle"
    });

    // 删除线
    slide.addShape("rect", {
      x: x + 0.2,
      y: y + ctxRowH / 2 - 0.01,
      w: ctxColW - 0.4,
      h: 0.02,
      fill: { color: theme.muted }
    });
  });

  // 箭头指向
  slide.addText("==>", {
    x: 4.5,
    y: 2.5,
    w: 0.6,
    h: 0.5,
    fontSize: 20,
    fontFace: "Arial",
    color: theme.accent,
    bold: true,
    align: "center"
  });

  // 右侧：Zustand Stores
  slide.addText("Zustand Stores", {
    x: 5.2,
    y: 1.1,
    w: 4.3,
    h: 0.4,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: theme.primary,
    bold: true,
    align: "left"
  });

  // Store卡片
  const storeStartX = 5.2;
  const storeStartY = 1.55;
  const storeColW = 2.15;
  const storeRowH = 0.5;
  const storeGapX = 0.1;
  const storeGapY = 0.08;

  zustandStores.forEach((store, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = storeStartX + col * (storeColW + storeGapX);
    const y = storeStartY + row * (storeRowH + storeGapY);

    // 绿色背景
    slide.addShape("roundRect", {
      x: x,
      y: y,
      w: storeColW,
      h: storeRowH,
      fill: { color: theme.primary },
      rectRadius: 0.05
    });

    // 文字
    slide.addText(store, {
      x: x,
      y: y,
      w: storeColW,
      h: storeRowH,
      fontSize: 11,
      fontFace: "Arial",
      color: "FFFFFF",
      align: "center",
      valign: "middle"
    });
  });

  // 底部说明框
  slide.addShape("roundRect", {
    x: 0.5,
    y: 4.0,
    w: 9.0,
    h: 0.75,
    fill: { color: theme.light, transparency: 50 },
    rectRadius: 0.08
  });

  slide.addText([
    { text: "迁移原因：", options: { bold: true } },
    { text: "Context API 在大型应用中性能较差，Zustand 提供更细粒度的更新机制" }
  ], {
    x: 0.7,
    y: 4.0,
    w: 8.6,
    h: 0.35,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.text,
    align: "left",
    valign: "middle"
  });

  slide.addText([
    { text: "优势：", options: { bold: true } },
    { text: "更少的样板代码、更灵活的状态订阅、更好的TypeScript支持" }
  ], {
    x: 0.7,
    y: 4.35,
    w: 8.6,
    h: 0.35,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.text,
    align: "left",
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

  slide.addText("17", {
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
