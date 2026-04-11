import { $ } from "bun";

const SEPARATOR_WIDTH = 50;

const steps = [
  {
    name: "Next.js Upgrade",
    command: () => $`bunx @next/codemod@latest upgrade`.cwd("apps/web"),
    critical: true,
  },
  {
    name: "shadcn/ui Components",
    command: () =>
      $`bunx shadcn@latest add --all --overwrite`.cwd("packages/ui"),
    critical: true,
  },
  {
    name: "Dependency Update",
    command: () => $`bun update`,
    critical: true,
  },
  {
    name: "Ultracite Fix",
    command: () => $`bun run fix`,
    critical: false,
  },
  {
    name: "Type Check",
    command: () => $`bunx tsc --noEmit`,
    critical: false,
  },
] as const;

let failed = false;

for (const step of steps) {
  console.log(`\n${"=".repeat(SEPARATOR_WIDTH)}`);
  console.log(`>> ${step.name}`);
  console.log("=".repeat(SEPARATOR_WIDTH));

  const result = await step.command().nothrow();

  if (result.exitCode !== 0) {
    console.error(`\n!! ${step.name} failed (exit code ${result.exitCode})`);

    if (step.critical) {
      console.error("Critical step failed, aborting.");
      process.exit(1);
    }

    failed = true;
    console.warn("Non-critical failure, continuing...");
  } else {
    console.log(`\n✓ ${step.name} completed`);
  }
}

if (failed) {
  console.warn("\nUpgrade completed with warnings.");
  process.exit(1);
}

console.log("\nUpgrade completed successfully.");
