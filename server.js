const { createServer } = require("http");

const next = require("next");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;
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

    // Handle incoming messages
    socket.on("send_message", async (data, callback) => {
      try {
        if (!data.requestId || !data.senderId || (!data.content && !data.imageUrl)) {
          throw new Error("Missing required fields");
        }

        // Save the message to the database using Prisma
        const message = await prisma.chatMessage.create({
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

        // Broadcast the saved message with sender details back to the room
        io.to(data.requestId).emit("receive_message", message);
        
        // Determine recipient for notification
        const request = await prisma.helpRequest.findUnique({
          where: { id: data.requestId },
          select: { requesterId: true, assignedVolunteers: { select: { id: true } } }
        });
        
        if (request) {
          const recipients = [];
          if (request.requesterId !== data.senderId) recipients.push(request.requesterId);
          
          if (request.assignedVolunteers && request.assignedVolunteers.id !== data.senderId) {
            recipients.push(request.assignedVolunteers.id);
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
