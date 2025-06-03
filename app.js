document.addEventListener('DOMContentLoaded', function () {
    // ================= 游戏状态管理 =================
    window.gameState = {
        bpMode: 'off', // 当前BP模式: global | personal | off
        usedCharacters: {
            global: new Set(),    // 全局已选角色
            players: [new Set(), new Set(), new Set(), new Set()] // 各玩家已选角色
        },
        unavailableCharacters: [new Set(), new Set(), new Set(), new Set()], // 每个玩家不可用的角色
        isGameStarted: false,      // 游戏是否开始
        roundCounter: 0,           // 当前轮数
        startTime: null,           // 游戏开始时间
        lastRoundTime: null,       // 上一轮抽取时间
        totalTime: 0,              // 总用时（秒）
        timerInterval: null,       // 定时器
        tongMode: 'normal',        // 'normal' | 'double' | 'single'
        tongTagIndexes: []
    };

    // ================= DOM元素获取 =================
    const characterBoxes = document.querySelectorAll('.character-box');
    const startButton = document.getElementById('startButton');
    const bpButton = document.getElementById('bpButton');
    const resetButton = document.getElementById('resetButton');
    const roundCounterDisplay = document.getElementById('roundCounter');
    const historyButton = document.getElementById('historyButton');
    const overlay = document.createElement('div'); // 黑色半透明背景
    overlay.className = 'overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);

    const historyPopup = document.createElement('div');
    historyPopup.className = 'history-popup';
    historyPopup.style.display = 'none';
    document.body.appendChild(historyPopup);

    const historyContent = document.createElement('div'); // 历史记录内容
    historyContent.className = 'history-content';
    historyPopup.appendChild(historyContent);

    const closeHistoryButton = document.createElement('button'); // 添加关闭按钮
    closeHistoryButton.textContent = '关闭';
    closeHistoryButton.className = 'close-history-button';
    historyPopup.appendChild(closeHistoryButton);

    // 将historyData提升为全局变量以便于多人游戏时共享
    window.historyData = []; // 保存历史记录

    // ================= 初始化 =================
    function initializeBPButton() {
        bpButton.textContent = `BP模式：${getModeName(gameState.bpMode)}`;
        bpButton.dataset.mode = gameState.bpMode;
        bpButton.className = `bp-button ${gameState.bpMode}`;
    }
    initializeBPButton();

    // ================= BP模式切换 =================
    const BP_MODES = ['global', 'personal', 'off'];
    bpButton.addEventListener('click', () => {
        if (!gameState.isGameStarted) {
            const newMode = BP_MODES[(BP_MODES.indexOf(gameState.bpMode) + 1) % 3];
            gameState.bpMode = newMode;
            bpButton.textContent = `BP模式：${getModeName(newMode)}`;
            bpButton.dataset.mode = newMode;
            
            // 更新状态栏的BP模式显示
            const bpModeDisplay = document.getElementById('bpModeDisplay');
            if (bpModeDisplay) {
                bpModeDisplay.textContent = `BP模式: ${getModeName(newMode)}`;
            }
            
            // 如果是主持人，触发同步
            if (window.isHost === true && window.sendGameState) {
                setTimeout(() => window.sendGameState(), 500);
            }
        }
    });

    // ================= 重置游戏 =================
    resetButton.addEventListener('click', () => {
        // 清空游戏状态
        gameState.usedCharacters.global.clear();
        gameState.usedCharacters.players.forEach(s => s.clear());
        gameState.unavailableCharacters.forEach(s => s.clear());
        gameState.isGameStarted = false;
        gameState.roundCounter = 0;

        // 停止计时器
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }

        // 重置按钮状态
        resetButton.style.display = 'none';
        bpButton.disabled = false;
        startButton.disabled = false;
        roundCounterDisplay.textContent = '当前轮数：0';
        
        // 重置BP模式显示
        const bpModeDisplay = document.getElementById('bpModeDisplay');
        if (bpModeDisplay) {
            bpModeDisplay.textContent = 'BP模式: 未开始';
        }

        // 清空角色卡片
        characterBoxes.forEach(box => {
            const img = box.querySelector('.character-image');
            const name = box.querySelector('.character-name');
            img.style.display = 'none';
            img.src = '';
            name.textContent = '';
            box.style.opacity = 1; // 确保卡片可见
            box.style.pointerEvents = 'auto'; // 恢复点击事件
            // 清除tong-tag标注
            let tongTag = box.querySelector('.tong-tag');
            if (tongTag) tongTag.remove();
        });

        // 清空事件卡片
        const missionBoxes = document.querySelectorAll('.mission-box');
        missionBoxes.forEach(box => {
            const title = box.querySelector('.mission-title');
            const content = box.querySelector('.mission-content');
            title.textContent = ''; // 清空标题
            content.textContent = ''; // 清空内容
            box.style.opacity = 1; // 确保卡片可见
            box.style.pointerEvents = 'auto'; // 恢复点击事件
        });

        // 隐藏困难事件卡片
        const hardMissionBox = document.getElementById('selectedHardMission');
        if (hardMissionBox) {
            hardMissionBox.style.display = 'none'; // 隐藏卡片
            const title = hardMissionBox.querySelector('.mission-title');
            const content = hardMissionBox.querySelector('.mission-content');
            if (title) title.textContent = ''; // 清空标题
            if (content) content.textContent = ''; // 清空内容
        }

        // 清空历史记录并关闭弹窗
        window.historyData = [];
        historyPopup.style.display = 'none';
        overlay.style.display = 'none';

        // 清空时间显示
        const timeCounter = document.getElementById('timeCounter');
        timeCounter.textContent = '总用时：00:00 | 本轮用时：00:00';

        alert('游戏已重置！');
    });

    // ================= 抽取角色 =================
    function displayRandomCharacters() {
        const now = Date.now(); // 当前时间戳
        let roundTime = Math.floor((now - gameState.lastRoundTime) / 1000);

        if (!gameState.isGameStarted) {
            gameState.isGameStarted = true;
            gameState.startTime = now; // 记录游戏开始时间
            gameState.lastRoundTime = now; // 初始化上一轮时间
            bpButton.disabled = true;
            resetButton.style.display = 'block'; // 使用block而不是inline-block
            
            // 更新BP模式显示
            const bpModeDisplay = document.getElementById('bpModeDisplay');
            if (bpModeDisplay) {
                bpModeDisplay.textContent = `BP模式: ${getModeName(gameState.bpMode)}`;
            }
            
            // 启动定时器，实时更新总用时和本轮用时
            gameState.timerInterval = setInterval(() => {
                const currentTime = Date.now();
                const totalElapsed = Math.floor((currentTime - gameState.startTime) / 1000); // 总用时
                const roundElapsed = Math.floor((currentTime - gameState.lastRoundTime) / 1000); // 本轮用时
                // 更新页面显示
                const timeCounter = document.getElementById('timeCounter');
                timeCounter.textContent = `总用时：${formatTime(totalElapsed)} | 本轮用时：${formatTime(roundElapsed)}`;
            }, 1000); // 每秒更新一次
            window.lastRoundPlayers = null; // 初始化
        } else {
            // 第二轮及以后，push上一轮的历史
            if (window.lastRoundPlayers) {
                window.historyData.push({ roundTime, players: window.lastRoundPlayers });
                gameState.totalTime += roundTime;
            }
        }
        
        // 无论是否是首轮，都确保BP模式显示是最新的
        const bpModeDisplay = document.getElementById('bpModeDisplay');
        if (bpModeDisplay) {
            bpModeDisplay.textContent = `BP模式: ${getModeName(gameState.bpMode)}`;
        }

        // 增加轮数
        gameState.roundCounter++;
        roundCounterDisplay.textContent = `当前轮数：${gameState.roundCounter}`;

        // 清除所有标注
        characterBoxes.forEach(box => {
            let tongTag = box.querySelector('.tong-tag');
            if (tongTag) tongTag.remove();
        });

        const roundPlayers = [];
        characterBoxes.forEach((box, index) => {
            const unavailableSet = gameState.unavailableCharacters[index];
            let availableChars = getCharacterKeys();

            // 根据 BP 模式过滤可用角色
            if (gameState.bpMode === 'personal') {
                availableChars = availableChars.filter(c => !gameState.usedCharacters.players[index].has(c) && !unavailableSet.has(c));
            } else if (gameState.bpMode === 'global') {
                availableChars = availableChars.filter(c => !gameState.usedCharacters.global.has(c) && !unavailableSet.has(c));
            } else if (gameState.bpMode === 'off') {
                availableChars = availableChars.filter(c => !unavailableSet.has(c));
            }

            if (availableChars.length === 0) {
                alert(`⚠️ 玩家 ${index + 1} 无可用角色，请重置游戏！`);
                disableGameControls();
                return;
            }

            const newChar = availableChars[Math.floor(Math.random() * availableChars.length)];

            if (gameState.bpMode === 'off') {
            }
            // 更新 BP 列表
            if (gameState.bpMode === 'global') {
                gameState.usedCharacters.global.add(newChar);
            }
            if (gameState.bpMode === 'personal') {
                gameState.usedCharacters.players[index].add(newChar);
            }

            // 调用动画函数更新角色卡片
            animateSelection(box, newChar, 0);

            roundPlayers.push({ new: newChar });
        });

        // 标注双通/单通
        let tongTagIndexes = [];
        if (gameState.tongMode === 'double') {
            let idxs = [0,1,2,3];
            for (let i = idxs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
            }
            tongTagIndexes = [idxs[0], idxs[1]];
            tongTagIndexes.forEach(i => {
                let tag = document.createElement('div');
                tag.className = 'tong-tag';
                tag.textContent = '双通';
                tag.style.color = 'blue';
                tag.style.fontWeight = 'bold';
                tag.style.textAlign = 'center';
                characterBoxes[i].appendChild(tag);
            });
        } else if (gameState.tongMode === 'single') {
            let idx = Math.floor(Math.random() * 4);
            tongTagIndexes = [idx];
            let tag = document.createElement('div');
            tag.className = 'tong-tag';
            tag.textContent = '单通';
            tag.style.color = 'red';
            tag.style.fontWeight = 'bold';
            tag.style.textAlign = 'center';
            characterBoxes[idx].appendChild(tag);
        }
        // 保存本轮标注索引供同步
        window.lastTongTagIndexes = tongTagIndexes;

        // 保存本轮玩家数据，供下次push
        window.lastRoundPlayers = roundPlayers;
        gameState.lastRoundTime = now; // 更新上一轮时间

        // 如果是主持模式，同步游戏状态
        if (window.isHost === true && window.sendGameState) {
            setTimeout(() => window.sendGameState(), 500);
        }

        // 自动触发同步
        window.triggerSync();

        // 禁用按钮 0.5 秒
        startButton.disabled = true;
        setTimeout(() => {
            startButton.disabled = false;
        }, 500);
    }

    // ================= 单独切换角色 =================
    function refreshSingleCharacter(box) {
        if (!gameState.isGameStarted) return; // 禁用单独抽取角色功能

        const playerIndex = Array.from(characterBoxes).indexOf(box);
        const usedSet = gameState.usedCharacters.players[playerIndex];
        const unavailableSet = gameState.unavailableCharacters[playerIndex];

        // 获取当前玩家的可用角色
        let availableChars = getCharacterKeys();
        if (gameState.bpMode === 'personal') {
            // 排除个人 BP 列表和不可用角色
            availableChars = availableChars.filter(c => !usedSet.has(c) && !unavailableSet.has(c));
        } else if (gameState.bpMode === 'global') {
            // 排除全局 BP 列表和不可用角色
            availableChars = availableChars.filter(c => !gameState.usedCharacters.global.has(c) && !unavailableSet.has(c));
        } else if (gameState.bpMode === 'off') {
            // 排除不可用角色
            availableChars = availableChars.filter(c => !unavailableSet.has(c));
        }

        if (availableChars.length === 0) {
            alert('该玩家无可用角色！');
            return;
        }

        const oldChar = box.querySelector('.character-name').textContent;
        const newChar = availableChars[Math.floor(Math.random() * availableChars.length)];

        // 更新不可用角色列表（仅在关闭模式下）
        if (gameState.bpMode === 'off' && oldChar) {
            unavailableSet.add(oldChar); // 将切换前的角色加入不可用列表
        }

        // 更新 BP 列表（仅计入最后换到的角色）
        if (gameState.bpMode === 'global') {
            if (oldChar) {
                gameState.usedCharacters.global.delete(oldChar); // 从全局 BP 列表中移除旧角色
            }
            gameState.usedCharacters.global.add(newChar); // 添加新角色到全局 BP 列表
        } else if (gameState.bpMode === 'personal') {
            if (oldChar) {
                usedSet.add(oldChar);
            }
            usedSet.add(newChar); // 添加新角色到个人 BP 列表
        }

        // 更新角色卡片
        box.style.pointerEvents = 'none';
        animateSelection(box, newChar, 0);
        setTimeout(() => box.style.pointerEvents = 'auto', 3500);

        // 更新历史记录
        const lastRound = window.historyData[window.historyData.length - 1];
        if (lastRound && lastRound.players) {
            if (!lastRound.players[playerIndex].replaced) {
                lastRound.players[playerIndex].replaced = [oldChar, newChar];
            } else {
                const lastCharacter = lastRound.players[playerIndex].replaced[lastRound.players[playerIndex].replaced.length - 1];
                if (lastCharacter !== newChar) {
                    lastRound.players[playerIndex].replaced.push(newChar);
                }
            }
            if (window.isHost === true && window.sendGameState) {
                setTimeout(() => window.sendGameState(), 500);
            }
        }
        
        // 自动触发同步
        window.triggerSync();
    }

    // ================= 显示历史记录 =================
    historyButton.addEventListener('click', () => {
        historyContent.innerHTML = '';
        // 创建表格
        const table = document.createElement('table');
        table.style.margin = '0 auto'; // 居中表格
        table.style.borderCollapse = 'collapse';
        table.style.width = '80%';

        // 添加表头
        const headerRow = document.createElement('tr');
        headerRow.style.backgroundColor = '#f2f2f2';
        headerRow.style.textAlign = 'center';

        const roundHeader = document.createElement('th');
        roundHeader.textContent = '轮次';
        roundHeader.style.border = '1px solid #ddd';
        roundHeader.style.padding = '8px';
        headerRow.appendChild(roundHeader);

        const timeHeader = document.createElement('th');
        timeHeader.textContent = '用时';
        timeHeader.style.border = '1px solid #ddd';
        timeHeader.style.padding = '8px';
        headerRow.appendChild(timeHeader);

        // 添加玩家列头
        ['1P', '2P', '3P', '4P'].forEach(player => {
            const playerHeader = document.createElement('th');
            playerHeader.textContent = player;
            playerHeader.style.border = '1px solid #ddd';
            playerHeader.style.padding = '8px';
            headerRow.appendChild(playerHeader);
        });

        table.appendChild(headerRow);

        // 使用全局历史记录变量
        const historyDataToUse = window.historyData || [];
        
        // 如果没有历史记录，显示提示
        if (historyDataToUse.length === 0) {
            const noDataRow = document.createElement('tr');
            const noDataCell = document.createElement('td');
            noDataCell.textContent = '暂无历史记录';
            noDataCell.colSpan = 6; // 跨越所有列
            noDataCell.style.textAlign = 'center';
            noDataCell.style.padding = '20px';
            noDataRow.appendChild(noDataCell);
            table.appendChild(noDataRow);
        } else {
            // 添加每轮记录
            historyDataToUse.forEach((round, index) => {
                const row = document.createElement('tr');
                row.style.textAlign = 'center';

                const roundCell = document.createElement('td');
                roundCell.textContent = ` ${index + 1} `;
                roundCell.style.border = '1px solid #ddd';
                roundCell.style.padding = '8px';
                row.appendChild(roundCell);

                const timeCell = document.createElement('td');
                // 优先使用同步过来的roundTime
                timeCell.textContent = formatTime(round.roundTime || 0); // 使用格式化时间
                timeCell.style.border = '1px solid #ddd';
                timeCell.style.padding = '8px';
                row.appendChild(timeCell);

                // 渲染每位玩家
                (round.players || []).forEach(player => {
                    const playerCell = document.createElement('td');
                    playerCell.style.border = '1px solid #ddd';
                    playerCell.style.padding = '8px';
                    if (player.replaced && player.replaced.length > 1) {
                        playerCell.textContent = player.replaced.join('→');
                    } else {
                        playerCell.textContent = player.new;
                    }
                    row.appendChild(playerCell);
                });

                table.appendChild(row);
            });
        }

        historyContent.appendChild(table);

        // 显示弹窗和黑色半透明背景
        overlay.style.display = 'block';
        historyPopup.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });

    closeHistoryButton.addEventListener('click', () => {
        historyPopup.style.display = 'none'; // 关闭弹窗
        overlay.style.display = 'none'; // 隐藏黑色半透明背景
        document.body.style.overflow = ''; // 恢复页面滚动
    });

    overlay.addEventListener('click', () => {
        historyPopup.style.display = 'none'; // 隐藏弹窗
        overlay.style.display = 'none'; // 隐藏背景遮罩
        document.body.style.overflow = 'auto'; // 恢复页面滚动
    });

    // ================= 事件管理初始化 =================
    const viewEventsButton = document.getElementById('viewEventsButton');
    const eventOverlay = document.getElementById('eventOverlay');
    const eventPopup = document.getElementById('eventPopup');
    const closeEventPopup = document.getElementById('closeEventPopup');
    const toggleEventsButton = document.getElementById('toggleEventsButton');
    const personalEvents = document.getElementById('personalEvents');
    const teamEvents = document.getElementById('teamEvents');
    const personalEventsTable = document.getElementById('personalEventsTable');
    const teamEventsTable = document.getElementById('teamEventsTable');
    const editPopup = document.getElementById('editPopup');
    const editTitle = document.getElementById('editTitle');
    const editContent = document.getElementById('editContent');
    const saveEdit = document.getElementById('saveEdit');
    const cancelEdit = document.getElementById('cancelEdit');

    let isShowingPersonal = true;
    let currentEditingEvent = null;
    let currentEditingType = null;

    // 填充任务表格
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

            // 创建操作单元格
            const actionCell = document.createElement('td');
            // 编辑按钮
            const editButton = document.createElement('button');
            editButton.textContent = '编辑';
            editButton.className = 'edit-button';
            editButton.onclick = () => {
                currentEditingEvent = key;
                currentEditingType = tableId === 'personalEventsTable' ? 'personal' : 'team';
                editTitle.value = key;
                editContent.value = tasks[key].内容;
                editPopup.style.display = 'block';
                eventOverlay.style.zIndex = '200';
            };
            actionCell.appendChild(editButton);
            // 删除按钮
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.className = 'delete-event-button';
            deleteButton.onclick = () => {
                if (confirm('确定要删除该事件吗？')) {
                    delete tasks[key];
                    populateTable(table, tasks, tableId);
                    localStorage.setItem(
                        tableId === 'personalEventsTable' ? 'personalEvents' : 'teamEvents',
                        JSON.stringify(tasks)
                    );
                }
            };
            actionCell.appendChild(deleteButton);

            // 将单元格添加到行
            row.appendChild(enableCell);
            row.appendChild(titleCell);
            row.appendChild(contentCell);
            row.appendChild(actionCell);

            // 将行添加到表格
            table.appendChild(row);
        });

        // 加载保存的勾选状态
        loadCheckedState(tableId);

        // 绑定勾选框的事件监听器
        attachCheckboxListeners(tableId);
    }

    // 显示弹窗
    viewEventsButton.addEventListener('click', () => {
        populateTable(personalEventsTable, mission, 'personalEventsTable'); // 填充个人任务
        populateTable(teamEventsTable, hardmission, 'teamEventsTable'); // 填充团体任务
        eventOverlay.style.display = 'block';
        eventPopup.style.display = 'block';
        personalEvents.style.display = 'block';
        teamEvents.style.display = 'none';
        toggleEventsButton.textContent = '显示团体事件';
    });

    // 关闭弹窗
    closeEventPopup.addEventListener('click', () => {
        eventOverlay.style.display = 'none';
        eventPopup.style.display = 'none';
        editPopup.style.display = 'none';
    });

    eventOverlay.addEventListener('click', () => {
        eventOverlay.style.display = 'none';
        eventPopup.style.display = 'none';
        editPopup.style.display = 'none';
    });

    // 切换任务类型
    toggleEventsButton.addEventListener('click', () => {
        if (personalEvents.style.display === 'block') {
            personalEvents.style.display = 'none';
            teamEvents.style.display = 'block';
            toggleEventsButton.textContent = '显示个人事件';
        } else {
            personalEvents.style.display = 'block';
            teamEvents.style.display = 'none';
            toggleEventsButton.textContent = '显示团体事件';
        }
    });

    // 添加事件按钮功能
    document.getElementById('addPersonalEventButton').onclick = function() {
        currentEditingEvent = null;
        currentEditingType = 'personal';
        editTitle.value = '';
        editContent.value = '';
        editPopup.style.display = 'block';
        eventOverlay.style.zIndex = '200';
    };
    document.getElementById('addTeamEventButton').onclick = function() {
        currentEditingEvent = null;
        currentEditingType = 'team';
        editTitle.value = '';
        editContent.value = '';
        editPopup.style.display = 'block';
        eventOverlay.style.zIndex = '200';
    };

    // 保存编辑
    saveEdit.addEventListener('click', () => {
        const newTitle = editTitle.value.trim();
        const newContent = editContent.value.trim();

        if (!newTitle || !newContent) {
            alert('标题和内容不能为空！');
            return;
        }

        const tasks = currentEditingType === 'personal' ? mission : hardmission;

        // 如果标题改变了，需要删除旧的事件并添加新的事件
        if (currentEditingEvent && newTitle !== currentEditingEvent) {
            delete tasks[currentEditingEvent];
        }

        // 添加或更新事件
        tasks[newTitle] = { "内容": newContent };

        // 重新填充表格
        populateTable(
            currentEditingType === 'personal' ? personalEventsTable : teamEventsTable,
            tasks,
            currentEditingType === 'personal' ? 'personalEventsTable' : 'teamEventsTable'
        );

        // 保存到本地存储
        localStorage.setItem(
            currentEditingType === 'personal' ? 'personalEvents' : 'teamEvents',
            JSON.stringify(tasks)
        );

        // 关闭编辑弹窗
        editPopup.style.display = 'none';
        eventOverlay.style.zIndex = '199';
        if (window.isHost === true && window.sendGameState) {
            setTimeout(() => window.sendGameState(), 500);
        }
    });

    // 取消编辑
    cancelEdit.addEventListener('click', () => {
        editPopup.style.display = 'none';
        eventOverlay.style.zIndex = '199';
    });

    // 保存勾选状态
    function saveCheckedState(tableId) {
        const checkboxes = document.querySelectorAll(`#${tableId} input[type="checkbox"]`);
        const checkedState = {};
        checkboxes.forEach(checkbox => {
            checkedState[checkbox.dataset.key] = checkbox.checked; // 保存每个任务的勾选状态
        });
        localStorage.setItem(`${tableId}-checkedState`, JSON.stringify(checkedState)); // 存储到 localStorage
    }

    // 加载勾选状态
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

    // ================= 工具函数 =================
    // 此函数将被character-manage.js覆盖
    function getCharacterKeys() {
        if (window.characterStates) {
            const allChars = Object.keys(characterData);
            return allChars.filter(name => window.characterStates[name] !== false);
        }
        return Object.keys(characterData);
    }

    function disableGameControls() {
        startButton.disabled = true;
        characterBoxes.forEach(box => {
            box.style.pointerEvents = 'none';
        });
    }

    function getModeName(mode) {
        return { global: '全局', personal: '个人', off: '关闭' }[mode];
    }

    function animateSelection(box, newChar, delay) {
        const img = box.querySelector('.character-image');
        const name = box.querySelector('.character-name');

        setTimeout(() => {
            box.style.opacity = 0;
            setTimeout(() => {
                img.style.display = 'block';
                img.src = characterData[newChar].头像;
                name.textContent = newChar;
                box.style.opacity = 1;
            }, 300);
        }, delay);
    }

    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const remainingSeconds = (seconds % 60).toString().padStart(2, '0');

        // 如果小时位为 0，则不显示小时
        if (hours > 0) {
            return `${hours}:${minutes}:${remainingSeconds}`;
        } else {
            return `${minutes}:${remainingSeconds}`;
        }
    }

    // ================= 事件绑定 =================
    characterBoxes.forEach(box => {
        box.addEventListener('click', () => refreshSingleCharacter(box));
    });

    startButton.addEventListener('click', displayRandomCharacters);

    // 初始化个人任务和团体任务表格
    populateTable(personalEventsTable, mission, 'personalEventsTable');
    populateTable(teamEventsTable, hardmission, 'teamEventsTable');

    const tongModeButton = document.getElementById('tongModeButton');
    tongModeButton.addEventListener('click', () => {
        if (gameState.tongMode === 'normal') {
            gameState.tongMode = 'double';
            tongModeButton.textContent = '双通模式';
            tongModeButton.style.backgroundColor = '#3498db'; // 蓝色
            tongModeButton.style.color = 'white';
        } else if (gameState.tongMode === 'double') {
            gameState.tongMode = 'single';
            tongModeButton.textContent = '单通模式';
            tongModeButton.style.backgroundColor = '#e74c3c'; // 红色
            tongModeButton.style.color = 'white';
        } else {
            gameState.tongMode = 'normal';
            tongModeButton.textContent = '普通模式';
            tongModeButton.style.backgroundColor = '#2ecc71'; // 绿色
            tongModeButton.style.color = 'white';
        }
    });

    // 主持/加入房间时控制tongModeButton显示隐藏
    document.getElementById('hostGameButton').addEventListener('click', () => {
        tongModeButton.style.display = '';
        gameState.tongMode = 'normal';
        tongModeButton.textContent = '普通模式';
        tongModeButton.style.backgroundColor = '#2ecc71'; // 绿色
        tongModeButton.style.color = 'white';
    });
    document.getElementById('joinGameButton').addEventListener('click', () => {
        tongModeButton.style.display = 'none';
    });

    exploreButton.addEventListener('click', () => {
        initialScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        // 禁用房间同步功能
        console.log('进入游戏主界面，但不进行多人游戏功能');
        tongModeButton.style.display = '';
        gameState.tongMode = 'normal';
        tongModeButton.textContent = '普通模式';
        tongModeButton.style.backgroundColor = '#2ecc71'; // 绿色
        tongModeButton.style.color = 'white';
    });

    // 全局触发同步的辅助函数
    window.triggerSync = function() {
        if (window.isHost === true && window.sendGameState) {
            setTimeout(() => window.sendGameState(), 500);
        }
    };
});
