/**
 * 天气服务业务错误类（HTTP 状态 + 错误码 + 可读 message）
 * 路由层捕获后转 JSON 响应
 */
export class WeatherError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}