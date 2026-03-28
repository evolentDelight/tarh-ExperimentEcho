import { HydraDBClient } from "@hydra_db/node";

const HYDRADB_API_KEY = process.env.HYDRADB_API_KEY;
const HYDRADB_TENANT_ID = process.env.HYDRADB_TENANT_ID || "experimentecho-dev";
const HYDRADB_SUB_TENANT_ID = process.env.HYDRADB_SUB_TENANT_ID || "";

let hydraClient = null;

export function getHydraClient() {
  if (!HYDRADB_API_KEY) return null;

  if (!hydraClient) {
    hydraClient = new HydraDBClient({
      token: HYDRADB_API_KEY
    });
  }

  return hydraClient;
}

export function getHydraTenantConfig() {
  return {
    tenant_id: HYDRADB_TENANT_ID,
    sub_tenant_id: HYDRADB_SUB_TENANT_ID
  };
}

export function formatExperimentMemory(experiment) {
  const variableLines =
    Object.entries(experiment.variables || {})
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n") || "- none";

  const resultLines =
    Object.entries(experiment.results || {})
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n") || "- none";

  return [
    `Experiment ID: ${experiment.id}`,
    `Task: ${experiment.task}`,
    `Dataset: ${experiment.dataset}`,
    `Model: ${experiment.model}`,
    `Strategy: ${experiment.strategy}`,
    `Variables:`,
    variableLines,
    `Results:`,
    resultLines,
    `Outcome: ${experiment.outcome}`,
    `Notes: ${experiment.notes || "none"}`
  ].join("\n");
}

export async function mirrorExperimentToHydra(experiment) {
  const client = getHydraClient();
  if (!client) {
    console.warn("HydraDB not configured. Skipping mirror.");
    return null;
  }

  const { tenant_id, sub_tenant_id } = getHydraTenantConfig();

  return client.userMemory.add({
    memories: [
      {
        title: `Experiment ${experiment.id}`,
        text: formatExperimentMemory(experiment),
        infer: false
      }
    ],
    tenant_id,
    sub_tenant_id,
    upsert: true
  });
}