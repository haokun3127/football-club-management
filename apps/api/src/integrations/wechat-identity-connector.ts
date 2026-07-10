export interface WechatIdentity {
  openId: string;
  unionId?: string;
  phone?: string;
}

export interface WechatIdentityConnector {
  resolve(wxLoginCode: string, phoneCode?: string): Promise<WechatIdentity>;
}

export class WechatApiIdentityConnector implements WechatIdentityConnector {
  constructor(private readonly appId: string, private readonly appSecret: string) {}

  static fromEnvironment(): WechatApiIdentityConnector | undefined {
    const appId = process.env.WECHAT_MINIPROGRAM_APP_ID;
    const appSecret = process.env.WECHAT_MINIPROGRAM_APP_SECRET;
    if (!appId || !appSecret) return undefined;
    return new WechatApiIdentityConnector(appId, appSecret);
  }

  async resolve(wxLoginCode: string, phoneCode?: string): Promise<WechatIdentity> {
    const session = await fetchJson<{ openid?: string; unionid?: string; errcode?: number; errmsg?: string }>(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(this.appId)}&secret=${encodeURIComponent(this.appSecret)}&js_code=${encodeURIComponent(wxLoginCode)}&grant_type=authorization_code`,
    );
    if (!session.openid) throw new Error(session.errmsg || "WeChat code exchange failed");
    if (!phoneCode) return { openId: session.openid, unionId: session.unionid };

    const token = await fetchJson<{ access_token?: string; errcode?: number; errmsg?: string }>(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(this.appId)}&secret=${encodeURIComponent(this.appSecret)}`,
    );
    if (!token.access_token) throw new Error(token.errmsg || "WeChat access token failed");
    const phone = await fetchJson<{ phone_info?: { purePhoneNumber?: string }; errcode?: number; errmsg?: string }>(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(token.access_token)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: phoneCode }) },
    );
    if (!phone.phone_info?.purePhoneNumber) throw new Error(phone.errmsg || "WeChat phone exchange failed");
    return { openId: session.openid, unionId: session.unionid, phone: phone.phone_info.purePhoneNumber };
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`WeChat request failed with HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
