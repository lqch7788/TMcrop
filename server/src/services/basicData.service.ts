/**
 * 基础数据服务
 * 提供部门、仓库、温室等基础数据的统一访问
 */

import { getDatabase } from '../db';

export interface Department {
  id: string;
  oid: string;
  name: string;
  parent_oid?: string;
  sort_number?: number;
  status: string;
  remarks?: string;
}

export interface Warehouse {
  id: string;
  oid: string;
  name: string;
  code: string;
  type: string;
  status: string;
}

export interface Greenhouse {
  id: string;
  oid: string;
  name: string;
  code: string;
  base_oid?: string;
  crop?: string;
  status: string;
}

export class BasicDataService {
  async getDepartments(params: {
    parentOid?: string;
    status?: string;
  }): Promise<Department[]> {
    const db = getDatabase();
    const { parentOid, status } = params;

    const sql = 'SELECT * FROM departments WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (parentOid !== undefined) {
      conditions.push('parent_oid = ?');
      queryParams.push(parentOid);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

    const stmt = db.prepare(`${sql}${whereClause} ORDER BY sort_number, name`);
    if (queryParams.length > 0) {
      stmt.bind(queryParams);
    }

    const items: Department[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Department);
    }
    stmt.free();
    return items;
  }

  async getWarehouses(params: {
    type?: string;
    status?: string;
  }): Promise<Warehouse[]> {
    const db = getDatabase();
    const { type, status } = params;

    const sql = 'SELECT * FROM warehouses WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (type) {
      conditions.push('type = ?');
      queryParams.push(type);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

    const stmt = db.prepare(`${sql}${whereClause} ORDER BY code, name`);
    if (queryParams.length > 0) {
      stmt.bind(queryParams);
    }

    const items: Warehouse[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Warehouse);
    }
    stmt.free();
    return items;
  }

  async getGreenhouses(params: {
    baseOid?: string;
    crop?: string;
    status?: string;
  }): Promise<Greenhouse[]> {
    const db = getDatabase();
    const { baseOid, crop, status } = params;

    const sql = 'SELECT * FROM greenhouses WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (baseOid) {
      conditions.push('base_oid = ?');
      queryParams.push(baseOid);
    }
    if (crop) {
      conditions.push('crop = ?');
      queryParams.push(crop);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';

    const stmt = db.prepare(`${sql}${whereClause} ORDER BY code, name`);
    if (queryParams.length > 0) {
      stmt.bind(queryParams);
    }

    const items: Greenhouse[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Greenhouse);
    }
    stmt.free();
    return items;
  }
}

export const basicDataService = new BasicDataService();
