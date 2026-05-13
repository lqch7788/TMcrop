/**
 * slide-10.cjs - 人工管理
 * 三列布局
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
  slide.addText("人工管理", {
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

  // 三列数据
  const columns = [
    {
      title: "考勤管理",
      color: theme.primary,
      items: ["排班计划制定", "打卡记录查询", "出勤统计报表", "异常考勤处理"]
    },
    {
      title: "请假管理",
      color: theme.secondary,
      items: ["请假申请", "审批流程", "额度管理", "请假统计"]
    },
    {
      title: "薪酬管理",
      color: theme.accent,
      items: ["工时记录", "薪酬规则配置", "工资单生成", "薪酬报表"]
    }
  ];

  // 三列布局
  const colW = 2.9;
  const startX = 0.5;
  const gapX = 0.2;
  const startY = 1.2;
  const cardH = 3.6;

  columns.forEach((col, index) => {
    const x = startX + index * (colW + gapX);

    // 列背景卡片
    slide.addShape("roundRect", {
      x: x,
      y: startY,
      w: colW,
      h: cardH,
      fill: { color: "FFFFFF" },
      line: { color: theme.light, width: 1 },
      rectRadius: 0.08
    });

    // 顶部标题区域
    slide.addShape("rect", {
      x: x,
      y: startY,
      w: colW,
      h: 0.6,
      fill: { color: col.color }
    });

    // 标题
    slide.addText(col.title, {
      x: x,
      y: startY + 0.1,
      w: colW,
      h: 0.4,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: "FFFFFF",
      bold: true,
      align: "center"
    });

    // 功能点列表
    col.items.forEach((item, pIndex) => {
      // 序号圆形
      slide.addShape("ellipse", {
        x: x + 0.2,
        y: startY + 0.85 + pIndex * 0.65,
        w: 0.35,
        h: 0.35,
        fill: { color: col.color, transparency: 80 }
      });

      slide.addText(String(pIndex + 1), {
        x: x + 0.2,
        y: startY + 0.85 + pIndex * 0.65,
        w: 0.35,
        h: 0.35,
        fontSize: 12,
        fontFace: "Arial",
        color: col.color,
        bold: true,
        align: "center",
        valign: "middle"
      });

      // 功能点文字
      slide.addText(item, {
        x: x + 0.65,
        y: startY + 0.85 + pIndex * 0.65,
        w: colW - 0.85,
        h: 0.35,
        fontSize: 13,
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

  slide.addText("10", {
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
