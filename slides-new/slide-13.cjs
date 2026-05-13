/**
 * slide-13.cjs - 审批流程
 * 状态流转图：草稿 -> 待审批 -> 已通过/已拒绝
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
  slide.addText("审批流程", {
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

  // 流程节点数据
  const nodes = [
    { label: "草稿", desc: "申请人编辑\n表单内容", color: theme.muted },
    { label: "提交申请", desc: "确认提交\n进入审批", color: theme.accent },
    { label: "待审批", desc: "审批人\n审核中", color: theme.secondary },
    { label: "审批完成", desc: "结果通知\n申请人", color: theme.primary }
  ];

  // 主流程横向布局
  const startX = 0.7;
  const startY = 2.0;
  const nodeW = 1.6;
  const nodeH = 1.4;
  const gapX = 0.5;

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
      y: startY + 0.25,
      w: nodeW,
      h: 0.4,
      fontSize: 16,
      fontFace: "Microsoft YaHei",
      color: "FFFFFF",
      bold: true,
      align: "center"
    });

    // 节点描述
    slide.addText(node.desc, {
      x: x,
      y: startY + 0.7,
      w: nodeW,
      h: 0.55,
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

  // 分支结果：已通过 / 已拒绝
  // 待审批节点下方分支
  const branchY = 3.7;

  // 已通过分支
  slide.addShape("rect", {
    x: startX + 2 * (nodeW + gapX) + 0.3,
    y: branchY,
    w: 0.4,
    h: 0.4,
    fill: { color: theme.accent }
  });

  slide.addText("V", {
    x: startX + 2 * (nodeW + gapX) + 0.3,
    y: branchY,
    w: 0.4,
    h: 0.4,
    fontSize: 18,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle"
  });

  slide.addText("已通过", {
    x: startX + 2 * (nodeW + gapX) + 0.8,
    y: branchY,
    w: 1.2,
    h: 0.4,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: theme.accent,
    bold: true,
    align: "left",
    valign: "middle"
  });

  // 已拒绝分支
  slide.addShape("rect", {
    x: startX + 3 * (nodeW + gapX) - 1.0,
    y: branchY,
    w: 0.4,
    h: 0.4,
    fill: { color: "DC3545" }
  });

  slide.addText("X", {
    x: startX + 3 * (nodeW + gapX) - 1.0,
    y: branchY,
    w: 0.4,
    h: 0.4,
    fontSize: 18,
    fontFace: "Arial",
    color: "FFFFFF",
    bold: true,
    align: "center",
    valign: "middle"
  });

  slide.addText("已拒绝", {
    x: startX + 3 * (nodeW + gapX) - 0.5,
    y: branchY,
    w: 1.2,
    h: 0.4,
    fontSize: 14,
    fontFace: "Microsoft YaHei",
    color: "DC3545",
    bold: true,
    align: "left",
    valign: "middle"
  });

  // 分支箭头说明
  slide.addShape("rect", {
    x: 4.6,
    y: 3.55,
    w: 0.04,
    h: 0.2,
    fill: { color: theme.muted }
  });

  slide.addShape("rect", {
    x: 5.9,
    y: 3.55,
    w: 0.04,
    h: 0.2,
    fill: { color: theme.muted }
  });

  // 底部说明
  slide.addShape("roundRect", {
    x: 0.5,
    y: 4.5,
    w: 9.0,
    h: 0.55,
    fill: { color: theme.light, transparency: 50 },
    rectRadius: 0.06
  });

  slide.addText("支持多级审批、会签、或签、委托审批等多种审批方式", {
    x: 0.7,
    y: 4.5,
    w: 8.6,
    h: 0.55,
    fontSize: 13,
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

  slide.addText("13", {
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
