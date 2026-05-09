// 基地总览图组件 - SVG 平面科技风格地图
import { MapPin } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface GreenhouseMapProps {
  expanded: boolean;
  onToggle: () => void;
  onMapClick: () => void;
}

export function GreenhouseMap({ expanded, onToggle, onMapClick }: GreenhouseMapProps) {
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

          {/* 平面科技风格基地总览图SVG */}
          <svg viewBox="0 0 400 280" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6"/>
                <stop offset="100%" stopColor="#1d4ed8"/>
              </linearGradient>
              <linearGradient id="filmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14b8a6"/>
                <stop offset="100%" stopColor="#0f766e"/>
              </linearGradient>
              <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b"/>
                <stop offset="100%" stopColor="#d97706"/>
              </linearGradient>
              <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e"/>
                <stop offset="100%" stopColor="#16a34a"/>
              </linearGradient>
              <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#374151"/>
                <stop offset="50%" stopColor="#4b5563"/>
                <stop offset="100%" stopColor="#374151"/>
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* 道路 */}
            <g>
              <rect x="190" y="10" width="20" height="260" fill="url(#roadGrad)" rx="3"/>
              <line x1="200" y1="15" x2="200" y2="255" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 6" opacity="0.7"/>
              <rect x="10" y="130" width="380" height="16" fill="url(#roadGrad)" rx="3"/>
              <line x1="15" y1="138" x2="385" y2="138" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 6" opacity="0.7"/>
              <rect x="10" y="220" width="380" height="12" fill="url(#roadGrad)" rx="3"/>
              <line x1="15" y1="226" x2="385" y2="226" stroke="#fbbf24" strokeWidth="2" strokeDasharray="10 6" opacity="0.7"/>
            </g>

            {/* 玻璃温室A区 */}
            <g>
              <rect x="20" y="20" width="160" height="100" fill="url(#glassGrad)" rx="6" filter="url(#glow)"/>
              <line x1="20" y1="65" x2="180" y2="65" stroke="#93c5fd" strokeWidth="1" opacity="0.4"/>
              <line x1="100" y1="20" x2="100" y2="120" stroke="#93c5fd" strokeWidth="1" opacity="0.4"/>
              <rect x="20" y="20" width="160" height="25" fill="#ffffff" opacity="0.15" rx="6"/>
              <rect x="20" y="20" width="160" height="6" fill="#60a5fa" opacity="0.5" rx="6"/>
              <text x="100" y="112" fill="#ffffff" fontSize="13" fontFamily="Arial" fontWeight="bold" textAnchor="middle">玻璃温室A区</text>
              <text x="60" y="48" fill="#dbeafe" fontSize="9" fontFamily="Arial" textAnchor="middle">1-4号棚</text>
              <text x="140" y="48" fill="#dbeafe" fontSize="9" fontFamily="Arial" textAnchor="middle">5-8号棚</text>
              <text x="60" y="88" fill="#dbeafe" fontSize="9" fontFamily="Arial" textAnchor="middle">9-12号棚</text>
              <text x="140" y="88" fill="#dbeafe" fontSize="9" fontFamily="Arial" textAnchor="middle">13-16号棚</text>
            </g>

            {/* 连栋温室B区 */}
            <g>
              <rect x="220" y="20" width="160" height="100" fill="url(#filmGrad)" rx="6" filter="url(#glow)"/>
              <line x1="220" y1="65" x2="380" y2="65" stroke="#5eead4" strokeWidth="1" opacity="0.4"/>
              <line x1="300" y1="20" x2="300" y2="120" stroke="#5eead4" strokeWidth="1" opacity="0.4"/>
              <rect x="220" y="20" width="160" height="25" fill="#ffffff" opacity="0.15" rx="6"/>
              <rect x="220" y="20" width="160" height="6" fill="#2dd4bf" opacity="0.5" rx="6"/>
              <text x="300" y="112" fill="#ffffff" fontSize="13" fontFamily="Arial" fontWeight="bold" textAnchor="middle">连栋温室B区</text>
              <text x="260" y="48" fill="#ccfbf1" fontSize="9" fontFamily="Arial" textAnchor="middle">1-4号棚</text>
              <text x="340" y="48" fill="#ccfbf1" fontSize="9" fontFamily="Arial" textAnchor="middle">5-8号棚</text>
              <text x="260" y="88" fill="#ccfbf1" fontSize="9" fontFamily="Arial" textAnchor="middle">9-12号棚</text>
              <text x="340" y="88" fill="#ccfbf1" fontSize="9" fontFamily="Arial" textAnchor="middle">13-16号棚</text>
            </g>

            {/* 日光温室C区 */}
            <g>
              <rect x="220" y="150" width="160" height="60" fill="url(#sunGrad)" rx="6" filter="url(#glow)"/>
              <line x1="220" y1="180" x2="380" y2="180" stroke="#fde68a" strokeWidth="1" opacity="0.4"/>
              <line x1="300" y1="150" x2="300" y2="210" stroke="#fde68a" strokeWidth="1" opacity="0.4"/>
              <rect x="220" y="150" width="160" height="18" fill="#ffffff" opacity="0.15" rx="6"/>
              <rect x="220" y="150" width="160" height="5" fill="#fbbf24" opacity="0.5" rx="6"/>
              <text x="300" y="205" fill="#ffffff" fontSize="13" fontFamily="Arial" fontWeight="bold" textAnchor="middle">日光温室C区</text>
              <text x="260" y="168" fill="#fef3c7" fontSize="9" fontFamily="Arial" textAnchor="middle">1-4号棚</text>
              <text x="340" y="168" fill="#fef3c7" fontSize="9" fontFamily="Arial" textAnchor="middle">5-8号棚</text>
            </g>

            {/* 大田种植区 */}
            <g>
              <rect x="20" y="150" width="160" height="100" fill="url(#fieldGrad)" rx="6" filter="url(#glow)"/>
              <line x1="20" y1="170" x2="180" y2="170" stroke="#bbf7d0" strokeWidth="1" opacity="0.3"/>
              <line x1="20" y1="190" x2="180" y2="190" stroke="#bbf7d0" strokeWidth="1" opacity="0.3"/>
              <line x1="20" y1="210" x2="180" y2="210" stroke="#bbf7d0" strokeWidth="1" opacity="0.3"/>
              <line x1="73" y1="150" x2="73" y2="250" stroke="#bbf7d0" strokeWidth="1" opacity="0.3"/>
              <line x1="126" y1="150" x2="126" y2="250" stroke="#bbf7d0" strokeWidth="1" opacity="0.3"/>
              <rect x="20" y="150" width="160" height="22" fill="#ffffff" opacity="0.15" rx="6"/>
              <rect x="20" y="150" width="160" height="5" fill="#4ade80" opacity="0.5" rx="6"/>
              <text x="100" y="242" fill="#ffffff" fontSize="13" fontFamily="Arial" fontWeight="bold" textAnchor="middle">大田种植区</text>
              <text x="47" y="165" fill="#dcfce7" fontSize="10" fontFamily="Arial" textAnchor="middle">A区</text>
              <text x="100" y="165" fill="#dcfce7" fontSize="10" fontFamily="Arial" textAnchor="middle">B区</text>
              <text x="153" y="165" fill="#dcfce7" fontSize="10" fontFamily="Arial" textAnchor="middle">C区</text>
            </g>

            {/* 仓库 */}
            <rect x="240" y="235" width="40" height="25" fill="#6b7280" rx="3" opacity="0.8"/>
            <text x="260" y="252" fill="#ffffff" fontSize="9" fontFamily="Arial" fontWeight="bold" textAnchor="middle">仓库</text>

            {/* 中心点 */}
            <circle cx="200" cy="138" r="4" fill="#fbbf24" opacity="0.9"/>
            <circle cx="200" cy="138" r="2" fill="#ffffff"/>

            {/* 图例 */}
            <g transform="translate(200, 268)">
              <rect x="-160" y="-10" width="320" height="22" fill="#111111" fillOpacity="0.8" rx="4" stroke="#333333" strokeWidth="0.5"/>
              <rect x="-150" y="-5" width="12" height="12" fill="url(#glassGrad)" rx="2"/>
              <text x="-135" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">玻璃温室A区</text>
              <rect x="-55" y="-5" width="12" height="12" fill="url(#filmGrad)" rx="2"/>
              <text x="-40" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">连栋温室B区</text>
              <rect x="40" y="-5" width="12" height="12" fill="url(#sunGrad)" rx="2"/>
              <text x="55" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">日光温室C区</text>
              <rect x="115" y="-5" width="12" height="12" fill="url(#fieldGrad)" rx="2"/>
              <text x="130" y="5" fill="#ffffff" fontSize="8" fontFamily="Arial">大田种植区</text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
