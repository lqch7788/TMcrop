import { Sprout } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { translations, Language } from '../../i18n/translations';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

/**
 * 关于弹窗组件
 */
export function AboutModal({ isOpen, onClose, language }: AboutModalProps) {
  const t = translations[language];

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.aboutTitle}
      size="sm"
      showFooter={false}
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sprout className="w-8 h-8 text-emerald-600" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-1">{t.aboutTitle}</h3>
        <p className="text-sm text-gray-500 mb-1">{t.aboutSubtitle}</p>
        <p className="text-xs text-gray-400 mb-4">{t.aboutShortName}</p>

        <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-4">
          <p className="text-sm"><span className="text-gray-500">{t.version}：</span><span className="font-medium">V3.0.0</span></p>
          <p className="text-sm"><span className="text-gray-500">{t.copyright}：</span><span className="font-medium">{t.companyName}</span></p>
          <hr className="my-2" />
          <p className="text-sm font-medium text-gray-700">{t.contactInfo}：</p>
          <p className="text-xs text-gray-500"><span className="font-medium">{t.address}：</span>{t.addressValue}</p>
          <p className="text-xs text-gray-500"><span className="font-medium">{t.contact}：</span>{t.contactValue}</p>
          <p className="text-xs text-gray-500"><span className="font-medium">{t.phone}：</span>{t.phoneValue}</p>
          <p className="text-xs text-gray-500"><span className="font-medium">{t.fax}：</span>{t.faxValue}</p>
          <p className="text-xs text-gray-500"><span className="font-medium">{t.email}：</span>{t.emailValue}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
        >
          {t.confirm}
        </button>
      </div>
    </UnifiedModal>
  );
}
