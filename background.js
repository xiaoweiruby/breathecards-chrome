// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateBreatheCard",
    title: "将选中文本生成呼吸卡片",
    contexts: ["selection"]
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateBreatheCard") {
    // 存储选中的文本
    chrome.storage.local.set({lastContent: info.selectionText});
    
    // 打开插件弹窗
    chrome.action.openPopup();
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveSelectedText") {
    chrome.storage.local.set({lastContent: request.text});
    sendResponse({success: true});
  }
});