document.addEventListener('DOMContentLoaded', function () {
    const ws = new WebSocket('wss://newws.hutaocar.cn:4000');

    // DOM 元素
    const initialScreen = document.getElementById('initialScreen');
    const gameScreen = document.getElementById('gameScreen');
    const hostGameButton = document.getElementById('hostGameButton');
    const joinGameButton = document.getElementById('joinGameButton');
    const gameContent = document.getElementById('gameContent');
    const startButton = document.getElementById('startButton');
    const resetButton = document.getElementById('resetButton');
    const missionButton = document.getElementById('missionButton');
    const bpButton = document.getElementById('bpButton');
    const roundCounterDisplay = document.getElementById('roundCounter');
    const characterBoxes = document.querySelectorAll('.character-box');
    const missionBoxes = document.querySelectorAll('.mission-box');
    const syncButton = document.getElementById('syncButton'); 
    const selectedHardMission = document.getElementById('selectedHardMission');
    const timeCounter = document.getElementById('timeCounter');
    const connectionStatus = document.getElementById('connectionStatus');
    const exploreButton = document.getElementById('exploreButton'); 

    let isHost = false;
    let currentRoomId = null;

    // 默认禁用按钮
    hostGameButton.disabled = true;
    joinGameButton.disabled = true;

    // WebSocket 连接成功
    ws.onopen = () => {
        console.log('WebSocket 连接成功');
        if (connectionStatus) {
            connectionStatus.textContent = '多人游戏服务器连接成功！';
            connectionStatus.style.color = 'green'; 
        }

        // 启用按钮
        hostGameButton.disabled = false;
        joinGameButton.disabled = false;
    };

    // WebSocket 连接错误
    ws.onerror = (error) => {
        console.error('WebSocket 连接错误:', error);
        if (connectionStatus) {
            connectionStatus.textContent = '服务器连接失败，请刷新页面重试...';
            connectionStatus.style.color = 'red'; 
        }

        // 确保按钮保持禁用状态
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
    };

    // WebSocket 连接关闭
    ws.onclose = () => {
        console.log('WebSocket 连接已关闭');
        if (connectionStatus) {
            connectionStatus.textContent = '服务器连接已断开，请刷新页面重试...';
            connectionStatus.style.color = 'red'; 
        }

        // 确保按钮保持禁用状态
        hostGameButton.disabled = true;
        joinGameButton.disabled = true;
    };

    // 主持游戏（自定义弹窗方式，兼容移动端）
    hostGameButton.addEventListener('click', () => {
        const overlay = document.getElementById('hostRoomOverlay');
        const popup = document.getElementById('hostRoomPopup');
        const confirmBtn = document.getElementById('hostRoomConfirm');
        const cancelBtn = document.getElementById('hostRoomCancel');
        overlay.style.display = 'block';
        popup.style.display = 'block';

        function closePopup() {
            overlay.style.display = 'none';
            popup.style.display = 'none';
        }

        confirmBtn.onclick = function() {
            ws.send(JSON.stringify({ type: 'createRoom' }));
            isHost = true;
            if (timeCounter) timeCounter.style.display = 'block';
            closePopup();
        };
        cancelBtn.onclick = closePopup;
        overlay.onclick = closePopup;
    });

    // 同步数据函数
    function syncGameState() {
        if (!window.gameState) {
            console.error('gameState 未定义');
            return;
        }

        // 获取当前标注索引
        let tongTagIndexes = [];
        if (gameState.tongMode === 'double') {
            tongTagIndexes = window.lastTongTagIndexes || [];
        } else if (gameState.tongMode === 'single') {
            tongTagIndexes = window.lastTongTagIndexes || [];
        }
        const state = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => ({
                name: box.querySelector('.character-name').textContent,
                image: box.querySelector('.character-image').src
            })),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').innerHTML // 使用 innerHTML 保留颜色
            })),
            hardMission: {
                title: selectedHardMission.querySelector('.mission-title')?.textContent || '',
                content: selectedHardMission.querySelector('.mission-content')?.innerHTML || '' // 使用 innerHTML 保留颜色
            },
            tongMode: gameState.tongMode,
            tongTagIndexes: tongTagIndexes
        };

        const history = window.historyData || [];

        console.log('同步的游戏状态:', state, '历史记录:', history);
        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state, history }));
    }

    // 自动同步功能：每30秒调用一次 syncGameState
    setInterval(() => {
        syncGameState();
    }, 30000);

    // 绑定同步按钮点击事件
    syncButton.addEventListener('click', (event) => {
        syncGameState(); // 调用同步数据函数
        
        // 更改按钮文本，显示同步成功
        const originalText = syncButton.textContent;
        syncButton.textContent = '已同步';
        syncButton.disabled = true;
        
        // 2秒后恢复原来的文本和状态
        setTimeout(() => {
            syncButton.textContent = originalText;
            syncButton.disabled = false;
        }, 1000);
    });

    // 在主界面顶部动态显示当前人数
    function showPlayerCount(count) {
        // 检查是否已经存在提示框
        let playerCountDisplay = document.getElementById('playerCountDisplay');
        if (!playerCountDisplay) {
            // 检查状态栏是否存在
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) {
                // 创建提示框
                playerCountDisplay = document.createElement('div');
                playerCountDisplay.id = 'playerCountDisplay';
                playerCountDisplay.className = 'status-item';
                // 添加到状态栏
                statusBar.appendChild(playerCountDisplay);
            }
        }

        // 更新提示框内容
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `当前人数：${count}`;
        }
    }

    // 显示临时提示框
    function showTemporaryMessage(message) {
        // 创建提示框容器
        const messageBox = document.createElement('div');
        messageBox.style.position = 'fixed';
        messageBox.style.top = '10%';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translateX(-50%)';
        messageBox.style.backgroundColor = '#3498db';
        messageBox.style.color = '#fff';
        messageBox.style.padding = '10px 20px';
        messageBox.style.borderRadius = '8px';
        messageBox.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        messageBox.style.fontSize = '16px';
        messageBox.style.zIndex = '1000';
        messageBox.style.textAlign = 'center';
        messageBox.textContent = message;

        // 添加到文档中
        document.body.appendChild(messageBox);

        // 3秒后移除提示框
        setTimeout(() => {
            messageBox.remove();
        }, 3000);
    }

    // WebSocket 消息处理
    ws.onmessage = (event) => {
        console.log('收到消息:', event.data);
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'roomCreated':
                currentRoomId = data.roomId;
                initialScreen.style.display = 'none';
                gameScreen.style.display = 'block';
                showTemporaryMessage('房间已创建！你现在是地主，请为所有人抽取角色和事件');
                // 显示房间代码
                document.getElementById('roomCodeDisplay').textContent = `${data.roomId}`;
                // 显示复制按钮
                const copyBtn1 = document.getElementById('copyRoomCodeBtn');
                copyBtn1.style.display = 'inline-block';
                copyBtn1.onclick = function() {
                    navigator.clipboard.writeText(data.roomId).then(() => {
                        copyBtn1.textContent = '已复制';
                        setTimeout(() => { copyBtn1.textContent = '复制'; }, 1000);
                    });
                };
                
                // 显示同步按钮和重置按钮（对主持人可见）
                syncButton.style.display = 'block';
                resetButton.style.display = 'block';
                
                // 房间创建成功后，确保弹窗和遮罩隐藏
                document.getElementById('hostRoomOverlay').style.display = 'none';
                document.getElementById('hostRoomPopup').style.display = 'none';
                // 显示历史记录按钮
                const historyButton1 = document.getElementById('historyButton');
                if (historyButton1) {
                    historyButton1.style.display = 'block';
                    setTimeout(() => { historyButton1.style.display = 'block'; }, 100);
                }
                break;

            case 'roomJoined':
                currentRoomId = data.roomId;
                showTemporaryMessage('成功加入房间！地主会帮你完成所有操作，等着就行。'); // 使用临时提示框
                initialScreen.style.display = 'none';
                gameScreen.style.display = 'block';
                // 显示房间代码
                document.getElementById('roomCodeDisplay').textContent = `${data.roomId}`;
                // 显示复制按钮
                const copyBtn2 = document.getElementById('copyRoomCodeBtn');
                copyBtn2.style.display = 'inline-block';
                copyBtn2.onclick = function() {
                    navigator.clipboard.writeText(data.roomId).then(() => {
                        copyBtn2.textContent = '已复制';
                        setTimeout(() => { copyBtn2.textContent = '复制'; }, 1000);
                    });
                };

                // 显示历史记录按钮
                const historyButton2 = document.getElementById('historyButton');
                if (historyButton2) {
                    historyButton2.style.display = 'block';
                    setTimeout(() => { historyButton2.style.display = 'block'; }, 100);
                }

                // 隐藏按钮并禁用功能（加入房间的玩家）
                if (!isHost) {
                    resetButton.style.display = 'none';
                    startButton.style.display = 'none';
                    missionButton.style.display = 'none';
                    syncButton.style.display = 'none'; // 禁用同步按钮
                    
                    // 隐藏 BP 按钮
                    bpButton.style.display = 'none'; // 隐藏 BP 按钮

                    // 隐藏角色管理按钮
                    const characterManageButton = document.getElementById('characterManageButton');
                    if (characterManageButton) {
                        characterManageButton.style.display = 'none';
                    }

                    // 禁用角色卡片单击事件
                    characterBoxes.forEach((box) => {
                        box.style.pointerEvents = 'none'; // 禁用点击事件
                    });

                    // 禁用事件卡片单击事件
                    missionBoxes.forEach((box) => {
                        box.style.pointerEvents = 'none'; // 禁用点击事件
                    });
                }
                break;

            case 'stateUpdated':
                console.log('收到最新游戏状态:', data.state);
                updateGameState(data.state); // 更新界面

                // 同步历史记录数据
                if (data.history) {
                    window.historyData = data.history;
                    console.log('同步历史记录:', data.history);
                }
                break;

            case 'roomClosed':
                alert('主持人已关闭房间');
                localStorage.removeItem('roomId'); // 房间关闭时清除房间代码
                location.reload();
                break;

            case 'error':
                alert(`错误：${data.message}`);
                localStorage.removeItem('roomId'); // 出现错误时清除房间代码
                break;

            case 'playerCount':
                // 使用顶部提示框显示当前人数
                showPlayerCount(data.count);
                break;

            case 'characterStates':
                // 接收并应用角色状态更新
                if (window.characterStates !== undefined) {
                    window.characterStates = data.states;
                    localStorage.setItem('characterStates', JSON.stringify(data.states));
                    console.log('已从主持人接收角色状态更新', data.states);
                }
                break;

            case 'updateState':
                console.log(`更新状态请求，房间ID: ${data.roomId}`);
                const updateRoom = rooms[data.roomId];
                if (updateRoom && updateRoom.host === ws) {
                    updateRoom.state = data.state;

                    console.log(`广播最新状态，房间ID: ${data.roomId}`);
                    updateRoom.players.forEach((player) => {
                        player.send(JSON.stringify({ type: 'stateUpdated', state: data.state }));
                    });
                } else {
                    console.log('更新状态失败：房间不存在或请求者不是主持人');
                }
                break;

            default:
                console.log('未知消息类型:', data.type);
        }
    };

    // 主持人发送游戏状态
    window.sendGameState = function sendGameState() {
        if (!window.gameState) {
            console.error('gameState 未定义');
            return;
        }

        let tongTagIndexes = [];
        if (gameState.tongMode === 'double') {
            tongTagIndexes = window.lastTongTagIndexes || [];
        } else if (gameState.tongMode === 'single') {
            tongTagIndexes = window.lastTongTagIndexes || [];
        }
        const state = {
            roundCounter: gameState.roundCounter,
            characters: Array.from(characterBoxes).map((box) => ({
                name: box.querySelector('.character-name').textContent,
                image: box.querySelector('.character-image').src
            })),
            missions: Array.from(missionBoxes).map((box) => ({
                title: box.querySelector('.mission-title').textContent,
                content: box.querySelector('.mission-content').textContent
            })),
            tongMode: gameState.tongMode,
            tongTagIndexes: tongTagIndexes
        };

        // 添加日志记录主持人发送的数据
        console.log('主持人发送的游戏状态:', state);

        // 同步完整历史记录
        ws.send(JSON.stringify({ type: 'updateState', roomId: currentRoomId, state, history: window.historyData || [] }));
    };

    // 更新游戏状态（同步角色、事件和轮数）
    function updateGameState(state) {
        // 更新轮数
        roundCounterDisplay.textContent = `当前轮数：${state.roundCounter}`;

        // 更新角色卡片
        state.characters.forEach((character, index) => {
            const box = characterBoxes[index];
            const img = box.querySelector('.character-image');
            const name = box.querySelector('.character-name');

            img.style.display = 'block';
            img.src = character.image;
            name.textContent = character.name;
        });

        // 更新事件卡片
        state.missions.forEach((mission, index) => {
            const box = missionBoxes[index];
            const title = box.querySelector('.mission-title');
            const content = box.querySelector('.mission-content');

            title.textContent = mission.title;
            content.innerHTML = mission.content; // 使用 innerHTML 恢复颜色
        });

        // 更新困难模式事件
        const hardMissionTitle = selectedHardMission.querySelector('.mission-title');
        const hardMissionContent = selectedHardMission.querySelector('.mission-content');

        if (state.hardMission && state.hardMission.title) {
            selectedHardMission.style.display = 'block';
            hardMissionTitle.textContent = state.hardMission.title;
            hardMissionContent.innerHTML = state.hardMission.content; // 使用 innerHTML 恢复颜色
        }

        // 清除所有标注
        characterBoxes.forEach(box => {
            let tongTag = box.querySelector('.tong-tag');
            if (tongTag) tongTag.remove();
        });
        // 渲染标注
        if (state.tongMode === 'double') {
            (state.tongTagIndexes || []).forEach(i => {
                let tag = document.createElement('div');
                tag.className = 'tong-tag';
                tag.textContent = '双通';
                tag.style.color = 'blue';
                tag.style.fontWeight = 'bold';
                tag.style.textAlign = 'center';
                characterBoxes[i].appendChild(tag);
            });
        } else if (state.tongMode === 'single') {
            (state.tongTagIndexes || []).forEach(i => {
                let tag = document.createElement('div');
                tag.className = 'tong-tag';
                tag.textContent = '单通';
                tag.style.color = 'red';
                tag.style.fontWeight = 'bold';
                tag.style.textAlign = 'center';
                characterBoxes[i].appendChild(tag);
            });
        }
    }

    exploreButton.addEventListener('click', () => {
        initialScreen.style.display = 'none';
        gameScreen.style.display = 'block';

        // 禁用房间同步功能
        console.log('进入游戏主界面，但不进行多人游戏功能');
    });

    // 加入游戏（自定义弹窗方式，兼容移动端）
    joinGameButton.addEventListener('click', () => {
        const overlay = document.getElementById('joinRoomOverlay');
        const popup = document.getElementById('joinRoomPopup');
        const input = document.getElementById('joinRoomInput');
        const confirmBtn = document.getElementById('joinRoomConfirm');
        const cancelBtn = document.getElementById('joinRoomCancel');
        input.value = '';
        overlay.style.display = 'block';
        popup.style.display = 'block';

        function closePopup() {
            overlay.style.display = 'none';
            popup.style.display = 'none';
        }

        confirmBtn.onclick = function() {
            const roomId = input.value.trim();
            if (roomId) {
                localStorage.setItem('roomId', roomId);
                ws.send(JSON.stringify({ type: 'joinRoom', roomId }));
                isHost = false;
                if (timeCounter) timeCounter.style.display = 'none';
                closePopup();
            } else {
                input.focus();
            }
        };
        cancelBtn.onclick = closePopup;
        overlay.onclick = closePopup;
    });
});