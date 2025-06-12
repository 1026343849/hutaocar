// 重置事件脚本
// 清除localStorage中的团队事件
localStorage.removeItem('teamEvents');

// 设置新的事件内容
const newEvents = {
    "事件1": {
        "内容": "爆炸箱子玩家单通,打完一波怪复活下家直到所有人复活，结算血量低于50%重复该事件"
    },
    "事件2": {
        "内容": "禁止使用任何回血武器和装备，个人回血技能投气球，绿色可用橙色禁用"
    },
    "事件3": {
        "内容": "观众提供协助（投骰子：12可用A，34可用E，56可用Q）不参与拉怪"
    },
    "事件4": {
        "内容": "爆炸箱子接力单通一个点位，第二个点位换下家（爆炸箱玩家的下家）接手（每个点位4人阵亡则G G）"
    },
    "事件5": {
        "内容": "如果有禁用技能则解除（包括6命限制）没有则无事发生"
    },
    "事件6": {
        "内容": "方位倒序（如方位是12则变成21，顺序：12选好人后再按21选人）"
    },
    "事件7": {
        "内容": "爆炸箱子或投帽子点数最大（相同帽子点数1P>2p>3p>4p)的玩家当前人物保留到下轮"
    },
    "事件8": {
        "内容": "第一波怪4通，无伤不减员，下波怪开始，受伤人员成为观众，剩两人双通则不减员（奶满可以不减员）"
    },
    "事件9": {
        "内容": "打爆箱子的玩家跟下两家三通"
    },
    "事件10": {
        "内容": "本轮可使用5星上限为1（如1P用了5星则其他人只能用4星如此类推）"
    },
    "事件11": {
        "内容": "本轮选出的人物经对方同意可以进行交换"
    },
    "事件12": {
        "内容": "本轮关键怪物只能最后击杀（如三役人只能最后击杀冰役人，双丘王最后击杀岩丘等）"
    },
    "事件13": {
        "内容": "超过2个（包括2个）以上低于4个的点位怪物需要同时击杀，即第一个怪死亡剩下的怪物需要10秒内杀死"
    },
    "事件14": {
        "内容": "本轮禁U I（队友禁止提示剩余血量）"
    },
    "事件15": {
        "内容": "第一波怪打完后，受伤或血量最低的人禁用技能（绿E橙Q），3人以上血量最高不禁，波次结束前奶满则无效"
    },
    "事件16": {
        "内容": "如果有禁用技能则保留到下回合，没有则无视发生"
    },
    "事件17": {
        "内容": "气球绿色的玩家视为阵亡，其他人战斗（4个同颜色则1P和2P先打，3P和4P接手，技能投到绿色不禁）"
    },
    "事件18": {
        "内容": "气球橙色的玩家视为阵亡，其他人战斗（4个同颜色则3P和4P先打，1P和2P接手，技能投到绿色不禁）"
    },
    "事件19": {
        "内容": "血量为红色视为阵亡(技能烧血类人物无视本条)"
    },
    "事件20": {
        "内容": "玩家+1，无观众则按选出的人物元素自选"
    }
};

// 更新当前内存中的事件
if (typeof hardmission !== 'undefined') {
    // 清除现有事件
    Object.keys(hardmission).forEach(key => {
        delete hardmission[key];
    });
    
    // 添加新事件
    Object.keys(newEvents).forEach(key => {
        hardmission[key] = newEvents[key];
    });
    
    console.log('已更新硬任务事件，可用事件列表：', Object.keys(hardmission));
} else {
    console.error('硬任务对象未定义，无法更新！');
}

// 清除所有事件框内容
function clearEventBoxes() {
    const missionBoxes = document.querySelectorAll('.mission-box');
    if (!missionBoxes || missionBoxes.length === 0) return;
    
    missionBoxes.forEach(box => {
        const titleElement = box.querySelector('.mission-title');
        const contentElement = box.querySelector('.mission-content');
        
        if (titleElement) titleElement.textContent = '';
        if (contentElement) contentElement.textContent = '';
        
        // 移除可能的事件编号标记
        const badge = box.querySelector('.event-number-badge');
        if (badge) box.removeChild(badge);
    });
}

// 页面加载完成后清空事件框
window.addEventListener('load', function() {
    clearEventBoxes();
}); 