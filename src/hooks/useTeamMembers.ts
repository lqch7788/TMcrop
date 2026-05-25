import { useState, useEffect, useCallback } from 'react';
import { enhancedApiClient } from '../lib/apiClient';

/**
 * 从 localStorage 安全获取当前用户信息
 * 添加 JSON.parse 异常保护，避免 localStorage 数据损坏时崩溃
 */
function getCurrentUser(): { id?: string; name?: string } {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : {};
  } catch {
    console.warn('解析用户信息失败');
    return {};
  }
}

/**
 * 班组成员数据类型
 */
export interface TeamMember {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_code: string;
  role: string;
  joined_at: string;
}

/**
 * useTeamMembers Hook 返回结果
 */
export interface UseTeamMembersResult {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  addMember: (workerId: string, role?: string, operatorId?: string, operatorName?: string) => Promise<void>;
  removeMember: (workerId: string, operatorId?: string, operatorName?: string) => Promise<void>;
  refresh: () => void;
}

/**
 * 获取班组成员 Hook
 * @param teamId 班组ID，为 null 时返回空列表
 */
export function useTeamMembers(teamId: string | null): UseTeamMembersResult {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // enhancedApiClient.get 直接返回解析后的数据
      const result = await enhancedApiClient.get<{ success: boolean; data?: TeamMember[]; error?: string }>(
        `/team-members/teams/${teamId}/members`
      );

      if (result.success) {
        setMembers(result.data || []);
      } else {
        setError(result.error || '获取成员失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error('获取班组成员失败:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = useCallback(async (
    workerId: string,
    role: string = 'member',
    operatorId?: string,
    operatorName?: string
  ) => {
    if (!teamId) return;

    // 从 localStorage 安全获取当前用户作为操作人
    const currentUser = getCurrentUser();

    const result = await enhancedApiClient.post<{ success: boolean; error?: string }>(
      `/team-members/teams/${teamId}/members`,
      {
        workerId,
        role,
        operatorId: operatorId || currentUser.id,
        operatorName: operatorName || currentUser.name,
      }
    );

    if (!result.success) {
      throw new Error(result.error || '添加成员失败');
    }

    fetchMembers();
  }, [teamId, fetchMembers]);

  const removeMember = useCallback(async (
    workerId: string,
    operatorId?: string,
    operatorName?: string
  ) => {
    if (!teamId) return;

    // 从 localStorage 安全获取当前用户作为操作人
    const currentUser = getCurrentUser();
    const finalOperatorId = operatorId || currentUser.id;
    const finalOperatorName = operatorName || currentUser.name;

    // enhancedApiClient.delete 不支持 body，将 operator 信息作为查询参数
    const queryParams = new URLSearchParams({
      operatorId: finalOperatorId,
      operatorName: finalOperatorName,
    });

    const result = await enhancedApiClient.delete<{ success: boolean; error?: string }>(
      `/team-members/teams/${teamId}/members/${workerId}?${queryParams.toString()}`
    );

    if (!result.success) {
      throw new Error(result.error || '移除成员失败');
    }

    fetchMembers();
  }, [teamId, fetchMembers]);

  return {
    members,
    loading,
    error,
    addMember,
    removeMember,
    refresh: fetchMembers,
  };
}

export default useTeamMembers;
