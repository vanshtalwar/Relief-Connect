const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load .env.local first, then .env
if (fs.existsSync(path.resolve(__dirname, ".env.local"))) {
  dotenv.config({ path: path.resolve(__dirname, ".env.local") });
}
if (fs.existsSync(path.resolve(__dirname, ".env"))) {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
}

// Support Vercel Postgres / Neon integration environment variable names
if (!process.env.DATABASE_URL && process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

const { createServer } = require("http");

const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT, 10) || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();

const { parse } = require("url");

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", 
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Client joins a specific room for a HelpRequest
    socket.on("join_request_room", (requestId) => {
      socket.join(requestId);
      console.log(`Socket ${socket.id} joined room ${requestId}`);
    });

    // Client leaves the room
    socket.on("leave_request_room", (requestId) => {
      socket.leave(requestId);
      console.log(`Socket ${socket.id} left room ${requestId}`);
    });

    // Client joins a personal room for direct notifications
    socket.on("join_user_room", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined personal room user_${userId}`);
    });

    // Handle realtime general notifications broadcast
    socket.on("broadcast_notification", (payload) => {
      if (payload && payload.userId) {
        io.to(`user_${payload.userId}`).emit("new_notification", payload);
      } else {
        io.emit("new_notification", payload);
      }
    });

    // Handle map/request updates broadcast
    socket.on("broadcast_requests_update", () => {
      socket.broadcast.emit("requests_updated");
    });

    // Handle incoming messages
    socket.on("send_message", async (data, callback) => {
      try {
        let message = data.message;

        if (!message) {
          if (!data.requestId || !data.senderId || (!data.content && !data.imageUrl)) {
            throw new Error("Missing required fields");
          }

          // Fallback: save to database only if not already saved via REST API
          message = await prisma.chatMessage.create({
            data: {
              requestId: data.requestId,
              senderId: data.senderId,
              content: data.content || null,
              imageUrl: data.imageUrl || null,
            },
            include: {
              sender: {
                select: { id: true, name: true, role: true, image: true }
              }
            }
          });
        }

        // Broadcast to other participants in the room (sender already has it)
        socket.to(data.requestId).emit("receive_message", message);
        
        // Determine all group recipients for real-time notification
        const request = await prisma.helpRequest.findUnique({
          where: { id: data.requestId },
          select: {
            requesterId: true,
            assignedVolunteers: { select: { id: true } },
            claims: { select: { volunteerId: true } },
          }
        });
        
        if (request) {
          const recipients = new Set();
          if (request.requesterId && request.requesterId !== data.senderId) recipients.add(request.requesterId);
          if (request.assignedVolunteers && request.assignedVolunteers.id !== data.senderId) {
            recipients.add(request.assignedVolunteers.id);
          }
          if (Array.isArray(request.claims)) {
            request.claims.forEach(c => {
              if (c.volunteerId && c.volunteerId !== data.senderId) recipients.add(c.volunteerId);
            });
          }

          recipients.forEach(recipientId => {
            io.to(`user_${recipientId}`).emit("new_chat_notification", { requestId: data.requestId });
          });
        }
        
        // Acknowledge success to the sender
        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Error saving message:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle editing messages
    socket.on("edit_message", async (data, callback) => {
      try {
        if (!data.messageId || !data.content || !data.senderId) {
          throw new Error("Missing required fields");
        }

        const message = await prisma.chatMessage.findUnique({
          where: { id: data.messageId }
        });

        if (!message || message.senderId !== data.senderId) {
          throw new Error("Unauthorized to edit this message");
        }

        const updatedMessage = await prisma.chatMessage.update({
          where: { id: data.messageId },
          data: {
            content: data.content,
            isEdited: true
          },
          include: {
            sender: {
              select: { id: true, name: true, role: true, image: true }
            }
          }
        });

        io.to(message.requestId).emit("message_edited", updatedMessage);
        
        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Error editing message:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle deleting messages
    socket.on("delete_message", async (data, callback) => {
      try {
        if (!data.messageId || !data.senderId) {
          throw new Error("Missing required fields");
        }

        const message = await prisma.chatMessage.findUnique({
          where: { id: data.messageId }
        });

        if (!message || message.senderId !== data.senderId) {
          throw new Error("Unauthorized to delete this message");
        }

        const deletedMessage = await prisma.chatMessage.update({
          where: { id: data.messageId },
          data: {
            content: null,
            imageUrl: null,
            isDeleted: true
          },
          include: {
            sender: {
              select: { id: true, name: true, role: true, image: true }
            }
          }
        });

        io.to(message.requestId).emit("message_deleted", deletedMessage);
        
        if (typeof callback === "function") {
          callback({ success: true });
        }
      } catch (error) {
        console.error("Error deleting message:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
