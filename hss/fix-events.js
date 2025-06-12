// 修复脚本，专门处理抽取事件功能
(function() {
    console.log('修复脚本已加载');
    
    // 清除localStorage中的teamEvents数据，确保使用新的团队事件
    localStorage.removeItem('teamEvents');
    console.log('已清除localStorage中的团队事件数据');
    
    // 等待页面完全加载
    window.addEventListener('load', function() {
        console.log('页面已完全加载，开始修复抽取事件按钮');
        
        // 获取DOM元素
        const missionButton = document.getElementById('missionButton');
        const missionBoxes = document.querySelectorAll('.mission-box');
        
        // 隐藏事件容器中的多余空格
        const missionContainer = document.getElementById('mission-container');
        if (missionContainer) {
            missionContainer.style.display = 'flex';
        }
        
        // 设置初始状态：只显示第一个白色方框，隐藏其他方框
        missionBoxes.forEach((box, index) => {
            const titleElement = box.querySelector('.mission-title');
            const contentElement = box.querySelector('.mission-content');
            
            if (titleElement) titleElement.textContent = '';
            if (contentElement) contentElement.textContent = '';
            
            // 只显示第一个方框
            if (index === 0) {
                box.style.display = 'block';
                box.classList.add('empty-box'); // 使用我们的新CSS类
            } else {
                box.style.display = 'none';
            }
        });
        
        if (!missionButton) {
            console.error('未找到抽取事件按钮！');
            return;
        }
        
        console.log('找到了抽取事件按钮，正在绑定事件');
        
        // 重新绑定点击事件
        missionButton.addEventListener('click', function() {
            console.log('抽取事件按钮被点击');
            // 确保hardmission对象存在
            if (typeof hardmission === 'undefined') {
                console.error('硬任务对象未定义！');
                return;
            }
            
            // 获取第一个方框
            const firstBox = missionBoxes[0];
            if (!firstBox) return;
            
            // 移除空白框样式，添加内容框样式
            firstBox.classList.remove('empty-box');
            firstBox.classList.add('with-content');
            
            // 获取随机团队事件
            const keys = Object.keys(hardmission);
            if (keys.length === 0) {
                console.error('没有可用的团队事件');
                return;
            }
            
            console.log('可用事件:', keys);
            
            // 随机选择一个事件
            const randomIndex = Math.floor(Math.random() * keys.length);
            const missionKey = keys[randomIndex];
            const missionData = hardmission[missionKey];
            
            console.log('抽取的事件:', missionKey);
            
            const titleElement = firstBox.querySelector('.mission-title');
            const contentElement = firstBox.querySelector('.mission-content');
            
            // 设置事件内容
            titleElement.textContent = missionKey;
            
            // 美化事件内容显示，突出关键词
            let formattedContent = missionData.内容;
            
            // 添加一些样式
            formattedContent = formattedContent
                .replace(/禁用|禁止|不可以|阵亡/g, '<span style="color: red; font-weight: bold;">$&</span>')
                .replace(/可用|可以|解除|奖励/g, '<span style="color: green; font-weight: bold;">$&</span>')
                .replace(/气球绿色/g, '<span style="color: green; font-weight: bold;">气球绿色</span>')
                .replace(/气球橙色/g, '<span style="color: orange; font-weight: bold;">气球橙色</span>')
                .replace(/红色/g, '<span style="color: red; font-weight: bold;">红色</span>')
                .replace(/[\d]+秒/g, '<span style="color: blue; font-weight: bold;">$&</span>')
                .replace(/爆炸箱子/g, '<span style="color: #FF9800; font-weight: bold;">爆炸箱子</span>')
                .replace(/单通|双通|三通|四通/g, '<span style="color: purple; font-weight: bold;">$&</span>');
            
            contentElement.innerHTML = formattedContent;
            
            // 应用动画效果
            firstBox.style.opacity = 0;
            setTimeout(() => {
                firstBox.style.opacity = 1;
                // 添加高亮动画效果
                firstBox.style.boxShadow = '0 0 15px rgba(255, 152, 0, 0.7)';
                setTimeout(() => {
                    firstBox.style.boxShadow = '';
                }, 1000);
            }, 100);
            
            // 添加事件编号标记
            const eventNumber = missionKey.replace(/[^0-9]/g, '');
            if (eventNumber) {
                const badge = document.createElement('div');
                badge.textContent = eventNumber;
                badge.className = 'event-number-badge';
                
                // 移除之前的标记
                const oldBadge = firstBox.querySelector('.event-number-badge');
                if (oldBadge) {
                    firstBox.removeChild(oldBadge);
                }
                
                firstBox.appendChild(badge);
            }
            
            // 触发同步功能
            if (typeof window.triggerSync === 'function') {
                window.triggerSync();
            }
            
            // 添加抽取的动画效果
            const button = missionButton;
            button.disabled = true;
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
                button.disabled = false;
            }, 500);
        });
        
        console.log('抽取事件按钮修复完成');
    });
})(); 