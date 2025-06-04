const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

// 使用不同的端口以避免与原有服务器冲突
const PORT = process.env.PORT || 4001;

// 1. 读取SSL证书
const options = {
  cert: fs.readFileSync('./fullchain.pem'),
  key: fs.readFileSync('./privkey.key')
};

// 2. 创建HTTPS服务器
const server = https.createServer(options);

// 3. 创建WebSocket服务器，绑定到HTTPS服务器
const wss = new WebSocket.Server({ server });

const rooms = {}; // 存储房间信息

wss.on("connection", (ws) => {
  console.log("胡桃服务器：客户端已连接");

  ws.on("message", (message) => {
    console.log("胡桃服务器收到消息:", message);
    const data = JSON.parse(message);

    switch (data.type) {
      case "createRoom":
        console.log("创建房间请求");
        const roomId = uuidv4().slice(0, 6); // 生成6位房间ID
        rooms[roomId] = { host: ws, players: [], state: {}, playerInfos: [] };
        ws.send(JSON.stringify({ type: "roomCreated", roomId }));
        break;

      case "joinRoom":
        console.log(`加入房间请求，房间ID: ${data.roomId}`);
        const room = rooms[data.roomId];
        if (room) {
          if (room.players.length >= 3) {
            ws.send(
              JSON.stringify({ type: "error", message: "房间已满，无法加入" })
            );
            return;
          }
          room.players.push(ws);
          ws.send(JSON.stringify({ type: "roomJoined", roomId: data.roomId }));

          // 广播当前房间人数
          const currentPlayerCount = room.players.length + 1; // 包括主持人
          const playerCountMessage = {
            type: "playerCount",
            count: currentPlayerCount,
            maxPlayers: 4
          };
          room.host.send(JSON.stringify(playerCountMessage));
          room.players.forEach((player) => {
            player.send(JSON.stringify(playerCountMessage));
          });
        } else {
          ws.send(JSON.stringify({ type: "error", message: "房间不存在" }));
        }
        break;

      case "playerInfo":
        console.log(`玩家信息更新，房间ID: ${data.roomId}`);
        const playerInfoRoom = rooms[data.roomId];
        if (playerInfoRoom) {
          // 存储玩家信息
          const playerExists = playerInfoRoom.playerInfos.findIndex(p => p.id === data.player.id);
          if (playerExists >= 0) {
            playerInfoRoom.playerInfos[playerExists] = data.player;
          } else {
            playerInfoRoom.playerInfos.push(data.player);
          }
          
          // 广播玩家加入消息
          const playerJoinedMessage = {
            type: "playerJoined",
            player: data.player
          };
          
          // 广播给房主
          playerInfoRoom.host.send(JSON.stringify(playerJoinedMessage));
          
          // 广播给其他玩家
          playerInfoRoom.players.forEach((player) => {
            if (player !== ws) { // 不发给自己
              player.send(JSON.stringify(playerJoinedMessage));
            }
          });
          
          // 给新玩家发送当前所有玩家信息
          const allPlayers = {
            type: "allPlayers",
            players: playerInfoRoom.playerInfos
          };
          ws.send(JSON.stringify(allPlayers));
        }
        break;
        
      case "playerReady":
        console.log(`玩家准备状态更新，房间ID: ${data.roomId}`);
        const readyRoom = rooms[data.roomId];
        if (readyRoom) {
          // 更新玩家准备状态
          const playerIndex = readyRoom.playerInfos.findIndex(p => p.id === data.playerId);
          if (playerIndex >= 0) {
            readyRoom.playerInfos[playerIndex].isReady = data.isReady;
          }
          
          // 广播玩家准备状态
          const readyMessage = {
            type: "playerReady",
            playerId: data.playerId,
            isReady: data.isReady
          };
          
          // 广播给房主
          readyRoom.host.send(JSON.stringify(readyMessage));
          
          // 广播给所有玩家
          readyRoom.players.forEach((player) => {
            player.send(JSON.stringify(readyMessage));
          });
        }
        break;
        
      case "leaveRoom":
        console.log(`玩家离开房间，房间ID: ${data.roomId}`);
        const leaveRoom = rooms[data.roomId];
        if (leaveRoom) {
          // 移除玩家信息
          leaveRoom.playerInfos = leaveRoom.playerInfos.filter(p => p.id !== data.playerId);
          
          // 广播玩家离开消息
          const leaveMessage = {
            type: "playerLeft",
            playerId: data.playerId
          };
          
          // 广播给房主
          leaveRoom.host.send(JSON.stringify(leaveMessage));
          
          // 广播给所有玩家
          leaveRoom.players.forEach((player) => {
            player.send(JSON.stringify(leaveMessage));
          });
        }
        break;
        
      case "startGame":
        console.log(`开始游戏请求，房间ID: ${data.roomId}`);
        const gameRoom = rooms[data.roomId];
        if (gameRoom && gameRoom.host === ws) {
          // 广播游戏开始消息
          const startMessage = {
            type: "gameStarted"
          };
          
          // 广播给所有玩家
          gameRoom.players.forEach((player) => {
            player.send(JSON.stringify(startMessage));
          });
        }
        break;

      case "updateState":
        console.log(`更新状态请求，房间ID: ${data.roomId}`);
        const updateRoom = rooms[data.roomId];
        if (updateRoom && updateRoom.host === ws) {
          updateRoom.state = data.state;

          // 广播最新状态，包括历史记录
          console.log(`广播最新状态，房间ID: ${data.roomId}`);
          updateRoom.players.forEach((player) => {
            player.send(
              JSON.stringify({
                type: "stateUpdated",
                state: data.state,
                history: data.history,
              })
            );
          });
        } else {
          console.log("更新状态失败：房间不存在或请求者不是主持人");
        }
        break;

      default:
        console.log("未知消息类型:", data.type);
    }
  });

  ws.on("close", () => {
    console.log("胡桃服务器：客户端断开连接");
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.host === ws) {
        room.players.forEach((player) => {
          player.send(JSON.stringify({ type: "roomClosed" }));
        });
        delete rooms[roomId];
      } else {
        // 查找是哪个玩家断开连接
        const playerIndex = room.players.indexOf(ws);
        if (playerIndex !== -1) {
          // 获取玩家ID
          const playerId = room.playerInfos.find((p, i) => 
            i === playerIndex || p.connection === ws
          )?.id;
          
          // 如果找到玩家ID，则广播离开消息
          if (playerId) {
            const leaveMessage = {
              type: "playerLeft",
              playerId: playerId
            };
            room.host.send(JSON.stringify(leaveMessage));
            room.players.forEach((p) => {
              if (p !== ws) {
                p.send(JSON.stringify(leaveMessage));
              }
            });
            
            // 从玩家信息中移除
            room.playerInfos = room.playerInfos.filter(p => p.id !== playerId);
          }
          
          // 从玩家列表中移除
          room.players.splice(playerIndex, 1);
        }

        const currentPlayerCount = room.players.length + 1; // 包括主持人
        const playerCountMessage = {
          type: "playerCount",
          count: currentPlayerCount,
        };
        room.host.send(JSON.stringify(playerCountMessage));
        room.players.forEach((player) => {
          player.send(JSON.stringify(playerCountMessage));
        });
      }
    }
  });
});

// 5. 启动服务器
server.listen(PORT, () => {
  console.log(`胡桃WebSocket服务器已启动，端口: ${PORT}`);
}); 