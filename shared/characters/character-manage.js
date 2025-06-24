// 角色管理功能
document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const characterManageButton = document.getElementById('characterManageButton');
    const characterPopup = document.getElementById('characterPopup');
    const characterOverlay = document.getElementById('characterOverlay');
    const closeCharacterPopup = document.getElementById('closeCharacterPopup');
    const charactersContainer = document.getElementById('charactersContainer');
    const elementFilter = document.getElementById('elementFilter');
    const weaponFilter = document.getElementById('weaponFilter');
    
    // 确定当前是哪个系统，根据URL判断
    const isSuiji = window.location.href.includes('suiji');
    const isHss = window.location.href.includes('hss');
    const storageKeyPrefix = isSuiji ? 'suiji_' : (isHss ? 'hss_' : '');
    
    // 存储角色启用状态的对象，使用不同的键名前缀
    window.characterStates = JSON.parse(localStorage.getItem(storageKeyPrefix + 'characterStates')) || {};
    
    // 创建公共初始化函数，供设置面板中的角色管理按钮使用
    window.initCharacterManagement = function() {
        initFilters();
        populateCharacters();
        characterPopup.style.display = 'block';
        characterOverlay.style.display = 'block';
    };
    
    // 弹窗的显示与隐藏
    characterManageButton.addEventListener('click', () => {
        window.initCharacterManagement(); // 使用公共初始化函数
    });
    
    closeCharacterPopup.addEventListener('click', () => {
        characterPopup.style.display = 'none';
        characterOverlay.style.display = 'none';
        // 同时关闭设置面板的遮罩层，确保完全返回初始界面
        const eventOverlay = document.getElementById('eventOverlay');
        if (eventOverlay) {
            eventOverlay.style.display = 'none';
        }
    });
    
    characterOverlay.addEventListener('click', () => {
        characterPopup.style.display = 'none';
        characterOverlay.style.display = 'none';
        // 同时关闭设置面板的遮罩层，确保完全返回初始界面
        const eventOverlay = document.getElementById('eventOverlay');
        if (eventOverlay) {
            eventOverlay.style.display = 'none';
        }
    });
    
    // 初始化筛选下拉框
    function initFilters() {
        // 获取所有元素类型和武器类型
        const elements = new Set();
        const weapons = new Set();
        Object.values(characterData).forEach(data => {
            if (data.元素类型 && data.元素类型 !== 'undefined') elements.add(data.元素类型);
            if (data.武器类型 && data.武器类型 !== 'undefined') weapons.add(data.武器类型);
        });
        // 元素类型下拉
        elementFilter.innerHTML = '<option value="">全部元素</option>' +
            Array.from(elements).map(e => `<option value="${e}">${e}</option>`).join('');
        // 武器类型下拉
        weaponFilter.innerHTML = '<option value="">全部武器</option>' +
            Array.from(weapons).map(w => `<option value="${w}">${w}</option>`).join('');
    }
    
    // 监听筛选变化
    elementFilter.addEventListener('change', populateCharacters);
    weaponFilter.addEventListener('change', populateCharacters);
    
    // 填充角色列表
    function populateCharacters() {
        charactersContainer.innerHTML = '';
        const elementValue = elementFilter.value;
        const weaponValue = weaponFilter.value;
        // 从characters.js中获取角色数据
        const characters = Object.keys(characterData).filter(character => {
            const data = characterData[character];
            if (elementValue && data.元素类型 !== elementValue) return false;
            if (weaponValue && data.武器类型 !== weaponValue) return false;
            return true;
        });
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
                    if (window.sendGameState) {
                        setTimeout(() => window.sendGameState(), 500);
                    }
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
    
    // 保存角色状态到本地存储，使用不同的键名前缀
    function saveCharacterStates() {
        localStorage.setItem(storageKeyPrefix + 'characterStates', JSON.stringify(window.characterStates));
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