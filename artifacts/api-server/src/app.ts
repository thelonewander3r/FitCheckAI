import express, { type Express } from "express";
import pinoHttp from "pino-http";
import session from "express-session";
import FileStore from "session-file-store";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET environment variable is required but was not set. " +
      "Add it to your Replit secrets before starting the server.",
  );
}

const SessionFileStore = FileStore(session);

const app: Express = express();

// Trust the Replit reverse proxy so secure cookies are set correctly
// and req.ip reflects the real client address.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Increase body limit to support base64-encoded images (selfies + wardrobe photos up to ~3 MB)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Per-user session cookie backed by files on disk, so userId survives server restarts.
// Each session file is tiny (just the userId UUID); no sensitive interview data is stored inside it.
const sessionsDir = path.join(process.cwd(), ".data", "sessions");
app.use(
  session({
    store: new SessionFileStore({
      path: sessionsDir,
      // Retry once on file-lock contention (parallel requests)
      retries: 1,
      // Re-save sessions 1 hour before expiry to keep active users warm
      reapInterval: 3600,
      // Prune sessions older than 7 days
      ttl: 7 * 24 * 60 * 60,
      // Suppress noisy session-file-store console logs
      logFn: () => undefined,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      // secure:true works because we set trust proxy above; Replit terminates TLS upstream
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  }),
);

app.use("/api", router);

export default app;
