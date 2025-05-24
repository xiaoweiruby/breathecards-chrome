document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const contentTextarea = document.getElementById('content');
  const generateBtn = document.getElementById('generate');
  const resultDiv = document.getElementById('result');
  const cardImage = document.getElementById('card-image');
  const downloadBtn = document.getElementById('download');
  const copyBtn = document.getElementById('copy');
  const styleItems = document.querySelectorAll('.style-item');
  
  // 当前选中的风格
  let selectedStyle = '1';
  
  // 从存储中获取上次输入的内容和风格
  chrome.storage.local.get(['lastContent', 'lastStyle'], function(result) {
    if (result.lastContent) {
      contentTextarea.value = result.lastContent;
    }

    // 统一处理样式的初始选中状态
    // 1. 先移除所有 style-item 的 selected 类
    styleItems.forEach(item => item.classList.remove('selected'));

    // 2. 确定要选中的样式
    let styleToSelect = '1'; // 默认样式ID
    // 检查localStorage中是否有有效的lastStyle，并且对应的DOM元素存在
    if (result.lastStyle && document.querySelector(`.style-item[data-style="${result.lastStyle}"]`)) {
      styleToSelect = result.lastStyle;
    } else if (styleItems.length > 0) {
      // 如果localStorage中的值无效或不存在，则尝试选择第一个style-item作为默认
      const firstStyleItem = styleItems[0];
      if (firstStyleItem && firstStyleItem.getAttribute('data-style')) {
        styleToSelect = firstStyleItem.getAttribute('data-style');
      } 
      // 如果第一个元素也没有data-style，则styleToSelect保持为'1'
    }
    selectedStyle = styleToSelect; // 更新全局的 selectedStyle 变量

    // 3. 应用 'selected' 类到计算出的当前选中的风格
    const styleElementToSelect = document.querySelector(`.style-item[data-style="${selectedStyle}"]`);
    if (styleElementToSelect) {
      styleElementToSelect.classList.add('selected');
    } else {
      // 极端情况：如果连默认的 '1' 或第一个 item 都不存在或无法选中，则不进行任何操作
      // 或者可以考虑记录一个错误
      console.warn(`无法找到或选择样式: ${selectedStyle}`);
    }

    // 4. 如果通过回退逻辑确定了selectedStyle，且与存储中的不一致（或存储中没有），则更新存储。
    // 这样可以确保存储中的值始终是有效的，或者至少是当前应用的默认值。
    if (!result.lastStyle || result.lastStyle !== selectedStyle) {
        chrome.storage.local.set({lastStyle: selectedStyle});
    }
  });
  
  // 风格选择
  styleItems.forEach(item => {
    item.addEventListener('click', function() {
      // 移除所有选中状态
      styleItems.forEach(i => i.classList.remove('selected'));
      // 添加当前选中状态
      this.classList.add('selected');
      selectedStyle = this.getAttribute('data-style');
      // 保存选中的风格
      chrome.storage.local.set({lastStyle: selectedStyle});
    });
  });
  
  // 从当前活动标签页获取选中的文本
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedText"}, function(response) {
      if (response && response.selectedText) {
        contentTextarea.value = response.selectedText;
      }
    });
  });
  
  // 生成卡片
  generateBtn.addEventListener('click', async function() {
    const content = contentTextarea.value.trim();
    if (!content) {
      alert('请输入文本内容');
      return;
    }

    // 进入加载状态
    generateBtn.disabled = true;
    generateBtn.textContent = '生成中...';
    generateBtn.classList.add('loading');
    
    // 保存输入的内容
    chrome.storage.local.set({lastContent: content});
    
    try {
      // 模拟生成卡片（实际项目中应调用API或本地生成）
      await generateCard(content, selectedStyle);
    } catch (error) {
      console.error('卡片生成失败:', error);
      alert('卡片生成失败，请稍后再试。');
    } finally {
      // 恢复按钮状态
      generateBtn.disabled = false;
      generateBtn.textContent = '生成卡片';
      generateBtn.classList.remove('loading');
    }
  });
  
  // 设置下载按钮事件
  downloadBtn.addEventListener('click', function() {
    const originalBtnContent = downloadBtn.innerHTML; // 保存原始HTML，包含SVG
    downloadBtn.textContent = '处理中...';
    downloadBtn.disabled = true;

    setTimeout(() => { // 短暂延迟以显示“处理中”状态
      try {
        if (cardImage.src && cardImage.src.startsWith('data:image/png;base64,')) {
          const link = document.createElement('a');
          link.download = '呼吸卡片.png';
          link.href = cardImage.src;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          // 可选：下载成功提示
        } else {
          alert('请先生成有效的卡片图像，或卡片数据无效。');
        }
      } catch (error) {
        console.error('下载失败:', error);
        alert('下载失败，请检查浏览器设置或稍后再试。');
      } finally {
        downloadBtn.innerHTML = originalBtnContent; // 恢复包含SVG的原始内容
        downloadBtn.disabled = false;
      }
    }, 50);
  });
  
  // 设置复制按钮事件
  copyBtn.addEventListener('click', function() {
    const originalBtnContent = copyBtn.innerHTML; // 保存原始HTML，包含SVG
    copyBtn.textContent = '处理中...';
    copyBtn.disabled = true;

    setTimeout(() => { // 短暂延迟以显示“处理中”状态
      if (!cardImage.src || !cardImage.src.startsWith('data:image/png;base64,')) {
        alert('请先生成有效的卡片图像。');
        copyBtn.innerHTML = originalBtnContent;
        copyBtn.disabled = false;
        return;
      }

      const img = new Image();
      img.src = cardImage.src;

      img.onload = function() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        tempCanvas.toBlob(function(blob) {
          if (!blob) {
            console.error('复制失败:无法生成blob对象');
            alert('复制失败，无法生成图像数据，请尝试下载。');
            copyBtn.innerHTML = originalBtnContent;
            copyBtn.disabled = false;
            return;
          }
          try {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(function() {
              alert('卡片已复制到剪贴板');
              copyBtn.innerHTML = originalBtnContent;
              copyBtn.disabled = false;
            }, function(error) {
              console.error('复制到剪贴板失败: ', error);
              alert('复制到剪贴板失败，您的浏览器可能不支持或权限不足。请尝试手动下载。');
              copyBtn.innerHTML = originalBtnContent;
              copyBtn.disabled = false;
            });
          } catch (error) {
            console.error('复制操作失败: ', error);
            alert('复制操作失败，请尝试手动下载。');
            copyBtn.innerHTML = originalBtnContent;
            copyBtn.disabled = false;
          }
        }, 'image/png');
      };

      img.onerror = function() {
        alert('加载卡片图像失败，无法复制。');
        copyBtn.innerHTML = originalBtnContent;
        copyBtn.disabled = false;
      };
    }, 50);
  });
  
  // 模拟生成卡片的函数 (返回Promise以支持async/await)
  function generateCard(content, style) {
    return new Promise((resolve, reject) => {
      try {
    // 这里应该是调用API或本地生成卡片的逻辑
    // 为了演示，我们使用一个简单的Canvas来生成卡片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布大小
    canvas.width = 800;
    canvas.height = 450;
    
    // 根据选择的风格设置渐变背景
    let gradient;
    switch(style) {
      case '1':
        gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#3b82f6');
        break;
      case '2':
        gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');
        break;
      case '3':
        gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#3b82f6');
        break;
      case '4':
        gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#ef4444');
        break;
      case '5':
        gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#8b5cf6');
        break;
    }
    
    // 填充背景
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 添加半透明白色覆盖层
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 设置文本样式
    ctx.font = '28px PingFang SC, Microsoft YaHei, sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 文本换行处理
    const maxWidth = canvas.width - 100;
    const lineHeight = 40;
    const lines = [];
    let line = '';
    
    const words = content.split('');
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    // 计算文本总高度
    const totalTextHeight = lines.length * lineHeight;
    let startY = (canvas.height - totalTextHeight) / 2;
    
    // 绘制文本
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], canvas.width / 2, startY + i * lineHeight);
    }
    
    // 添加呼吸卡片水印
    ctx.font = '14px PingFang SC, Microsoft YaHei, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText('呼吸卡片生成器', canvas.width - 30, canvas.height - 20);
    
    // 将Canvas转换为图片
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('无法生成图片Data URL');
    }
    cardImage.src = dataUrl;
    
    // 显示结果区域
    resultDiv.style.display = 'flex';
    resultDiv.style.opacity = 1;
    resolve(); // 生成成功
      } catch (error) {
        console.error('generateCard内部错误:', error);
        reject(error); // 生成失败
      }
    });
  }
});