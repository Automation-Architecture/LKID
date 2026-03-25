import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function startMockWorker() {
  if (process.env.NODE_ENV === "development") {
    return worker.start();
  }
}
