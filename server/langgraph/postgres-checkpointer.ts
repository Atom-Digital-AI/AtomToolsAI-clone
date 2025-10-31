import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { db } from "../db";
import { langgraphCheckpoints, langgraphThreads } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { contentWriterStateSchema } from "./types";

export interface PostgresCheckpointerConfig {
  userId: string;
  sessionId?: string;
}

export class PostgresCheckpointer extends BaseCheckpointSaver {
  private config: PostgresCheckpointerConfig;

  constructor(config: PostgresCheckpointerConfig) {
    super();
    this.config = config;
  }

  async putWrites(
    config: RunnableConfig,
    writes: Array<[string, any]>,
    taskId: string
  ): Promise<void> {
    // No-op implementation for putWrites
    // This is called by LangGraph for write-ahead logging, but we handle
    // all state persistence in the put() method instead
    // Just return without error to allow the workflow to continue
    return;
  }

  async deleteThread(threadId: string): Promise<void> {
    try {
      await db.delete(langgraphThreads).where(eq(langgraphThreads.id, threadId));
    } catch (error) {
      console.error("Error deleting thread:", error);
      throw error;
    }
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      return undefined;
    }

    const checkpointId = config.configurable?.checkpoint_id;

    try {
      let checkpointRecord;
      
      if (checkpointId) {
        [checkpointRecord] = await db
          .select()
          .from(langgraphCheckpoints)
          .where(
            and(
              eq(langgraphCheckpoints.threadId, threadId),
              eq(langgraphCheckpoints.checkpointId, checkpointId)
            )
          )
          .limit(1);
      } else {
        [checkpointRecord] = await db
          .select()
          .from(langgraphCheckpoints)
          .where(eq(langgraphCheckpoints.threadId, threadId))
          .orderBy(desc(langgraphCheckpoints.createdAt))
          .limit(1);
      }

      if (!checkpointRecord) {
        return undefined;
      }

      const checkpoint = checkpointRecord.stateData as unknown as Checkpoint;
      const metadata = (checkpointRecord.metadata as unknown as CheckpointMetadata) || {};
      
      // Validate state before resuming
      if (checkpoint.channel_values) {
        try {
          contentWriterStateSchema.parse(checkpoint.channel_values);
        } catch (validationError) {
          console.error("State validation failed when loading checkpoint:", {
            threadId,
            checkpointId: checkpointRecord.checkpointId,
            error: validationError instanceof Error ? validationError.message : String(validationError)
          });
          // Return undefined to indicate invalid checkpoint, allowing graceful handling
          return undefined;
        }
      }
      
      const parentConfig = checkpointRecord.parentCheckpointId
        ? {
            configurable: {
              thread_id: threadId,
              checkpoint_id: checkpointRecord.parentCheckpointId,
            },
          }
        : undefined;

      return {
        config: {
          configurable: {
            thread_id: threadId,
            checkpoint_id: checkpointRecord.checkpointId,
          },
        },
        checkpoint,
        metadata,
        parentConfig,
      };
    } catch (error) {
      console.error("Error getting checkpoint:", error);
      return undefined;
    }
  }

  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig }
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      return;
    }

    try {
      const query = db
        .select()
        .from(langgraphCheckpoints)
        .where(eq(langgraphCheckpoints.threadId, threadId))
        .orderBy(desc(langgraphCheckpoints.createdAt));

      if (options?.limit) {
        query.limit(options.limit);
      }

      const checkpoints = await query;

      for (const checkpointRecord of checkpoints) {
        const checkpoint = checkpointRecord.stateData as unknown as Checkpoint;
        const metadata = (checkpointRecord.metadata as unknown as CheckpointMetadata) || {};
        
        const parentConfig = checkpointRecord.parentCheckpointId
          ? {
              configurable: {
                thread_id: threadId,
                checkpoint_id: checkpointRecord.parentCheckpointId,
              },
            }
          : undefined;

        yield {
          config: {
            configurable: {
              thread_id: threadId,
              checkpoint_id: checkpointRecord.checkpointId,
            },
          },
          checkpoint,
          metadata,
          parentConfig,
        };
      }
    } catch (error) {
      console.error("Error listing checkpoints:", error);
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) {
      throw new Error("thread_id is required in config.configurable");
    }

    try {
      // Validate state before saving
      if (checkpoint.channel_values) {
        try {
          contentWriterStateSchema.parse(checkpoint.channel_values);
        } catch (validationError) {
          console.error("State validation failed before saving checkpoint:", {
            threadId,
            error: validationError instanceof Error ? validationError.message : String(validationError)
          });
          // Don't crash - log the error but still save the checkpoint
          // This allows the workflow to continue and the issue can be debugged later
        }
      }

      const checkpointId = nanoid();
      const parentCheckpointId = config.configurable?.checkpoint_id || null;

      const [thread] = await db
        .select()
        .from(langgraphThreads)
        .where(eq(langgraphThreads.id, threadId))
        .limit(1);

      if (!thread) {
        await db.insert(langgraphThreads).values({
          id: threadId,
          userId: this.config.userId,
          sessionId: this.config.sessionId || null,
          status: 'active',
          lastCheckpointId: checkpointId,
          metadata: {},
        });
      } else {
        await db
          .update(langgraphThreads)
          .set({
            lastCheckpointId: checkpointId,
            updatedAt: new Date(),
          })
          .where(eq(langgraphThreads.id, threadId));
      }

      await db.insert(langgraphCheckpoints).values({
        threadId,
        checkpointId,
        parentCheckpointId,
        stateData: checkpoint as any,
        metadata: metadata as any,
      });

      return {
        configurable: {
          thread_id: threadId,
          checkpoint_id: checkpointId,
        },
      };
    } catch (error) {
      console.error("Error saving checkpoint:", error);
      throw error;
    }
  }
}
