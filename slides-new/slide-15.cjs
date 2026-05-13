/**
 * slide-15.cjs - 请假审批流程
 * 流程图：申请 -> 冻结 -> 审批 -> 扣减/释放
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
  slide.addText("请假审批流程", {
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

  // 流程节点
  const nodes = [
    { label: "请假申请", desc: "填写请假单\n选择假种/时长", color: theme.primary },
    { label: "额度冻结", desc: "系统冻结\n对应假期额度", color: theme.secondary },
    { label: "审批流程", desc: "多级审批\n逐级审核", color: theme.accent },
    { label: "结果处理", desc: "通过-扣减额度\n拒绝-释放额度", color: theme.primary }
  ];

  // 横向流程布局
  const startX = 0.6;
  const startY = 2.0;
  const nodeW = 1.8;
  const nodeH = 1.4;
  const gapX = 0.4;

  nodes.forEach((node, index) => {
    const x = startX + index * (nodeW + gapX);

    // 节点矩形
    slide.addShape("roundRect", {
      x: x,
      y: startY,
      w: nodeW,
      h: nodeH,
      fill: { color: node.color },
      rectRadius: 0.1
    });

    // 节点标签
    slide.addText(node.label, {
      x: x,
      y: startY + 0.2,
      w: nodeW,
      h: 0.4,
      fontSize: 15,
      fontFace: "Microsoft YaHei",
      color: "FFFFFF",
      bold: true,
      align: "center"
    });

    // 节点描述
    slide.addText(node.desc, {
      x: x,
      y: startY + 0.65,
      w: nodeW,
      h: 0.6,
      fontSize: 11,
      fontFace: "Microsoft YaHei",
      color: "FFFFFF",
      align: "center"
    });

    // 箭头（除了最后一个）
    if (index < nodes.length - 1) {
      slide.addText("->", {
        x: x + nodeW - 0.1,
        y: startY + 0.45,
        w: gapX + 0.2,
        h: 0.4,
        fontSize: 24,
        fontFace: "Arial",
        color: theme.accent,
        bold: true,
        align: "center"
      });
    }
  });

  // 分支结果说明
  // 通过 - 扣减额度
  slide.addShape("roundRect", {
    x: 6.8,
    y: 3.7,
    w: 1.4,
    h: 0.7,
    fill: { color: theme.accent },
    rectRadius: 0.08
  });

  slide.addText("通过\n扣减额度", {
    x: 6.8,
    y: 3.7,
    w: 1.4,
    h: 0.7,
    fontSize: 11,
    fontFace: "Microsoft YaHei",
    color: "FFFFFF",
    align: "center",
    valign: "middle"
  });

  // 拒绝 - 释放额度
  slide.addShape("roundRect", {
    x: 8.3,
    y: 3.7,
    w: 1.4,
    h: 0.7,
    fill: { color: "6C757D" },
    rectRadius: 0.08
  });

  slide.addText("拒绝\n释放额度", {
    x: 8.3,
    y: 3.7,
    w: 1.4,
    h: 0.7,
    fontSize: 11,
    fontFace: "Microsoft YaHei",
    color: "FFFFFF",
    align: "center",
    valign: "middle"
  });

  // 分支箭头
  slide.addShape("rect", {
    x: 7.55,
    y: 3.85,
    w: 0.3,
    h: 0.04,
    fill: { color: theme.muted }
  });

  slide.addShape("rect", {
    x: 8.65,
    y: 3.85,
    w: 0.3,
    h: 0.04,
    fill: { color: theme.muted }
  });

  // 额度类型说明
  slide.addShape("roundRect", {
    x: 0.5,
    y: 4.6,
    w: 9.0,
    h: 0.45,
    fill: { color: theme.light, transparency: 50 },
    rectRadius: 0.06
  });

  slide.addText("支持多种假期类型：年假、病假、事假、婚假、产假、丧假等", {
    x: 0.7,
    y: 4.6,
    w: 8.6,
    h: 0.45,
    fontSize: 12,
    fontFace: "Microsoft YaHei",
    color: theme.text,
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

  slide.addText("15", {
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
