// 角色管理功能
document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const characterManageButton = document.getElementById('characterManageButton');
    const characterPopup = document.getElementById('characterPopup');
    const characterOverlay = document.getElementById('characterOverlay');
    const closeCharacterPopup = document.getElementById('closeCharacterPopup');
    const charactersContainer = document.getElementById('charactersContainer');
    
    // 存储角色启用状态的对象
    window.characterStates = JSON.parse(localStorage.getItem('characterStates')) || {};
    
    // 弹窗的显示与隐藏
    characterManageButton.addEventListener('click', () => {
        populateCharacters();
        characterPopup.style.display = 'block';
        characterOverlay.style.display = 'block';
    });
    
    closeCharacterPopup.addEventListener('click', () => {
        characterPopup.style.display = 'none';
        characterOverlay.style.display = 'none';
    });
    
    characterOverlay.addEventListener('click', () => {
        characterPopup.style.display = 'none';
        characterOverlay.style.display = 'none';
    });
    
    // 填充角色列表
    function populateCharacters() {
        charactersContainer.innerHTML = '';
        
        // 从characters.js中获取角色数据
        const characters = Object.keys(characterData);
        
        characters.forEach(character => {
            const data = characterData[character];
            
            // 默认启用所有角色
            if (window.characterStates[character] === undefined) {
                window.characterStates[character] = true;
            }
            
            // 创建角色项
            const characterItem = document.createElement('div');
            characterItem.className = 'character-item';
            
            // 角色头像
            const img = document.createElement('img');
            img.src = data.头像;
            img.alt = character;
            
            // 角色名称
            const name = document.createElement('div');
            name.textContent = character;
            name.style.fontWeight = 'bold';
            name.style.textAlign = 'center';
            
            // 显示星级
            const rarity = document.createElement('div');
            rarity.textContent = data.星级;
            rarity.style.color = data.星级 === "五星" ? "#c0a167" : "#8e72a4";
            rarity.style.fontSize = '14px';
            
            // 启用/禁用按钮
            const toggleButton = document.createElement('button');
            toggleButton.className = `character-toggle ${window.characterStates[character] ? 'enabled' : 'disabled'}`;
            toggleButton.textContent = window.characterStates[character] ? '已启用' : '已禁用';
            
            toggleButton.addEventListener('click', () => {
                window.characterStates[character] = !window.characterStates[character];
                toggleButton.className = `character-toggle ${window.characterStates[character] ? 'enabled' : 'disabled'}`;
                toggleButton.textContent = window.characterStates[character] ? '已启用' : '已禁用';
                
                // 保存状态到本地
                saveCharacterStates();
                
                // 如果是主持人，发送更新到其他玩家
                if (window.isHost) {
                    syncCharacterStates();
                }
            });
            
            // 组装角色项
            characterItem.appendChild(img);
            characterItem.appendChild(name);
            characterItem.appendChild(rarity);
            characterItem.appendChild(toggleButton);
            
            // 添加到容器
            charactersContainer.appendChild(characterItem);
        });
    }
    
    // 保存角色状态到本地存储
    function saveCharacterStates() {
        localStorage.setItem('characterStates', JSON.stringify(window.characterStates));
    }
    
    // 同步角色状态到其他玩家（多人游戏模式）
    function syncCharacterStates() {
        if (window.currentRoomId && window.ws) {
            const syncData = {
                type: 'characterStates',
                roomId: window.currentRoomId,
                states: window.characterStates
            };
            window.ws.send(JSON.stringify(syncData));
        }
    }
    
    // 接收角色状态更新（多人游戏模式）
    if (window.ws) {
        const originalOnMessage = window.ws.onmessage;
        window.ws.onmessage = function(event) {
            if (originalOnMessage) {
                originalOnMessage.call(window.ws, event);
            }
            
            const data = JSON.parse(event.data);
            if (data.type === 'characterStates') {
                window.characterStates = data.states;
                saveCharacterStates();
                
                // 如果弹窗正在显示，更新界面
                if (characterPopup.style.display === 'block') {
                    populateCharacters();
                }
            }
        };
    }
    
    // 直接覆盖app.js中的getCharacterKeys函数
    window.getCharacterKeys = function() {
        // 首先获取所有角色
        const allCharacters = Object.keys(characterData);
        
        // 过滤出启用的角色
        const enabledCharacters = allCharacters.filter(name => window.characterStates[name] !== false);
        
        console.log('角色过滤：', allCharacters.length, '个角色中有', enabledCharacters.length, '个启用');
        
        return enabledCharacters;
    };
}); 