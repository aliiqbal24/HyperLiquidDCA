import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BillingPlan, DcaSchedule, ExecutionLog } from "@hypedca/core";
import type { EncryptedSecret } from "./crypto.js";

export interface AccountRecord {
  id: string;
  plan: BillingPlan;
  credential?: EncryptedSecret;
}

export interface DatabaseShape {
  accounts: AccountRecord[];
  schedules: DcaSchedule[];
  logs: ExecutionLog[];
  locks: string[];
}

export class JsonStore {
  constructor(private readonly file: string) {}

  async read(): Promise<DatabaseShape> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as DatabaseShape;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { accounts: [], schedules: [], logs: [], locks: [] };
      throw error;
    }
  }

  async write(db: DatabaseShape): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true }).catch(() => undefined);
    await writeFile(this.file, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }
}
