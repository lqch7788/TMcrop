/**
 * 销售统计页面 - 使用 shadcn/ui 组件重构
 * 展示产品销售数据分析、统计概览
 */
import { useState } from 'react'
import {
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Eye,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  useToast,
} from '@/components/ui'

// 销售统计数据
const statisticsData = [
  {
    id: 'ST001',
    productName: '番茄',
    category: '茄果类',
    totalSales: 125600,
    totalVolume: 18800,
    orderCount: 156,
    avgPrice: 6.68,
    trend: '上涨',
    share: '23.5%',
    period: '2026年3月',
  },
  {
    id: 'ST002',
    productName: '黄瓜',
    category: '瓜菜类',
    totalSales: 98600,
    totalVolume: 23400,
    orderCount: 134,
    avgPrice: 4.21,
    trend: '下跌',
    share: '18.4%',
    period: '2026年3月',
  },
  {
    id: 'ST003',
    productName: '草莓',
    category: '浆果类',
    totalSales: 87200,
    totalVolume: 3480,
    orderCount: 89,
    avgPrice: 25.06,
    trend: '上涨',
    share: '16.3%',
    period: '2026年3月',
  },
  {
    id: 'ST004',
    productName: '辣椒',
    category: '茄果类',
    totalSales: 65400,
    totalVolume: 7680,
    orderCount: 98,
    avgPrice: 8.52,
    trend: '平稳',
    share: '12.2%',
    period: '2026年3月',
  },
  {
    id: 'ST005',
    productName: '生菜',
    category: '叶菜类',
    totalSales: 42800,
    totalVolume: 8560,
    orderCount: 67,
    avgPrice: 5.0,
    trend: '下跌',
    share: '8.0%',
    period: '2026年3月',
  },
  {
    id: 'ST006',
    productName: '西瓜',
    category: '瓜果类',
    totalSales: 35600,
    totalVolume: 7120,
    orderCount: 45,
    avgPrice: 5.0,
    trend: '下跌',
    share: '6.6%',
    period: '2026年3月',
  },
  {
    id: 'ST007',
    productName: '葡萄',
    category: '浆果类',
    totalSales: 28400,
    totalVolume: 2360,
    orderCount: 34,
    avgPrice: 12.03,
    trend: '上涨',
    share: '5.3%',
    period: '2026年3月',
  },
  {
    id: 'ST008',
    productName: '茄子',
    category: '茄果类',
    totalSales: 21200,
    totalVolume: 2940,
    orderCount: 56,
    avgPrice: 7.21,
    trend: '平稳',
    share: '4.0%',
    period: '2026年3月',
  },
  {
    id: 'ST009',
    productName: '菠菜',
    category: '叶菜类',
    totalSales: 15600,
    totalVolume: 3460,
    orderCount: 43,
    avgPrice: 4.51,
    trend: '上涨',
    share: '2.9%',
    period: '2026年3月',
  },
  {
    id: 'ST010',
    productName: '樱桃番茄',
    category: '茄果类',
    totalSales: 12800,
    totalVolume: 920,
    orderCount: 28,
    avgPrice: 13.91,
    trend: '上涨',
    share: '2.4%',
    period: '2026年3月',
  },
]

// 类别徽章颜色映射
const categoryVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'ghost'> = {
  '茄果类': 'destructive',
  '瓜菜类': 'success',
  '叶菜类': 'warning',
  '浆果类': 'info',
}

// 趋势徽章映射
const getTrendBadgeVariant = (trend: string): 'success' | 'destructive' | 'default' => {
  switch (trend) {
    case '上涨':
      return 'success'
    case '下跌':
      return 'destructive'
    default:
      return 'default'
  }
}

// 趋势图标组件
const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === '上涨') {
    return <TrendingUp className="w-3 h-3" />
  }
  if (trend === '下跌') {
    return <TrendingDown className="w-3 h-3" />
  }
  return <BarChart3 className="w-3 h-3" />
}

