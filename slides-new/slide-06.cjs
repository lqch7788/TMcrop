/**
 * slide-06.cjs - 首页与认证
 * 4个功能点用卡片展示
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
  slide.addText("首页与认证", {
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

  // 4个功能点数据
  const features = [
    {
      title: "Dashboard首页",
      points: ["数据统计卡片", "快捷操作入口", "待办事项提醒", "环境数据展示"]
    },
    {
      title: "用户认证",
      points: ["登录/登出", "权限验证", "会话管理", "密码修改"]
    },
    {
      title: "侧边导航",
      points: ["模块菜单", "折叠/展开", "路由跳转", "当前状态高亮"]
    },
    {
      title: "Header头部",
      points: ["用户信息", "通知中心", "全局搜索", "主题切换"]
    }
  ];

  // 2x2网格布局
  const startX = 0.5;
  const startY = 1.15;
  const cardWidth = 4.4;
  const cardHeight = 2.0;
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
      fill: { color: "F8F9FA" },
      line: { color: theme.light, width: 1 },
      rectRadius: 0.08
    });

    // 标题背景条
    slide.addShape("rect", {
      x: x,
      y: y,
      w: cardWidth,
      h: 0.45,
      fill: { color: index < 2 ? theme.primary : theme.secondary }
    });

    // 标题
    slide.addText(feature.title, {
      x: x + 0.15,
      y: y + 0.05,
      w: cardWidth - 0.3,
      h: 0.35,
      fontSize: 14,
      fontFace: "Microsoft YaHei",
      color: "FFFFFF",
      bold: true,
      align: "left",
      valign: "middle"
    });

    // 功能点列表
    feature.points.forEach((point, pIndex) => {
      // 小圆点
      slide.addShape("ellipse", {
        x: x + 0.2,
        y: y + 0.6 + pIndex * 0.35,
        w: 0.12,
        h: 0.12,
        fill: { color: theme.accent }
      });

      // 功能点文字
      slide.addText(point, {
        x: x + 0.4,
        y: y + 0.55 + pIndex * 0.35,
        w: cardWidth - 0.6,
        h: 0.3,
        fontSize: 12,
        fontFace: "Microsoft YaHei",
        color: theme.text,
        align: "left",
        valign: "middle"
      });
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

  slide.addText("6", {
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
