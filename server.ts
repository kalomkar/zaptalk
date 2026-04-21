import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Real-time Socket.io logic
  const connectedUsers = new Map<string, string>(); // socketId -> userId

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Register user and track status
    socket.on("register-user", (uid) => {
      connectedUsers.set(socket.id, uid);
      socket.join(`user_${uid}`);
      io.emit("user_status_change", { userId: uid, status: "online" });
      console.log(`User ${uid} registered for sessions on socket ${socket.id}`);
    });

    // Join a chat room
    socket.on("join_room", (chatId) => {
      socket.join(chatId);
    });

    // Handle new message for delivery status
    socket.on("new_message", (data) => {
      // data: { chatId, senderId, receiverId, messageId }
      const isOnline = Array.from(connectedUsers.values()).includes(data.receiverId);
      if (isOnline) {
        io.to(`user_${data.receiverId}`).emit("message_delivered", data);
        socket.emit("status_updated", { ...data, status: 'delivered' });
      }
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      // data: { chatId, userId, isTyping }
      socket.to(data.chatId).emit("typing_update", data);
    });

    // Message status updates (Sent -> Delivered -> Seen)
    socket.on("message_status_update", (data) => {
      // data: { chatId, messageId, status, userId }
      socket.to(data.chatId).emit("status_updated", data);
    });

    // WebRTC Calling Signaling
    socket.on("call-user", (data) => {
      // data: { to (uid), from (uid), name, avatar, offer, video }
      console.log(`Call from ${data.from} to ${data.to}`);
      socket.to(`user_${data.to}`).emit("incoming-call", data);
    });

    socket.on("accept-call", (data) => {
      // data: { to (uid), answer }
      socket.to(`user_${data.to}`).emit("call-accepted", data);
    });

    socket.on("refuse-call", (data) => {
      // data: { to (uid) }
      socket.to(`user_${data.to}`).emit("call-refused");
    });

    socket.on("ice-candidate", (data) => {
      // data: { to (uid), candidate }
      socket.to(`user_${data.to}`).emit("ice-candidate", data.candidate);
    });

    socket.on("hangup", (data) => {
      // data: { to (uid) }
      socket.to(`user_${data.to}`).emit("call-ended");
    });

    socket.on("disconnect", () => {
      const uid = connectedUsers.get(socket.id);
      if (uid) {
        connectedUsers.delete(socket.id);
        // Check if user has other sockets open
        const stillConnected = Array.from(connectedUsers.values()).includes(uid);
        if (!stillConnected) {
          io.emit("user_status_change", { 
            userId: uid, 
            status: "offline", 
            lastSeen: Date.now() 
          });
        }
      }
      console.log("A user disconnected");
    });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ZapTalk Full-Stack Server is running" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