/**
 * 销售统计页面
 */
const SalesStatistics = () => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('view')
  const [selectedStat, setSelectedStat] = useState<typeof statisticsData[0] | null>(null)
  const [timeFilter, setTimeFilter] = useState('本月')
  const { toast } = useToast()

  const timeRanges = ['今日', '本周', '本月', '本季', '本年']

  // 筛选数据
  const filteredData = statisticsData.filter((s) => {
    const matchesSearch =
      !searchKeyword ||
      s.productName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      s.category.toLowerCase().includes(searchKeyword.toLowerCase())
    return matchesSearch
  })

  // 汇总数据
  const totalSales = filteredData.reduce((sum, s) => sum + s.totalSales, 0)
  const totalVolume = filteredData.reduce((sum, s) => sum + s.totalVolume, 0)
  const totalOrders = filteredData.reduce((sum, s) => sum + s.orderCount, 0)

  // 操作处理
  const handleView = (item: typeof statisticsData[0]) => {
    setSelectedStat(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: typeof statisticsData[0]) => {
    setSelectedStat(item)
    setModalType('edit')
    setShowModal(true)
  }

  const handleDelete = (item: typeof statisticsData[0]) => {
    toast({
      title: '删除确认',
      description: `确定要删除 ${item.productName} 的统计数据吗？`,
      variant: 'destructive',
    })
  }

  const handleSave = () => {
    setShowModal(false)
    toast({
      title: '保存成功',
      description: '数据已成功保存',
      variant: 'success',
    })
  }

  const handleExport = () => {
    toast({
      title: '导出成功',
      description: '销售报表已成功导出',
      variant: 'success',
    })
  }

  return (
    <div className="p-page space-y-section">
      <Toaster />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">销售统计</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">产品销售数据分析</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            导出报表
          </Button>
          <Button
            icon={Plus}
            onClick={() => {
              setSelectedStat(null)
              setModalType('add')
              setShowModal(true)
            }}
          >
            添加统计
          </Button>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {/* 总销售额 */}
        <Card className="bg-gradient-to-br from-[#2B5D3A] to-green-500 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                +12.5%
              </Badge>
            </div>
            <p className="text-2xl font-bold">
              ¥{totalSales.toLocaleString()}
            </p>
            <p className="text-green-100 text-sm mt-1">总销售额</p>
          </CardContent>
        </Card>

        {/* 总销售量 */}
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                +8.2%
              </Badge>
            </div>
            <p className="text-2xl font-bold">{totalVolume.toLocaleString()} kg</p>
            <p className="text-blue-100 text-sm mt-1">总销售量</p>
          </CardContent>
        </Card>

        {/* 订单总数 */}
        <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <PieChart className="w-5 h-5" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                +5.3%
              </Badge>
            </div>
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-purple-100 text-sm mt-1">订单总数</p>
          </CardContent>
        </Card>

        {/* 平均单价 */}
        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-lg font-bold">¥</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                -2.1%
              </Badge>
            </div>
            <p className="text-2xl font-bold">¥{(totalSales / totalVolume).toFixed(2)}</p>
            <p className="text-amber-100 text-sm mt-1">平均单价</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选区域 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 时间范围筛选 */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--color-text-secondary)]">时间范围：</span>
              <div className="flex gap-2">
                {timeRanges.map((range) => (
                  <Button
                    key={range}
                    variant={timeFilter === range ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeFilter(range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* 搜索框 */}
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder="搜索产品名称或类别..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>产品名称</TableHead>
              <TableHead>类别</TableHead>
              <TableHead className="text-right">销售额</TableHead>
              <TableHead className="text-right">销售量</TableHead>
              <TableHead className="text-right">订单数</TableHead>
              <TableHead className="text-right">平均单价</TableHead>
              <TableHead>走势</TableHead>
              <TableHead>占比</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {item.productName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={categoryVariants[item.category] || 'default'}>
                    {item.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold text-[var(--color-accent)]">
                  ¥{item.totalSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-[var(--color-text-secondary)]">
                  {item.totalVolume.toLocaleString()} kg
                </TableCell>
                <TableCell className="text-right text-[var(--color-text-secondary)]">
                  {item.orderCount}
                </TableCell>
                <TableCell className="text-right text-[var(--color-text-secondary)]">
                  ¥{item.avgPrice}/kg
                </TableCell>
                <TableCell>
                  <Badge variant={getTrendBadgeVariant(item.trend)} className="flex items-center gap-1 w-fit">
                    <TrendIcon trend={item.trend} />
                    {item.trend}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-[var(--color-background-tertiary)] rounded-full h-2">
                      <div
                        className="bg-[var(--color-accent)] h-2 rounded-full transition-all"
                        style={{ width: item.share }}
                      />
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">{item.share}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(item)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="w-4 h-4 text-[var(--color-error)]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 空状态 */}
        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-muted)]">暂无数据</p>
          </div>
        )}
      </Card>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          共 {filteredData.length} 条记录
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            上一页
          </Button>
          <Button size="sm">1</Button>
          <Button variant="outline" size="sm">
            下一页
          </Button>
        </div>
      </div>

      {/* 弹窗 - 使用项目绿色渐变标题栏 */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalType === 'add' ? '添加统计' : modalType === 'edit' ? '编辑统计' : '统计详情'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {modalType === 'view' && selectedStat ? (
              /* 查看模式 */
              <div className="space-y-6">
                {/* 产品信息头部 */}
                <div className="bg-gradient-to-r from-[#2B5D3A] to-[#3D8B5F] rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-2xl font-bold">{selectedStat.productName}</h4>
                      <p className="text-green-100 mt-1">统计周期：{selectedStat.period}</p>
                    </div>
                    <Badge
                      variant={
                        selectedStat.trend === '上涨'
                          ? 'success'
                          : selectedStat.trend === '下跌'
                            ? 'destructive'
                            : 'default'
                      }
                      className="bg-white/20 text-white border-0"
                    >
                      <TrendIcon trend={selectedStat.trend} />
                      {selectedStat.trend}
                    </Badge>
                  </div>
                </div>

                {/* 统计数据网格 */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">销售额</p>
                      <p className="text-lg font-bold text-[var(--color-accent)]">
                        ¥{selectedStat.totalSales.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">销售量</p>
                      <p className="text-lg font-bold">{selectedStat.totalVolume.toLocaleString()} kg</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">订单数</p>
                      <p className="text-lg font-bold">{selectedStat.orderCount} 笔</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">平均单价</p>
                      <p className="text-lg font-bold">¥{selectedStat.avgPrice}/kg</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">所属类别</p>
                      <p className="text-lg font-bold">{selectedStat.category}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-[var(--color-text-muted)] mb-1">销售占比</p>
                      <p className="text-lg font-bold">{selectedStat.share}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* 编辑/添加模式 */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      产品名称
                    </label>
                    <Input defaultValue={selectedStat?.productName || ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      类别
                    </label>
                    <Input defaultValue={selectedStat?.category || '茄果类'} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      销售额
                    </label>
                    <Input type="number" defaultValue={selectedStat?.totalSales || ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      销售量
                    </label>
                    <Input type="number" defaultValue={selectedStat?.totalVolume || ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      订单数
                    </label>
                    <Input type="number" defaultValue={selectedStat?.orderCount || ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      平均单价
                    </label>
                    <Input type="number" step="0.01" defaultValue={selectedStat?.avgPrice || ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      走势
                    </label>
                    <Input defaultValue={selectedStat?.trend || '平稳'} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      占比
                    </label>
                    <Input defaultValue={selectedStat?.share || ''} placeholder="如：23.5%" />
                  </div>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalesStatistics
