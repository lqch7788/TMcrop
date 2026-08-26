/**
 * 销售统计页面 - 使用 shadcn/ui 组件重构
 * 展示产品销售数据分析、统计概览
 */
import { useState, useEffect } from 'react'
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
import { getStatistics, Statistic } from '@/services/marketApiService'

// 类别徽章颜色映射
const categoryVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'ghost'> = {
  '茄果类': 'destructive',
  '瓜菜类': 'success',
  '叶菜类': 'warning',
  '浆果类': 'info',
}

// 趋势徽章映射
const getTrendBadgeVariant = (trend?: string): 'success' | 'destructive' | 'default' => {
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
const TrendIcon = ({ trend }: { trend?: string }) => {
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
  const [selectedStat, setSelectedStat] = useState<Statistic | null>(null)
  const [timeFilter, setTimeFilter] = useState('本月')
  const { toast } = useToast()

  // 销售统计数据状态（V2.1 铁律：API 直连，无缓存）
  const [statistics, setStatistics] = useState<Statistic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 加载销售统计数据
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getStatistics()
        if (!cancelled) {
          setStatistics(data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '加载销售统计失败'
          setError(msg)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const timeRanges = ['今日', '本周', '本月', '本季', '本年']

  // 筛选数据
  const filteredData = statistics.filter((s) => {
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
  // 计算每个产品占比（用于"占比"列展示，Statistic 接口未包含 share 字段）
  const calcShare = (sales: number): string => {
    if (totalSales <= 0) return '0.0%'
    return ((sales / totalSales) * 100).toFixed(1) + '%'
  }

  // 操作处理
  const handleView = (item: Statistic) => {
    setSelectedStat(item)
    setModalType('view')
    setShowModal(true)
  }

  const handleEdit = (item: Statistic) => {
    setSelectedStat(item)
    setModalType('edit')
    setShowModal(true)
  }

  const handleDelete = (item: Statistic) => {
    toast.warning(`确定要删除 ${item.productName} 的统计数据吗？`)
  }

  const handleSave = () => {
    setShowModal(false)
    toast.success('数据已成功保存')
  }

  const handleExport = () => {
    toast.success('销售报表已成功导出')
  }

  return (
    <div className="p-page space-y-section">
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

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          加载失败：{error}
        </div>
      )}

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
            <p className="text-2xl font-bold">
              ¥{totalVolume > 0 ? (totalSales / totalVolume).toFixed(2) : '0.00'}
            </p>
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-[var(--color-text-muted)]">
                  加载中...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
                    <p className="text-[var(--color-text-muted)]">暂无数据</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const share = calcShare(item.totalSales)
                const shareNum = parseFloat(share)
                return (
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
                        {item.trend ?? '平稳'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-[var(--color-background-tertiary)] rounded-full h-2">
                          <div
                            className="bg-[var(--color-accent)] h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(shareNum, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-[var(--color-text-muted)]">{share}</span>
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
                )
              })
            )}
          </TableBody>
        </Table>
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
          <div className="space-y-4">
            {modalType === 'view' && selectedStat ? (
              /* 查看模式 */
              <div className="space-y-6">
                {/* 产品信息头部 */}
                <div className="bg-gradient-to-r from-[#2B5D3A] to-[#3D8B5F] rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-2xl font-bold">{selectedStat.productName}</h4>
                      <p className="text-green-100 mt-1">统计周期：{timeFilter}</p>
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
                      {selectedStat.trend ?? '平稳'}
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
                      <p className="text-lg font-bold">{calcShare(selectedStat.totalSales)}</p>
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
                    <Input defaultValue={selectedStat?.productName ?? ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      类别
                    </label>
                    <Input defaultValue={selectedStat?.category ?? '茄果类'} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      销售额
                    </label>
                    <Input type="number" defaultValue={selectedStat?.totalSales ?? ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      销售量
                    </label>
                    <Input type="number" defaultValue={selectedStat?.totalVolume ?? ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      订单数
                    </label>
                    <Input type="number" defaultValue={selectedStat?.orderCount ?? ''} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      平均单价
                    </label>
                    <Input type="number" step="0.01" defaultValue={selectedStat?.avgPrice ?? ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      走势
                    </label>
                    <Input defaultValue={selectedStat?.trend ?? '平稳'} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">
                      占比
                    </label>
                    <Input defaultValue={selectedStat ? calcShare(selectedStat.totalSales) : ''} placeholder="自动计算" />
                  </div>
                </div>
              </div>
            )}
          </div>
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