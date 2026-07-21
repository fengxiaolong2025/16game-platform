import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WechatSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

@Injectable()
export class WechatAuthService {
  private readonly logger = new Logger(WechatAuthService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 调用微信 code2Session 接口
   * 用小程序登录凭证 code 换取 openid 和 session_key
   * @docs https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  async code2Session(code: string): Promise<WechatSession> {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_APPSECRET');

    // 开发环境 mock：未配置 AppID 时方便调试
    if (!appid || !secret) {
      this.logger.warn('WECHAT_APPID 或 WECHAT_APPSECRET 未配置，使用 mock 模式');
      return {
        openid: `mock_openid_${code}`,
        session_key: 'mock_session_key',
      };
    }

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data = (await response.json()) as any;

      if (data.errcode) {
        this.logger.error(`微信登录失败: ${data.errcode} ${data.errmsg}`);
        throw new UnauthorizedException(`微信登录失败: ${data.errmsg || '未知错误'}`);
      }

      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error('调用微信API失败', err);
      throw new UnauthorizedException('微信登录服务异常，请稍后重试');
    }
  }

  /**
   * 获取微信全局 access_token（用于调用其他微信API，如内容安全检查）
   * @docs https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/access-token/auth.getAccessToken.html
   */
  async getAccessToken(): Promise<string> {
    const appid = this.configService.get<string>('WECHAT_APPID');
    const secret = this.configService.get<string>('WECHAT_APPSECRET');

    if (!appid || !secret) {
      throw new UnauthorizedException('微信小程序未配置');
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;

    if (data.errcode) {
      throw new UnauthorizedException(`获取access_token失败: ${data.errmsg}`);
    }

    return data.access_token;
  }

  /**
   * 文本内容安全检测（社区模块用）
   * @docs https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/security/security.msgSecCheck.html
   */
  async msgSecCheck(content: string, openid: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${accessToken}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 2, scene: 1, openid, content }),
      });
      const data = (await response.json()) as any;
      return data.errcode === 0;
    } catch (err) {
      this.logger.error('内容安全检测失败', err);
      return true; // 检测失败时放行，避免阻断正常使用
    }
  }
}
