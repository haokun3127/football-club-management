import { getPrivacyContractName, openPrivacyContract, settlePrivacyAuthorization, subscribePrivacyAuthorization } from "../../utils/privacy";

/** 官方协议要求：resolve({ event: "agree", buttonId }) 的 buttonId 必须是本组件同意按钮的 id。 */
const AGREE_BUTTON_ID = "privacy-agree-btn";

Component({
  data: {
    visible: false,
    contractName: "《小程序用户隐私保护指引》",
  },
  lifetimes: {
    attached(this: any) {
      this.unsubscribePrivacy = subscribePrivacyAuthorization((request) => {
        if (request) this.setData({ visible: true, contractName: getPrivacyContractName() });
        else this.setData({ visible: false });
      });
    },
    detached(this: any) {
      if (this.unsubscribePrivacy) this.unsubscribePrivacy();
    },
  },
  methods: {
    // 用户点击同意按钮（open-type="agreePrivacyAuthorization"）。官方要求在
    // bindagreeprivacyauthorization 触发后再调用 resolve({ buttonId, event: "agree" })。
    handleAgree(this: any) {
      settlePrivacyAuthorization({ buttonId: AGREE_BUTTON_ID, event: "agree" });
    },
    // 用户选择暂不：结算为拒绝，本次隐私接口调用将被平台以 privacy 未授权报错拦截。
    handleDisagree(this: any) {
      settlePrivacyAuthorization({ event: "disagree" });
    },
    openContract(this: any) {
      openPrivacyContract();
    },
  },
});
