/**
 * 病虫害管理页面入口
 * 路由：/pest-control
 */
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PestControlPage from '@/components/farm/pest-control/PestControlPage';

export default function PestControl() {
  return (
    <MainLayout>
      <PestControlPage />
    </MainLayout>
  );
}
