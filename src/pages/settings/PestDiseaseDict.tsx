/**
 * 病虫害字典页面入口
 * 路由：/settings/pest-disease-dict
 */
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PestDiseaseDictPage from '@/components/settings/pest-disease-dict/PestDiseaseDictPage';

export default function PestDiseaseDict() {
  return (
    <MainLayout>
      <PestDiseaseDictPage />
    </MainLayout>
  );
}
