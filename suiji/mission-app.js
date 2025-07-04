// 随机事件展示功能
document.addEventListener('DOMContentLoaded', function() {
    window.missionBoxes = document.querySelectorAll('.mission-box');
    const missionButton = document.getElementById('missionButton');
    const hardModeButton = document.getElementById('hardModeButton');
    let rerollChance = 0.05; // 初始概率为 5%
    let negativeCount = 0; // 累计 -1 的次数

    // 初始化时隐藏困难模式按钮
    hardModeButton.style.display = 'none';
    
    // 初始化动画效果
    missionBoxes.forEach((box, index) => {
        setTimeout(() => {
            box.classList.add('active');
            
            // 为每个事件盒子添加玩家标识元素
            const playerTag = document.createElement('div');
            playerTag.className = `player-tag p${index+1}`;
            playerTag.textContent = `P${index+1}`;
            box.appendChild(playerTag);
            
            // 为每个事件盒子添加点击事件，实现单独刷新
            box.addEventListener('click', function() {
                refreshSingleMission(box, index);
            });
        }, 100 * index);
    });
    
    // 从mission.js获取事件数据
    function getMissionKeys() {
        const enabledKeys = [];
        const checkboxes = document.querySelectorAll('#personalEventsTable input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                enabledKeys.push(checkbox.dataset.key);
            }
        });
        return enabledKeys;
    }
    
    // 随机选择事件
    function getRandomMissions(count) {
        const keys = getMissionKeys(); // 获取已启用的任务
        const shuffled = [...keys].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // 刷新单个事件
    function refreshSingleMission(box, index) {
        const keys = getMissionKeys();
        const randomIndex = Math.floor(Math.random() * keys.length);
        const missionKey = keys[randomIndex];
        const missionData = mission[missionKey];

        // 重置动画
        box.classList.remove('active');

        // 设置事件内容
        const titleElement = box.querySelector('.mission-title');
        const contentElement = box.querySelector('.mission-content');

        // 隐藏玩家标识
        const playerTag = box.querySelector('.player-tag');
        if (playerTag) {
            playerTag.classList.remove('show');
        }

        // 清空内容
        titleElement.textContent = '';
        contentElement.textContent = '';
        contentElement.innerHTML = ''

        // 添加淡出效果
        box.style.opacity = 0;

        setTimeout(() => {
            // 设置新内容
            titleElement.textContent = missionKey;

            let modifiedContent = typeof missionData.内容 === 'function' 
                ? missionData.内容() 
                : missionData.内容;

            // 检查是否为"方位车？给我干哪来了？"事件
            if (missionKey === "方位车？给我干哪来了？") {
                const AAOptions = ["等级", "命座", "攻击", "生命", "防御", "精通"];
                const BBOptions = ["上", "下", "左", "右", "左上", "左下", "右上", "右下"];
                
                const randomAA = AAOptions[Math.floor(Math.random() * AAOptions.length)];
                const randomBB = BBOptions[Math.floor(Math.random() * BBOptions.length)];
                
                modifiedContent = modifiedContent.replace("AA", randomAA).replace("BB", randomBB);
            }

            // 添加随机逻辑
            const randomChance = Math.random();
            if (randomChance < rerollChance) {
                // 确定是 +1 还是 -1
                let rerollResult;
                if (negativeCount >= 2) {
                    // 如果累计两次 -1，下一次触发时强制为 +1
                    rerollResult = "+1";
                    negativeCount = 0; // 重置计数器
                } else {
                    // 正常随机判断 +1 或 -1
                    rerollResult = Math.random() < 0.5 ? "+1" : "-1";
                    if (rerollResult === "-1") {
                        negativeCount++; // 累计 -1 次数
                    } else {
                        negativeCount = 0; // 如果是 +1，清空 -1 的累计次数
                    }
                }

                // 添加重抽次数
                const color = rerollResult === "+1" ? "green" : "red";
                modifiedContent += `;<span style="color: ${color};">重抽次数${rerollResult}</span>`;

                // 重置概率
                rerollChance = 0.05;
            } else {
                // 未触发，增加概率
                rerollChance += 0.05;
            }

            contentElement.textContent = modifiedContent;
            contentElement.innerHTML = modifiedContent;

            // 添加淡入效果
            box.style.opacity = 1;
            box.classList.add('active');

            // 显示玩家标识
            if (playerTag) {
                setTimeout(() => {
                    playerTag.classList.add('show');
                }, 500); // 在内容显示后再显示玩家标识
            }
            
            // 自动触发同步
            window.triggerSync();
        }, 300);
    }
    
    // 显示随机事件
    function displayRandomMissions() {
        const randomMissions = getRandomMissions(4);
        
        // 隐藏所有玩家标识
        document.querySelectorAll('.player-tag').forEach(tag => {
            tag.classList.remove('show');
        });
        
        // 隐藏上一次抽到的困难模式事件
        const selectedHardMission = document.getElementById('selectedHardMission');
        if (selectedHardMission) {
            selectedHardMission.style.display = 'none';
        }
        
        missionBoxes.forEach((box, index) => {
            const missionKey = randomMissions[index];
            const missionData = mission[missionKey];

            // 重置动画
            box.classList.remove('active');

            // 设置事件内容
            const titleElement = box.querySelector('.mission-title');
            const contentElement = box.querySelector('.mission-content');

            // 清空内容
            titleElement.textContent = '';
            contentElement.textContent = '';
            contentElement.innerHTML = ''
            
            // 添加淡出效果
            box.style.opacity = 0;

            setTimeout(() => {
                // 设置新内容
                titleElement.textContent = missionKey;

                let modifiedContent = typeof missionData.内容 === 'function' 
                    ? missionData.内容() 
                    : missionData.内容;

                if (missionKey === "方位车？给我干哪来了？") {
                    const AAOptions = ["等级", "命座", "攻击", "生命", "防御", "精通"];
                    const BBOptions = ["上", "下", "左", "右", "左上", "左下", "右上", "右下"];
                    
                    const randomAA = AAOptions[Math.floor(Math.random() * AAOptions.length)];
                    const randomBB = BBOptions[Math.floor(Math.random() * BBOptions.length)];
                    
                    modifiedContent = modifiedContent.replace("AA", randomAA).replace("BB", randomBB);
                }

            // 添加随机逻辑
            const randomChance = Math.random();
            if (randomChance < rerollChance) {
                // 确定是 +1 还是 -1
                let rerollResult;
                if (negativeCount >= 2) {
                    // 如果累计两次 -1，下一次触发时强制为 +1
                    rerollResult = "+1";
                    negativeCount = 0; // 重置计数器
                } else {
                    // 正常随机判断 +1 或 -1
                    rerollResult = Math.random() < 0.5 ? "+1" : "-1";
                    if (rerollResult === "-1") {
                        negativeCount++; // 累计 -1 次数
                    } else {
                        negativeCount = 0; // 如果是 +1，清空 -1 的累计次数
                    }
                }

                // 添加重抽次数
                const color = rerollResult === "+1" ? "green" : "red";
                modifiedContent += `;<span style="color: ${color};">重抽次数${rerollResult}</span>`;

                // 重置概率
                rerollChance = 0.05;
            } else {
                // 未触发，增加概率
                rerollChance += 0.05;
            }

                contentElement.textContent = modifiedContent;
                contentElement.innerHTML = modifiedContent;

                // 添加淡入效果
                box.style.opacity = 1;
                box.classList.add('active');
                
                // 显示玩家标识
                const playerTag = box.querySelector('.player-tag');
                if (playerTag) {
                    setTimeout(() => {
                        playerTag.classList.add('show');
                    }, 500); // 在内容显示后再显示玩家标识
                }
            }, 300);
        });
        
        // 显示困难模式按钮
        hardModeButton.style.display = 'inline-block';
    }
    
    // 绑定按钮点击事件
    missionButton.addEventListener('click', () => {
      displayRandomMissions(); // 抽取事件逻辑
      if (window.isHost === true && window.sendGameState) {
        setTimeout(() => window.sendGameState(), 500);
      }
      
      // 自动触发同步
      window.triggerSync();
    });
    
    function saveCheckedState(tableId) {
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        const checkedState = {};
        checkboxes.forEach(checkbox => {
            checkedState[checkbox.dataset.key] = checkbox.checked; // 保存每个任务的勾选状态
        });
        localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(checkedState)); // 存储到 localStorage
    }
    
    function loadCheckedState(tableId) {
        const savedState = JSON.parse(localStorage.getItem(`${tableId}-checkedState`)) || {};
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        checkboxes.forEach(checkbox => {
            checkbox.checked = savedState[checkbox.dataset.key] !== undefined ? savedState[checkbox.dataset.key] : true; // 默认勾选
        });
    }
    
    function attachCheckboxListeners(tableId) {
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                saveCheckedState(tableId); // 保存勾选状态
            });
        });
    }
    
    function populateTable(table, tasks, tableId) {
        table.innerHTML = '';
        Object.keys(tasks).forEach(key => {
            const row = document.createElement('tr');

            // 创建启用勾选框
            const enableCell = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true; // 默认勾选
            checkbox.dataset.key = key; // 保存任务的 key
            enableCell.appendChild(checkbox);

            // 创建标题和内容单元格
            const titleCell = document.createElement('td');
            const contentCell = document.createElement('td');
            titleCell.textContent = key;
            contentCell.textContent = tasks[key].内容;

            // 将单元格添加到行
            row.appendChild(enableCell);
            row.appendChild(titleCell);
            row.appendChild(contentCell);

            // 将行添加到表格
            table.appendChild(row);
        });

        // 加载保存的勾选状态
        loadCheckedState(tableId);

        // 绑定勾选框的事件监听器
        attachCheckboxListeners(tableId);
    }

    const viewProbabilityText = document.getElementById('viewProbabilityText');
    const probabilityPopup = document.getElementById('probabilityPopup');

    // 点击文字显示弹窗
    viewProbabilityText.addEventListener('click', function (event) {
        if (probabilityPopup.style.display === 'none') {
                // 显示弹窗
            probabilityPopup.style.display = 'block';

            // 在手机端居中显示
            if (window.innerWidth <= 768) {
                probabilityPopup.style.left = '5%';
                probabilityPopup.style.top = `${window.scrollY + 100}px`; // 距离顶部 100px
            } else {
                // 桌面端显示在文字旁边
                probabilityPopup.style.left = `${event.pageX + 10}px`;
                probabilityPopup.style.top = `${event.pageY}px`;
            }
        } else {
            // 隐藏弹窗
            probabilityPopup.style.display = 'none';
        }
    });

    // 点击页面其他地方隐藏弹窗
    document.addEventListener('click', function (event) {
        if (!viewProbabilityText.contains(event.target) && !probabilityPopup.contains(event.target)) {
            probabilityPopup.style.display = 'none';
        }
    });
});