// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    // 获取用户选中的文本
    const selectedText = window.getSelection().toString();
    sendResponse({selectedText: selectedText});
  }
});

// 监听用户选择文本事件
document.addEventListener('mouseup', function() {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // 将选中的文本发送给background脚本
    chrome.runtime.sendMessage({
      action: "saveSelectedText",
      text: selectedText
    });
  }
});