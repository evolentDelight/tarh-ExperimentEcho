import "dotenv/config";

const HYDRADB_API_KEY = process.env.HYDRADB_API_KEY || "";
const HYDRADB_TENANT_ID = process.env.HYDRADB_TENANT_ID || "experimentecho-dev";
const HYDRADB_SUB_TENANT_ID = process.env.HYDRADB_SUB_TENANT_ID || "";
const HYDRADB_BASE_URL = process.env.HYDRADB_BASE_URL || "https://api.hydradb.com";

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
  if (!HYDRADB_API_KEY) {
    console.warn("HydraDB not configured. Skipping mirror.");
    return null;
  }

  const response = await fetch(`${HYDRADB_BASE_URL}/memories/add_memory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HYDRADB_API_KEY}`
    },
    body: JSON.stringify({
      memories: [
        {
          id: `experiment-${experiment.id}`,
          title: `Experiment ${experiment.id}`,
          text: formatExperimentMemory(experiment),
          infer: false
        }
      ],
      tenant_id: HYDRADB_TENANT_ID,
      sub_tenant_id: HYDRADB_SUB_TENANT_ID,
      upsert: true
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `HydraDB REST mirror failed: ${response.status} ${JSON.stringify(data)}`
    );
  }

  return data;
}