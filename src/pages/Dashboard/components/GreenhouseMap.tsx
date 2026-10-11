// 基地总览图组件 - 3D 等轴测大棚示意图（SVG）
// 2026-10-11：由扁平色块重绘为立体示意图 —— 每个棚区画"顶面+正面+侧面"三面渐变 + 地面投影，
//             玻璃温室加玻璃分格与反光、连栋温室加跨间拱线、日光温室为单坡斜顶、大田为透视田垄；
//             4 个分区（玻璃/连栋/日光/大田）继续绑定 greenhouses 表真实区域名称与面积，
//             未匹配到真实数据时回退原示意文案
import { MapPin } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { MapZones } from '../types/dashboard.types';

interface GreenhouseMapProps {
  expanded: boolean;
  onToggle: () => void;
  onMapClick: () => void;
  /** 真实分区数据（按温室类型匹配，缺省回退示意文案） */
  zones?: MapZones;
}

/** 分区面积文案（如 "100亩"） */
function zoneAreaText(zone?: { area: number; unit: string }): string {
  if (!zone) return '';
  return `${zone.area}${zone.unit}`;
}

export function GreenhouseMap({ expanded, onToggle, onMapClick, zones }: GreenhouseMapProps) {
  return (
    <div className="animate-card-in" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <p className="text-base font-bold text-emerald-700">基地总览图</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="btn-expand"
        >
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      </div>
      {expanded && (
        <div
          className="card-map relative w-full h-[26rem] cursor-pointer group"
          onClick={onMapClick}
        >
          {/* 深色科技背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f1a0f] to-[#1a2f1a]" />

          {/* 3D 等轴测大棚示意图 */}
          <svg viewBox="0 0 400 280" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* ===== 玻璃温室（蓝）：顶亮 / 面中 / 侧暗 ===== */}
              <linearGradient id="glassTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#dbeafe"/>
                <stop offset="100%" stopColor="#93c5fd"/>
              </linearGradient>
              <linearGradient id="glassFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd"/>
                <stop offset="100%" stopColor="#2563eb"/>
              </linearGradient>
              <linearGradient id="glassSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#1e40af"/>
              </linearGradient>

              {/* ===== 连栋薄膜温室（青） ===== */}
              <linearGradient id="filmTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ccfbf1"/>
                <stop offset="100%" stopColor="#5eead4"/>
              </linearGradient>
              <linearGradient id="filmFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5eead4"/>
                <stop offset="100%" stopColor="#0d9488"/>
              </linearGradient>
              <linearGradient id="filmSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#14b8a6"/>
                <stop offset="100%" stopColor="#0f766e"/>
              </linearGradient>

              {/* ===== 日光温室（橙）：单坡斜顶 ===== */}
              <linearGradient id="sunTop" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7"/>
                <stop offset="100%" stopColor="#fbbf24"/>
              </linearGradient>
              <linearGradient id="sunFront" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d"/>
                <stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
              <linearGradient id="sunSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d97706"/>
                <stop offset="100%" stopColor="#b45309"/>
              </linearGradient>

              {/* ===== 大田（绿） ===== */}
              <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80"/>
                <stop offset="100%" stopColor="#16a34a"/>
              </linearGradient>

              {/* 道路渐变（中间亮两侧暗，增加通道纵深感） */}
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#374151"/>
                <stop offset="50%" stopColor="#4b5563"/>
                <stop offset="100%" stopColor="#374151"/>
              </linearGradient>

              {/* 地面投影模糊 */}
              <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3"/>
              </filter>
            </defs>

            {/* 右上角阳光光晕（氛围） */}
            <circle cx="372" cy="16" r="64" fill="#fbbf24" opacity="0.06"/>

            {/* ================= 道路（保持原位） ================= */}
            <g>
              <rect x="190" y="10" width="20" height="260" fill="url(#roadGrad)" rx="3"/>
              <line x1="200" y1="15" x2="200" y2="255" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 6" opacity="0.7"/>
              <rect x="10" y="130" width="380" height="16" fill="url(#roadGrad)" rx="3"/>
              <line x1="15" y1="138" x2="385" y2="138" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 6" opacity="0.7"/>
              <rect x="10" y="220" width="380" height="12" fill="url(#roadGrad)" rx="3"/>
              <line x1="15" y1="226" x2="385" y2="226" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 6" opacity="0.7"/>
            </g>

            {/* ================= 玻璃温室区（左上）：等轴测盒 + 玻璃分格/反光 ================= */}
            <g>
              {/* 地面投影 */}
              <ellipse cx="96" cy="127" rx="74" ry="9" fill="#000" opacity="0.4" filter="url(#softShadow)"/>
              {/* 顶面（后高前低平行四边形） */}
              <polygon points="30,76 142,76 166,52 54,52" fill="url(#glassTop)" stroke="#bfdbfe" strokeWidth="0.6"/>
              {/* 顶面反光斜条 */}
              <polygon points="64,52 84,52 62,76 42,76" fill="#ffffff" opacity="0.35"/>
              <polygon points="104,52 124,52 102,76 82,76" fill="#ffffff" opacity="0.2"/>
              {/* 屋脊线 */}
              <line x1="54" y1="52" x2="166" y2="52" stroke="#ffffff" strokeWidth="0.8" opacity="0.7"/>
              {/* 右侧面 */}
              <polygon points="142,76 166,52 166,96 142,120" fill="url(#glassSide)"/>
              {/* 前立面（玻璃墙） */}
              <rect x="30" y="76" width="112" height="44" fill="url(#glassFront)" rx="1.5"/>
              {/* 玻璃竖分格 */}
              <line x1="58" y1="78" x2="58" y2="118" stroke="#dbeafe" strokeWidth="1" opacity="0.4"/>
              <line x1="86" y1="78" x2="86" y2="118" stroke="#dbeafe" strokeWidth="1" opacity="0.4"/>
              <line x1="114" y1="78" x2="114" y2="118" stroke="#dbeafe" strokeWidth="1" opacity="0.4"/>
              {/* 前立面顶部高光 */}
              <rect x="30" y="76" width="112" height="5" fill="#ffffff" opacity="0.25" rx="1.5"/>
              {/* 名称 + 面积 */}
              <text x="86" y="97" fill="#ffffff" fontSize="12.5" fontFamily="Arial" fontWeight="bold" textAnchor="middle">{zones?.glass?.name || '玻璃温室区'}</text>
              <text x="86" y="113" fill="#dbeafe" fontSize="9" fontFamily="Arial" textAnchor="middle">{zoneAreaText(zones?.glass)}</text>
            </g>

            {/* ================= 连栋温室区（右上）：等轴测盒 + 跨间拱线 ================= */}
            <g>
              <ellipse cx="296" cy="127" rx="74" ry="9" fill="#000" opacity="0.4" filter="url(#softShadow)"/>
              {/* 顶面 */}
              <polygon points="222,76 344,76 368,52 246,52" fill="url(#filmTop)" stroke="#99f6e4" strokeWidth="0.6"/>
              {/* 连栋跨间线（3 条，连接前/后顶边） */}
              <line x1="247" y1="76" x2="271" y2="52" stroke="#f0fdfa" strokeWidth="1" opacity="0.8"/>
              <line x1="282" y1="76" x2="306" y2="52" stroke="#f0fdfa" strokeWidth="1" opacity="0.8"/>
              <line x1="317" y1="76" x2="341" y2="52" stroke="#f0fdfa" strokeWidth="1" opacity="0.8"/>
              {/* 屋脊线 */}
              <line x1="246" y1="52" x2="368" y2="52" stroke="#ffffff" strokeWidth="0.8" opacity="0.7"/>
              {/* 右侧面 */}
              <polygon points="344,76 368,52 368,96 344,120" fill="url(#filmSide)"/>
              {/* 前立面（棚膜墙） */}
              <rect x="222" y="76" width="122" height="44" fill="url(#filmFront)" rx="1.5"/>
              {/* 棚膜横向压膜线 */}
              <line x1="224" y1="94" x2="342" y2="94" stroke="#ccfbf1" strokeWidth="1" opacity="0.35"/>
              <line x1="224" y1="108" x2="342" y2="108" stroke="#ccfbf1" strokeWidth="1" opacity="0.35"/>
              <rect x="222" y="76" width="122" height="5" fill="#ffffff" opacity="0.22" rx="1.5"/>
              <text x="283" y="97" fill="#ffffff" fontSize="12.5" fontFamily="Arial" fontWeight="bold" textAnchor="middle">{zones?.film?.name || '连栋温室区'}</text>
              <text x="283" y="113" fill="#ccfbf1" fontSize="9" fontFamily="Arial" textAnchor="middle">{zoneAreaText(zones?.film)}</text>
            </g>

            {/* ================= 日光温室区（右中下）：单坡斜顶（前矮后高） ================= */}
            <g>
              <ellipse cx="296" cy="216" rx="74" ry="8" fill="#000" opacity="0.4" filter="url(#softShadow)"/>
              {/* 单坡斜顶（前低后高，面积大） */}
              <polygon points="222,182 344,182 368,144 246,144" fill="url(#sunTop)" stroke="#fde68a" strokeWidth="0.6"/>
              {/* 保温被分隔线（3 条） */}
              <line x1="252" y1="182" x2="276" y2="144" stroke="#fef3c7" strokeWidth="0.8" opacity="0.6"/>
              <line x1="288" y1="182" x2="312" y2="144" stroke="#fef3c7" strokeWidth="0.8" opacity="0.6"/>
              <line x1="324" y1="182" x2="348" y2="144" stroke="#fef3c7" strokeWidth="0.8" opacity="0.6"/>
              {/* 后墙高光线 */}
              <line x1="246" y1="144" x2="368" y2="144" stroke="#ffffff" strokeWidth="0.8" opacity="0.7"/>
              {/* 右侧面 */}
              <polygon points="344,182 368,144 368,172 344,210" fill="url(#sunSide)"/>
              {/* 前立面（矮墙） */}
              <rect x="222" y="182" width="122" height="30" fill="url(#sunFront)" rx="1.5"/>
              <rect x="222" y="182" width="122" height="4" fill="#ffffff" opacity="0.25" rx="1.5"/>
              <text x="283" y="196" fill="#ffffff" fontSize="12.5" fontFamily="Arial" fontWeight="bold" textAnchor="middle">{zones?.solar?.name || '日光温室区'}</text>
              <text x="283" y="208" fill="#fef3c7" fontSize="9" fontFamily="Arial" textAnchor="middle">{zoneAreaText(zones?.solar)}</text>
            </g>

            {/* ================= 大田种植区（左下）：透视地块 + 田垄 ================= */}
            {/* 2026-10-11：底边收在横向道路（y220-232）上方，避免地块与道路重叠 */}
            <g>
              <ellipse cx="100" cy="218" rx="66" ry="6" fill="#000" opacity="0.4" filter="url(#softShadow)"/>
              {/* 透视梯形地块（上宽下窄） */}
              <polygon points="28,158 172,158 158,214 42,214" fill="url(#fieldGrad)" stroke="#bbf7d0" strokeWidth="0.6"/>
              {/* 田垄线（5 条，随透视收敛） */}
              <line x1="52" y1="158" x2="61" y2="214" stroke="#dcfce7" strokeWidth="1.6" opacity="0.6"/>
              <line x1="76" y1="158" x2="81" y2="214" stroke="#dcfce7" strokeWidth="1.6" opacity="0.6"/>
              <line x1="100" y1="158" x2="100" y2="214" stroke="#dcfce7" strokeWidth="1.6" opacity="0.6"/>
              <line x1="124" y1="158" x2="119" y2="214" stroke="#dcfce7" strokeWidth="1.6" opacity="0.6"/>
              <line x1="148" y1="158" x2="139" y2="214" stroke="#dcfce7" strokeWidth="1.6" opacity="0.6"/>
              {/* 地块上沿高光 */}
              <line x1="28" y1="158" x2="172" y2="158" stroke="#dcfce7" strokeWidth="1.4" opacity="0.8"/>
              <text x="100" y="196" fill="#ffffff" fontSize="12.5" fontFamily="Arial" fontWeight="bold" textAnchor="middle">{zones?.open?.name || '大田种植区'}</text>
              <text x="100" y="209" fill="#dcfce7" fontSize="9" fontFamily="Arial" textAnchor="middle">{zoneAreaText(zones?.open)}</text>
            </g>

            {/* ================= 仓库（立体小盒） ================= */}
            <g>
              <ellipse cx="262" cy="254" rx="28" ry="5" fill="#000" opacity="0.4" filter="url(#softShadow)"/>
              <polygon points="242,232 278,232 290,222 254,222" fill="#9ca3af" stroke="#d1d5db" strokeWidth="0.5"/>
              <polygon points="278,232 290,222 290,244 278,254" fill="#4b5563"/>
              <rect x="242" y="232" width="36" height="22" fill="#6b7280" rx="1"/>
              <rect x="242" y="232" width="36" height="3" fill="#ffffff" opacity="0.2" rx="1"/>
              <text x="260" y="247" fill="#ffffff" fontSize="8.5" fontFamily="Arial" fontWeight="bold" textAnchor="middle">仓库</text>
            </g>

            {/* ================= 中心发光点（十字路口） ================= */}
            <circle cx="200" cy="138" r="4" fill="#fbbf24" opacity="0.9"/>
            <circle cx="200" cy="138" r="2" fill="#ffffff"/>

            {/* ================= 图例 ================= */}
            <g transform="translate(200, 268)">
              <rect x="-160" y="-10" width="320" height="22" fill="#111111" fillOpacity="0.8" rx="4" stroke="#333333" strokeWidth="0.5"/>
              <rect x="-150" y="-5" width="12" height="12" fill="url(#glassFront)" rx="2"/>
              <text x="-135" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">{zones?.glass?.name || '玻璃温室区'}</text>
              <rect x="-55" y="-5" width="12" height="12" fill="url(#filmFront)" rx="2"/>
              <text x="-40" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">{zones?.film?.name || '连栋温室区'}</text>
              <rect x="40" y="-5" width="12" height="12" fill="url(#sunFront)" rx="2"/>
              <text x="55" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">{zones?.solar?.name || '日光温室区'}</text>
              <rect x="115" y="-5" width="12" height="12" fill="url(#fieldGrad)" rx="2"/>
              <text x="130" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">{zones?.open?.name || '大田种植区'}</text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
