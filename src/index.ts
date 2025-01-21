import { issuer } from "@openauthjs/openauth";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import {
  type ExecutionContext,
  type KVNamespace,
} from "@cloudflare/workers-types";
import { subjects } from "./subjects.js";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { Hono } from "hono";

interface Env {
  CloudflareAuthKV: KVNamespace;
}

async function getUser(email: string) {
  // Get user from database
  // Return user ID
  return "123";
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Impossible to extend with additional routes:https://github.com/openauthjs/openauth/issues/127#issuecomment-2569976202
    const app = new Hono();
    app.get("/health", (c) => c.json({ status: "ok" }));

    // https://hono.dev/docs/api/routing#grouping
    const fe = new Hono();
    fe.get("/", (c) => c.text("Hello fe"));
    app.route("/fe", fe);

    const openauth = issuer({
      storage: CloudflareStorage({
        namespace: env.CloudflareAuthKV,
      }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(email, code);
            },
          })
        ),
      },
      success: async (ctx, value) => {
        if (value.provider === "password") {
          return ctx.subject("user", {
            id: await getUser(value.email),
          });
        }
        throw new Error("Invalid provider");
      },
    });
    app.route("/", openauth); // Mount last

    return app.fetch(request, env, ctx);
  },
};
