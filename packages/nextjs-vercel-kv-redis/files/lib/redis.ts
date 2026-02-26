import { createClient } from "redis";

export async function getRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL ?? process.env.KV_URL,
  });

  await client.connect();

  return client;
}
