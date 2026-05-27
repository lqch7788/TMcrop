/**
 * 药剂知识库页面入口
 * 路由：/settings/pesticide-library
 */
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PesticideLibraryPage from '@/components/settings/pesticide-library/PesticideLibraryPage';

export default function PesticideLibrary() {
  return (
    <MainLayout>
      <PesticideLibraryPage />
    </MainLayout>
  );
}
