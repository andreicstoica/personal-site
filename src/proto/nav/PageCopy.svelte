<script lang="ts">
  import { experiences, personalStatement } from "../../lib/experience";

  function dates(start: string, end: string | undefined): string {
    if (!end) return start;
    return `${start} – ${end}`;
  }
</script>

<div id="proto-content" class="max-w-2xl pb-24">
  <p class="text-lead">{@html personalStatement}</p>
  <div class="mt-8 flex flex-col gap-4">
    {#each experiences as job (job.name)}
      <div>
        <div class="font-medium">{job.name}</div>
        <div class="text-sm text-[var(--color-text-secondary)]">
          {job.role} · {dates(job.startDate, job.endDate)}
        </div>
      </div>
    {/each}
  </div>
</div>
