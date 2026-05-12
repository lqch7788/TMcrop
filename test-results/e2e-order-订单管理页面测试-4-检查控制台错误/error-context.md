# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-order.spec.ts >> 订单管理页面测试 >> 4. 检查控制台错误
- Location: e2e-order.spec.ts:74:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 3
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: 种植管理系统
        - button "收起菜单" [ref=e7] [cursor=pointer]:
          - img [ref=e8]
      - navigation [ref=e10]:
        - list [ref=e11]:
          - listitem [ref=e12]:
            - link "园区导览" [ref=e13] [cursor=pointer]:
              - /url: /park-archive
              - img [ref=e14]
              - generic [ref=e16]: 园区导览
          - listitem [ref=e17]:
            - link "基地总览" [ref=e18] [cursor=pointer]:
              - /url: /dashboard
              - img [ref=e19]
              - generic [ref=e24]: 基地总览
          - listitem [ref=e25]:
            - link "指标数据" [ref=e26] [cursor=pointer]:
              - /url: /indicators
              - img [ref=e27]
              - generic [ref=e31]: 指标数据
          - listitem [ref=e32]:
            - link "公告发布" [ref=e33] [cursor=pointer]:
              - /url: /announcement
              - img [ref=e34]
              - generic [ref=e37]: 公告发布
          - listitem [ref=e38]:
            - button "计划管理" [ref=e39] [cursor=pointer]:
              - img [ref=e40]
              - generic [ref=e44]: 计划管理
              - img [ref=e45]
            - list [ref=e47]:
              - listitem [ref=e48]:
                - link "订单管理" [ref=e49] [cursor=pointer]:
                  - /url: /crop/order
                  - img [ref=e50]
                  - generic [ref=e53]: 订单管理
              - listitem [ref=e54]:
                - link "生产计划" [ref=e55] [cursor=pointer]:
                  - /url: /production
                  - img [ref=e56]
                  - generic [ref=e59]: 生产计划
              - listitem [ref=e60]:
                - link "技术方案" [ref=e61] [cursor=pointer]:
                  - /url: /tech-solution
                  - img [ref=e62]
                  - generic [ref=e67]: 技术方案
              - listitem [ref=e68]:
                - link "采购计划" [ref=e69] [cursor=pointer]:
                  - /url: /purchase-plan
                  - img [ref=e70]
                  - generic [ref=e74]: 采购计划
          - listitem [ref=e75]:
            - button "作物管理" [ref=e76] [cursor=pointer]:
              - img [ref=e77]
              - generic [ref=e80]: 作物管理
              - img [ref=e81]
            - list [ref=e83]:
              - listitem [ref=e84]:
                - link "种源管理" [ref=e85] [cursor=pointer]:
                  - /url: /crop/seed-source
                  - img [ref=e86]
                  - generic [ref=e90]: 种源管理
              - listitem [ref=e91]:
                - link "育苗管理" [ref=e92] [cursor=pointer]:
                  - /url: /crop/seedling
                  - img [ref=e93]
                  - generic [ref=e98]: 育苗管理
              - listitem [ref=e99]:
                - link "种植管理" [ref=e100] [cursor=pointer]:
                  - /url: /crop/planting
                  - img [ref=e101]
                  - generic [ref=e104]: 种植管理
              - listitem [ref=e105]:
                - link "采收入库" [ref=e106] [cursor=pointer]:
                  - /url: /crop/harvest
                  - img [ref=e107]
                  - generic [ref=e110]: 采收入库
              - listitem [ref=e111]:
                - link "作物库存" [ref=e112] [cursor=pointer]:
                  - /url: /crop-inventory
                  - img [ref=e113]
                  - generic [ref=e116]: 作物库存
              - listitem [ref=e117]:
                - link "实例追溯" [ref=e118] [cursor=pointer]:
                  - /url: /crop/instance
                  - img [ref=e119]
                  - generic [ref=e122]: 实例追溯
          - listitem [ref=e123]:
            - button "农事管理" [ref=e124] [cursor=pointer]:
              - img [ref=e125]
              - generic [ref=e128]: 农事管理
              - img [ref=e129]
            - list [ref=e131]:
              - listitem [ref=e132]:
                - link "农事任务中心" [ref=e133] [cursor=pointer]:
                  - /url: /farm-hub
                  - img [ref=e134]
                  - generic [ref=e136]: 农事任务中心
              - listitem [ref=e137]:
                - link "任务中心" [ref=e138] [cursor=pointer]:
                  - /url: /task-center
                  - img [ref=e139]
                  - generic [ref=e142]: 任务中心
              - listitem [ref=e143]:
                - link "每日工单汇总" [ref=e144] [cursor=pointer]:
                  - /url: /daily-work-summary
                  - img [ref=e145]
                  - generic [ref=e147]: 每日工单汇总
          - listitem [ref=e148]:
            - button "库存管理" [ref=e149] [cursor=pointer]:
              - img [ref=e150]
              - generic [ref=e154]: 库存管理
              - img [ref=e155]
            - list [ref=e157]:
              - listitem [ref=e158]:
                - link "库存总览" [ref=e159] [cursor=pointer]:
                  - /url: /warehouse-overview
                  - img [ref=e160]
                  - generic [ref=e163]: 库存总览
              - listitem [ref=e164]:
                - link "物料入库" [ref=e165] [cursor=pointer]:
                  - /url: /warehouse-inbound
                  - img [ref=e166]
                  - generic [ref=e169]: 物料入库
              - listitem [ref=e170]:
                - link "产品库存" [ref=e171] [cursor=pointer]:
                  - /url: /produce-inventory
                  - img [ref=e172]
                  - generic [ref=e176]: 产品库存
              - listitem [ref=e177]:
                - link "供应商管理" [ref=e178] [cursor=pointer]:
                  - /url: /supplier-management
                  - img [ref=e179]
                  - generic [ref=e184]: 供应商管理
              - listitem [ref=e185]:
                - link "生产领料" [ref=e186] [cursor=pointer]:
                  - /url: /material-receiving
                  - img [ref=e187]
                  - generic [ref=e190]: 生产领料
              - listitem [ref=e191]:
                - link "生产退料" [ref=e192] [cursor=pointer]:
                  - /url: /material-return
                  - img [ref=e193]
                  - generic [ref=e196]: 生产退料
          - listitem [ref=e197]:
            - button "人工管理" [ref=e198] [cursor=pointer]:
              - img [ref=e199]
              - generic [ref=e204]: 人工管理
              - img [ref=e205]
            - list [ref=e207]:
              - listitem [ref=e208]:
                - link "考勤管理" [ref=e209] [cursor=pointer]:
                  - /url: /labor/attendance
                  - img [ref=e210]
                  - generic [ref=e215]: 考勤管理
              - listitem [ref=e216]:
                - link "人事管理" [ref=e217] [cursor=pointer]:
                  - /url: /labor/personnel
                  - img [ref=e218]
                  - generic [ref=e221]: 人事管理
              - listitem [ref=e222]:
                - link "薪酬管理" [ref=e223] [cursor=pointer]:
                  - /url: /labor/compensation
                  - img [ref=e224]
                  - generic [ref=e227]: 薪酬管理
              - listitem [ref=e228]:
                - link "运营分析" [ref=e229] [cursor=pointer]:
                  - /url: /labor/analytics
                  - img [ref=e230]
                  - generic [ref=e233]: 运营分析
          - listitem [ref=e234]:
            - button "生产汇总表" [ref=e235] [cursor=pointer]:
              - img [ref=e236]
              - generic [ref=e238]: 生产汇总表
              - img [ref=e239]
            - list [ref=e241]:
              - listitem [ref=e242]:
                - link "每日问题汇总表" [ref=e243] [cursor=pointer]:
                  - /url: /daily-problem-summary
                  - img [ref=e244]
                  - generic [ref=e246]: 每日问题汇总表
              - listitem [ref=e247]:
                - link "生产计划汇总表" [ref=e248] [cursor=pointer]:
                  - /url: /plan-summary
                  - img [ref=e249]
                  - generic [ref=e252]: 生产计划汇总表
              - listitem [ref=e253]:
                - link "生产报表" [ref=e254] [cursor=pointer]:
                  - /url: /reports
                  - img [ref=e255]
                  - generic [ref=e257]: 生产报表
          - listitem [ref=e258]:
            - button "审批中心" [ref=e259] [cursor=pointer]:
              - img [ref=e260]
              - generic [ref=e263]: 审批中心
              - img [ref=e264]
            - list [ref=e266]:
              - listitem [ref=e267]:
                - link "审批中心" [ref=e268] [cursor=pointer]:
                  - /url: /approvals
                  - img [ref=e269]
                  - generic [ref=e272]: 审批中心
              - listitem [ref=e273]:
                - link "物料审批" [ref=e274] [cursor=pointer]:
                  - /url: /material-approval
                  - img [ref=e275]
                  - generic [ref=e279]: 物料审批
              - listitem [ref=e280]:
                - link "生产审批" [ref=e281] [cursor=pointer]:
                  - /url: /production-approval
                  - img [ref=e282]
                  - generic [ref=e286]: 生产审批
              - listitem [ref=e287]:
                - link "农事审批" [ref=e288] [cursor=pointer]:
                  - /url: /farm-approval
                  - img [ref=e289]
                  - generic [ref=e293]: 农事审批
              - listitem [ref=e294]:
                - link "指标预算审批" [ref=e295] [cursor=pointer]:
                  - /url: /indicator-budget-approval
                  - img [ref=e296]
                  - generic [ref=e298]: 指标预算审批
              - listitem [ref=e299]:
                - link "我的申请" [ref=e300] [cursor=pointer]:
                  - /url: /my-applications
                  - img [ref=e301]
                  - generic [ref=e304]: 我的申请
              - listitem [ref=e305]:
                - link "人事审批" [ref=e306] [cursor=pointer]:
                  - /url: /hr-approval
                  - img [ref=e307]
                  - generic [ref=e312]: 人事审批
    - banner [ref=e314]:
      - generic [ref=e315]:
        - generic [ref=e317]:
          - img "弘智耘Logo" [ref=e318]
          - generic [ref=e319]:
            - generic [ref=e320]: 弘讯智能种植云
            - generic [ref=e321]: Techmation Intelligent Crop Cloud
          - button "返回主页" [ref=e322] [cursor=pointer]:
            - img [ref=e323]
        - generic [ref=e326]:
          - button "3" [ref=e328] [cursor=pointer]:
            - img [ref=e329]
            - generic [ref=e332]: "3"
          - button "LQC 陆启闯" [ref=e334] [cursor=pointer]:
            - generic [ref=e335]: LQC
            - generic [ref=e336]: 陆启闯
            - img [ref=e337]
    - main [ref=e340]:
      - generic [ref=e341]:
        - generic [ref=e343]:
          - img [ref=e345]
          - generic [ref=e349]:
            - heading "订单管理" [level=1] [ref=e350]
            - paragraph [ref=e351]: 管理订单、交付安排和客户追溯
        - generic [ref=e352]:
          - generic [ref=e354]:
            - img [ref=e356]
            - generic [ref=e360]:
              - paragraph [ref=e361]: "5"
              - paragraph [ref=e362]: 订单总数
          - generic [ref=e364]:
            - img [ref=e366]
            - generic [ref=e369]:
              - paragraph [ref=e370]: "2"
              - paragraph [ref=e371]: 进行中
          - generic [ref=e373]:
            - img [ref=e375]
            - generic [ref=e378]:
              - paragraph [ref=e379]: "1"
              - paragraph [ref=e380]: 已完成
          - generic [ref=e382]:
            - img [ref=e384]
            - generic [ref=e386]:
              - paragraph [ref=e387]: "5"
              - paragraph [ref=e388]: 本月新增
        - generic [ref=e390]:
          - generic [ref=e391]:
            - generic [ref=e392]: 订单编号
            - textbox "请输入订单编号" [ref=e393]
          - generic [ref=e394]:
            - generic [ref=e395]: 订单名称
            - textbox "请输入订单名称" [ref=e396]
          - generic [ref=e397]:
            - generic [ref=e398]: 作物品种
            - combobox [ref=e399]:
              - option "请选择" [selected]
              - option "圆叶菠菜"
              - option "尖叶菠菜"
              - option "大叶菠菜"
              - option "小叶菠菜"
              - option "日本菠菜"
              - option "其他菠菜"
              - option "散叶生菜"
              - option "结球生菜"
              - option "罗马生菜"
              - option "油麦生菜"
              - option "紫叶生菜"
              - option "其他生菜"
              - option "普通油麦菜"
              - option "细叶油麦菜"
              - option "大叶油麦菜"
              - option "其他油麦菜"
              - option "上海青"
              - option "苏州青"
              - option "矮脚青"
              - option "白叶小白菜"
              - option "黑叶小白菜"
              - option "其他小白菜"
              - option "北京白菜"
              - option "山东白菜"
              - option "娃娃白菜"
              - option "黄心白菜"
              - option "绿叶白菜"
              - option "其他大白菜"
              - option "结球甘蓝"
              - option "紫甘蓝"
              - option "羽衣甘蓝"
              - option "抱子甘蓝"
              - option "皱叶甘蓝"
              - option "其他甘蓝"
              - option "春月黄"
              - option "金童"
              - option "旺旺"
              - option "绿箭"
              - option "红孩儿"
              - option "其他娃娃菜"
              - option "大叶茼蒿"
              - option "小叶茼蒿"
              - option "花叶茼蒿"
              - option "其他茼蒿"
              - option "大叶香菜"
              - option "小叶香菜"
              - option "铁杆香菜"
              - option "其他香菜"
              - option "宽叶韭菜"
              - option "细叶韭菜"
              - option "紫根韭菜"
              - option "白根韭菜"
              - option "其他韭菜"
              - option "西芹"
              - option "本芹"
              - option "香芹"
              - option "水芹菜"
              - option "其他芹菜"
              - option "青莴笋"
              - option "红莴笋"
              - option "飞桥莴笋"
              - option "紫叶莴笋"
              - option "其他莴笋"
              - option "其他叶菜"
              - option "水果黄瓜"
              - option "刺黄瓜"
              - option "无刺黄瓜"
              - option "旱黄瓜"
              - option "白黄瓜"
              - option "其他黄瓜"
              - option "长丝瓜"
              - option "短丝瓜"
              - option "棱丝瓜"
              - option "光滑丝瓜"
              - option "白丝瓜"
              - option "其他丝瓜"
              - option "长苦瓜"
              - option "短苦瓜"
              - option "白玉苦瓜"
              - option "绿苦瓜"
              - option "大顶苦瓜"
              - option "其他苦瓜"
              - option "黑皮冬瓜"
              - option "白皮冬瓜"
              - option "粉皮冬瓜"
              - option "小冬瓜"
              - option "巨型冬瓜"
              - option "其他冬瓜"
              - option "蜜本南瓜"
              - option "贝贝南瓜"
              - option "板栗南瓜"
              - option "红皮南瓜"
              - option "青南瓜"
              - option "金瓜"
              - option "其他南瓜"
              - option "长瓠瓜"
              - option "短瓠瓜"
              - option "圆瓠瓜"
              - option "白瓠瓜"
              - option "青瓠瓜"
              - option "其他瓠瓜"
              - option "花叶西葫芦"
              - option "绿皮西葫芦"
              - option "黄皮西葫芦"
              - option "白皮西葫芦"
              - option "斑纹西葫芦"
              - option "其他西葫芦"
              - option "其他瓜菜"
              - option "樱桃番茄"
              - option "硬粉番茄"
              - option "水果番茄"
              - option "红果番茄"
              - option "黄果番茄"
              - option "其他番茄"
              - option "千禧小番茄"
              - option "粉妹小番茄"
              - option "红妃小番茄"
              - option "黄妃小番茄"
              - option "黑珍珠小番茄"
              - option "其他小番茄"
              - option "紫长茄子"
              - option "圆茄子"
              - option "青茄子"
              - option "白茄子"
              - option "线茄子"
              - option "其他茄子"
              - option "朝天椒"
              - option "线椒"
              - option "灯笼椒"
              - option "螺丝椒"
              - option "小米椒"
              - option "尖椒"
              - option "其他辣椒"
              - option "红彩椒"
              - option "黄彩椒"
              - option "橙彩椒"
              - option "紫彩椒"
              - option "白彩椒"
              - option "其他彩椒"
              - option "其他茄果"
              - option "白萝卜"
              - option "红萝卜"
              - option "青萝卜"
              - option "心里美"
              - option "樱桃萝卜"
              - option "其他萝卜"
              - option "红胡萝卜"
              - option "黄胡萝卜"
              - option "紫胡萝卜"
              - option "白胡萝卜"
              - option "迷你胡萝卜"
              - option "其他胡萝卜"
              - option "黄心土豆"
              - option "白心土豆"
              - option "红土豆"
              - option "紫土豆"
              - option "迷你土豆"
              - option "其他土豆"
              - option "红心红薯"
              - option "白心红薯"
              - option "紫薯"
              - option "黄心红薯"
              - option "蜜薯"
              - option "其他红薯"
              - option "铁棍山药"
              - option "麻山药"
              - option "白玉山药"
              - option "紫山药"
              - option "灵芝山药"
              - option "其他山药"
              - option "红莲藕"
              - option "白莲藕"
              - option "七孔莲藕"
              - option "九孔莲藕"
              - option "太空莲藕"
              - option "其他莲藕"
              - option "红荸荠"
              - option "黑荸荠"
              - option "桂林马蹄"
              - option "水马蹄"
              - option "勒荸荠"
              - option "其他荸荠"
              - option "荔浦芋头"
              - option "红芽芋头"
              - option "白芽芋头"
              - option "香芋"
              - option "野芋头"
              - option "其他芋头"
              - option "其他根茎"
              - option "长豇豆"
              - option "短豇豆"
              - option "白豇豆"
              - option "青豇豆"
              - option "其他豇豆"
              - option "架四季豆"
              - option "矮四季豆"
              - option "白四季豆"
              - option "青四季豆"
              - option "其他四季豆"
              - option "大粒毛豆"
              - option "小粒毛豆"
              - option "青毛豆"
              - option "黄毛豆"
              - option "其他毛豆"
              - option "大粒蚕豆"
              - option "小粒蚕豆"
              - option "青蚕豆"
              - option "白蚕豆"
              - option "其他蚕豆"
              - option "甜豌豆"
              - option "荷兰豆"
              - option "麻豌豆"
              - option "其他豌豆"
              - option "嫩扁豆"
              - option "白扁豆"
              - option "紫扁豆"
              - option "绿扁豆"
              - option "其他扁豆"
              - option "其他豆类"
              - option "章丘大葱"
              - option "铁杆大葱"
              - option "长白葱"
              - option "短白葱"
              - option "其他大葱"
              - option "细香葱"
              - option "分葱"
              - option "楼葱"
              - option "火葱"
              - option "其他小葱"
              - option "黄皮洋葱"
              - option "紫皮洋葱"
              - option "白皮洋葱"
              - option "红皮洋葱"
              - option "其他洋葱"
              - option "紫皮蒜"
              - option "白皮蒜"
              - option "独头蒜"
              - option "多瓣蒜"
              - option "其他大蒜"
              - option "老姜"
              - option "嫩姜"
              - option "沙姜"
              - option "山姜"
              - option "其他生姜"
              - option "白花韭菜"
              - option "红花韭菜"
              - option "黄花韭菜"
              - option "青花韭菜"
              - option "其他韭菜花"
              - option "其他葱蒜"
              - option "红颜"
              - option "章姬"
              - option "宁玉"
              - option "甜查理"
              - option "淡雪"
              - option "桃熏"
              - option "白雪公主"
              - option "其他草莓"
              - option "北高丛"
              - option "南高丛"
              - option "兔眼"
              - option "半高丛"
              - option "矮丛"
              - option "其他蓝莓"
              - option "红树莓"
              - option "黑树莓"
              - option "黄树莓"
              - option "紫树莓"
              - option "金铃子"
              - option "其他树莓"
              - option "巨峰"
              - option "夏黑"
              - option "阳光玫瑰"
              - option "红提"
              - option "青提"
              - option "美人指"
              - option "克伦生"
              - option "其他葡萄"
              - option "红心猕猴桃"
              - option "黄心猕猴桃"
              - option "绿心猕猴桃"
              - option "软枣猕猴桃"
              - option "毛花猕猴桃"
              - option "其他猕猴桃"
              - option "红心火龙果"
              - option "白心火龙果"
              - option "黄心火龙果"
              - option "燕窝果"
              - option "水晶火龙果"
              - option "其他火龙果"
              - option "其他浆果"
              - option "水蜜桃"
              - option "黄桃"
              - option "油桃"
              - option "蟠桃"
              - option "血桃"
              - option "毛桃"
              - option "其他桃子"
              - option "红李"
              - option "青李"
              - option "黑李"
              - option "黄李"
              - option "脆李"
              - option "其他李子"
              - option "甜杏"
              - option "酸杏"
              - option "仁用杏"
              - option "红杏"
              - option "白杏"
              - option "其他杏子"
              - option "青梅"
              - option "黄梅"
              - option "红梅"
              - option "乌梅"
              - option "其他梅子"
              - option "红灯樱桃"
              - option "美早樱桃"
              - option "黄蜜樱桃"
              - option "黑珍珠樱桃"
              - option "萨米托樱桃"
              - option "布鲁克斯樱桃"
              - option "其他樱桃"
              - option "其他核果"
              - option "红富士"
              - option "嘎啦"
              - option "黄元帅"
              - option "青苹果"
              - option "蛇果"
              - option "花牛"
              - option "其他苹果"
              - option "雪梨"
              - option "鸭梨"
              - option "皇冠梨"
              - option "酥梨"
              - option "香梨"
              - option "其他梨"
              - option "红山楂"
              - option "绿山楂"
              - option "歪把红"
              - option "大金星"
              - option "棉球山楂"
              - option "其他山楂"
              - option "红沙枇杷"
              - option "白沙枇杷"
              - option "解放钟枇杷"
              - option "大红袍枇杷"
              - option "早钟枇杷"
              - option "其他枇杷"
              - option "其他仁果"
              - option "脐橙"
              - option "血橙"
              - option "冰糖橙"
              - option "夏橙"
              - option "甜橙"
              - option "其他橙子"
              - option "砂糖橘"
              - option "蜜橘"
              - option "贡橘"
              - option "丑橘"
              - option "沃柑"
              - option "其他柑橘"
              - option "沙田柚"
              - option "蜜柚"
              - option "文旦"
              - option "西柚"
              - option "胡柚"
              - option "其他柚子"
              - option "尤力克柠檬"
              - option "香水柠檬"
              - option "青柠"
              - option "黄柠檬"
              - option "北京柠檬"
              - option "其他柠檬"
              - option "金弹"
              - option "金枣"
              - option "脆皮金橘"
              - option "滑皮金橘"
              - option "牛奶金橘"
              - option "其他金橘"
              - option "其他柑橘"
              - option "黄香蕉"
              - option "青香蕉"
              - option "红香蕉"
              - option "小米蕉"
              - option "皇帝蕉"
              - option "其他香蕉"
              - option "香水菠萝"
              - option "金钻菠萝"
              - option "牛奶菠萝"
              - option "手撕菠萝"
              - option "无眼菠萝"
              - option "其他菠萝"
              - option "台农芒果"
              - option "贵妃芒果"
              - option "金煌芒果"
              - option "象牙芒果"
              - option "青芒果"
              - option "凯特芒果"
              - option "其他芒果"
              - option "青椰子"
              - option "毛椰子"
              - option "金椰子"
              - option "糯米椰子"
              - option "香椰子"
              - option "其他椰子"
              - option "妃子笑"
              - option "糯米糍"
              - option "桂味"
              - option "荔枝王"
              - option "白蜡荔枝"
              - option "其他荔枝"
              - option "石硖龙眼"
              - option "储良龙眼"
              - option "古山龙眼"
              - option "草铺龙眼"
              - option "东壁龙眼"
              - option "其他龙眼"
              - option "金枕榴莲"
              - option "猫山王榴莲"
              - option "苏丹王榴莲"
              - option "黑刺榴莲"
              - option "红虾榴莲"
              - option "其他榴莲"
              - option "黄金菠萝蜜"
              - option "红肉菠萝蜜"
              - option "黄肉菠萝蜜"
              - option "白肉菠萝蜜"
              - option "泰国菠萝蜜"
              - option "其他菠萝蜜"
              - option "其他热带水果"
              - option "黑美人"
              - option "麒麟瓜"
              - option "8424西瓜"
              - option "京欣西瓜"
              - option "特小凤"
              - option "早春红玉"
              - option "其他西瓜"
              - option "西州蜜"
              - option "黄醉仙"
              - option "红心脆"
              - option "黑眉毛"
              - option "伽师瓜"
              - option "其他哈密瓜"
              - option "羊角蜜"
              - option "博洋甜瓜"
              - option "绿宝甜瓜"
              - option "金如意甜瓜"
              - option "伊丽莎白甜瓜"
              - option "其他甜瓜"
              - option "番木瓜"
              - option "宣木瓜"
              - option "毛叶木瓜"
              - option "皱皮木瓜"
              - option "光皮木瓜"
              - option "其他木瓜"
              - option "其他瓜类水果"
              - option "水稻"
              - option "糯米"
              - option "粳米"
              - option "籼米"
              - option "其他稻谷"
              - option "小麦"
              - option "大麦"
              - option "荞麦"
              - option "其他小麦类"
              - option "玉米"
              - option "糯玉米"
              - option "甜玉米"
              - option "爆裂玉米"
              - option "其他玉米"
              - option "黄豆"
              - option "黑豆"
              - option "绿豆"
              - option "红豆"
              - option "芸豆"
              - option "蚕豆"
              - option "其他豆类"
              - option "红薯"
              - option "土豆"
              - option "芋头"
              - option "山药"
              - option "其他薯类"
              - option "玫瑰"
              - option "百合"
              - option "康乃馨"
              - option "郁金香"
              - option "菊花"
              - option "洋桔梗"
              - option "非洲菊"
              - option "满天星"
              - option "勿忘我"
              - option "情人草"
              - option "其他鲜切花"
              - option "绿萝"
              - option "吊兰"
              - option "多肉植物"
              - option "仙人掌"
              - option "君子兰"
              - option "兰花"
              - option "杜鹃花"
              - option "茉莉花"
              - option "其他盆栽"
              - option "发财树"
              - option "幸福树"
              - option "平安树"
              - option "散尾葵"
              - option "龟背竹"
              - option "橡皮树"
              - option "其他观赏植物"
              - option "人参"
              - option "党参"
              - option "黄芪"
              - option "当归"
              - option "枸杞"
              - option "天麻"
              - option "三七"
              - option "何首乌"
              - option "其他根茎药材"
              - option "金银花"
              - option "菊花"
              - option "玫瑰花"
              - option "茉莉花"
              - option "荷叶"
              - option "艾叶"
              - option "其他花叶药材"
              - option "山楂"
              - option "枇杷叶"
              - option "陈皮"
              - option "橘红"
              - option "罗汉果"
              - option "其他果实药材"
              - option "香菇"
              - option "金针菇"
              - option "平菇"
              - option "杏鲍菇"
              - option "白玉菇"
              - option "蟹味菇"
              - option "其他木腐菌"
              - option "双孢蘑菇"
              - option "草菇"
              - option "鸡腿菇"
              - option "姬松茸"
              - option "其他草腐菌"
              - option "松茸"
              - option "牛肝菌"
              - option "鸡枞菌"
              - option "羊肚菌"
              - option "竹荪"
              - option "黑木耳"
              - option "银耳"
              - option "其他野生菌"
              - option "核桃"
              - option "板栗"
              - option "腰果"
              - option "杏仁"
              - option "榛子"
              - option "其他坚果"
              - option "绿茶"
              - option "红茶"
              - option "乌龙茶"
              - option "普洱茶"
              - option "茉莉花茶"
              - option "其他茶叶"
              - option "花椒"
              - option "八角"
              - option "桂皮"
              - option "胡椒"
              - option "辣椒干"
              - option "其他调料"
              - option "蜂蜜"
              - option "花粉"
              - option "蜂王浆"
              - option "其他"
          - generic [ref=e400]:
            - generic [ref=e401]: 订单状态
            - combobox [ref=e402]:
              - option "请选择" [selected]
              - option "已计划"
              - option "进行中"
              - option "已完成"
              - option "已取消"
          - generic [ref=e403]:
            - generic [ref=e404]: 订单日期
            - textbox [ref=e405]
          - generic [ref=e406]:
            - button "重置" [ref=e407] [cursor=pointer]:
              - img [ref=e408]
              - text: 重置
            - button "搜索" [ref=e411] [cursor=pointer]:
              - img [ref=e412]
              - text: 搜索
        - generic [ref=e415]:
          - heading "订单管理" [level=2] [ref=e416]
          - generic [ref=e417]:
            - button "新增" [ref=e418] [cursor=pointer]:
              - img [ref=e419]
              - text: 新增
            - button "库存不足" [ref=e420] [cursor=pointer]
            - button "编辑" [ref=e421] [cursor=pointer]
            - button "删除" [ref=e422] [cursor=pointer]
            - button "导出" [ref=e423] [cursor=pointer]:
              - img [ref=e424]
              - text: 导出
        - generic [ref=e427]:
          - table [ref=e429]:
            - rowgroup [ref=e430]:
              - row "订单编号 订单名称 订单类型 作物信息 数量 订单日期 预计采收 状态 操作" [ref=e431]:
                - columnheader "订单编号" [ref=e432]
                - columnheader "订单名称" [ref=e433]
                - columnheader "订单类型" [ref=e434]
                - columnheader "作物信息" [ref=e435]
                - columnheader "数量" [ref=e436]
                - columnheader "订单日期" [ref=e437]
                - columnheader "预计采收" [ref=e438]
                - columnheader "状态" [ref=e439]
                - columnheader "操作" [ref=e440]
            - rowgroup [ref=e441]:
              - row "DD20260505100005 辣椒订单 生产订单 朝天椒 蔬菜类 300 kg 2026-05-05 2026-05-18 已完成" [ref=e442]:
                - cell "DD20260505100005" [ref=e443]
                - cell "辣椒订单" [ref=e444]
                - cell "生产订单" [ref=e445]
                - cell "朝天椒 蔬菜类" [ref=e446]:
                  - generic [ref=e447]: 朝天椒
                  - generic "蔬菜类" [ref=e448]
                - cell "300 kg" [ref=e449]
                - cell "2026-05-05" [ref=e450]
                - cell "2026-05-18" [ref=e451]
                - cell "已完成" [ref=e452]
                - cell [ref=e453]:
                  - generic [ref=e454]:
                    - button "查看详情" [ref=e455] [cursor=pointer]:
                      - img [ref=e456]
                    - button "删除" [ref=e459] [cursor=pointer]:
                      - img [ref=e460]
              - row "DD20260504100004 草莓种苗订单 红颜草莓 水果类 200 kg 2026-05-04 2026-05-20 进行中" [ref=e463]:
                - cell "DD20260504100004" [ref=e464]
                - cell "草莓种苗订单" [ref=e465]
                - cell [ref=e466]
                - cell "红颜草莓 水果类" [ref=e467]:
                  - generic [ref=e468]: 红颜草莓
                  - generic "水果类" [ref=e469]
                - cell "200 kg" [ref=e470]
                - cell "2026-05-04" [ref=e471]
                - cell "2026-05-20" [ref=e472]
                - cell "进行中" [ref=e473]
                - cell [ref=e474]:
                  - generic [ref=e475]:
                    - button "查看详情" [ref=e476] [cursor=pointer]:
                      - img [ref=e477]
                    - button "删除" [ref=e480] [cursor=pointer]:
                      - img [ref=e481]
              - row "DD20260503100003 生菜订单 生产订单 大叶生菜 蔬菜类 500 kg 2026-05-03 2026-05-17 已计划" [ref=e484]:
                - cell "DD20260503100003" [ref=e485]
                - cell "生菜订单" [ref=e486]
                - cell "生产订单" [ref=e487]
                - cell "大叶生菜 蔬菜类" [ref=e488]:
                  - generic [ref=e489]: 大叶生菜
                  - generic "蔬菜类" [ref=e490]
                - cell "500 kg" [ref=e491]
                - cell "2026-05-03" [ref=e492]
                - cell "2026-05-17" [ref=e493]
                - cell "已计划" [ref=e494]
                - cell [ref=e495]:
                  - generic [ref=e496]:
                    - button "查看详情" [ref=e497] [cursor=pointer]:
                      - img [ref=e498]
                    - button "删除" [ref=e501] [cursor=pointer]:
                      - img [ref=e502]
              - row "DD20260502100002 黄瓜订单 生产订单 水果黄瓜 蔬菜类 800 kg 2026-05-02 2026-05-16 进行中" [ref=e505]:
                - cell "DD20260502100002" [ref=e506]
                - cell "黄瓜订单" [ref=e507]
                - cell "生产订单" [ref=e508]
                - cell "水果黄瓜 蔬菜类" [ref=e509]:
                  - generic [ref=e510]: 水果黄瓜
                  - generic "蔬菜类" [ref=e511]
                - cell "800 kg" [ref=e512]
                - cell "2026-05-02" [ref=e513]
                - cell "2026-05-16" [ref=e514]
                - cell "进行中" [ref=e515]
                - cell [ref=e516]:
                  - generic [ref=e517]:
                    - button "查看详情" [ref=e518] [cursor=pointer]:
                      - img [ref=e519]
                    - button "删除" [ref=e522] [cursor=pointer]:
                      - img [ref=e523]
              - row "DD20260501100001 番茄订单 生产订单 红果番茄 蔬菜类 1000 kg 2026-05-01 2026-05-15 已计划" [ref=e526]:
                - cell "DD20260501100001" [ref=e527]
                - cell "番茄订单" [ref=e528]
                - cell "生产订单" [ref=e529]
                - cell "红果番茄 蔬菜类" [ref=e530]:
                  - generic [ref=e531]: 红果番茄
                  - generic "蔬菜类" [ref=e532]
                - cell "1000 kg" [ref=e533]
                - cell "2026-05-01" [ref=e534]
                - cell "2026-05-15" [ref=e535]
                - cell "已计划" [ref=e536]
                - cell [ref=e537]:
                  - generic [ref=e538]:
                    - button "查看详情" [ref=e539] [cursor=pointer]:
                      - img [ref=e540]
                    - button "删除" [ref=e543] [cursor=pointer]:
                      - img [ref=e544]
          - generic [ref=e547]:
            - generic [ref=e548]:
              - generic [ref=e549]: 每页
              - combobox [ref=e550]:
                - option "10" [selected]
                - option "20"
                - option "50"
              - generic [ref=e551]: 条
            - generic [ref=e552]:
              - generic [ref=e553]: 共 5 条
              - button [disabled] [ref=e554]:
                - img [ref=e555]
              - generic [ref=e557]: 1 / 1
              - button [disabled] [ref=e558]:
                - img [ref=e559]
  - generic "通知"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // 订单管理页面 E2E 测试
  4   | test.describe('订单管理页面测试', () => {
  5   |   test.beforeEach(async ({ page }) => {
  6   |     // 收集控制台错误
  7   |     page.on('console', msg => {
  8   |       if (msg.type() === 'error') {
  9   |         console.log(`[控制台错误] ${msg.text()}`);
  10  |       }
  11  |     });
  12  | 
  13  |     // 收集页面错误
  14  |     page.on('pageerror', err => {
  15  |       console.log(`[页面错误] ${err.message}`);
  16  |     });
  17  |   });
  18  | 
  19  |   test('1. 页面加载和侧边栏导航', async ({ page }) => {
  20  |     console.log('--- 步骤1: 导航到首页 ---');
  21  |     await page.goto('http://localhost:5188', { waitUntil: 'networkidle' });
  22  |     console.log('页面已加载:', page.url());
  23  | 
  24  |     // 等待页面主体内容出现
  25  |     await page.waitForSelector('body');
  26  |     console.log('页面主体已渲染');
  27  |   });
  28  | 
  29  |   test('2. 直接导航到订单管理页面', async ({ page }) => {
  30  |     console.log('--- 步骤2: 直接导航到订单管理页面 ---');
  31  | 
  32  |     // 订单管理页面路径是 /crop/order
  33  |     await page.goto('http://localhost:5188/crop/order', { waitUntil: 'networkidle' });
  34  |     await page.waitForTimeout(2000);
  35  | 
  36  |     console.log('当前URL:', page.url());
  37  | 
  38  |     // 验证页面URL正确
  39  |     expect(page.url()).toContain('/crop/order');
  40  |     console.log('成功进入订单管理页面');
  41  |   });
  42  | 
  43  |   test('3. 检查订单列表是否显示', async ({ page }) => {
  44  |     console.log('--- 步骤3: 检查订单列表 ---');
  45  | 
  46  |     // 直接导航到订单页面
  47  |     await page.goto('http://localhost:5188/crop/order', { waitUntil: 'networkidle' });
  48  |     await page.waitForTimeout(2000);
  49  | 
  50  |     // 查找表格元素
  51  |     const tableSelectors = [
  52  |       '[role="table"]',
  53  |       'table',
  54  |       '.ant-table',
  55  |       '[class*="table"]',
  56  |       '[class*="Table"]'
  57  |     ];
  58  | 
  59  |     for (const selector of tableSelectors) {
  60  |       const tableElement = page.locator(selector).first();
  61  |       const isVisible = await tableElement.isVisible().catch(() => false);
  62  |       if (isVisible) {
  63  |         console.log(`找到表格元素: ${selector}`);
  64  |         break;
  65  |       }
  66  |     }
  67  | 
  68  |     // 查找订单相关文本
  69  |     const orderText = page.getByText(/订单/).first();
  70  |     const hasOrderText = await orderText.isVisible().catch(() => false);
  71  |     console.log('包含订单文本:', hasOrderText);
  72  |   });
  73  | 
  74  |   test('4. 检查控制台错误', async ({ page }) => {
  75  |     console.log('--- 步骤4: 检查控制台错误 ---');
  76  | 
  77  |     const consoleErrors: string[] = [];
  78  |     page.on('console', msg => {
  79  |       if (msg.type() === 'error') {
  80  |         consoleErrors.push(msg.text());
  81  |       }
  82  |     });
  83  | 
  84  |     await page.goto('http://localhost:5188/crop/order', { waitUntil: 'networkidle' });
  85  |     await page.waitForTimeout(3000);
  86  | 
  87  |     if (consoleErrors.length > 0) {
  88  |       console.log('发现控制台错误:');
  89  |       consoleErrors.forEach(err => console.log('  -', err));
  90  |     } else {
  91  |       console.log('无控制台错误');
  92  |     }
  93  | 
> 94  |     expect(consoleErrors.length).toBe(0);
      |                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  95  |   });
  96  | 
  97  |   test('5. 点击"新增订单"按钮并检查弹窗', async ({ page }) => {
  98  |     console.log('--- 步骤5: 点击"新增订单"按钮 ---');
  99  | 
  100 |     await page.goto('http://localhost:5188/crop/order', { waitUntil: 'networkidle' });
  101 |     await page.waitForTimeout(2000);
  102 | 
  103 |     // 查找新增按钮 - 使用多种可能的选择器
  104 |     const addButtonSelectors = [
  105 |       'button:has-text("新增")',
  106 |       'button:has-text("新增订单")',
  107 |       'button:has-text("添加")',
  108 |       '[class*="button"]:has-text("新增")',
  109 |       '[class*="btn"]:has-text("新增")',
  110 |       '[aria-label*="新增"]',
  111 |       '[title*="新增"]'
  112 |     ];
  113 | 
  114 |     let addButton = null;
  115 |     for (const selector of addButtonSelectors) {
  116 |       const btn = page.locator(selector).first();
  117 |       const isVisible = await btn.isVisible().catch(() => false);
  118 |       if (isVisible) {
  119 |         addButton = btn;
  120 |         console.log(`找到新增按钮: ${selector}`);
  121 |         break;
  122 |       }
  123 |     }
  124 | 
  125 |     if (addButton) {
  126 |       await addButton.click();
  127 |       await page.waitForTimeout(1500);
  128 | 
  129 |       // 检查弹窗是否出现
  130 |       const dialogSelectors = [
  131 |         '[role="dialog"]',
  132 |         '.ant-modal',
  133 |         '[class*="modal"]',
  134 |         '[class*="dialog"]',
  135 |         '[class*="Modal"]'
  136 |       ];
  137 | 
  138 |       let dialogFound = false;
  139 |       for (const selector of dialogSelectors) {
  140 |         const dialog = page.locator(selector).first();
  141 |         const isVisible = await dialog.isVisible().catch(() => false);
  142 |         if (isVisible) {
  143 |           console.log(`找到弹窗: ${selector}`);
  144 |           dialogFound = true;
  145 |           break;
  146 |         }
  147 |       }
  148 | 
  149 |       if (!dialogFound) {
  150 |         // 如果没找到标准弹窗，检查是否有表单或其他交互元素出现
  151 |         const formElements = page.locator('form, [class*="form"], input, [role="form"]').first();
  152 |         const hasForm = await formElements.isVisible().catch(() => false);
  153 |         console.log('表单元素可见:', hasForm);
  154 |       }
  155 |     } else {
  156 |       console.log('未找到新增订单按钮');
  157 |       // 截图以便调试
  158 |       await page.screenshot({ path: 'order-page-no-add-button.png' });
  159 |     }
  160 |   });
  161 | });
  162 | 
```